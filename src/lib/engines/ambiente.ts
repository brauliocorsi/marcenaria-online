export type ParedeId = "fundo" | "frente" | "esquerda" | "direita";

export type ParedesVisiveis = Record<ParedeId, boolean>;

export type TipoAbertura = "janela" | "porta";

export interface Abertura {
  id: string;
  paredeId: ParedeId;
  tipo: TipoAbertura;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface AberturaCalculada extends Abertura {
  u: number;
  v: number;
  valido: boolean;
  motivo?: string;
}

export interface RoomConfig {
  largura: number;
  profundidade: number;
  altura: number;
  espessuraParede: number;
  paredesVisiveis: ParedesVisiveis;
  aberturas: Abertura[];
  corParede: string;
  corChao: string;
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
  aberturas: [],
  corParede: "#EDEAE4",
  corChao: "#D9D6D0",
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

export function comprimentoParede(room: RoomConfig, paredeId: ParedeId): number {
  return paredeId === "fundo" || paredeId === "frente" ? room.largura : room.profundidade;
}

export function validarAbertura(room: RoomConfig, ab: Abertura): { valido: boolean; motivo?: string } {
  if (ab.largura <= 0 || ab.altura <= 0) return { valido: false, motivo: "Dimensões inválidas" };
  if (ab.x < 0 || ab.y < 0) return { valido: false, motivo: "Posição negativa" };
  const comp = comprimentoParede(room, ab.paredeId);
  if (ab.x + ab.largura > comp) return { valido: false, motivo: `Excede comprimento da parede (${comp}mm)` };
  if (ab.y + ab.altura > room.altura) return { valido: false, motivo: `Excede altura (${room.altura}mm)` };
  if (ab.tipo === "porta" && ab.y !== 0) return { valido: false, motivo: "Porta deve ter y=0" };
  return { valido: true };
}

export function calcularAberturasDaParede(room: RoomConfig, paredeId: ParedeId): AberturaCalculada[] {
  return room.aberturas
    .filter((a) => a.paredeId === paredeId)
    .map((a) => {
      const v = validarAbertura(room, a);
      return { ...a, u: a.x, v: a.y, valido: v.valido, motivo: v.motivo };
    });
}

export function normalizarRoom(input: Partial<RoomConfig> | undefined | null): RoomConfig {
  const base = { ...DEFAULT_ROOM, ...(input ?? {}) };
  return {
    ...base,
    paredesVisiveis: { ...DEFAULT_ROOM.paredesVisiveis, ...((input as any)?.paredesVisiveis ?? {}) },
    aberturas: Array.isArray((input as any)?.aberturas) ? (input as any).aberturas : [],
  };
}
