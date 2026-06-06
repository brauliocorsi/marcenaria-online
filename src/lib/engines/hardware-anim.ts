// Helpers de animação 3D — funções puras (Fase 4H)
import type { PortaDim, CorredicaTipo } from "./module";

export function pivotPorta(porta: PortaDim): number {
  return porta.ladoDobradicas === "esquerda" ? porta.xMin : porta.xMax;
}

export function anguloPortaRad(ladoDobradicas: "esquerda" | "direita", deg: number): number {
  const rad = (deg * Math.PI) / 180;
  return ladoDobradicas === "esquerda" ? -rad : rad;
}

export function aberturaGaveta(
  boxDepth: number,
  extensao: "total" | "parcial" | undefined,
  pct: number,
): number {
  const factor = extensao === "total" ? 1 : 0.75;
  return boxDepth * factor * Math.max(0, Math.min(1, pct));
}

export function extensaoFromTipo(tipo?: CorredicaTipo): "total" | "parcial" {
  return tipo === "telescopica" || tipo === "oculta" ? "total" : "parcial";
}
