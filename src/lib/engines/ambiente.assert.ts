import { calcularParedes, DEFAULT_ROOM } from "./ambiente";

export function runAmbienteAsserts() {
  const sala = { ...DEFAULT_ROOM, largura: 3000, profundidade: 2000, altura: 2400, espessuraParede: 100 };
  const paredes = calcularParedes(sala);
  const fundo = paredes.find((p) => p.id === "fundo")!;
  const esq = paredes.find((p) => p.id === "esquerda")!;
  console.assert(
    fundo.size[0] === 3000 && fundo.size[1] === 2400 && fundo.size[2] === 100,
    "[ambiente] parede fundo size",
  );
  console.assert(
    esq.size[0] === 100 && esq.size[1] === 2400 && esq.size[2] === 2000,
    "[ambiente] parede esquerda size",
  );
}
