// Motor paramétrico do módulo (caixa). Função pura, determinística.
// Todas as medidas em mm. Cálculos internos podem ser decimais; resultados
// arredondados a inteiro.

export type PieceType = "lateral" | "tampo" | "base" | "prateleira" | "fundo";
export type SistemaMontagem = "laterais_cobrem" | "tampo_base_cobrem";
export type FundoModo = "sobreposto" | "ranhura";
export type Veio = "comprimento" | "largura" | "sem";

export interface Dimensoes {
  width: number;
  height: number;
  depth: number;
}

export interface EspessurasOverride {
  lateral?: number | null;
  tampo?: number | null;
  base?: number | null;
  prateleira?: number | null;
}

export interface FundoConfig {
  modo: FundoModo;
  espessura: number;
  prof_ranhura: number; // só usado em modo 'ranhura'
  recuo: number; // reservado para uso futuro
}

export interface ModuleConfig {
  dims: Dimensoes;
  sistemaMontagem: SistemaMontagem;
  espessuraPadrao: number;
  espessuras: EspessurasOverride;
  folgas: {
    prateleira_lateral: number;
    prateleira_recuo: number;
  };
  fundo: FundoConfig;
  nPrateleiras: number;
}

export interface Peca {
  tipo: PieceType;
  descricao: string;
  qtd: number;
  comprimento_mm: number;
  largura_mm: number;
  espessura_mm: number;
  veio: Veio;
}

export function resolverEspessuras(padrao: number, ov: EspessurasOverride) {
  const pick = (v: number | null | undefined) =>
    v == null || Number.isNaN(v) || v <= 0 ? padrao : v;
  return {
    lateral: pick(ov.lateral),
    tampo: pick(ov.tampo),
    base: pick(ov.base),
    prateleira: pick(ov.prateleira),
  };
}

const r = (v: number) => Math.round(v);

export function calcularPecas(config: ModuleConfig): Peca[] {
  const { dims, sistemaMontagem, espessuraPadrao, espessuras, folgas, fundo, nPrateleiras } = config;
  const W = dims.width;
  const H = dims.height;
  const D = dims.depth;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  const pecas: Peca[] = [];

  if (sistemaMontagem === "laterais_cobrem") {
    pecas.push({
      tipo: "lateral", descricao: "Lateral",
      qtd: 2, comprimento_mm: r(H), largura_mm: r(D), espessura_mm: r(e.lateral),
      veio: "comprimento",
    });
    pecas.push({
      tipo: "tampo", descricao: "Tampo",
      qtd: 1, comprimento_mm: r(W - 2 * e.lateral), largura_mm: r(D), espessura_mm: r(e.tampo),
      veio: "comprimento",
    });
    pecas.push({
      tipo: "base", descricao: "Base",
      qtd: 1, comprimento_mm: r(W - 2 * e.lateral), largura_mm: r(D), espessura_mm: r(e.base),
      veio: "comprimento",
    });
  } else {
    // tampo_base_cobrem
    pecas.push({
      tipo: "lateral", descricao: "Lateral",
      qtd: 2, comprimento_mm: r(H - e.tampo - e.base), largura_mm: r(D), espessura_mm: r(e.lateral),
      veio: "comprimento",
    });
    pecas.push({
      tipo: "tampo", descricao: "Tampo",
      qtd: 1, comprimento_mm: r(W), largura_mm: r(D), espessura_mm: r(e.tampo),
      veio: "comprimento",
    });
    pecas.push({
      tipo: "base", descricao: "Base",
      qtd: 1, comprimento_mm: r(W), largura_mm: r(D), espessura_mm: r(e.base),
      veio: "comprimento",
    });
  }

  if (nPrateleiras > 0) {
    pecas.push({
      tipo: "prateleira",
      descricao: "Prateleira",
      qtd: nPrateleiras,
      comprimento_mm: r(W - 2 * e.lateral - folgas.prateleira_lateral),
      largura_mm: r(D - folgas.prateleira_recuo),
      espessura_mm: r(e.prateleira),
      veio: "comprimento",
    });
  }

  if (fundo.modo === "sobreposto") {
    pecas.push({
      tipo: "fundo", descricao: "Fundo (sobreposto)",
      qtd: 1, comprimento_mm: r(W), largura_mm: r(H), espessura_mm: r(fundo.espessura),
      veio: "largura",
    });
  } else {
    pecas.push({
      tipo: "fundo", descricao: "Fundo (ranhura)",
      qtd: 1,
      comprimento_mm: r(W - 2 * e.lateral + 2 * fundo.prof_ranhura),
      largura_mm: r(H - e.tampo - e.base + 2 * fundo.prof_ranhura),
      espessura_mm: r(fundo.espessura),
      veio: "largura",
    });
  }

  return pecas;
}

export const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  dims: { width: 800, height: 720, depth: 560 },
  sistemaMontagem: "laterais_cobrem",
  espessuraPadrao: 19,
  espessuras: { lateral: null, tampo: null, base: null, prateleira: null },
  folgas: { prateleira_lateral: 2, prateleira_recuo: 10 },
  fundo: { modo: "sobreposto", espessura: 4, prof_ranhura: 8, recuo: 0 },
  nPrateleiras: 1,
};
