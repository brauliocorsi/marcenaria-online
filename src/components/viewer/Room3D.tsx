import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport, Environment } from "@react-three/drei";
import {
  calcularAberturasDaParede,
  comprimentoParede,
  type RoomConfig,
  type ParedeId,
  type AberturaCalculada,
} from "@/lib/engines/ambiente";
import { ModuleScene } from "./Module3D";
import { transformColocacao, type ParedeColocavel } from "@/lib/engines/ambiente-modulos";
import { DEFAULT_MODULE_CONFIG, normalizarConfig, type ModuleConfig } from "@/lib/engines/module";

const MM = 0.001;

const COR_ARESTA = "#3a3a3a";
const COR_MOLDURA = "#E8E4DB";
const COR_VIDRO = "#a8c7e8";
const FRAME_W = 30; // mm

export interface PlacedModule {
  id: string;
  module: {
    id: string;
    name: string;
    width_mm: number;
    height_mm: number;
    depth_mm: number;
    config: any;
    material_id?: string | null;
  };
  parede: ParedeColocavel;
  x_offset_mm: number;
  altura_chao_mm: number;
  rotacao_deg: number;
}

interface Room3DProps {
  room: RoomConfig;
  placements?: PlacedModule[];
  showHardware?: boolean;
}

interface WallTransform {
  position: [number, number, number];
  rotation: [number, number, number];
}

function transformParede(room: RoomConfig, id: ParedeId): WallTransform {
  const { largura: L, profundidade: P, espessuraParede: E } = room;
  switch (id) {
    case "fundo":
      return { position: [0, 0, -E * MM], rotation: [0, 0, 0] };
    case "frente":
      return { position: [0, 0, P * MM], rotation: [0, 0, 0] };
    case "esquerda":
      return { position: [-E * MM, 0, P * MM], rotation: [0, Math.PI / 2, 0] };
    case "direita":
      return { position: [(L + E) * MM, 0, 0], rotation: [0, -Math.PI / 2, 0] };
  }
}

function WallMesh({
  comp, altura, esp, aberturas,
}: { comp: number; altura: number; esp: number; aberturas: AberturaCalculada[] }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const W = comp * MM, H = altura * MM;
    s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, H); s.lineTo(0, H); s.lineTo(0, 0);
    aberturas.forEach((ab) => {
      if (!ab.valido) return;
      const x0 = ab.u * MM, y0 = ab.v * MM;
      const x1 = (ab.u + ab.largura) * MM, y1 = (ab.v + ab.altura) * MM;
      const h = new THREE.Path();
      h.moveTo(x0, y0); h.lineTo(x1, y0); h.lineTo(x1, y1); h.lineTo(x0, y1); h.lineTo(x0, y0);
      s.holes.push(h);
    });
    return s;
  }, [comp, altura, aberturas]);

  const extrudeArgs = useMemo(() => ({ depth: esp * MM, bevelEnabled: false }), [esp]);

  return (
    <>
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeArgs]} />
        <meshStandardMaterial color={COR_PAREDE} side={THREE.DoubleSide} />
        <Edges color={COR_ARESTA} threshold={20} />
      </mesh>
      {aberturas.filter((a) => a.valido).map((ab) => (
        <AberturaDeco key={ab.id} ab={ab} esp={esp} />
      ))}
    </>
  );
}

function AberturaDeco({ ab, esp }: { ab: AberturaCalculada; esp: number }) {
  const E = esp * MM;
  const W = ab.largura * MM, H = ab.altura * MM;
  const fw = FRAME_W * MM;
  const cx = ab.u * MM + W / 2;
  const cy = ab.v * MM + H / 2;
  const cz = E / 2;
  return (
    <group position={[cx, cy, cz]}>
      <mesh position={[0, -H / 2 + fw / 2, 0]}><boxGeometry args={[W, fw, E]} /><meshStandardMaterial color={COR_MOLDURA} /></mesh>
      <mesh position={[0, H / 2 - fw / 2, 0]}><boxGeometry args={[W, fw, E]} /><meshStandardMaterial color={COR_MOLDURA} /></mesh>
      <mesh position={[-W / 2 + fw / 2, 0, 0]}><boxGeometry args={[fw, H - 2 * fw, E]} /><meshStandardMaterial color={COR_MOLDURA} /></mesh>
      <mesh position={[W / 2 - fw / 2, 0, 0]}><boxGeometry args={[fw, H - 2 * fw, E]} /><meshStandardMaterial color={COR_MOLDURA} /></mesh>
      {ab.tipo === "janela" && (
        <mesh><boxGeometry args={[W - 2 * fw, H - 2 * fw, E * 0.1]} /><meshStandardMaterial color={COR_VIDRO} transparent opacity={0.25} /></mesh>
      )}
    </group>
  );
}

function moduleConfigFromRow(row: PlacedModule["module"]): ModuleConfig {
  const base = (row.config && Object.keys(row.config).length > 0)
    ? { ...DEFAULT_MODULE_CONFIG, ...row.config, dims: { width: row.width_mm, height: row.height_mm, depth: row.depth_mm } }
    : { ...DEFAULT_MODULE_CONFIG, dims: { width: row.width_mm, height: row.height_mm, depth: row.depth_mm } };
  return normalizarConfig(base as ModuleConfig);
}

function PlacedModuleNode({ p, sala, showHardware }: { p: PlacedModule; sala: { largura: number; profundidade: number; altura: number }; showHardware: boolean }) {
  const cfg = useMemo(() => moduleConfigFromRow(p.module), [p.module]);
  const t = useMemo(() => transformColocacao(
    { parede: p.parede, x_offset_mm: p.x_offset_mm, altura_chao_mm: p.altura_chao_mm, rotacao_deg: p.rotacao_deg },
    { width: cfg.dims.width, height: cfg.dims.height, depth: cfg.dims.depth },
    sala,
  ), [p, cfg, sala]);
  return (
    <group position={[t.position[0] * MM, t.position[1] * MM, t.position[2] * MM]} rotation={[0, t.rotationY, 0]}>
      <ModuleScene config={cfg} showHardware={showHardware} />
    </group>
  );
}

export function Room3D({ room, placements = [], showHardware = false }: Room3DProps) {
  const L = room.largura * MM;
  const P = room.profundidade * MM;
  const A = room.altura * MM;
  const paredes: ParedeId[] = ["fundo", "frente", "esquerda", "direita"];

  const camDist = Math.max(L, P, A) * 1.8;
  const cameraPos: [number, number, number] = [L + camDist * 0.4, A * 0.9 + camDist * 0.3, P + camDist * 0.4];

  return (
    <div className="h-full w-full">
      <Canvas shadows camera={{ position: cameraPos, fov: 45, near: 0.01, far: 200 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#f5f5f4"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[L * 1.5, A * 2, P * 1.5]} intensity={0.9} castShadow />
        <Suspense fallback={null}><Environment preset="apartment" /></Suspense>

        <Suspense fallback={null}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, P / 2]} receiveShadow>
            <planeGeometry args={[L, P]} />
            <meshStandardMaterial color={COR_CHAO} />
          </mesh>
          <Grid
            position={[L / 2, 0.001, P / 2]}
            args={[L, P]}
            cellSize={0.1}
            cellColor="#cbc8bf"
            sectionSize={1}
            sectionColor="#9c9890"
            fadeDistance={Math.max(L, P) * 3}
            infiniteGrid={false}
          />

          {paredes.map((pid) => {
            if (!room.paredesVisiveis[pid]) return null;
            const t = transformParede(room, pid);
            const comp = comprimentoParede(room, pid);
            const aberturas = calcularAberturasDaParede(room, pid);
            return (
              <group key={pid} position={t.position} rotation={t.rotation}>
                <WallMesh comp={comp} altura={room.altura} esp={room.espessuraParede} aberturas={aberturas} />
              </group>
            );
          })}

          {placements.map((p) => (
            <PlacedModuleNode
              key={p.id}
              p={p}
              sala={{ largura: room.largura, profundidade: room.profundidade, altura: room.altura }}
              showHardware={showHardware}
            />
          ))}
        </Suspense>

        <OrbitControls target={[L / 2, A / 2, P / 2]} enableDamping maxPolarAngle={Math.PI / 2} />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={["#e85d3a", "#16a34a", "#3b82f6"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
