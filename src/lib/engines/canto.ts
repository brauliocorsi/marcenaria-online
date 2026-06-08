// Motor de geometria do canto diagonal (footprint pentagonal). Puro/determinístico.
// Coords no chão: origem no canto interior. X ao longo da parede esq, Z ao longo da direita.
// Sem render. Apenas footprint + peças + furos (joinery base).

import type { PieceType, Veio } from "./module";

export interface CantoDiagonalParams {
  ladoEsq: number;          // comprimento ao longo da parede esquerda (X)
  ladoDir: number;          // comprimento ao longo da parede direita (Z)
  profRetornoEsq: number;   // profundidade do retorno esquerdo (em Z, a partir de Z=0)
  profRetornoDir: number;   // profundidade do retorno direito (em X, a partir de X=0)
  altura: number;           // H
  espessuras: {
    lateral: number;        // costas + retornos
    tampo: number;
    base: number;
    frente: number;         // porta diagonal
  };
}

export type Vec2 = [number, number];

export interface CantoPeca {
  tipo: PieceType;
  ref: string;
  descricao: string;
  qtd: number;
  comprimento_mm: number;
  largura_mm: number;
  espessura_mm: number;
  veio: Veio;
  // Posicionamento opcional (mm) — origem no canto interior, Y vertical.
  pos?: [number, number, number];
  // Ângulo (radianos) em torno de Y (para frente diagonal).
  rotY?: number;
}

export interface CantoFuro {
  ref: string;
  pecaA: string;
  pecaB: string;
  tipo: "minifix" | "cavilha";
}

export interface CantoGeometria {
  footprint: Vec2[];          // 5 vértices, CCW
  areaPentagono_mm2: number;
  distFrenteDiagonal_mm: number;
  pecas: CantoPeca[];
  furos: CantoFuro[];
}

const r = (v: number) => Math.round(v);

/** Área de um polígono fechado (shoelace, absoluto). */
export function areaPoligono(pts: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function dist2D(a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}

export function geraCantoDiagonal(p: CantoDiagonalParams): CantoGeometria {
  const { ladoEsq, ladoDir, profRetornoEsq, profRetornoDir, altura, espessuras } = p;
  const H = altura;
  const e = espessuras;

  // Vértices do footprint (X, Z) — pentágono CCW.
  const P0: Vec2 = [0, 0];
  const P1: Vec2 = [ladoEsq, 0];
  const P2: Vec2 = [ladoEsq, profRetornoEsq];
  const P3: Vec2 = [profRetornoDir, ladoDir];
  const P4: Vec2 = [0, ladoDir];
  const footprint: Vec2[] = [P0, P1, P2, P3, P4];

  const distFrente = dist2D(P2, P3);
  const areaPent = areaPoligono(footprint);

  const pecas: CantoPeca[] = [];

  // Costas esquerda — ao longo da parede esquerda (Z=0), comprimento = ladoEsq.
  pecas.push({
    tipo: "lateral", ref: "costas_esq",
    descricao: "Costas esquerda",
    qtd: 1, comprimento_mm: r(ladoEsq), largura_mm: r(H), espessura_mm: r(e.lateral),
    veio: "comprimento",
    pos: [0, 0, 0],
  });

  // Costas direita — ao longo da parede direita (X=0), comprimento = ladoDir.
  pecas.push({
    tipo: "lateral", ref: "costas_dir",
    descricao: "Costas direita",
    qtd: 1, comprimento_mm: r(ladoDir), largura_mm: r(H), espessura_mm: r(e.lateral),
    veio: "comprimento",
    pos: [0, 0, 0],
  });

  // Retorno esquerdo — em X = ladoEsq, comprimento = profRetornoEsq.
  pecas.push({
    tipo: "lateral", ref: "retorno_esq",
    descricao: "Retorno esquerdo",
    qtd: 1, comprimento_mm: r(profRetornoEsq), largura_mm: r(H), espessura_mm: r(e.lateral),
    veio: "comprimento",
    pos: [ladoEsq, 0, 0],
  });

  // Retorno direito — em Z = ladoDir, comprimento = profRetornoDir.
  pecas.push({
    tipo: "lateral", ref: "retorno_dir",
    descricao: "Retorno direito",
    qtd: 1, comprimento_mm: r(profRetornoDir), largura_mm: r(H), espessura_mm: r(e.lateral),
    veio: "comprimento",
    pos: [0, 0, ladoDir],
  });

  // Frente diagonal (porta) — comprimento = dist(P2,P3), ângulo da diagonal.
  const dx = P3[0] - P2[0];
  const dz = P3[1] - P2[1];
  const ang = Math.atan2(dz, dx);
  pecas.push({
    tipo: "porta", ref: "frente_diagonal",
    descricao: "Frente diagonal (porta)",
    qtd: 1, comprimento_mm: r(distFrente), largura_mm: r(H), espessura_mm: r(e.frente),
    veio: "comprimento",
    pos: [P2[0], 0, P2[1]],
    rotY: ang,
  });

  // Tampo e base — painéis pentagonais (área do footprint).
  pecas.push({
    tipo: "tampo", ref: "tampo",
    descricao: "Tampo (pentagonal)",
    qtd: 1, comprimento_mm: r(Math.max(ladoEsq, ladoDir)),
    largura_mm: r(Math.max(ladoEsq, ladoDir)),
    espessura_mm: r(e.tampo),
    veio: "comprimento",
  });
  pecas.push({
    tipo: "base", ref: "base",
    descricao: "Base (pentagonal)",
    qtd: 1, comprimento_mm: r(Math.max(ladoEsq, ladoDir)),
    largura_mm: r(Math.max(ladoEsq, ladoDir)),
    espessura_mm: r(e.base),
    veio: "comprimento",
  });

  // Junção: costas ↔ retorno (minifix + cavilha em cada junta vertical).
  const furos: CantoFuro[] = [
    { ref: "j_esq_mf", pecaA: "costas_esq", pecaB: "retorno_esq", tipo: "minifix" },
    { ref: "j_esq_cv", pecaA: "costas_esq", pecaB: "retorno_esq", tipo: "cavilha" },
    { ref: "j_dir_mf", pecaA: "costas_dir", pecaB: "retorno_dir", tipo: "minifix" },
    { ref: "j_dir_cv", pecaA: "costas_dir", pecaB: "retorno_dir", tipo: "cavilha" },
  ];

  return {
    footprint,
    areaPentagono_mm2: areaPent,
    distFrenteDiagonal_mm: distFrente,
    pecas,
    furos,
  };
}
