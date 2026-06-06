// Modelos 3D simplificados de ferragens (Fase 4H).
// Geometria reconhecível, cor metálica salvo indicado.
// Posições/coords em mm; convertemos para metros aqui dentro.
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import type { Furo } from "@/lib/engines/drilling";
import type { GavetaCaixa } from "@/lib/engines/module";

const MM = 0.001;
const COLOR_METAL = "#9AA0A6";
const COLOR_WOOD = "#C9A66B";
const UP = new Vector3(0, 1, 0);

function useDirQuat(d: [number, number, number]) {
  return useMemo(() => {
    const v = new Vector3(d[0], d[1], d[2]).normalize();
    return new Quaternion().setFromUnitVectors(UP, v);
  }, [d[0], d[1], d[2]]); // eslint-disable-line react-hooks/exhaustive-deps
}

function shiftedPos(f: Furo, len: number): [number, number, number] {
  return [
    (f.pos[0] + (f.dir[0] * len) / 2) * MM,
    (f.pos[1] + (f.dir[1] * len) / 2) * MM,
    (f.pos[2] + (f.dir[2] * len) / 2) * MM,
  ];
}

export function MinifixCorpo({ f }: { f: Furo }) {
  const h = 12, r = 7.5;
  const q = useDirQuat(f.dir);
  return (
    <mesh position={shiftedPos(f, h)} quaternion={q}>
      <cylinderGeometry args={[r * MM, r * MM, h * MM, 24]} />
      <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.25} />
    </mesh>
  );
}

export function MinifixPerno({ f }: { f: Furo }) {
  const len = 32, r = 3;
  const q = useDirQuat(f.dir);
  return (
    <mesh position={shiftedPos(f, len)} quaternion={q}>
      <cylinderGeometry args={[r * MM, r * MM, len * MM, 14]} />
      <meshStandardMaterial color={COLOR_METAL} metalness={0.8} roughness={0.3} />
    </mesh>
  );
}

export function CavilhaModel({ f }: { f: Furo }) {
  // cavilha atravessa a junta — comprimento ≈ 2× profundidade
  const len = Math.max(20, f.profundidade * 2 - 2);
  const r = 4;
  const q = useDirQuat(f.dir);
  return (
    <mesh position={[f.pos[0] * MM, f.pos[1] * MM, f.pos[2] * MM]} quaternion={q}>
      <cylinderGeometry args={[r * MM, r * MM, len * MM, 14]} />
      <meshStandardMaterial color={COLOR_WOOD} roughness={0.75} />
    </mesh>
  );
}

export function PinoPrateleiraModel({ f }: { f: Furo }) {
  const len = 11, r = 2.5;
  const q = useDirQuat(f.dir);
  return (
    <mesh position={shiftedPos(f, len)} quaternion={q}>
      <cylinderGeometry args={[r * MM, r * MM, len * MM, 12]} />
      <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.25} />
    </mesh>
  );
}

export function DobradicaCaneco({ f }: { f: Furo }) {
  // Caneco Ø35 (h=12) + braço (box ~ 50×20×12) saindo para -dir (para dentro do módulo).
  const r = 17.5, h = 12;
  const q = useDirQuat(f.dir);
  // braço como segundo cilindro+box num group, simplificado: uma box atrás do caneco
  const bracoLen = 50, bracoW = 22, bracoH = 14;
  return (
    <group>
      <mesh position={shiftedPos(f, h)} quaternion={q}>
        <cylinderGeometry args={[r * MM, r * MM, h * MM, 28]} />
        <meshStandardMaterial color={COLOR_METAL} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh
        position={[
          (f.pos[0] - f.dir[0] * bracoLen / 2) * MM,
          (f.pos[1]) * MM,
          (f.pos[2] - f.dir[2] * bracoLen / 2) * MM,
        ]}
      >
        <boxGeometry
          args={[
            Math.abs(f.dir[0]) > 0.5 ? bracoLen * MM : bracoW * MM,
            bracoH * MM,
            Math.abs(f.dir[2]) > 0.5 ? bracoLen * MM : bracoW * MM,
          ]}
        />
        <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function DobradicaChapa({ centro, dir }: { centro: [number, number, number]; dir: [number, number, number] }) {
  // chapa fixa na lateral; sai um pouco para fora da face
  const thick = 3;
  const cx = centro[0] + (dir[0] * thick) / 2;
  const cy = centro[1] + (dir[1] * thick) / 2;
  const cz = centro[2] + (dir[2] * thick) / 2;
  const sx = Math.abs(dir[0]) > 0.5 ? thick : 50;
  const sy = Math.abs(dir[1]) > 0.5 ? thick : 70;
  const sz = Math.abs(dir[2]) > 0.5 ? thick : 25;
  return (
    <mesh position={[cx * MM, cy * MM, cz * MM]}>
      <boxGeometry args={[sx * MM, sy * MM, sz * MM]} />
      <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.25} />
    </mesh>
  );
}

// Corrediça: dois perfis (carcaça + gaveta), boxes finos ao longo da profundidade
export function CorredicaCarcaca({ caixa, ladoXmin, ladoXmax }: { caixa: GavetaCaixa; ladoXmin: number; ladoXmax: number }) {
  const len = caixa.boxDepth;
  const altura = 17;
  const espessura = 12;
  const cy = caixa.center[1];
  const cz = caixa.center[2];
  return (
    <group>
      {[ladoXmin, ladoXmax].map((x, i) => {
        const dirX = i === 0 ? 1 : -1; // sai da lateral para o interior
        return (
          <mesh key={i} position={[(x + dirX * espessura / 2) * MM, cy * MM, cz * MM]}>
            <boxGeometry args={[espessura * MM, altura * MM, len * MM]} />
            <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

export function CorredicaGaveta({ caixa }: { caixa: GavetaCaixa }) {
  // perfis montados nas laterais da caixa, em ambos os lados
  const len = caixa.boxDepth;
  const altura = 17;
  const espessura = 8;
  const cy = caixa.center[1];
  const cz = caixa.center[2];
  const halfW = caixa.boxWidth / 2;
  return (
    <group>
      {[caixa.center[0] - halfW - espessura / 2, caixa.center[0] + halfW + espessura / 2].map((x, i) => (
        <mesh key={i} position={[x * MM, cy * MM, cz * MM]}>
          <boxGeometry args={[espessura * MM, altura * MM, len * MM]} />
          <meshStandardMaterial color="#7a8089" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
