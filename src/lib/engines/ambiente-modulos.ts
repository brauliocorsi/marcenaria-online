// Motor puro de colocação de módulos sobre as paredes da sala.
// Coordenadas em mm. Y = altura (chão = 0). X = largura da sala (0..L).
// Z = profundidade da sala (0..P). Parede 'fundo' em Z=0; 'esquerda' em X=0;
// 'direita' em X=L. Módulo local: back em z=0, front em z=+D.
//
// Rotação por parede (Y axis):
//   fundo    →  0
//   esquerda → +90°  (local +Z → world +X — frente vira p/ interior +X)
//   direita  → -90°  (local +Z → world -X — frente vira p/ interior -X)
//
// Posições calculadas para que a TRASEIRA encoste à face interna da parede e
// o módulo se estenda ao longo da parede começando no canto ESQUERDO (visto
// de dentro da sala) por x_offset.

export type ParedeColocavel = "fundo" | "esquerda" | "direita";

export interface PlacementInput {
  parede: ParedeColocavel;
  x_offset_mm: number;
  altura_chao_mm: number;
  rotacao_deg?: number;
}

export interface ModSize {
  width: number;
  height: number;
  depth: number;
}

export interface SalaSize {
  largura: number;     // X
  profundidade: number; // Z
  altura: number;       // Y
}

export interface PlacementTransform {
  position: [number, number, number]; // mm
  rotationY: number;                  // rad
  comprimentoParedeMm: number;
  excede: boolean;                    // x_offset+W > comprimento da parede
}

export function comprimentoParede(sala: SalaSize, parede: ParedeColocavel): number {
  return parede === "fundo" ? sala.largura : sala.profundidade;
}

export function transformColocacao(
  p: PlacementInput,
  m: ModSize,
  sala: SalaSize,
): PlacementTransform {
  const rExtra = ((p.rotacao_deg ?? 0) * Math.PI) / 180;
  const y = p.altura_chao_mm;
  const off = p.x_offset_mm;
  const comp = comprimentoParede(sala, p.parede);
  const excede = off + m.width > comp;

  if (p.parede === "fundo") {
    return { position: [off, y, 0], rotationY: 0 + rExtra, comprimentoParedeMm: comp, excede };
  }
  if (p.parede === "esquerda") {
    // após +90° Y: local (x,y,z) → world (z, y, -x). Origin do grupo em X=0,
    // Z = off + W faz o módulo ocupar Z:[off..off+W], com back em X=0.
    return { position: [0, y, off + m.width], rotationY: Math.PI / 2 + rExtra, comprimentoParedeMm: comp, excede };
  }
  // direita
  // após -90° Y: local (x,y,z) → world (-z, y, x). Origin em X=L, Z=off.
  return { position: [sala.largura, y, off], rotationY: -Math.PI / 2 + rExtra, comprimentoParedeMm: comp, excede };
}
