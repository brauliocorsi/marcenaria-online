import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport, Environment } from "@react-three/drei";
import type { ModuleConfig, PecaGeo } from "@/lib/engines/module";
import { calcularGeometria } from "@/lib/engines/module";

const MM_TO_M = 0.001;
const COR_MELAMINA = "#E8E2D5";
const COR_ARESTA = "#3a3a3a";

interface Module3DProps {
  config: ModuleConfig;
  explode?: number; // 0..1
}

function PecaMesh({ p, explode, center3D }: { p: PecaGeo; explode: number; center3D: [number, number, number] }) {
  // deslocamento radial face ao centro do módulo
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

  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={COR_MELAMINA} roughness={0.75} metalness={0.02} />
      <Edges threshold={15} color={COR_ARESTA} />
    </mesh>
  );
}

export function Module3D({ config, explode = 0 }: Module3DProps) {
  const pecas = useMemo(() => calcularGeometria(config), [config]);
  const { W, H, D } = useMemo(
    () => ({ W: config.dims.width, H: config.dims.height, D: config.dims.depth }),
    [config.dims.width, config.dims.height, config.dims.depth],
  );
  const center3D: [number, number, number] = [W / 2, H / 2, D / 2];

  // câmara em vista 3/4 frontal
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
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.25} />

      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      {pecas.map((p, i) => (
        <PecaMesh key={i} p={p} explode={explode} center3D={center3D} />
      ))}

      <Grid
        position={[target[0], 0, target[2]]}
        args={[10, 10]}
        cellSize={0.1}
        cellThickness={0.6}
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#7a7367"
        cellColor="#b5afa3"
        fadeDistance={15}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls target={target} enableDamping makeDefault />

      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={["#d94a4a", "#4ab06a", "#4a7fd9"]} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}
