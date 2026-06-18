import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport, Environment, Line, Html } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import type { ModuleConfig, PecaGeo, PortaDim, GavetaCaixa } from "@/lib/engines/module";
import {
  calcularGeometria, calcularPes, dimensoesPortas, dimensoesGavetas, resolverEspessuras,
  pecasPortaAluminio, dimensoesVaroes, dimensoesPortasCorrer,
} from "@/lib/engines/module";
import { geraCantoDiagonal, geraCantoL, geraCantoCego } from "@/lib/engines/canto";
import { aberturaGaveta, anguloPortaRad, extensaoFromTipo, pivotPorta } from "@/lib/engines/hardware-anim";
import type { Furo } from "@/lib/engines/drilling";
import {
  CavilhaModel, CorredicaCarcaca, CorredicaGaveta, DobradicaCaneco, DobradicaChapa,
  MinifixCorpo, MinifixPerno, PinoPrateleiraModel, liftYUndermount,
  PuxadorFrenteMesh, PerfilGolaMesh,
} from "./hardware/HardwareMeshes";
import type { PuxadorSnapshot, PuxadorPosicao } from "@/lib/engines/puxadores";
import {
  pecasGavetaPorTemplate, DEFAULT_CLASSICA, calcShiftZFrenteIntegrada, type GavetaTemplate,
} from "@/lib/engines/gaveta-template";


const MM_TO_M = 0.001;
const COR_MELAMINA = "#E8E2D5";
const COR_ARESTA = "#3a3a3a";
const COR_POR_TIPO: Record<string, string> = {
  minifix_corpo: "#e08a2a",
  minifix_perno: "#3b82f6",
  cavilha:       "#16a34a",
  parafuso:      "#6b7280",
  dobradica:     "#1a1a1a",
  marcacao:      "#d4d4d8",
  pino:          "#8b5cf6",
};

// ── Material da biblioteca (linha de `materials`) — só campos visuais ──
export type MatDef = { cor_hex?: string | null; acabamento?: string | null; decor_nome?: string | null; name?: string | null } | null | undefined;

// acabamento → propriedades físicas (PBR) reproduzíveis pelo render
export function materialPhys(acab?: string | null): { roughness: number; metalness: number } {
  switch ((acab ?? "").toLowerCase()) {
    case "brilho":    return { roughness: 0.15, metalness: 0.05 };
    case "mate":      return { roughness: 0.85, metalness: 0.0 };
    case "madeira":   return { roughness: 0.7,  metalness: 0.0 };
    case "texturado": return { roughness: 0.6,  metalness: 0.0 };
    default:          return { roughness: 0.7,  metalness: 0.02 };
  }
}

interface Module3DProps {
  config: ModuleConfig;
  explode?: number;
  furos?: Furo[];
  showHardware?: boolean;
  doorAngleDeg?: number;
  drawerPct?: number;
  showCotas?: boolean;
  gavetaTemplates?: Array<{ id: string; nome: string; tipo: string; config: any }>;
  materialCorpo?: MatDef;
  materialFrente?: MatDef;
}

// Resolve template ativo da gaveta — fallback DEFAULT_CLASSICA.
const FALLBACK_TPL: GavetaTemplate = { nome: "Caixa Clássica (padrão)", tipo: "classica", config: DEFAULT_CLASSICA };
function resolveGavetaTemplate(
  config: ModuleConfig,
  list?: Module3DProps["gavetaTemplates"],
): GavetaTemplate {
  const id = (config.gavetas as any)?.gavetaTemplateId ?? null;
  if (!id || !list) return FALLBACK_TPL;
  const row = list.find((t) => t.id === id);
  if (!row) return FALLBACK_TPL;
  return { id: row.id, nome: row.nome, tipo: row.tipo as any, config: row.config as any };
}

// Aplica saída do motor de templates às peças da caixa da gaveta i:
//  - alturaCaixa  → redefine altura das laterais/frente/traseira (legrabox encurta).
//  - desenhaFrenteCaixa=false → remove o painel "Frente caixa" (frente_integrada).
//  - frente_integrada → shifta caixa em Z para colar à face traseira da frente
//    decorativa (corpo rígido, sem folga visível ao abrir).
//  - gaveta_frente (decorativa) fica intacta — translação rígida acontece via
//    o group pai (drawerPct) → mesmo deltaZ para todas as peças.
function applyGavetaTemplate(pecas: PecaGeo[], c: GavetaCaixa, tpl: GavetaTemplate): PecaGeo[] {
  const r = pecasGavetaPorTemplate(tpl, { boxWidth: c.boxWidth, boxHeight: c.boxHeight, boxDepth: c.boxDepth });
  let shiftZ = 0;
  if (tpl.tipo === "frente_integrada") {
    const fd = pecas.find((p) => p.tipo === "gaveta_frente");
    if (fd) shiftZ = calcShiftZFrenteIntegrada(c.center[2], c.boxDepth, fd.center[2], fd.size[2]);
  }
  const heightChanged = r.alturaCaixa !== c.boxHeight;
  if (!heightChanged && shiftZ === 0 && r.desenhaFrenteCaixa) return pecas; // classica → sem alteração
  const yBottom = c.center[1] - c.boxHeight / 2;
  const newCy = yBottom + r.alturaCaixa / 2;
  return pecas.flatMap((p) => {
    if (!r.desenhaFrenteCaixa && p.tipo === "gaveta_frenteCaixa" && /^Frente caixa/i.test(p.descricao)) return [];
    if (p.tipo === "gaveta_lateral" || p.tipo === "gaveta_frenteCaixa") {
      const cy = heightChanged ? newCy : p.center[1];
      const sy = heightChanged ? r.alturaCaixa : p.size[1];
      return [{ ...p,
        size: [p.size[0], sy, p.size[2]] as [number, number, number],
        center: [p.center[0], cy, p.center[2] + shiftZ] as [number, number, number] }];
    }
    if (p.tipo === "gaveta_fundo") {
      // fundo acompanha o shift Z da caixa (mantém altura e largura originais)
      return [{ ...p, center: [p.center[0], p.center[1], p.center[2] + shiftZ] as [number, number, number] }];
    }
    return [p];
  });
}

function PecaMesh({ p, explode, center3D, matCorpo, matFrente }: { p: PecaGeo; explode: number; center3D: [number, number, number]; matCorpo?: MatDef; matFrente?: MatDef }) {
  const isPorta = p.tipo === "porta";
  const isGavFrente = p.tipo === "gaveta_frente";
  const isCaixa = p.tipo === "gaveta_lateral" || p.tipo === "gaveta_frenteCaixa" || p.tipo === "gaveta_fundo";
  const isTamp = p.tipo === "tamponamento";
  const dx = (p.center[0] - center3D[0]) * explode * 0.8;
  const dy = (p.center[1] - center3D[1]) * explode * 0.8;
  const dz = (p.center[2] - center3D[2]) * explode * 0.8;
  const pos: [number, number, number] = [
    (p.center[0] + dx) * MM_TO_M,
    (p.center[1] + dy) * MM_TO_M,
    (p.center[2] + dz) * MM_TO_M,
  ];
  const size: [number, number, number] = [
    Math.max(p.size[0], 1) * MM_TO_M,
    Math.max(p.size[1], 1) * MM_TO_M,
    Math.max(p.size[2], 1) * MM_TO_M,
  ];
  // Aplica material da biblioteca: frentes (portas + frentes de gaveta) usam
  // materialFrente quando definido; restante usa materialCorpo. Fallback = paleta clássica.
  const useFrente = isPorta || isGavFrente;
  const mat = (useFrente ? (matFrente ?? matCorpo) : matCorpo) ?? null;
  const fallback = isPorta || isGavFrente ? "#D8D1C0" : isCaixa ? "#B8AE96" : isTamp ? "#DCD5C4" : COR_MELAMINA;
  const color = mat?.cor_hex || fallback;
  const phys = materialPhys(mat?.acabamento);
  const opacity = isPorta || isGavFrente ? 0.92 : isCaixa ? 0.82 : 0.95;
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={phys.roughness} metalness={phys.metalness} transparent opacity={opacity} />
      <Edges threshold={15} color={COR_ARESTA} />
    </mesh>
  );
}

// ── Porta alumínio + espelho: caixilho metálico + painel espelhado ──
function PortaAluminioMesh({ pd, perfilW, perfilE }: { pd: PortaDim; perfilW: number; perfilE: number }) {
  // pecas em coords locais à porta (origem canto inferior-esq).
  const pecas = pecasPortaAluminio(pd.largura, pd.altura, perfilW, perfilE);
  // origem da porta no espaço local do <group> (que tem rotação no pivot):
  // a porta vive em xMin..xMax, yMin..yMax, zBack.. (espessura para a frente).
  // Origem da peça (canto inferior-esq + zBack):
  const ox = pd.xMin, oy = pd.yMin, oz = pd.zBack;
  return (
    <group>
      {pecas.map((q, i) => {
        const cx = (ox + q.center[0]) * MM_TO_M;
        const cy = (oy + q.center[1]) * MM_TO_M;
        const cz = (oz + q.center[2]) * MM_TO_M;
        const sx = Math.max(q.size[0], 1) * MM_TO_M;
        const sy = Math.max(q.size[1], 1) * MM_TO_M;
        const sz = Math.max(q.size[2], 1) * MM_TO_M;
        const isEspelho = q.kind === "espelho";
        return (
          <mesh key={`alu-${i}`} position={[cx, cy, cz]} castShadow receiveShadow>
            <boxGeometry args={[sx, sy, sz]} />
            {isEspelho ? (
              <meshStandardMaterial color="#cfd6dc" roughness={0.05} metalness={0.95} />
            ) : (
              <meshStandardMaterial color="#a8aaad" roughness={0.35} metalness={0.85} />
            )}
            {!isEspelho && <Edges threshold={15} color="#2b2d30" />}
          </mesh>
        );
      })}
    </group>
  );
}

const UP = new Vector3(0, 1, 0);
function FuroMesh({ f }: { f: Furo }) {
  const { pos, q, len, r } = useMemo(() => {
    const d = new Vector3(f.dir[0], f.dir[1], f.dir[2]).normalize();
    const q = new Quaternion().setFromUnitVectors(UP, d);
    const len = f.profundidade * MM_TO_M;
    const r = (f.diametro / 2) * MM_TO_M;
    const cx = (f.pos[0] + f.dir[0] * f.profundidade / 2) * MM_TO_M;
    const cy = (f.pos[1] + f.dir[1] * f.profundidade / 2) * MM_TO_M;
    const cz = (f.pos[2] + f.dir[2] * f.profundidade / 2) * MM_TO_M;
    return { pos: [cx, cy, cz] as [number, number, number], q, len, r };
  }, [f]);
  const color = COR_POR_TIPO[f.tipo_furo] ?? "#1a1a1a";
  return (
    <mesh position={pos} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

// Translada uma peça para coordenadas locais (subtrai a origem do grupo).
function translatePeca(p: PecaGeo, ox: number, oy: number, oz: number): PecaGeo {
  return { ...p, center: [p.center[0] - ox, p.center[1] - oy, p.center[2] - oz] };
}
function translateFuro(f: Furo, ox: number, oy: number, oz: number): Furo {
  return { ...f, pos: [f.pos[0] - ox, f.pos[1] - oy, f.pos[2] - oz] };
}

function isDrawerPiece(p: PecaGeo, idx: number): boolean {
  if (p.tipo !== "gaveta_frente" && p.tipo !== "gaveta_lateral" && p.tipo !== "gaveta_frenteCaixa" && p.tipo !== "gaveta_fundo") return false;
  return new RegExp(`gaveta\\s+${idx + 1}\\b`, "i").test(p.descricao);
}

export function Module3D({ config, explode = 0, furos = [], showHardware = false, doorAngleDeg = 0, drawerPct = 0, showCotas = false, gavetaTemplates, materialCorpo, materialFrente }: Module3DProps) {
  if (config.categoria === "canto" && config.cantoTipo === "diagonal") {
    return <CantoDiagonalCanvas config={config} doorAngleDeg={doorAngleDeg} showHardware={showHardware} />;
  }
  if (config.categoria === "canto" && config.cantoTipo === "l") {
    return <CantoLCanvas config={config} doorAngleDeg={doorAngleDeg} showHardware={showHardware} />;
  }
  if (config.categoria === "canto" && config.cantoTipo === "cego") {
    return <CantoCegoCanvas config={config} doorAngleDeg={doorAngleDeg} showHardware={showHardware} />;
  }
  const pecas = useMemo(() => calcularGeometria(config), [config]);

  const pes = useMemo(() => calcularPes(config), [config]);
  const portas = useMemo(() => dimensoesPortas(config), [config]);
  const gavetas = useMemo(() => dimensoesGavetas(config), [config]);
  const eRes = useMemo(() => resolverEspessuras(config.espessuraPadrao, config.espessuras), [config]);
  const gavetaTpl = useMemo(() => resolveGavetaTemplate(config, gavetaTemplates), [config, gavetaTemplates]);

  const { W, H, D } = useMemo(
    () => ({ W: config.dims.width, H: config.dims.height, D: config.dims.depth }),
    [config.dims.width, config.dims.height, config.dims.depth],
  );
  const center3D: [number, number, number] = [W / 2, H / 2, D / 2];

  const maxDim = Math.max(W, H, D) * MM_TO_M;
  const camPos: [number, number, number] = [
    (W * MM_TO_M) + maxDim * 0.9,
    (H * MM_TO_M) * 0.85 + maxDim * 0.4,
    (D * MM_TO_M) + maxDim * 1.1,
  ];
  const target: [number, number, number] = [W / 2 * MM_TO_M, H / 2 * MM_TO_M, D / 2 * MM_TO_M];

  // ── Particionar peças e furos por dono (estrutura / por porta / por gaveta) ──
  const portaDescr = new Set(portas.map((p) => p.descricao));
  const drawerCount = gavetas.caixas.length;

  type Bucket = { structPecas: PecaGeo[]; structFuros: Furo[]; portaPecas: Map<string, PecaGeo>; portaFuros: Map<string, Furo[]>; drawerPecas: PecaGeo[][]; drawerFuros: Furo[][] };
  const bucket: Bucket = {
    structPecas: [],
    structFuros: [],
    portaPecas: new Map(),
    portaFuros: new Map(portas.map((p) => [p.descricao, [] as Furo[]])),
    drawerPecas: Array.from({ length: drawerCount }, () => []),
    drawerFuros: Array.from({ length: drawerCount }, () => []),
  };
  for (const p of pecas) {
    if (p.tipo === "porta" && portaDescr.has(p.descricao)) {
      bucket.portaPecas.set(p.descricao, p);
      continue;
    }
    let placed = false;
    for (let i = 0; i < drawerCount; i++) {
      if (isDrawerPiece(p, i)) { bucket.drawerPecas[i].push(p); placed = true; break; }
    }
    if (!placed) bucket.structPecas.push(p);
  }
  for (const f of furos) {
    if (f.tipo_furo === "dobradica") {
      // junta = `dobradica_<descricao>`
      for (const pd of portas) {
        if (f.junta === `dobradica_${pd.descricao}`) {
          bucket.portaFuros.get(pd.descricao)?.push(f);
          break;
        }
      }
      continue;
    }
    // restante furação fica na estrutura (chapas, minifix, cavilhas, marcações, pinos…)
    bucket.structFuros.push(f);
  }

  // Pares de chapas (2 parafusos = 1 chapa) por porta
  const chapasByPorta = new Map<string, Array<{ centro: [number, number, number]; dir: [number, number, number] }>>();
  for (const pd of portas) {
    const screws = furos.filter((f) => f.tipo_furo === "parafuso" && f.junta === `dobradica_chapa_${pd.descricao}`);
    const pairs: Array<{ centro: [number, number, number]; dir: [number, number, number] }> = [];
    for (let i = 0; i < screws.length; i += 2) {
      const a = screws[i], b = screws[i + 1] ?? screws[i];
      pairs.push({
        centro: [(a.pos[0] + b.pos[0]) / 2, (a.pos[1] + b.pos[1]) / 2, (a.pos[2] + b.pos[2]) / 2],
        dir: a.dir,
      });
    }
    chapasByPorta.set(pd.descricao, pairs);
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: camPos, fov: 35, near: 0.01, far: 100 }}
      style={{ background: "linear-gradient(180deg, #f4f3ef 0%, #dcdad3 100%)" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 2, -2]} intensity={0.25} />
      <Suspense fallback={null}><Environment preset="apartment" /></Suspense>

      <ModuleSceneInner
        bucket={bucket}
        chapasByPorta={chapasByPorta}
        portas={portas}
        gavetas={gavetas}
        gavetaTpl={gavetaTpl}
        eRes={eRes}
        pes={pes}
        explode={explode}
        center3D={center3D}
        W={W} H={H} D={D}
        showHardware={showHardware}
        doorAngleDeg={doorAngleDeg}
        drawerPct={drawerPct}
        showCotas={showCotas}
        tipoPorta={config.portas.tipoPorta ?? "melamina"}
        perfilLarguraMm={config.portas.perfilLarguraMm ?? 25}
        perfilEspessuraMm={config.portas.perfilEspessuraMm ?? 20}
        materialCorpo={materialCorpo}
        materialFrente={materialFrente}
        puxadorPortas={(config.portas?.puxador ?? null) as PuxadorSnapshot | null}
        puxadorPortasPos={(config.portas?.puxadorPos ?? "superior") as PuxadorPosicao}
        puxadorGavetas={(config.gavetas?.puxador ?? null) as PuxadorSnapshot | null}
        puxadorGavetasPos={(config.gavetas?.puxadorPos ?? "superior") as PuxadorPosicao}
      />

      <RoupeiroExtras config={config} drawerPct={drawerPct} />

      <Grid
        position={[target[0], 0, target[2]]}
        args={[10, 10]} cellSize={0.1} cellThickness={0.6} sectionSize={1} sectionThickness={1}
        sectionColor="#7a7367" cellColor="#b5afa3" fadeDistance={15} fadeStrength={1} infiniteGrid
      />

      <OrbitControls target={target} enableDamping makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={["#d94a4a", "#4ab06a", "#4a7fd9"]} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}

// ── Cena reusável (sem Canvas/lights/controls). Usar dentro de um Canvas pai
// (ex.: Room3D) para colocar várias instâncias de módulo na mesma sala.
export function ModuleScene({
  config, explode = 0, furos = [], showHardware = false, doorAngleDeg = 0, drawerPct = 0, showCotas = false, gavetaTemplates, materialCorpo, materialFrente,
}: Module3DProps) {
  const pecas = useMemo(() => calcularGeometria(config), [config]);
  const pes = useMemo(() => calcularPes(config), [config]);
  const portas = useMemo(() => dimensoesPortas(config), [config]);
  const gavetas = useMemo(() => dimensoesGavetas(config), [config]);
  const eRes = useMemo(() => resolverEspessuras(config.espessuraPadrao, config.espessuras), [config]);
  const gavetaTpl = useMemo(() => resolveGavetaTemplate(config, gavetaTemplates), [config, gavetaTemplates]);

  const { W, H, D } = { W: config.dims.width, H: config.dims.height, D: config.dims.depth };
  const center3D: [number, number, number] = [W / 2, H / 2, D / 2];

  const portaDescr = new Set(portas.map((p) => p.descricao));
  const drawerCount = gavetas.caixas.length;

  const bucket: Bucket = {
    structPecas: [],
    structFuros: [],
    portaPecas: new Map(),
    portaFuros: new Map(portas.map((p) => [p.descricao, [] as Furo[]])),
    drawerPecas: Array.from({ length: drawerCount }, () => []),
    drawerFuros: Array.from({ length: drawerCount }, () => []),
  };
  for (const p of pecas) {
    if (p.tipo === "porta" && portaDescr.has(p.descricao)) { bucket.portaPecas.set(p.descricao, p); continue; }
    let placed = false;
    for (let i = 0; i < drawerCount; i++) {
      if (isDrawerPiece(p, i)) { bucket.drawerPecas[i].push(p); placed = true; break; }
    }
    if (!placed) bucket.structPecas.push(p);
  }
  for (const f of furos) {
    if (f.tipo_furo === "dobradica") {
      for (const pd of portas) {
        if (f.junta === `dobradica_${pd.descricao}`) { bucket.portaFuros.get(pd.descricao)?.push(f); break; }
      }
      continue;
    }
    bucket.structFuros.push(f);
  }

  const chapasByPorta = new Map<string, Array<{ centro: [number, number, number]; dir: [number, number, number] }>>();
  for (const pd of portas) {
    const screws = furos.filter((f) => f.tipo_furo === "parafuso" && f.junta === `dobradica_chapa_${pd.descricao}`);
    const pairs: Array<{ centro: [number, number, number]; dir: [number, number, number] }> = [];
    for (let i = 0; i < screws.length; i += 2) {
      const a = screws[i], b = screws[i + 1] ?? screws[i];
      pairs.push({ centro: [(a.pos[0] + b.pos[0]) / 2, (a.pos[1] + b.pos[1]) / 2, (a.pos[2] + b.pos[2]) / 2], dir: a.dir });
    }
    chapasByPorta.set(pd.descricao, pairs);
  }

  return (
    <>
    <ModuleSceneInner
      bucket={bucket} chapasByPorta={chapasByPorta} portas={portas} gavetas={gavetas}
      gavetaTpl={gavetaTpl} eRes={eRes} pes={pes} explode={explode} center3D={center3D}
      W={W} H={H} D={D} showHardware={showHardware} doorAngleDeg={doorAngleDeg}
      drawerPct={drawerPct} showCotas={showCotas}
      tipoPorta={config.portas.tipoPorta ?? "melamina"}
      perfilLarguraMm={config.portas.perfilLarguraMm ?? 25}
      perfilEspessuraMm={config.portas.perfilEspessuraMm ?? 20}
      materialCorpo={materialCorpo} materialFrente={materialFrente}
      puxadorPortas={(config.portas?.puxador ?? null) as PuxadorSnapshot | null}
      puxadorPortasPos={(config.portas?.puxadorPos ?? "superior") as PuxadorPosicao}
      puxadorGavetas={(config.gavetas?.puxador ?? null) as PuxadorSnapshot | null}
      puxadorGavetasPos={(config.gavetas?.puxadorPos ?? "superior") as PuxadorPosicao}
    />
    <RoupeiroExtras config={config} drawerPct={drawerPct} />
    </>
  );
}

// ── Núcleo de render (peças/furos/ferragens/portas/gavetas/cotas/pés) ──
type Bucket = {
  structPecas: PecaGeo[];
  structFuros: Furo[];
  portaPecas: Map<string, PecaGeo>;
  portaFuros: Map<string, Furo[]>;
  drawerPecas: PecaGeo[][];
  drawerFuros: Furo[][];
};

function ModuleSceneInner({
  bucket, chapasByPorta, portas, gavetas, gavetaTpl, eRes, pes,
  explode, center3D, W, H, D, showHardware, doorAngleDeg, drawerPct, showCotas,
  tipoPorta, perfilLarguraMm, perfilEspessuraMm, materialCorpo, materialFrente,
  puxadorPortas, puxadorPortasPos, puxadorGavetas, puxadorGavetasPos,
}: {
  bucket: Bucket;
  chapasByPorta: Map<string, Array<{ centro: [number, number, number]; dir: [number, number, number] }>>;
  portas: PortaDim[];
  gavetas: ReturnType<typeof dimensoesGavetas>;
  gavetaTpl: GavetaTemplate;
  eRes: ReturnType<typeof resolverEspessuras>;
  pes: ReturnType<typeof calcularPes>;
  explode: number;
  center3D: [number, number, number];
  W: number; H: number; D: number;
  showHardware: boolean;
  doorAngleDeg: number;
  drawerPct: number;
  showCotas: boolean;
  tipoPorta: "melamina" | "aluminio_espelho";
  perfilLarguraMm: number;
  perfilEspessuraMm: number;
  materialCorpo?: MatDef;
  materialFrente?: MatDef;
  puxadorPortas: PuxadorSnapshot | null;
  puxadorPortasPos: PuxadorPosicao;
  puxadorGavetas: PuxadorSnapshot | null;
  puxadorGavetasPos: PuxadorPosicao;
}) {
  return (
    <>
      {bucket.structPecas.map((p, i) => (
        <PecaMesh key={`s-${i}`} p={p} explode={explode} center3D={center3D} matCorpo={materialCorpo} matFrente={materialFrente} />
      ))}
      {bucket.structFuros.map((f, i) => <FuroMesh key={`sf-${i}`} f={f} />)}

      {showHardware && bucket.structFuros.map((f, i) => {
        if (f.tipo_furo === "cavilha" && f.peca === "lateral") return <CavilhaModel key={`hw-cav-${i}`} f={f} />;
        if (f.tipo_furo === "minifix_corpo") return <MinifixCorpo key={`hw-mc-${i}`} f={f} />;
        if (f.tipo_furo === "minifix_perno") return <MinifixPerno key={`hw-mp-${i}`} f={f} />;
        if (f.tipo_furo === "pino") return <PinoPrateleiraModel key={`hw-pino-${i}`} f={f} />;
        return null;
      })}
      {showHardware && Array.from(chapasByPorta.entries()).flatMap(([desc, pairs]) =>
        pairs.map((c, j) => <DobradicaChapa key={`chapa-${desc}-${j}`} centro={c.centro} dir={c.dir} />)
      )}

      {showHardware && gavetas.caixas.map((c, i) => (
        <CorredicaCarcaca key={`crc-c-${i}`} caixa={c} ladoXmin={eRes.lateral} ladoXmax={W - eRes.lateral} />
      ))}

      {portas.map((pd, i) => {
        const pivotX = pivotPorta(pd);
        const pivotZ = pd.zBack;
        const angle = anguloPortaRad(pd.ladoDobradicas, doorAngleDeg);
        const peca = bucket.portaPecas.get(pd.descricao);
        const canecos = bucket.portaFuros.get(pd.descricao) ?? [];
        // Coordenadas locais ao group (com pivot trasladado)
        const pdLocal: PortaDim = { ...pd,
          xMin: pd.xMin - pivotX, xMax: pd.xMax - pivotX,
          cx: pd.cx - pivotX, zBack: pd.zBack - pivotZ, zFront: pd.zFront - pivotZ };
        return (
          <group key={`door-${i}`} position={[pivotX * MM_TO_M, 0, pivotZ * MM_TO_M]} rotation={[0, angle, 0]}>
            {peca && tipoPorta === "melamina" && (
              <PecaMesh
                p={translatePeca(peca, pivotX, 0, pivotZ)}
                explode={explode}
                center3D={[center3D[0] - pivotX, center3D[1], center3D[2] - pivotZ]}
                matCorpo={materialCorpo}
                matFrente={materialFrente}
              />
            )}
            {tipoPorta === "aluminio_espelho" && (
              <PortaAluminioMesh pd={pdLocal} perfilW={perfilLarguraMm} perfilE={perfilEspessuraMm} />
            )}
            {canecos.map((f, j) => <FuroMesh key={`df-${j}`} f={translateFuro(f, pivotX, 0, pivotZ)} />)}
            {showHardware && canecos.map((f, j) => <DobradicaCaneco key={`dc-${j}`} f={translateFuro(f, pivotX, 0, pivotZ)} />)}
            {/* 4/5: puxador convencional/cava — acompanha a porta (dentro do group rotacionado) */}
            {puxadorPortas && (puxadorPortas.tipo === "convencional" || puxadorPortas.tipo === "cava") && (
              <PuxadorFrenteMesh
                pux={puxadorPortas}
                pos={puxadorPortasPos}
                frente={{ xMin: pdLocal.xMin, xMax: pdLocal.xMax, yMin: pdLocal.yMin, yMax: pdLocal.yMax, zBack: pdLocal.zBack, zFront: pdLocal.zFront }}
              />
            )}
          </group>
        );
      })}

      {/* 4/5: PERFIL GOLA (alumínio) — FIXO à carcaça; não roda com a porta */}
      {puxadorPortas && (puxadorPortas.tipo === "gola_j" || puxadorPortas.tipo === "gola_c") && portas[0] && (
        <PerfilGolaMesh
          pux={puxadorPortas}
          pos={puxadorPortasPos}
          frente={{ xMin: portas[0].xMin, xMax: portas[0].xMax, yMin: portas[0].yMin, yMax: portas[0].yMax, zBack: portas[0].zBack, zFront: portas[0].zFront }}
          moduloW={W}
        />
      )}

      {gavetas.caixas.map((c: GavetaCaixa, i) => {
        const ext = extensaoFromTipo(c.tipoCorredica);
        const openZ = aberturaGaveta(c.boxDepth, ext, drawerPct);
        const liftY = liftYUndermount(c.tipoCorredica);
        const pecasGav = applyGavetaTemplate(bucket.drawerPecas[i], c, gavetaTpl);
        const fr = gavetas.frentes[i];
        const frenteRef = fr ? {
          xMin: fr.center[0] - fr.size[0] / 2,
          xMax: fr.center[0] + fr.size[0] / 2,
          yMin: fr.center[1] - fr.size[1] / 2,
          yMax: fr.center[1] + fr.size[1] / 2,
          zBack: fr.center[2] - fr.size[2] / 2,
          zFront: fr.center[2] + fr.size[2] / 2,
        } : null;
        return (
          <group key={`drawer-${i}`} position={[0, liftY * MM_TO_M, openZ * MM_TO_M]}>
            {pecasGav.map((p, j) => (
              <PecaMesh key={`dp-${j}`} p={p} explode={explode} center3D={center3D} matCorpo={materialCorpo} matFrente={materialFrente} />
            ))}
            {showHardware && <CorredicaGaveta caixa={c} />}
            {/* 4/5: puxador convencional/cava na frente da gaveta — acompanha a abertura */}
            {frenteRef && puxadorGavetas && (puxadorGavetas.tipo === "convencional" || puxadorGavetas.tipo === "cava") && (
              <PuxadorFrenteMesh pux={puxadorGavetas} pos={puxadorGavetasPos} frente={frenteRef} />
            )}
          </group>
        );
      })}

      {/* 4/5: PERFIS GOLA por gaveta — FIXOS à carcaça (fora do group animado) */}
      {puxadorGavetas && (puxadorGavetas.tipo === "gola_j" || puxadorGavetas.tipo === "gola_c") && gavetas.frentes.map((fr, i) => {
        const frenteRef = {
          xMin: fr.center[0] - fr.size[0] / 2,
          xMax: fr.center[0] + fr.size[0] / 2,
          yMin: fr.center[1] - fr.size[1] / 2,
          yMax: fr.center[1] + fr.size[1] / 2,
          zBack: fr.center[2] - fr.size[2] / 2,
          zFront: fr.center[2] + fr.size[2] / 2,
        };
        return (
          <PerfilGolaMesh key={`pg-${i}`} pux={puxadorGavetas} pos={puxadorGavetasPos} frente={frenteRef} moduloW={W} />
        );
      })}

      {showCotas && <CotasModulo W={W} H={H} D={D} />}

      {pes.posicoes.map((p, i) => {
        const pos: [number, number, number] = [p[0] * MM_TO_M, p[1] * MM_TO_M, p[2] * MM_TO_M];
        return (
          <mesh key={`pe-${i}`} position={pos} castShadow>
            <cylinderGeometry args={[0.015, 0.015, pes.altura * MM_TO_M, 16]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.55} metalness={0.2} />
          </mesh>
        );
      })}
    </>
  );
}

// ── [Roupeiros] Varões cromados + Portas de correr (folhas + calhas) ──
function RoupeiroExtras({ config, drawerPct }: { config: ModuleConfig; drawerPct: number }) {
  const varoes = useMemo(() => dimensoesVaroes(config), [config]);
  const correr = useMemo(() => dimensoesPortasCorrer(config), [config]);
  const W = config.dims.width;
  return (
    <>
      {/* Varões: cilindro horizontal Ø25 cromado + 2 suportes */}
      {varoes.map((v, i) => {
        const cx = (v.xMin + v.xMax) / 2 * MM_TO_M;
        const cy = v.cy * MM_TO_M;
        const cz = v.cz * MM_TO_M;
        const len = v.comprimento_mm * MM_TO_M;
        const r = v.diametro_mm / 2 * MM_TO_M;
        return (
          <group key={`varao-${i}`}>
            <mesh position={[cx, cy, cz]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[r, r, len, 24]} />
              <meshStandardMaterial color="#c8cbd0" roughness={0.2} metalness={0.95} />
            </mesh>
            {/* suportes nas laterais */}
            {[v.xMin, v.xMax].map((x, k) => (
              <mesh key={k} position={[x * MM_TO_M, cy, cz]} castShadow>
                <boxGeometry args={[0.012, r * 2.4, r * 2.4]} />
                <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.7} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Portas de correr: 2 calhas (sup/inf) + n folhas com animação de deslize */}
      {correr.folhas.length > 0 && (() => {
        const cr = config.portas.correr!;
        // deslize: drawerPct in [-1, +1] aproximadamente (reusa drawerPct ∈ [0,1])
        const desloc = Math.max(0, Math.min(1, drawerPct)) * (cr.nFolhas >= 2 ? (W - 2 * cr.folga) / cr.nFolhas : 0);
        return (
          <>
            {correr.calhas.map((k, i) => (
              <mesh key={`calha-${i}`}
                position={[W / 2 * MM_TO_M, k.cy * MM_TO_M, k.cz * MM_TO_M]} castShadow>
                <boxGeometry args={[k.comprimento * MM_TO_M, k.espessura * MM_TO_M, k.largura * MM_TO_M]} />
                <meshStandardMaterial color="#a8aaad" roughness={0.35} metalness={0.85} />
                <Edges threshold={15} color="#2b2d30" />
              </mesh>
            ))}
            {correr.folhas.map((f, i) => {
              // folhas pares (trilho 0) deslizam para a direita, ímpares (trilho 1) para a esquerda
              const sign = f.trilho === 0 ? 1 : -1;
              const cx = (f.cx + sign * desloc) * MM_TO_M;
              const cy = f.cy * MM_TO_M;
              const cz = f.cz * MM_TO_M;
              const sx = f.largura * MM_TO_M;
              const sy = f.altura * MM_TO_M;
              const sz = f.espessura * MM_TO_M;
              return (
                <group key={`folha-${i}`} position={[cx, cy, cz]}>
                  {/* painel (melamina ou espelho) */}
                  <mesh castShadow>
                    <boxGeometry args={[sx, sy, sz * 0.6]} />
                    {f.espelho ? (
                      <meshPhysicalMaterial color="#dde3e8" roughness={0.05} metalness={0.95}
                        clearcoat={1} clearcoatRoughness={0.05} />
                    ) : (
                      <meshStandardMaterial color="#E8E2D5" roughness={0.6} metalness={0.05} transparent opacity={0.92} />
                    )}
                    <Edges threshold={15} color="#2b2d30" />
                  </mesh>
                  {/* caixilho alumínio (4 perfis) */}
                  {[
                    { px: 0,        py:  sy / 2 - cr.perfilLarguraMm / 2 * MM_TO_M, sxP: sx, syP: cr.perfilLarguraMm * MM_TO_M },
                    { px: 0,        py: -sy / 2 + cr.perfilLarguraMm / 2 * MM_TO_M, sxP: sx, syP: cr.perfilLarguraMm * MM_TO_M },
                    { px: -sx / 2 + cr.perfilLarguraMm / 2 * MM_TO_M, py: 0, sxP: cr.perfilLarguraMm * MM_TO_M, syP: sy },
                    { px:  sx / 2 - cr.perfilLarguraMm / 2 * MM_TO_M, py: 0, sxP: cr.perfilLarguraMm * MM_TO_M, syP: sy },
                  ].map((perf, k) => (
                    <mesh key={k} position={[perf.px, perf.py, sz * 0.2]} castShadow>
                      <boxGeometry args={[perf.sxP, perf.syP, sz * 0.8]} />
                      <meshStandardMaterial color="#a8aaad" roughness={0.35} metalness={0.85} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </>
        );
      })()}
    </>
  );
}


// ── Cotas (Largura X, Altura Y, Profundidade Z) ──
export function cotasLabels(W: number, H: number, D: number) {
  return [
    { eixo: "L" as const, mm: Math.round(W) },
    { eixo: "A" as const, mm: Math.round(H) },
    { eixo: "P" as const, mm: Math.round(D) },
  ];
}

function CotaLinha({ a, b, label, color }: { a: [number, number, number]; b: [number, number, number]; label: string; color: string }) {
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  // setas como pontas cónicas
  const va = new Vector3(...a), vb = new Vector3(...b);
  const dir = vb.clone().sub(va).normalize();
  const tipLen = 0.02;
  const arrowA = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone());
  const arrowB = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().multiplyScalar(-1));
  const posA: [number, number, number] = [a[0] + dir.x * tipLen / 2, a[1] + dir.y * tipLen / 2, a[2] + dir.z * tipLen / 2];
  const posB: [number, number, number] = [b[0] - dir.x * tipLen / 2, b[1] - dir.y * tipLen / 2, b[2] - dir.z * tipLen / 2];
  return (
    <group>
      <Line points={[a, b]} color={color} lineWidth={1.6} />
      <mesh position={posA} quaternion={arrowA}>
        <coneGeometry args={[0.006, tipLen, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={posB} quaternion={arrowB}>
        <coneGeometry args={[0.006, tipLen, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={mid} center distanceFactor={1.6} zIndexRange={[10, 0]} pointerEvents="none">
        <div
          data-cota-label
          style={{
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            color: "#111",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function CotasModulo({ W, H, D }: { W: number; H: number; D: number }) {
  const off = 0.08; // 80mm de afastamento
  const wM = W * MM_TO_M, hM = H * MM_TO_M, dM = D * MM_TO_M;
  return (
    <group>
      {/* Largura (X) — em baixo, frente */}
      <CotaLinha
        a={[0, -off, dM + off]}
        b={[wM, -off, dM + off]}
        label={`L ${Math.round(W)}`}
        color="#d94a4a"
      />
      {/* Altura (Y) — lateral esquerda, frente */}
      <CotaLinha
        a={[-off, 0, dM + off]}
        b={[-off, hM, dM + off]}
        label={`A ${Math.round(H)}`}
        color="#4ab06a"
      />
      {/* Profundidade (Z) — em baixo, lateral esquerda */}
      <CotaLinha
        a={[-off, -off, 0]}
        b={[-off, -off, dM]}
        label={`P ${Math.round(D)}`}
        color="#4a7fd9"
      />
    </group>
  );
}

// ─── [B4] Canto diagonal — render pentagonal ───────────────────────────
const COR_MET = "#B8BCC0";
function CantoDiagonalCanvas({ config, doorAngleDeg, showHardware }: { config: ModuleConfig; doorAngleDeg: number; showHardware: boolean }) {
  const params = useMemo(() => {
    const cd = config.cantoDiagonal ?? { ladoEsq: 900, ladoDir: 900, profRetornoEsq: 560, profRetornoDir: 560 };
    const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
    return {
      ladoEsq: cd.ladoEsq, ladoDir: cd.ladoDir,
      profRetornoEsq: cd.profRetornoEsq, profRetornoDir: cd.profRetornoDir,
      altura: config.dims.height,
      espessuras: { lateral: e.lateral, tampo: e.tampo, base: e.base, frente: e.lateral },
    };
  }, [config]);
  const g = useMemo(() => geraCantoDiagonal(params), [params]);
  const { ladoEsq, ladoDir, profRetornoEsq, profRetornoDir, altura: H, espessuras: e } = params;

  // Painel pentagonal (tampo/base) via THREE.Shape + ExtrudeGeometry.
  const shapeGeom = useMemo(() => {
    const shape = new THREE.Shape();
    const fp = g.footprint;
    shape.moveTo(fp[0][0] * MM_TO_M, -fp[0][1] * MM_TO_M);
    for (let i = 1; i < fp.length; i++) shape.lineTo(fp[i][0] * MM_TO_M, -fp[i][1] * MM_TO_M);
    shape.closePath();
    return { shape, n: fp.length };
  }, [g]);

  const maxDim = Math.max(ladoEsq, ladoDir, H) * MM_TO_M;
  const target: [number, number, number] = [(ladoEsq / 2) * MM_TO_M, (H / 2) * MM_TO_M, (ladoDir / 2) * MM_TO_M];
  const camPos: [number, number, number] = [target[0] + maxDim * 1.2, target[1] + maxDim * 0.7, target[2] + maxDim * 1.2];

  // Frente diagonal: pivot em P2, ângulo = -atan2(dz,dx) - openAngle
  const P2 = g.footprint[2], P3 = g.footprint[3];
  const dx = P3[0] - P2[0], dz = P3[1] - P2[1];
  const angBase = Math.atan2(dz, dx);
  const openAng = (doorAngleDeg * Math.PI) / 180;
  const distFr = g.distFrenteDiagonal_mm;

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: camPos, fov: 35, near: 0.01, far: 100 }}
      style={{ background: "linear-gradient(180deg, #f4f3ef 0%, #dcdad3 100%)" }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <Suspense fallback={null}><Environment preset="apartment" /></Suspense>

      {/* Base pentagonal */}
      <mesh data-canto-base position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shapeGeom.shape, { depth: e.base * MM_TO_M, bevelEnabled: false }]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Tampo pentagonal */}
      <mesh data-canto-tampo position={[0, (H - e.tampo) * MM_TO_M, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shapeGeom.shape, { depth: e.tampo * MM_TO_M, bevelEnabled: false }]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>

      {/* Costas esquerda (X: 0..ladoEsq, Z=0) */}
      <mesh data-canto-costas position={[(ladoEsq / 2) * MM_TO_M, (H / 2) * MM_TO_M, (e.lateral / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[ladoEsq * MM_TO_M, H * MM_TO_M, e.lateral * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Costas direita (X=0, Z: 0..ladoDir) */}
      <mesh data-canto-costas position={[(e.lateral / 2) * MM_TO_M, (H / 2) * MM_TO_M, (ladoDir / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[e.lateral * MM_TO_M, H * MM_TO_M, ladoDir * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Retorno esquerdo (X=ladoEsq, Z: 0..profRetornoEsq) */}
      <mesh data-canto-retorno position={[(ladoEsq - e.lateral / 2) * MM_TO_M, (H / 2) * MM_TO_M, (profRetornoEsq / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[e.lateral * MM_TO_M, H * MM_TO_M, profRetornoEsq * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Retorno direito (Z=ladoDir, X: 0..profRetornoDir) */}
      <mesh data-canto-retorno position={[(profRetornoDir / 2) * MM_TO_M, (H / 2) * MM_TO_M, (ladoDir - e.lateral / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[profRetornoDir * MM_TO_M, H * MM_TO_M, e.lateral * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>

      {/* Frente diagonal (porta) — hinge em P2 */}
      <group position={[P2[0] * MM_TO_M, 0, P2[1] * MM_TO_M]} rotation={[0, -angBase - openAng, 0]}>
        <mesh data-canto-frente position={[(distFr / 2) * MM_TO_M, (H / 2) * MM_TO_M, (e.frente / 2) * MM_TO_M]} castShadow receiveShadow>
          <boxGeometry args={[distFr * MM_TO_M, H * MM_TO_M, e.frente * MM_TO_M]} />
          <meshStandardMaterial color="#D8D1C0" roughness={0.5} metalness={0.05} transparent opacity={0.92} />
          <Edges threshold={15} color={COR_ARESTA} />
        </mesh>
      </group>

      {/* Ferragens: minifix nas juntas costas↔retorno (símbolos simples) */}
      {showHardware && g.furos.filter(f => f.tipo === "minifix").map((f, i) => {
        // posicionar nas extremidades — simplificação visual
        const isEsq = /esq/.test(f.ref);
        const x = isEsq ? (ladoEsq - e.lateral) * MM_TO_M : e.lateral * MM_TO_M;
        const z = isEsq ? e.lateral * MM_TO_M : (ladoDir - e.lateral) * MM_TO_M;
        return (
          <mesh key={`mf-${i}`} position={[x, (H / 3) * MM_TO_M, z]}>
            <cylinderGeometry args={[0.006, 0.006, 0.014, 12]} />
            <meshStandardMaterial color={COR_MET} roughness={0.35} metalness={0.85} />
          </mesh>
        );
      })}

      <Grid position={[target[0], 0, target[2]]} args={[10, 10]} cellSize={0.1} cellThickness={0.6}
        sectionSize={1} sectionThickness={1} sectionColor="#7a7367" cellColor="#b5afa3"
        fadeDistance={15} fadeStrength={1} infiniteGrid />
      <OrbitControls target={target} enableDamping makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={["#d94a4a", "#4ab06a", "#4a7fd9"]} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}

// ─── [B5] Canto em L — render via Shape + Extrude ──────────────────
function CantoLCanvas({ config, doorAngleDeg, showHardware }: { config: ModuleConfig; doorAngleDeg: number; showHardware: boolean }) {
  const params = useMemo(() => {
    const cl = config.cantoL ?? { ladoEsq: 900, ladoDir: 900, profundidade: 560 };
    const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
    return {
      ladoEsq: cl.ladoEsq, ladoDir: cl.ladoDir, profundidade: cl.profundidade,
      altura: config.dims.height,
      espessuras: { lateral: e.lateral, tampo: e.tampo, base: e.base, frente: e.lateral },
    };
  }, [config]);
  const g = useMemo(() => geraCantoL(params), [params]);
  const { ladoEsq, ladoDir, profundidade: d, altura: H, espessuras: e } = params;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const fp = g.footprint;
    s.moveTo(fp[0][0] * MM_TO_M, -fp[0][1] * MM_TO_M);
    for (let i = 1; i < fp.length; i++) s.lineTo(fp[i][0] * MM_TO_M, -fp[i][1] * MM_TO_M);
    s.closePath();
    return s;
  }, [g]);

  const maxDim = Math.max(ladoEsq, ladoDir, H) * MM_TO_M;
  const target: [number, number, number] = [(ladoEsq / 2) * MM_TO_M, (H / 2) * MM_TO_M, (ladoDir / 2) * MM_TO_M];
  const camPos: [number, number, number] = [target[0] + maxDim * 1.2, target[1] + maxDim * 0.7, target[2] + maxDim * 1.2];

  const openAng = (doorAngleDeg * Math.PI) / 180;
  const compEsq = Math.max(0, ladoEsq - d);
  const compDir = Math.max(0, ladoDir - d);

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: camPos, fov: 35, near: 0.01, far: 100 }}
      style={{ background: "linear-gradient(180deg, #f4f3ef 0%, #dcdad3 100%)" }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <Suspense fallback={null}><Environment preset="apartment" /></Suspense>

      {/* Base em L */}
      <mesh data-canto-base position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: e.base * MM_TO_M, bevelEnabled: false }]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Tampo em L */}
      <mesh data-canto-tampo position={[0, (H - e.tampo) * MM_TO_M, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: e.tampo * MM_TO_M, bevelEnabled: false }]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>

      {/* Costas esq (parede esq, Z=0) */}
      <mesh data-canto-costas position={[(ladoEsq / 2) * MM_TO_M, (H / 2) * MM_TO_M, (e.lateral / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[ladoEsq * MM_TO_M, H * MM_TO_M, e.lateral * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Costas dir (parede dir, X=0) */}
      <mesh data-canto-costas position={[(e.lateral / 2) * MM_TO_M, (H / 2) * MM_TO_M, (ladoDir / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[e.lateral * MM_TO_M, H * MM_TO_M, ladoDir * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Retorno braço esq (X=ladoEsq, Z∈[0,d]) */}
      <mesh data-canto-retorno position={[(ladoEsq - e.lateral / 2) * MM_TO_M, (H / 2) * MM_TO_M, (d / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[e.lateral * MM_TO_M, H * MM_TO_M, d * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Retorno braço dir (Z=ladoDir, X∈[0,d]) */}
      <mesh data-canto-retorno position={[(d / 2) * MM_TO_M, (H / 2) * MM_TO_M, (ladoDir - e.lateral / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[d * MM_TO_M, H * MM_TO_M, e.lateral * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>

      {/* Frente braço esq (porta) — face interior Z=d, X∈[d,ladoEsq]; hinge em X=ladoEsq */}
      {compEsq > 0 && (
        <group position={[ladoEsq * MM_TO_M, 0, d * MM_TO_M]} rotation={[0, openAng, 0]}>
          <mesh data-canto-frente position={[-(compEsq / 2) * MM_TO_M, (H / 2) * MM_TO_M, (e.frente / 2) * MM_TO_M]} castShadow receiveShadow>
            <boxGeometry args={[compEsq * MM_TO_M, H * MM_TO_M, e.frente * MM_TO_M]} />
            <meshStandardMaterial color="#D8D1C0" roughness={0.5} metalness={0.05} transparent opacity={0.92} />
            <Edges threshold={15} color={COR_ARESTA} />
          </mesh>
        </group>
      )}
      {/* Frente braço dir (porta) — face interior X=d, Z∈[d,ladoDir]; hinge em Z=ladoDir */}
      {compDir > 0 && (
        <group position={[d * MM_TO_M, 0, ladoDir * MM_TO_M]} rotation={[0, Math.PI / 2 - openAng, 0]}>
          <mesh data-canto-frente position={[(compDir / 2) * MM_TO_M, (H / 2) * MM_TO_M, (e.frente / 2) * MM_TO_M]} castShadow receiveShadow>
            <boxGeometry args={[compDir * MM_TO_M, H * MM_TO_M, e.frente * MM_TO_M]} />
            <meshStandardMaterial color="#D8D1C0" roughness={0.5} metalness={0.05} transparent opacity={0.92} />
            <Edges threshold={15} color={COR_ARESTA} />
          </mesh>
        </group>
      )}

      {showHardware && g.furos.filter(f => f.tipo === "minifix").map((f, i) => {
        const isEsq = /esq/.test(f.ref);
        const x = isEsq ? (ladoEsq - e.lateral) * MM_TO_M : e.lateral * MM_TO_M;
        const z = isEsq ? e.lateral * MM_TO_M : (ladoDir - e.lateral) * MM_TO_M;
        return (
          <mesh key={`mf-${i}`} position={[x, (H / 3) * MM_TO_M, z]}>
            <cylinderGeometry args={[0.006, 0.006, 0.014, 12]} />
            <meshStandardMaterial color={COR_MET} roughness={0.35} metalness={0.85} />
          </mesh>
        );
      })}

      <Grid position={[target[0], 0, target[2]]} args={[10, 10]} cellSize={0.1} cellThickness={0.6}
        sectionSize={1} sectionThickness={1} sectionColor="#7a7367" cellColor="#b5afa3"
        fadeDistance={15} fadeStrength={1} infiniteGrid />
      <OrbitControls target={target} enableDamping makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={["#d94a4a", "#4ab06a", "#4a7fd9"]} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}

// ─── [B5] Canto cego — caixa retangular + filler frontal + porta útil ──
function CantoCegoCanvas({ config, doorAngleDeg, showHardware: _showHardware }: { config: ModuleConfig; doorAngleDeg: number; showHardware: boolean }) {
  const params = useMemo(() => {
    const cc = config.cantoCego ?? { largura: 900, profundidade: 560, larguraFiller: 100, larguraPortaUtil: 380 };
    const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
    return {
      largura: cc.largura, profundidade: cc.profundidade,
      larguraFiller: cc.larguraFiller, larguraPortaUtil: cc.larguraPortaUtil,
      altura: config.dims.height,
      espessuras: { lateral: e.lateral, tampo: e.tampo, base: e.base, frente: e.lateral },
    };
  }, [config]);
  const _g = useMemo(() => geraCantoCego(params), [params]);
  const { largura: W, profundidade: D, altura: H, larguraFiller, larguraPortaUtil, espessuras: e } = params;

  const maxDim = Math.max(W, H, D) * MM_TO_M;
  const target: [number, number, number] = [(W / 2) * MM_TO_M, (H / 2) * MM_TO_M, (D / 2) * MM_TO_M];
  const camPos: [number, number, number] = [target[0] + maxDim * 1.2, target[1] + maxDim * 0.6, target[2] + maxDim * 1.4];

  const openAng = (doorAngleDeg * Math.PI) / 180;

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: camPos, fov: 35, near: 0.01, far: 100 }}
      style={{ background: "linear-gradient(180deg, #f4f3ef 0%, #dcdad3 100%)" }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <Suspense fallback={null}><Environment preset="apartment" /></Suspense>

      {/* Laterais */}
      <mesh position={[(e.lateral / 2) * MM_TO_M, (H / 2) * MM_TO_M, (D / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[e.lateral * MM_TO_M, H * MM_TO_M, D * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      <mesh position={[(W - e.lateral / 2) * MM_TO_M, (H / 2) * MM_TO_M, (D / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[e.lateral * MM_TO_M, H * MM_TO_M, D * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Tampo */}
      <mesh position={[(W / 2) * MM_TO_M, (H - e.tampo / 2) * MM_TO_M, (D / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[(W - 2 * e.lateral) * MM_TO_M, e.tampo * MM_TO_M, D * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>
      {/* Base */}
      <mesh position={[(W / 2) * MM_TO_M, (e.base / 2) * MM_TO_M, (D / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[(W - 2 * e.lateral) * MM_TO_M, e.base * MM_TO_M, D * MM_TO_M]} />
        <meshStandardMaterial color={COR_MELAMINA} roughness={0.7} metalness={0.02} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>

      {/* Filler frontal (sem abertura) */}
      <mesh position={[(larguraFiller / 2) * MM_TO_M, (H / 2) * MM_TO_M, (D - e.frente / 2) * MM_TO_M]} castShadow receiveShadow>
        <boxGeometry args={[larguraFiller * MM_TO_M, H * MM_TO_M, e.frente * MM_TO_M]} />
        <meshStandardMaterial color="#C9C2B0" roughness={0.6} metalness={0.05} />
        <Edges threshold={15} color={COR_ARESTA} />
      </mesh>

      {/* Porta útil — hinge no lado do filler (X=larguraFiller) */}
      {larguraPortaUtil > 0 && (
        <group position={[larguraFiller * MM_TO_M, 0, D * MM_TO_M]} rotation={[0, -openAng, 0]}>
          <mesh position={[(larguraPortaUtil / 2) * MM_TO_M, (H / 2) * MM_TO_M, (e.frente / 2) * MM_TO_M]} castShadow receiveShadow>
            <boxGeometry args={[larguraPortaUtil * MM_TO_M, H * MM_TO_M, e.frente * MM_TO_M]} />
            <meshStandardMaterial color="#D8D1C0" roughness={0.5} metalness={0.05} transparent opacity={0.92} />
            <Edges threshold={15} color={COR_ARESTA} />
          </mesh>
        </group>
      )}

      <Grid position={[target[0], 0, target[2]]} args={[10, 10]} cellSize={0.1} cellThickness={0.6}
        sectionSize={1} sectionThickness={1} sectionColor="#7a7367" cellColor="#b5afa3"
        fadeDistance={15} fadeStrength={1} infiniteGrid />
      <OrbitControls target={target} enableDamping makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={["#d94a4a", "#4ab06a", "#4a7fd9"]} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}
