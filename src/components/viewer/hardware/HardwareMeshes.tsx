// Modelos 3D simplificados de ferragens (Fase 4H + 5C corrediças fiéis por tipo
// + 4/5 puxadores: barra, botão, cava, perfil gola J/C).
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import type { Furo } from "@/lib/engines/drilling";
import type { GavetaCaixa } from "@/lib/engines/module";
import type { PuxadorSnapshot, PuxadorPosicao, PuxadorBarraCfg, PuxadorBotaoCfg, PuxadorCavaCfg, PuxadorGolaCfg } from "@/lib/engines/puxadores";

const MM = 0.001;
const COLOR_METAL = "#6B7280";
const COLOR_SLIDE = "#9CA3AF";
const COLOR_SLIDE_INNER = "#7a8089";
const COLOR_WOOD = "#C9A66B";
const COLOR_PUXADOR = "#B8BCC0";
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
  const h = 12, r = 8;
  const q = useDirQuat(f.dir);
  return (
    <mesh position={shiftedPos(f, h)} quaternion={q}>
      <cylinderGeometry args={[r * MM, r * MM, h * MM, 24]} />
      <meshStandardMaterial color="#3F4651" metalness={0.95} roughness={0.2} />
    </mesh>
  );
}

export function MinifixPerno({ f }: { f: Furo }) {
  const len = 32, r = 4;
  const q = useDirQuat(f.dir);
  return (
    <mesh position={shiftedPos(f, len)} quaternion={q}>
      <cylinderGeometry args={[r * MM, r * MM, len * MM, 14]} />
      <meshStandardMaterial color="#3B82F6" metalness={0.7} roughness={0.35} />
    </mesh>
  );
}

export function CavilhaModel({ f }: { f: Furo }) {
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
  const r = 17.5, h = 12;
  const q = useDirQuat(f.dir);
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

// ── Corrediças fiéis por tipo ──
// Membro de CARCAÇA (fixa à lateral do módulo) — render no espaço estático.
export function CorredicaCarcaca({ caixa, ladoXmin, ladoXmax }: { caixa: GavetaCaixa; ladoXmin: number; ladoXmax: number }) {
  const tipo = caixa.tipoCorredica ?? "telescopica";
  const len = caixa.boxDepth;
  const cy = caixa.center[1];
  const cz = caixa.center[2];

  if (tipo === "oculta") {
    // 2 calhas SOB a base da gaveta (junto às ilhargas), em Z.
    const calha = 16;
    const halfW = caixa.boxWidth / 2;
    const yCalha = (cy - caixa.boxHeight / 2 - calha / 2);
    const xs = [caixa.center[0] - halfW + calha / 2, caixa.center[0] + halfW - calha / 2];
    return (
      <group>
        {xs.map((x, i) => (
          <mesh key={i} position={[x * MM, yCalha * MM, cz * MM]}>
            <boxGeometry args={[calha * MM, calha * MM, len * MM]} />
            <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
      </group>
    );
  }

  // Telescópica / Roldanas: perfil em cada lateral
  const esp = tipo === "roldanas" ? 12.5 : 13;
  const alt = tipo === "roldanas" ? 35 : 45;
  return (
    <group>
      {[ladoXmin, ladoXmax].map((x, i) => {
        const dirX = i === 0 ? 1 : -1;
        return (
          <group key={i}>
            <mesh position={[(x + dirX * esp / 2) * MM, cy * MM, cz * MM]}>
              <boxGeometry args={[esp * MM, alt * MM, len * MM]} />
              <meshStandardMaterial color={COLOR_SLIDE} metalness={0.9} roughness={0.25} />
            </mesh>
            {tipo === "roldanas" && (
              // roldana na traseira do membro de carcaça
              <mesh
                position={[(x + dirX * (esp + 4)) * MM, cy * MM, (caixa.zBack + 12) * MM]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[9 * MM, 9 * MM, 6 * MM, 18]} />
                <meshStandardMaterial color="#2c2c2c" metalness={0.4} roughness={0.6} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Membro de GAVETA (fixa à ilharga) — render dentro do grupo animado da gaveta.
export function CorredicaGaveta({ caixa }: { caixa: GavetaCaixa }) {
  const tipo = caixa.tipoCorredica ?? "telescopica";
  const len = caixa.boxDepth;
  const cy = caixa.center[1];
  const cz = caixa.center[2];
  const halfW = caixa.boxWidth / 2;

  if (tipo === "oculta") {
    // clip frontal visível na frente da caixa
    const cx = caixa.center[0];
    return (
      <mesh position={[cx * MM, (cy - caixa.boxHeight / 2 + 6) * MM, (caixa.zFront - 8) * MM]}>
        <boxGeometry args={[(caixa.boxWidth * 0.55) * MM, 10 * MM, 14 * MM]} />
        <meshStandardMaterial color={COLOR_METAL} metalness={0.85} roughness={0.3} />
      </mesh>
    );
  }

  const esp = tipo === "roldanas" ? 10 : 8;
  const alt = tipo === "roldanas" ? 30 : 40;
  const xs = [caixa.center[0] - halfW - esp / 2, caixa.center[0] + halfW + esp / 2];
  return (
    <group>
      {xs.map((x, i) => {
        const dirX = i === 0 ? -1 : 1;
        return (
          <group key={i}>
            <mesh position={[x * MM, cy * MM, cz * MM]}>
              <boxGeometry args={[esp * MM, alt * MM, len * MM]} />
              <meshStandardMaterial color={COLOR_SLIDE_INNER} metalness={0.85} roughness={0.3} />
            </mesh>
            {tipo === "roldanas" && (
              // roldana na FRENTE do membro de gaveta
              <mesh
                position={[(x + dirX * 4) * MM, cy * MM, (caixa.zFront - 12) * MM]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[9 * MM, 9 * MM, 6 * MM, 18]} />
                <meshStandardMaterial color="#2c2c2c" metalness={0.4} roughness={0.6} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Helper: lift Y para undermount (caixa assenta sobre as calhas)
export function liftYUndermount(tipo?: GavetaCaixa["tipoCorredica"]): number {
  return tipo === "oculta" ? 16 : 0;
}

// ── 4/5 Puxadores: render por tipo (barra/botão/cava/perfil gola) ───────
export interface PuxadorFrenteRef {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  zBack: number; zFront: number;
}

/** Render do puxador SOLIDÁRIO À FRENTE (acompanha a abertura da porta/gaveta).
 *  Cobre 'convencional' (barra/botão) e 'cava'. Coords em mm no espaço local
 *  do <group> da porta/gaveta (caller passa coords já trasladadas). */
export function PuxadorFrenteMesh({
  pux, pos, frente,
}: { pux: PuxadorSnapshot; pos: PuxadorPosicao; frente: PuxadorFrenteRef }) {
  const yBordo =
    pos === "superior" ? frente.yMax
    : pos === "inferior" ? frente.yMin
    : (frente.yMin + frente.yMax) / 2;
  const sinal = pos === "superior" ? -1 : 1;
  const largura = Math.max(1, frente.xMax - frente.xMin);
  const espessura = Math.max(1, frente.zFront - frente.zBack);
  const cxF = (frente.xMin + frente.xMax) / 2;
  const zFace = frente.zFront;

  if (pux.tipo === "convencional") {
    const c = pux.config as PuxadorBarraCfg | PuxadorBotaoCfg;
    const yH = yBordo + sinal * c.alturaDoBordo;

    if ((c as PuxadorBarraCfg).subtipo === "barra") {
      const cb = c as PuxadorBarraCfg;
      const x1 = cxF - cb.entreEixo / 2;
      const x2 = cxF + cb.entreEixo / 2;
      const standoffLen = 14;
      const standoffR = 5;
      const barR = 6;
      const barLen = cb.entreEixo + 24;
      const zBar = zFace + standoffLen;
      const zStandoff = zFace + standoffLen / 2;
      return (
        <group>
          {[x1, x2].map((x, i) => (
            <mesh key={`so-${i}`} position={[x * MM, yH * MM, zStandoff * MM]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[standoffR * MM, standoffR * MM, standoffLen * MM, 16]} />
              <meshStandardMaterial color={COLOR_PUXADOR} metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
          <mesh position={[cxF * MM, yH * MM, zBar * MM]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[barR * MM, barR * MM, barLen * MM, 20]} />
            <meshStandardMaterial color={COLOR_PUXADOR} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );
    }

    // botão
    const knobLen = 22, knobR = 12;
    return (
      <mesh position={[cxF * MM, yH * MM, (zFace + knobLen / 2) * MM]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[knobR * MM, knobR * MM, knobLen * MM, 24]} />
        <meshStandardMaterial color={COLOR_PUXADOR} metalness={0.9} roughness={0.2} />
      </mesh>
    );
  }

  if (pux.tipo === "cava") {
    const c = pux.config as PuxadorCavaCfg;
    // rebaixo/notch na orla traseira do topo (ou base) da frente —
    // representado como caixa metálica escura embebida na face traseira.
    const prof = Math.max(1, espessura - c.deixarEspessura);
    const cavaW = c.cavaLargura;
    const yC = yBordo + sinal * cavaW / 2;
    const zC = frente.zBack + prof / 2;
    return (
      <mesh position={[cxF * MM, yC * MM, zC * MM]}>
        <boxGeometry args={[(largura - 4) * MM, cavaW * MM, prof * MM]} />
        <meshStandardMaterial color="#3a3d42" metalness={0.55} roughness={0.5} />
      </mesh>
    );
  }

  // gola: o perfil NÃO é solidário à frente — render via PerfilGolaMesh.
  return null;
}

/** Render do PERFIL DE ALUMÍNIO da gola, FIXO à carcaça (não roda com a porta
 *  nem desliza com a gaveta). Coords em mm no espaço global do módulo. */
export function PerfilGolaMesh({
  pux, pos, frente, moduloW,
}: { pux: PuxadorSnapshot; pos: PuxadorPosicao; frente: PuxadorFrenteRef; moduloW: number }) {
  if (pux.tipo !== "gola_j" && pux.tipo !== "gola_c") return null;
  const c = pux.config as PuxadorGolaCfg;
  const yPerfil =
    pos === "superior" ? frente.yMax + c.reveal / 2
    : pos === "inferior" ? frente.yMin - c.reveal / 2
    : (frente.yMin + frente.yMax) / 2;
  const zPerfil = frente.zFront - c.perfilProf / 2;
  return (
    <mesh position={[(moduloW / 2) * MM, yPerfil * MM, zPerfil * MM]}>
      <boxGeometry args={[moduloW * MM, c.perfilLargura * MM, c.perfilProf * MM]} />
      <meshStandardMaterial color={COLOR_PUXADOR} metalness={0.85} roughness={0.25} />
    </mesh>
  );
}
