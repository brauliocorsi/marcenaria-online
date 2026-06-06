import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport, Environment } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import type { ModuleConfig, PecaGeo } from "@/lib/engines/module";
import { calcularGeometria, calcularPes, dimensoesPortas } from "@/lib/engines/module";
import type { Furo } from "@/lib/engines/drilling";

const MM_TO_M = 0.001;
const COR_MELAMINA = "#E8E2D5";
const COR_ARESTA = "#3a3a3a";
const COR_POR_TIPO: Record<string, string> = {
  minifix_corpo: "#e08a2a",
  minifix_perno: "#3b82f6",
  cavilha:       "#16a34a",
  parafuso:      "#6b7280",
  dobradica:     "#1a1a1a",
};

interface Module3DProps {
  config: ModuleConfig;
  explode?: number;
  furos?: Furo[];
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
  const { pos, dir, q, len, r } = useMemo(() => {
    const d = new Vector3(f.dir[0], f.dir[1], f.dir[2]).normalize();
    const q = new Quaternion().setFromUnitVectors(UP, d);
    const len = f.profundidade * MM_TO_M;
    const r = (f.diametro / 2) * MM_TO_M;
    // centro do cilindro = pos + dir * (prof/2)
    const cx = (f.pos[0] + f.dir[0] * f.profundidade / 2) * MM_TO_M;
    const cy = (f.pos[1] + f.dir[1] * f.profundidade / 2) * MM_TO_M;
    const cz = (f.pos[2] + f.dir[2] * f.profundidade / 2) * MM_TO_M;
    return { pos: [cx, cy, cz] as [number, number, number], dir: d, q, len, r };
  }, [f]);
  void dir;
  const color = COR_POR_TIPO[f.tipo_furo] ?? "#1a1a1a";
  return (
    <mesh position={pos} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

export function Module3D({ config, explode = 0, furos = [] }: Module3DProps) {
  const pecas = useMemo(() => calcularGeometria(config), [config]);
  const pes = useMemo(() => calcularPes(config), [config]);
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

      {pecas.map((p, i) => (
        <PecaMesh key={i} p={p} explode={explode} center3D={center3D} />
      ))}

      {furos.map((f, i) => <FuroMesh key={i} f={f} />)}

      {dimensoesPortas(config).map((p, i) => {
        // marcador esférico no lado oposto às dobradiças (lado do puxador), a meia altura
        const xPux = p.ladoDobradicas === "esquerda" ? p.xMax : p.xMin;
        const pos: [number, number, number] = [xPux * MM_TO_M, p.cy * MM_TO_M, p.zFront * MM_TO_M + 0.005];
        return (
          <mesh key={`pux-${i}`} position={pos}>
            <sphereGeometry args={[0.008, 16, 16]} />
            <meshStandardMaterial color="#d94a4a" roughness={0.4} metalness={0.3} />
          </mesh>
        );
      })}

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
