export type ParedeId = "fundo" | "frente" | "esquerda" | "direita";

export type ParedesVisiveis = Record<ParedeId, boolean>;

export interface RoomConfig {
  largura: number;
  profundidade: number;
  altura: number;
  espessuraParede: number;
  paredesVisiveis: ParedesVisiveis;
}

export interface Parede {
  id: ParedeId;
  size: [number, number, number];
  center: [number, number, number];
}

export const DEFAULT_ROOM: RoomConfig = {
  largura: 3000,
  profundidade: 2000,
  altura: 2400,
  espessuraParede: 100,
  paredesVisiveis: { fundo: true, frente: false, esquerda: true, direita: true },
};

export function calcularParedes(room: RoomConfig): Parede[] {
  const { largura: L, profundidade: P, altura: A, espessuraParede: E } = room;
  return [
    { id: "fundo", size: [L, A, E], center: [L / 2, A / 2, -E / 2] },
    { id: "frente", size: [L, A, E], center: [L / 2, A / 2, P + E / 2] },
    { id: "esquerda", size: [E, A, P], center: [-E / 2, A / 2, P / 2] },
    { id: "direita", size: [E, A, P], center: [L + E / 2, A / 2, P / 2] },
  ];
}

export function normalizarRoom(input: Partial<RoomConfig> | undefined | null): RoomConfig {
  const base = { ...DEFAULT_ROOM, ...(input ?? {}) };
  return {
    ...base,
    paredesVisiveis: { ...DEFAULT_ROOM.paredesVisiveis, ...((input as any)?.paredesVisiveis ?? {}) },
  };
}
