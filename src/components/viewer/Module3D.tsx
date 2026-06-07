import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport, Environment, Line, Html } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import type { ModuleConfig, PecaGeo, PortaDim, GavetaCaixa } from "@/lib/engines/module";
import {
  calcularGeometria, calcularPes, dimensoesPortas, dimensoesGavetas, resolverEspessuras,
} from "@/lib/engines/module";
import { aberturaGaveta, anguloPortaRad, extensaoFromTipo, pivotPorta } from "@/lib/engines/hardware-anim";
import type { Furo } from "@/lib/engines/drilling";
import {
  CavilhaModel, CorredicaCarcaca, CorredicaGaveta, DobradicaCaneco, DobradicaChapa,
  MinifixCorpo, MinifixPerno, PinoPrateleiraModel, liftYUndermount,
} from "./hardware/HardwareMeshes";

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

interface Module3DProps {
  config: ModuleConfig;
  explode?: number;
  furos?: Furo[];
  showHardware?: boolean;
  doorAngleDeg?: number;
  drawerPct?: number;
}

function PecaMesh({ p, explode, center3D }: { p: PecaGeo; explode: number; center3D: [number, number, number] }) {
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
  const color = isPorta || isGavFrente ? "#D8D1C0" : isCaixa ? "#B8AE96" : isTamp ? "#DCD5C4" : COR_MELAMINA;
  const opacity = isPorta || isGavFrente ? 0.85 : isCaixa ? 0.78 : 0.92;
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.02} transparent opacity={opacity} />
      <Edges threshold={15} color={COR_ARESTA} />
    </mesh>
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

export function Module3D({ config, explode = 0, furos = [], showHardware = false, doorAngleDeg = 0, drawerPct = 0 }: Module3DProps) {
  const pecas = useMemo(() => calcularGeometria(config), [config]);
  const pes = useMemo(() => calcularPes(config), [config]);
  const portas = useMemo(() => dimensoesPortas(config), [config]);
  const gavetas = useMemo(() => dimensoesGavetas(config), [config]);
  const eRes = useMemo(() => resolverEspessuras(config.espessuraPadrao, config.espessuras), [config]);

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

      {/* ── Estrutura (estática) ── */}
      {bucket.structPecas.map((p, i) => (
        <PecaMesh key={`s-${i}`} p={p} explode={explode} center3D={center3D} />
      ))}
      {bucket.structFuros.map((f, i) => <FuroMesh key={`sf-${i}`} f={f} />)}

      {/* Ferragens estruturais: cavilhas (1× por junta), minifix corpo/perno, pinos, chapas */}
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

      {/* Corrediças (carcaça fixa) */}
      {showHardware && gavetas.caixas.map((c, i) => (
        <CorredicaCarcaca key={`crc-c-${i}`} caixa={c} ladoXmin={eRes.lateral} ladoXmax={W - eRes.lateral} />
      ))}

      {/* ── Portas (animadas) ── */}
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
            {/* puxador segue a porta */}
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

      {/* ── Gavetas (animadas — translação em +Z) ── */}
      {gavetas.caixas.map((c: GavetaCaixa, i) => {
        const ext = extensaoFromTipo(c.tipoCorredica);
        const openZ = aberturaGaveta(c.boxDepth, ext, drawerPct);
        return (
          <group key={`drawer-${i}`} position={[0, 0, openZ * MM_TO_M]}>
            {bucket.drawerPecas[i].map((p, j) => (
              <PecaMesh key={`dp-${j}`} p={p} explode={explode} center3D={center3D} />
            ))}
            {showHardware && <CorredicaGaveta caixa={c} />}
          </group>
        );
      })}

      {/* Pés */}
      {pes.posicoes.map((p, i) => {
        const pos: [number, number, number] = [p[0] * MM_TO_M, p[1] * MM_TO_M, p[2] * MM_TO_M];
        return (
          <mesh key={`pe-${i}`} position={pos} castShadow>
            <cylinderGeometry args={[0.015, 0.015, pes.altura * MM_TO_M, 16]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.55} metalness={0.2} />
          </mesh>
        );
      })}

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
