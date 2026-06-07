import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport, Environment, Line, Html } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import type { ModuleConfig, PecaGeo, PortaDim, GavetaCaixa } from "@/lib/engines/module";
import {
  calcularGeometria, calcularPes, dimensoesPortas, dimensoesGavetas, resolverEspessuras,
  pecasPortaAluminio,
} from "@/lib/engines/module";
import { aberturaGaveta, anguloPortaRad, extensaoFromTipo, pivotPorta } from "@/lib/engines/hardware-anim";
import type { Furo } from "@/lib/engines/drilling";
import {
  CavilhaModel, CorredicaCarcaca, CorredicaGaveta, DobradicaCaneco, DobradicaChapa,
  MinifixCorpo, MinifixPerno, PinoPrateleiraModel, liftYUndermount,
} from "./hardware/HardwareMeshes";
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
      />

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
  config, explode = 0, furos = [], showHardware = false, doorAngleDeg = 0, drawerPct = 0, showCotas = false, gavetaTemplates,
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
    <ModuleSceneInner
      bucket={bucket} chapasByPorta={chapasByPorta} portas={portas} gavetas={gavetas}
      gavetaTpl={gavetaTpl} eRes={eRes} pes={pes} explode={explode} center3D={center3D}
      W={W} H={H} D={D} showHardware={showHardware} doorAngleDeg={doorAngleDeg}
      drawerPct={drawerPct} showCotas={showCotas}
    />
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
}) {
  return (
    <>
      {bucket.structPecas.map((p, i) => (
        <PecaMesh key={`s-${i}`} p={p} explode={explode} center3D={center3D} />
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
        return (
          <group key={`door-${i}`} position={[pivotX * MM_TO_M, 0, pivotZ * MM_TO_M]} rotation={[0, angle, 0]}>
            {peca && (
              <PecaMesh
                p={translatePeca(peca, pivotX, 0, pivotZ)}
                explode={explode}
                center3D={[center3D[0] - pivotX, center3D[1], center3D[2] - pivotZ]}
              />
            )}
            {canecos.map((f, j) => <FuroMesh key={`df-${j}`} f={translateFuro(f, pivotX, 0, pivotZ)} />)}
            {showHardware && canecos.map((f, j) => <DobradicaCaneco key={`dc-${j}`} f={translateFuro(f, pivotX, 0, pivotZ)} />)}
            {(() => {
              const xPux = pd.ladoDobradicas === "esquerda" ? pd.xMax : pd.xMin;
              const pos: [number, number, number] = [(xPux - pivotX) * MM_TO_M, pd.cy * MM_TO_M, (pd.zFront - pivotZ) * MM_TO_M + 0.005];
              return (
                <mesh position={pos}>
                  <sphereGeometry args={[0.008, 16, 16]} />
                  <meshStandardMaterial color="#d94a4a" roughness={0.4} metalness={0.3} />
                </mesh>
              );
            })()}
          </group>
        );
      })}

      {gavetas.caixas.map((c: GavetaCaixa, i) => {
        const ext = extensaoFromTipo(c.tipoCorredica);
        const openZ = aberturaGaveta(c.boxDepth, ext, drawerPct);
        const liftY = liftYUndermount(c.tipoCorredica);
        const pecasGav = applyGavetaTemplate(bucket.drawerPecas[i], c, gavetaTpl);
        return (
          <group key={`drawer-${i}`} position={[0, liftY * MM_TO_M, openZ * MM_TO_M]}>
            {pecasGav.map((p, j) => (
              <PecaMesh key={`dp-${j}`} p={p} explode={explode} center3D={center3D} />
            ))}
            {showHardware && <CorredicaGaveta caixa={c} />}
          </group>
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
