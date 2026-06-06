// Motor paramétrico do módulo (caixa). Função pura, determinística.
// Todas as medidas em mm. Cálculos internos podem ser decimais; resultados
// arredondados a inteiro.

export type PieceType = "lateral" | "tampo" | "base" | "prateleira" | "fundo" | "porta" | "gaveta_frente" | "gaveta_lateral" | "gaveta_frenteCaixa" | "gaveta_fundo";
export type PortaModo = "sobreposta" | "embutida";
export type LadoAbertura = "esquerda" | "direita";
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

export interface PortasConfig {
  nPortas: 0 | 1 | 2;
  modo: PortaModo;
  ladoAbertura: LadoAbertura; // só relevante p/ 1 porta
  espessura: number | null;   // null = espessuraPadrao
  folga: number;
  folgaCentral: number;
}

export type CorredicaTipo = "telescopica" | "oculta" | "roldanas";

export interface CorredicaConfig {
  hardwareId: string | null;
  comprimento: number;
  // Params hidratados pela UI a partir da ferragem escolhida (category='corredica').
  folgaLateralPorLado?: number;  // mm por lado; aceita decimais (ex. 12.5)
  tipo?: CorredicaTipo;
  rebaixoFundo?: boolean;
  // Backwards-compat (config antigo)
  folgaLateral?: number;
}

export interface GavetasConfig {
  nGavetas: number;
  modo: PortaModo;
  folga: number;
  espessuraFrente: number;
  corredica: CorredicaConfig;
  espessuraCaixa: number;
  espessuraFundo: number;
  alturaCaixaFolga: number;
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
  portas: PortasConfig;
  // REGRA: se nGavetas>0, a frente são gavetas (portas ignoradas).
  gavetas: GavetasConfig;
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

  // Portas como peças reais (apenas se não houver gavetas)
  for (const pp of dimensoesPortas(config)) {
    pecas.push({
      tipo: "porta", descricao: pp.descricao,
      qtd: 1, comprimento_mm: r(pp.altura), largura_mm: r(pp.largura), espessura_mm: r(pp.espessura),
      veio: "comprimento",
    });
  }

  // Gavetas — frentes + caixas
  const g = dimensoesGavetas(config);
  for (const fr of g.frentes) {
    pecas.push({
      tipo: "gaveta_frente", descricao: fr.descricao,
      qtd: 1, comprimento_mm: r(fr.size[1]), largura_mm: r(fr.size[0]), espessura_mm: r(fr.size[2]),
      veio: "comprimento",
    });
  }
  for (const c of g.caixas) {
    pecas.push({
      tipo: "gaveta_lateral", descricao: `Lateral caixa gaveta ${c.idx + 1}`,
      qtd: 2, comprimento_mm: r(c.boxDepth), largura_mm: r(c.boxHeight), espessura_mm: r(c.espessuraCaixa),
      veio: "comprimento",
    });
    pecas.push({
      tipo: "gaveta_frenteCaixa", descricao: `Frente/traseira caixa gaveta ${c.idx + 1}`,
      qtd: 2, comprimento_mm: r(c.boxWidth - 2 * c.espessuraCaixa), largura_mm: r(c.boxHeight), espessura_mm: r(c.espessuraCaixa),
      veio: "comprimento",
    });
    pecas.push({
      tipo: "gaveta_fundo", descricao: `Fundo gaveta ${c.idx + 1}`,
      qtd: 1, comprimento_mm: r(c.boxWidth), largura_mm: r(c.boxDepth), espessura_mm: r(c.espessuraFundo),
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
  portas: { nPortas: 0, modo: "sobreposta", ladoAbertura: "direita", espessura: null, folga: 2, folgaCentral: 3 },
  gavetas: {
    nGavetas: 0, modo: "sobreposta", folga: 3, espessuraFrente: 19,
    corredica: { hardwareId: null, comprimento: 500, folgaLateralPorLado: 13 },
    espessuraCaixa: 16, espessuraFundo: 4, alturaCaixaFolga: 30,
  },
};

// Backwards-compat: assegura que módulos antigos têm o bloco gavetas
// e migra corredica antiga {comprimento, folgaLateral} → novo formato.
export function normalizarConfig(c: ModuleConfig): ModuleConfig {
  const out: ModuleConfig = c.gavetas && typeof c.gavetas.nGavetas === "number"
    ? c
    : { ...c, gavetas: DEFAULT_MODULE_CONFIG.gavetas };
  const corr = out.gavetas.corredica as CorredicaConfig & { folgaLateral?: number };
  if (corr && corr.folgaLateralPorLado == null && typeof corr.folgaLateral === "number") {
    out.gavetas = {
      ...out.gavetas,
      corredica: {
        hardwareId: corr.hardwareId ?? null,
        comprimento: corr.comprimento ?? 500,
        folgaLateralPorLado: corr.folgaLateral,
      },
    };
  } else if (corr && corr.hardwareId === undefined) {
    out.gavetas = { ...out.gavetas, corredica: { ...corr, hardwareId: corr.hardwareId ?? null } };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Geometria 3D — fonte única de verdade partilhada com calcularPecas.
// Sistema: X=largura (0..W), Y=altura (0..H), Z=profundidade (0..D).
// Origem num canto. `center` é o centro da caixa de cada peça.
// ─────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

export interface PecaGeo {
  tipo: PieceType;
  descricao: string;
  size: Vec3;
  center: Vec3;
  veio: Veio;
}

export function calcularGeometria(config: ModuleConfig): PecaGeo[] {
  const { dims, sistemaMontagem, espessuraPadrao, espessuras, folgas, fundo, nPrateleiras } = config;
  const W = dims.width, H = dims.height, D = dims.depth;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  const out: PecaGeo[] = [];

  if (sistemaMontagem === "laterais_cobrem") {
    out.push({ tipo: "lateral", descricao: "Lateral esquerda", veio: "comprimento",
      size: [e.lateral, H, D], center: [e.lateral / 2, H / 2, D / 2] });
    out.push({ tipo: "lateral", descricao: "Lateral direita", veio: "comprimento",
      size: [e.lateral, H, D], center: [W - e.lateral / 2, H / 2, D / 2] });
    const tbLen = W - 2 * e.lateral;
    out.push({ tipo: "tampo", descricao: "Tampo", veio: "comprimento",
      size: [tbLen, e.tampo, D], center: [W / 2, H - e.tampo / 2, D / 2] });
    out.push({ tipo: "base", descricao: "Base", veio: "comprimento",
      size: [tbLen, e.base, D], center: [W / 2, e.base / 2, D / 2] });
  } else {
    const latLen = H - e.tampo - e.base;
    out.push({ tipo: "lateral", descricao: "Lateral esquerda", veio: "comprimento",
      size: [e.lateral, latLen, D], center: [e.lateral / 2, e.base + latLen / 2, D / 2] });
    out.push({ tipo: "lateral", descricao: "Lateral direita", veio: "comprimento",
      size: [e.lateral, latLen, D], center: [W - e.lateral / 2, e.base + latLen / 2, D / 2] });
    out.push({ tipo: "tampo", descricao: "Tampo", veio: "comprimento",
      size: [W, e.tampo, D], center: [W / 2, H - e.tampo / 2, D / 2] });
    out.push({ tipo: "base", descricao: "Base", veio: "comprimento",
      size: [W, e.base, D], center: [W / 2, e.base / 2, D / 2] });
  }

  if (nPrateleiras > 0) {
    const pratLen = W - 2 * e.lateral - folgas.prateleira_lateral;
    const pratDep = D - folgas.prateleira_recuo;
    const innerBottom = e.base;
    const innerHeight = H - e.base - e.tampo;
    for (let i = 1; i <= nPrateleiras; i++) {
      const cy = innerBottom + (innerHeight * i) / (nPrateleiras + 1);
      out.push({
        tipo: "prateleira", descricao: `Prateleira ${i}`, veio: "comprimento",
        size: [pratLen, e.prateleira, pratDep],
        center: [W / 2, cy, pratDep / 2],
      });
    }
  }

  if (fundo.modo === "sobreposto") {
    out.push({
      tipo: "fundo", descricao: "Fundo (sobreposto)", veio: "largura",
      size: [W, H, fundo.espessura],
      center: [W / 2, H / 2, fundo.espessura / 2],
    });
  } else {
    out.push({
      tipo: "fundo", descricao: "Fundo (ranhura)", veio: "largura",
      size: [
        W - 2 * e.lateral + 2 * fundo.prof_ranhura,
        H - e.tampo - e.base + 2 * fundo.prof_ranhura,
        fundo.espessura,
      ],
      center: [W / 2, H / 2, fundo.espessura / 2],
    });
  }

  // Portas
  for (const pp of dimensoesPortas(config)) {
    out.push({
      tipo: "porta", descricao: pp.descricao, veio: "comprimento",
      size: [pp.largura, pp.altura, pp.espessura],
      center: [pp.cx, pp.cy, pp.cz],
    });
  }

  // Gavetas — frentes + 4 peças da caixa por gaveta
  const g = dimensoesGavetas(config);
  for (const fr of g.frentes) {
    out.push({ tipo: "gaveta_frente", descricao: fr.descricao, veio: "comprimento",
      size: fr.size, center: fr.center });
  }
  for (const c of g.caixas) {
    // 2 laterais
    const xL = c.center[0] - c.boxWidth / 2 + c.espessuraCaixa / 2;
    const xR = c.center[0] + c.boxWidth / 2 - c.espessuraCaixa / 2;
    out.push({ tipo: "gaveta_lateral", descricao: `Lateral esq. caixa gaveta ${c.idx + 1}`, veio: "comprimento",
      size: [c.espessuraCaixa, c.boxHeight, c.boxDepth], center: [xL, c.center[1], c.center[2]] });
    out.push({ tipo: "gaveta_lateral", descricao: `Lateral dir. caixa gaveta ${c.idx + 1}`, veio: "comprimento",
      size: [c.espessuraCaixa, c.boxHeight, c.boxDepth], center: [xR, c.center[1], c.center[2]] });
    // frente + traseira
    const zBack = c.center[2] - c.boxDepth / 2 + c.espessuraCaixa / 2;
    const zFront = c.center[2] + c.boxDepth / 2 - c.espessuraCaixa / 2;
    const innerW = c.boxWidth - 2 * c.espessuraCaixa;
    out.push({ tipo: "gaveta_frenteCaixa", descricao: `Frente caixa gaveta ${c.idx + 1}`, veio: "comprimento",
      size: [innerW, c.boxHeight, c.espessuraCaixa], center: [c.center[0], c.center[1], zFront] });
    out.push({ tipo: "gaveta_frenteCaixa", descricao: `Traseira caixa gaveta ${c.idx + 1}`, veio: "comprimento",
      size: [innerW, c.boxHeight, c.espessuraCaixa], center: [c.center[0], c.center[1], zBack] });
    // fundo (assente em baixo)
    const yFundo = c.center[1] - c.boxHeight / 2 + c.espessuraFundo / 2;
    out.push({ tipo: "gaveta_fundo", descricao: `Fundo gaveta ${c.idx + 1}`, veio: "largura",
      size: [c.boxWidth, c.espessuraFundo, c.boxDepth], center: [c.center[0], yFundo, c.center[2]] });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
// Portas — dimensão + posição (partilhado por peças, geometria e dobradiças)
// ─────────────────────────────────────────────────────────────

export type LadoDobradicas = "esquerda" | "direita";

export interface PortaDim {
  idx: 0 | 1;            // 0 = única ou esquerda; 1 = direita
  descricao: string;
  largura: number;
  altura: number;
  espessura: number;
  cx: number; cy: number; cz: number;   // centro
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  zBack: number; zFront: number;
  ladoDobradicas: LadoDobradicas;       // lado da porta onde estão as dobradiças
  xCharneira: number;                    // x da aresta da porta no lado das dobradiças
}

export function dimensoesPortas(config: ModuleConfig): PortaDim[] {
  const { dims, espessuraPadrao, espessuras, portas, gavetas } = config;
  if (!portas || portas.nPortas === 0) return [];
  // Regra: se houver gavetas, a frente é gavetas — portas ignoradas.
  if (gavetas && gavetas.nGavetas > 0) return [];
  const W = dims.width, H = dims.height, D = dims.depth;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  const eP = portas.espessura && portas.espessura > 0 ? portas.espessura : espessuraPadrao;
  const f = portas.folga;
  const fc = portas.folgaCentral;

  const out: PortaDim[] = [];

  if (portas.modo === "sobreposta") {
    const zBack = D, zFront = D + eP, cz = D + eP / 2;
    const yMin = f, yMax = H - f, altura = H - 2 * f, cy = H / 2;

    if (portas.nPortas === 1) {
      const xMin = f, xMax = W - f, largura = W - 2 * f, cx = W / 2;
      const lado: LadoDobradicas = portas.ladoAbertura === "direita" ? "esquerda" : "direita";
      const xCharneira = lado === "esquerda" ? xMin : xMax;
      out.push({ idx: 0, descricao: "Porta", largura, altura, espessura: eP,
        cx, cy, cz, xMin, xMax, yMin, yMax, zBack, zFront, ladoDobradicas: lado, xCharneira });
    } else {
      const largura = (W - 2 * f - fc) / 2;
      // esquerda
      const xMinE = f, xMaxE = f + largura;
      out.push({ idx: 0, descricao: "Porta esquerda", largura, altura, espessura: eP,
        cx: xMinE + largura / 2, cy, cz, xMin: xMinE, xMax: xMaxE,
        yMin, yMax, zBack, zFront, ladoDobradicas: "esquerda", xCharneira: xMinE });
      // direita
      const xMaxD = W - f, xMinD = xMaxD - largura;
      out.push({ idx: 1, descricao: "Porta direita", largura, altura, espessura: eP,
        cx: xMinD + largura / 2, cy, cz, xMin: xMinD, xMax: xMaxD,
        yMin, yMax, zBack, zFront, ladoDobradicas: "direita", xCharneira: xMaxD });
    }
  } else {
    // embutida — dentro da abertura interna
    const xLeft = e.lateral, xRight = W - e.lateral;
    const yBot = e.base, yTop = H - e.tampo;
    const altura = (yTop - yBot) - 2 * f;
    const cy = (yTop + yBot) / 2;
    const zBack = D - eP, zFront = D, cz = D - eP / 2;
    const yMin = yBot + f, yMax = yTop - f;

    if (portas.nPortas === 1) {
      const xMin = xLeft + f, xMax = xRight - f, largura = xMax - xMin, cx = (xMin + xMax) / 2;
      const lado: LadoDobradicas = portas.ladoAbertura === "direita" ? "esquerda" : "direita";
      const xCharneira = lado === "esquerda" ? xMin : xMax;
      out.push({ idx: 0, descricao: "Porta", largura, altura, espessura: eP,
        cx, cy, cz, xMin, xMax, yMin, yMax, zBack, zFront, ladoDobradicas: lado, xCharneira });
    } else {
      const largura = ((xRight - xLeft) - 2 * f - fc) / 2;
      const xMinE = xLeft + f, xMaxE = xMinE + largura;
      out.push({ idx: 0, descricao: "Porta esquerda", largura, altura, espessura: eP,
        cx: xMinE + largura / 2, cy, cz, xMin: xMinE, xMax: xMaxE,
        yMin, yMax, zBack, zFront, ladoDobradicas: "esquerda", xCharneira: xMinE });
      const xMaxD = xRight - f, xMinD = xMaxD - largura;
      out.push({ idx: 1, descricao: "Porta direita", largura, altura, espessura: eP,
        cx: xMinD + largura / 2, cy, cz, xMin: xMinD, xMax: xMaxD,
        yMin, yMax, zBack, zFront, ladoDobradicas: "direita", xCharneira: xMaxD });
    }
  }
  return out;
}

export function nDobradicasPorAltura(h: number): number {
  if (h <= 900) return 2;
  if (h <= 1600) return 3;
  if (h <= 2000) return 4;
  if (h <= 2400) return 5;
  return 6;
}

export function posicoesDobradicasY(p: PortaDim): number[] {
  const n = nDobradicasPorAltura(p.altura);
  const yTop = p.yMax - 100;
  const yBot = p.yMin + 100;
  if (n <= 1) return [(yTop + yBot) / 2];
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(yBot + ((yTop - yBot) * k) / (n - 1));
  return out;
}



// ─────────────────────────────────────────────────────────────
// Gavetas — frentes + caixas (partilhado por peças, geometria, corrediças)
// ─────────────────────────────────────────────────────────────

export interface GavetaFrente {
  idx: number;
  descricao: string;
  size: Vec3;
  center: Vec3;
}

export interface GavetaCaixa {
  idx: number;
  center: Vec3;          // centro 3D da caixa (X=W/2; Y=cyFrente; Z meio)
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  espessuraCaixa: number;
  espessuraFundo: number;
  zBack: number;
  zFront: number;
  folgaLateralPorLado: number; // efetiva, vinda da corrediça
  tipoCorredica?: CorredicaTipo;
  requerRasgoTraseira: boolean; // TODO: para corrediça oculta com rebaixoFundo
}

export interface GavetasResult {
  frentes: GavetaFrente[];
  caixas: GavetaCaixa[];
}

export function dimensoesGavetas(config: ModuleConfig): GavetasResult {
  const g = config.gavetas;
  if (!g || g.nGavetas <= 0) return { frentes: [], caixas: [] };
  const { dims, espessuraPadrao, espessuras } = config;
  const W = dims.width, H = dims.height, D = dims.depth;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  const n = g.nGavetas;
  const f = g.folga;
  const eF = g.espessuraFrente && g.espessuraFrente > 0 ? g.espessuraFrente : espessuraPadrao;

  // Limites em X/Y consoante o modo
  let xMin: number, xMax: number, yMin: number, yMax: number, zBack: number, zFront: number, cz: number;
  if (g.modo === "sobreposta") {
    xMin = f; xMax = W - f;
    yMin = f; yMax = H - f;
    zBack = D; zFront = D + eF; cz = D + eF / 2;
  } else {
    xMin = e.lateral + f; xMax = W - e.lateral - f;
    yMin = e.base + f; yMax = H - e.tampo - f;
    zBack = D - eF; zFront = D; cz = D - eF / 2;
  }
  const larguraFrente = xMax - xMin;
  const cx = (xMin + xMax) / 2;
  const espacoY = yMax - yMin;
  const alturaFrente = Math.round((espacoY - (n - 1) * f) / n);

  // Geometria da caixa (igual para todas as gavetas)
  // folgaLateralPorLado vem da ferragem escolhida (category='corredica'); fallback 13mm.
  const fl = g.corredica.folgaLateralPorLado ?? g.corredica.folgaLateral ?? 13;
  const boxWidth = W - 2 * e.lateral - 2 * fl;
  const boxDepth = Math.min(g.corredica.comprimento, D - 10);
  const boxHeight = Math.max(60, alturaFrente - g.alturaCaixaFolga);
  // Caixa recuada da frente: zStart = e.lateral (proxy de folga interior); cz_caixa = zStart + boxDepth/2
  const zStartCaixa = e.lateral;
  const cz_caixa = zStartCaixa + boxDepth / 2;

  const frentes: GavetaFrente[] = [];
  const caixas: GavetaCaixa[] = [];

  for (let j = 0; j < n; j++) {
    const cyFrente = yMin + j * (alturaFrente + f) + alturaFrente / 2;
    frentes.push({
      idx: j,
      descricao: `Frente gaveta ${j + 1}`,
      size: [larguraFrente, alturaFrente, eF],
      center: [cx, cyFrente, cz],
    });
    caixas.push({
      idx: j,
      center: [W / 2, cyFrente, cz_caixa],
      boxWidth, boxHeight, boxDepth,
      espessuraCaixa: g.espessuraCaixa,
      espessuraFundo: g.espessuraFundo,
      zBack: zStartCaixa,
      zFront: zStartCaixa + boxDepth,
      folgaLateralPorLado: fl,
      tipoCorredica: g.corredica.tipo,
      requerRasgoTraseira: g.corredica.tipo === "oculta" && !!g.corredica.rebaixoFundo,
    });
  }

  return { frentes, caixas };
}
