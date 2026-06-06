import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { calcularParedes, type RoomConfig } from "@/lib/engines/ambiente";

const MM_TO_M = 0.001;
const COR_CHAO = "#EDEAE3";
const COR_PAREDE = "#F0EDE6";
const COR_ARESTA = "#3a3a3a";

interface Room3DProps {
  room: RoomConfig;
}

export function Room3D({ room }: Room3DProps) {
  const paredes = useMemo(() => calcularParedes(room), [room]);
  const L = room.largura * MM_TO_M;
  const P = room.profundidade * MM_TO_M;
  const A = room.altura * MM_TO_M;

  const camDist = Math.max(L, P, A) * 1.8;
  const cameraPos: [number, number, number] = [L + camDist * 0.4, A * 0.9 + camDist * 0.3, P + camDist * 0.4];

  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: cameraPos, fov: 45, near: 0.01, far: 200 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#f5f5f4"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[L * 1.5, A * 2, P * 1.5]} intensity={0.9} castShadow />

        <Suspense fallback={null}>
          {/* Chão */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[L / 2, 0, P / 2]}
            receiveShadow
          >
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

          {/* Paredes */}
          {paredes.map((parede) => {
            if (!room.paredesVisiveis[parede.id]) return null;
            const center: [number, number, number] = [
              parede.center[0] * MM_TO_M,
              parede.center[1] * MM_TO_M,
              parede.center[2] * MM_TO_M,
            ];
            const size: [number, number, number] = [
              parede.size[0] * MM_TO_M,
              parede.size[1] * MM_TO_M,
              parede.size[2] * MM_TO_M,
            ];
            return (
              <mesh key={parede.id} position={center} castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color={COR_PAREDE} />
                <Edges color={COR_ARESTA} threshold={15} />
              </mesh>
            );
          })}
        </Suspense>

        <OrbitControls
          target={[L / 2, A / 2, P / 2]}
          enableDamping
          maxPolarAngle={Math.PI / 2}
        />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={["#e85d3a", "#16a34a", "#3b82f6"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
