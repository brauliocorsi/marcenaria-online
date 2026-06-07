// Motor paramétrico do módulo (caixa). Função pura, determinística.
// Todas as medidas em mm. Cálculos internos podem ser decimais; resultados
// arredondados a inteiro.
import { revealOfPuxador, type PuxadorSnapshot } from "./puxadores";

export type PieceType = "lateral" | "tampo" | "base" | "prateleira" | "fundo" | "porta" | "gaveta_frente" | "gaveta_lateral" | "gaveta_frenteCaixa" | "gaveta_fundo" | "tamponamento" | "puxador";
export type PortaModo = "sobreposta" | "embutida";
export type LadoAbertura = "esquerda" | "direita";
export type SistemaMontagem = "laterais_cobrem" | "tampo_base_cobrem";
export type FundoModo = "sobreposto" | "ranhura" | "rasgo";
export type Veio = "comprimento" | "largura" | "sem";

export interface PainelComRasgo {
  laterais: boolean;
  tampo: boolean;
  base: boolean;
}

// Operação "Rasgo" (fresa/disco) — distinta de furação.
export interface Rasgo {
  ref: string;
  peca: PieceType;
  eixo: "X" | "Y" | "Z";
  pos: [number, number, number]; // canto inicial em coords do módulo (gaveta inclusa)
  comprimento: number;
  largura: number;       // = espessura do painel encaixado
  profundidade: number;
}

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
  prof_ranhura: number;          // = profundidadeRasgo (default 8)
  recuo: number;                 // reservado
  recuoTraseiroRasgo?: number;   // mm (default 8)
  painelComRasgo?: PainelComRasgo; // default {laterais:true, tampo:true, base:true}
  espacamentoParafusoFundo?: number; // mm (default 250)
}

export type TipoPorta = "melamina" | "aluminio_espelho";

/** Snapshot inline do puxador escolhido (caching p/ engine puro). */
export interface PuxadorRef {
  id?: string | null;
  tipo: "convencional" | "cava" | "gola_j" | "gola_c";
  config: Record<string, any>;
  nome?: string;
}
export type PuxadorPos = "superior" | "inferior" | "lateral";

export interface PortasConfig {
  nPortas: 0 | 1 | 2;
  modo: PortaModo;
  ladoAbertura: LadoAbertura; // só relevante p/ 1 porta
  espessura: number | null;   // null = espessuraPadrao
  folga: number;
  folgaCentral: number;
  /** Tipo construtivo da porta. Default 'melamina' (comportamento clássico). */
  tipoPorta?: TipoPorta;
  /** Largura do perfil de alumínio (mm), só usado em aluminio_espelho. Default 25. */
  perfilLarguraMm?: number;
  /** Espessura do perfil/painel (mm) na porta de alumínio. Default 20. */
  perfilEspessuraMm?: number;
  /** Puxador aplicado às portas. */
  puxador?: PuxadorRef | null;
  /** Posiçao do puxador na frente. Default 'superior'. */
  puxadorPos?: PuxadorPos;
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
  distanciaFundoGaveta?: number;     // mm do bordo inferior (default 10)
  profundidadeRasgoGaveta?: number;  // mm (default 8)
  /** Puxador aplicado às frentes de gaveta. */
  puxador?: PuxadorRef | null;
  /** Posiçao do puxador na frente. Default 'superior'. */
  puxadorPos?: PuxadorPos;
}

export interface PesConfig {
  ativo: boolean;
  altura: number;       // mm
  quantidade: 4 | 6;
  recuo: number;        // mm (do canto)
}

export interface TamponamentoConfig {
  esquerda: boolean;
  direita: boolean;
  topo: boolean;
  espessura: number | null; // null = espessuraPadrao
}

export interface Sistema32Config {
  ativo: boolean;
  recuoFrente: number;
  recuoTras: number;
  passoVertical: number;
  inicioY: number;
  fimY: number;
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
  /** true → prateleiras móveis em pinos Ø5; false → prateleiras fixas em minifix+cavilha. Default true. */
  prateleirasMoveis?: boolean;
  portas: PortasConfig;
  // REGRA: se nGavetas>0, a frente são gavetas (portas ignoradas).
  gavetas: GavetasConfig;
  pes: PesConfig;
  tamponamento: TamponamentoConfig;
  sistema32: Sistema32Config;
  /** ID do material aplicado à carcaça (laterais/tampo/base/prateleiras/fundo). */
  materialCorpoId?: string | null;
  /** ID do material aplicado às frentes (portas + frentes de gaveta). Fallback = materialCorpoId. */
  materialFrenteId?: string | null;
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

  {
    const fd = dimensoesFundoCarcaca(config);
    pecas.push({
      tipo: "fundo", descricao: fundo.modo === "sobreposto" ? "Fundo (sobreposto)" : "Fundo (rasgo)",
      qtd: 1,
      comprimento_mm: r(fd.wF),
      largura_mm: r(fd.hF),
      espessura_mm: r(fundo.espessura),
      veio: "largura",
    });
  }

  // Portas como peças reais (apenas se não houver gavetas)
  const tipoPortaCfg = config.portas.tipoPorta ?? "melamina";
  for (const pp of dimensoesPortas(config)) {
    if (tipoPortaCfg === "aluminio_espelho") {
      // Porta alumínio + espelho: emite perfil (mm lineares) + área de espelho (m²)
      const perfilW = config.portas.perfilLarguraMm ?? 25;
      const perfilE = config.portas.perfilEspessuraMm ?? 20;
      const perimetro_mm = 2 * (pp.largura + pp.altura);
      const espW = Math.max(0, pp.largura - 2 * perfilW);
      const espH = Math.max(0, pp.altura - 2 * perfilW);
      const area_m2 = (espW * espH) / 1_000_000;
      pecas.push({
        tipo: "porta", descricao: `${pp.descricao} — Perfil alumínio`,
        qtd: 1, comprimento_mm: r(perimetro_mm), largura_mm: r(perfilW), espessura_mm: r(perfilE),
        veio: "sem",
      });
      pecas.push({
        tipo: "porta", descricao: `${pp.descricao} — Espelho/vidro`,
        qtd: 1, comprimento_mm: r(espH), largura_mm: r(espW),
        espessura_mm: 4, // espelho típico 4mm
        veio: "sem",
      });
      // anotação informativa para o utilizador (área em m²)
      pecas.push({
        tipo: "porta", descricao: `${pp.descricao} — Espelho (área m²) = ${area_m2.toFixed(3)}`,
        qtd: 1, comprimento_mm: 0, largura_mm: 0, espessura_mm: 0, veio: "sem",
      });
    } else {
      pecas.push({
        tipo: "porta", descricao: pp.descricao,
        qtd: 1, comprimento_mm: r(pp.altura), largura_mm: r(pp.largura), espessura_mm: r(pp.espessura),
        veio: "comprimento",
      });
    }
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
    const fg = dimensoesFundoGaveta(c, config);
    pecas.push({
      tipo: "gaveta_fundo", descricao: `Fundo gaveta ${c.idx + 1}`,
      qtd: 1, comprimento_mm: r(fg.wFundo), largura_mm: r(fg.dFundo), espessura_mm: r(c.espessuraFundo),
      veio: "largura",
    });
  }

  // Perfis de gola (alumínio) — 1 por host (portas/gavetas) quando o puxador é gola_j/gola_c.
  // Comprimento = largura do módulo. Quantidade = nº de frentes que partilham a gola.
  const W_mod = dims.width;
  const puxPortas = config.portas.puxador as PuxadorSnapshot | null | undefined;
  if (puxPortas && (puxPortas.tipo === "gola_j" || puxPortas.tipo === "gola_c")) {
    const cfgG = (puxPortas.config ?? {}) as any;
    const letra = puxPortas.tipo === "gola_j" ? "J" : "C";
    pecas.push({
      tipo: "puxador", descricao: `Perfil gola ${letra} (portas)`,
      qtd: 1,
      comprimento_mm: r(W_mod),
      largura_mm: r(cfgG.perfilLargura ?? 20),
      espessura_mm: r(cfgG.perfilProf ?? 20),
      veio: "sem",
    });
  }
  const puxGav = config.gavetas.puxador as PuxadorSnapshot | null | undefined;
  if (puxGav && (puxGav.tipo === "gola_j" || puxGav.tipo === "gola_c") && config.gavetas.nGavetas > 0) {
    const cfgG = (puxGav.config ?? {}) as any;
    const letra = puxGav.tipo === "gola_j" ? "J" : "C";
    pecas.push({
      tipo: "puxador", descricao: `Perfil gola ${letra} (gavetas)`,
      qtd: config.gavetas.nGavetas,
      comprimento_mm: r(W_mod),
      largura_mm: r(cfgG.perfilLargura ?? 20),
      espessura_mm: r(cfgG.perfilProf ?? 20),
      veio: "sem",
    });
  }


  // Tamponamento como peças de corte
  for (const t of dimensoesTamponamentos(config)) {
    // size = [largura(X), altura(Y), prof(Z)]
    // Para esquerda/direita: comprimento = H, largura = D, espessura = X(e)
    // Para topo: comprimento = W, largura = D, espessura = Y(e)
    const isVertical = t.lado !== "topo";
    pecas.push({
      tipo: "tamponamento", descricao: t.descricao, qtd: 1,
      comprimento_mm: r(isVertical ? t.size[1] : t.size[0]),
      largura_mm: r(t.size[2]),
      espessura_mm: r(isVertical ? t.size[0] : t.size[1]),
      veio: "comprimento",
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
  fundo: {
    modo: "sobreposto", espessura: 4, prof_ranhura: 8, recuo: 0,
    recuoTraseiroRasgo: 8,
    painelComRasgo: { laterais: true, tampo: true, base: true },
    espacamentoParafusoFundo: 250,
  },
  nPrateleiras: 1,
  prateleirasMoveis: true,

  portas: { nPortas: 0, modo: "sobreposta", ladoAbertura: "direita", espessura: null, folga: 2, folgaCentral: 3 },
  gavetas: {
    nGavetas: 0, modo: "sobreposta", folga: 3, espessuraFrente: 19,
    corredica: { hardwareId: null, comprimento: 500, folgaLateralPorLado: 13 },
    espessuraCaixa: 16, espessuraFundo: 4, alturaCaixaFolga: 30,
    distanciaFundoGaveta: 10, profundidadeRasgoGaveta: 8,
  },
  pes: { ativo: false, altura: 100, quantidade: 4, recuo: 50 },
  tamponamento: { esquerda: false, direita: false, topo: false, espessura: null },
  sistema32: { ativo: false, recuoFrente: 37, recuoTras: 37, passoVertical: 32, inicioY: 100, fimY: 620 },
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
  if (!out.pes) out.pes = { ...DEFAULT_MODULE_CONFIG.pes };
  if (!out.tamponamento) out.tamponamento = { ...DEFAULT_MODULE_CONFIG.tamponamento };
  if (!out.sistema32) out.sistema32 = { ...DEFAULT_MODULE_CONFIG.sistema32, fimY: Math.max(200, out.dims.height - 100) };
  if (typeof out.prateleirasMoveis !== "boolean") out.prateleirasMoveis = true;
  // Fundo — backfill novos campos
  out.fundo = {
    ...DEFAULT_MODULE_CONFIG.fundo,
    ...out.fundo,
    painelComRasgo: out.fundo?.painelComRasgo ?? { laterais: true, tampo: true, base: true },
  };
  // Gavetas — backfill rasgo
  out.gavetas = {
    ...out.gavetas,
    distanciaFundoGaveta: out.gavetas.distanciaFundoGaveta ?? 10,
    profundidadeRasgoGaveta: out.gavetas.profundidadeRasgoGaveta ?? 8,
  };
  return out;

}

// ─────────────────────────────────────────────────────────────
// Pés (acessório — não é peça de corte)
// ─────────────────────────────────────────────────────────────
export interface PesResult {
  posicoes: Vec3[]; // (x, yCentro, z) — yCentro = -altura/2
  quantidade: number;
  altura: number;
}

export function calcularPes(config: ModuleConfig): PesResult {
  const p = config.pes;
  if (!p || !p.ativo) return { posicoes: [], quantidade: 0, altura: 0 };
  const W = config.dims.width, D = config.dims.depth;
  const r = Math.max(0, p.recuo);
  const yC = -p.altura / 2;
  const corners: Vec3[] = [
    [r, yC, r], [W - r, yC, r], [r, yC, D - r], [W - r, yC, D - r],
  ];
  const pos: Vec3[] = p.quantidade === 6
    ? [...corners, [W / 2, yC, r], [W / 2, yC, D - r]]
    : corners;
  return { posicoes: pos, quantidade: pos.length, altura: p.altura };
}

// ─────────────────────────────────────────────────────────────
// Tamponamento (painéis de acabamento — peças de corte)
// ─────────────────────────────────────────────────────────────
export interface TamponamentoPeca {
  lado: "esquerda" | "direita" | "topo";
  descricao: string;
  size: Vec3;
  center: Vec3;
  veio: Veio;
}

export function dimensoesTamponamentos(config: ModuleConfig): TamponamentoPeca[] {
  const t = config.tamponamento;
  if (!t) return [];
  const W = config.dims.width, H = config.dims.height, D = config.dims.depth;
  const e = t.espessura && t.espessura > 0 ? t.espessura : config.espessuraPadrao;
  const out: TamponamentoPeca[] = [];
  if (t.esquerda) out.push({ lado: "esquerda", descricao: "Tamponamento esquerda",
    size: [e, H, D], center: [-e / 2, H / 2, D / 2], veio: "comprimento" });
  if (t.direita) out.push({ lado: "direita", descricao: "Tamponamento direita",
    size: [e, H, D], center: [W + e / 2, H / 2, D / 2], veio: "comprimento" });
  if (t.topo) out.push({ lado: "topo", descricao: "Tamponamento topo",
    size: [W, e, D], center: [W / 2, H + e / 2, D / 2], veio: "comprimento" });
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

  {
    const fd = dimensoesFundoCarcaca(config);
    out.push({
      tipo: "fundo",
      descricao: fundo.modo === "sobreposto" ? "Fundo (sobreposto)" : "Fundo (rasgo)",
      veio: "largura",
      size: [fd.wF, fd.hF, fundo.espessura],
      center: [(fd.xMin + fd.xMax) / 2, (fd.yMin + fd.yMax) / 2, fundo.espessura / 2],
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
    // fundo da gaveta (rasgo) — encaixado nas 4 peças da caixa
    const fg = dimensoesFundoGaveta(c, config);
    out.push({ tipo: "gaveta_fundo", descricao: `Fundo gaveta ${c.idx + 1}`, veio: "largura",
      size: [fg.wFundo, c.espessuraFundo, fg.dFundo], center: [c.center[0], fg.yFundo, c.center[2]] });
  }

  // Tamponamentos
  for (const t of dimensoesTamponamentos(config)) {
    out.push({ tipo: "tamponamento", descricao: t.descricao, veio: t.veio,
      size: t.size, center: t.center });
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

function aplicarRevealFrente(
  yMin: number, yMax: number, altura: number, cy: number,
  reveal: number, pos: PuxadorPos | undefined,
) {
  if (reveal <= 0) return { yMin, yMax, altura, cy };
  const p = pos ?? "superior";
  if (p === "superior") {
    const nyMax = yMax - reveal, nAlt = altura - reveal;
    return { yMin, yMax: nyMax, altura: nAlt, cy: (yMin + nyMax) / 2 };
  }
  if (p === "inferior") {
    const nyMin = yMin + reveal, nAlt = altura - reveal;
    return { yMin: nyMin, yMax, altura: nAlt, cy: (nyMin + yMax) / 2 };
  }
  // lateral: sem alteração de altura
  return { yMin, yMax, altura, cy };
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

  // Encurtamento por gola (reveal) — aplicado a TODAS as portas resultantes.
  const reveal = revealOfPuxador((portas.puxador ?? null) as PuxadorSnapshot | null);
  if (reveal > 0) {
    const pos = portas.puxadorPos ?? "superior";
    for (const p of out) {
      const adj = aplicarRevealFrente(p.yMin, p.yMax, p.altura, p.cy, reveal, pos);
      p.yMin = adj.yMin; p.yMax = adj.yMax; p.altura = adj.altura; p.cy = adj.cy;
    }
  }
  return out;
}

// ─── Porta alumínio + espelho: geometria das peças do caixilho + painel ───
export interface AluPortaPiece {
  kind: "perfil_topo" | "perfil_base" | "perfil_esq" | "perfil_dir" | "espelho";
  size: [number, number, number];   // [W, H, espessura]
  center: [number, number, number]; // relativo à porta (origem no canto inferior-esq da porta)
}
export function pecasPortaAluminio(W: number, H: number, perfilW = 25, perfilE = 20): AluPortaPiece[] {
  const espW = Math.max(1, W - 2 * perfilW);
  const espH = Math.max(1, H - 2 * perfilW);
  const ez = perfilE; // ambos no mesmo plano Z
  return [
    // 4 perfis (caixilho)
    { kind: "perfil_topo", size: [W, perfilW, ez], center: [W / 2, H - perfilW / 2, ez / 2] },
    { kind: "perfil_base", size: [W, perfilW, ez], center: [W / 2, perfilW / 2, ez / 2] },
    { kind: "perfil_esq",  size: [perfilW, espH, ez], center: [perfilW / 2, H / 2, ez / 2] },
    { kind: "perfil_dir",  size: [perfilW, espH, ez], center: [W - perfilW / 2, H / 2, ez / 2] },
    // espelho recuado 2mm para trás
    { kind: "espelho", size: [espW, espH, 4], center: [W / 2, H / 2, ez / 2 - 2] },
  ];
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

  // Encurtamento por gola (reveal) aplicado por cada frente de gaveta.
  const revealG = revealOfPuxador((g.puxador ?? null) as PuxadorSnapshot | null);
  const posG = g.puxadorPos ?? "superior";

  for (let j = 0; j < n; j++) {
    const cyFrente = yMin + j * (alturaFrente + f) + alturaFrente / 2;
    let altF = alturaFrente, cyF = cyFrente;
    if (revealG > 0) {
      const yMinF = cyFrente - alturaFrente / 2;
      const yMaxF = cyFrente + alturaFrente / 2;
      const adj = aplicarRevealFrente(yMinF, yMaxF, alturaFrente, cyFrente, revealG, posG);
      altF = adj.altura; cyF = adj.cy;
    }
    frentes.push({
      idx: j,
      descricao: `Frente gaveta ${j + 1}`,
      size: [larguraFrente, altF, eF],
      center: [cx, cyF, cz],
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

// ─────────────────────────────────────────────────────────────
// Fundo da carcaça — dimensões partilhadas (peças + geometria + rasgos)
// ─────────────────────────────────────────────────────────────
export function dimensoesFundoCarcaca(config: ModuleConfig) {
  const { dims, espessuraPadrao, espessuras, fundo } = config;
  const W = dims.width, H = dims.height;
  const e = resolverEspessuras(espessuraPadrao, espessuras);
  if (fundo.modo === "sobreposto") {
    return { wF: W, hF: H, xMin: 0, xMax: W, yMin: 0, yMax: H, espF: fundo.espessura, sobreposto: true as const };
  }
  const pr = fundo.prof_ranhura;
  const pc = fundo.painelComRasgo ?? { laterais: true, tampo: true, base: true };
  const xMin = pc.laterais ? e.lateral - pr : e.lateral;
  const xMax = pc.laterais ? W - e.lateral + pr : W - e.lateral;
  const yMin = pc.base ? e.base - pr : e.base;
  const yMax = pc.tampo ? H - e.tampo + pr : H - e.tampo;
  return { wF: xMax - xMin, hF: yMax - yMin, xMin, xMax, yMin, yMax, espF: fundo.espessura, sobreposto: false as const };
}

export function dimensoesFundoGaveta(c: GavetaCaixa, config: ModuleConfig) {
  const g = config.gavetas;
  const espC = c.espessuraCaixa;
  const prG = g.profundidadeRasgoGaveta ?? 8;
  const dG = g.distanciaFundoGaveta ?? 10;
  const larguraInt = c.boxWidth - 2 * espC;
  const profundidadeInt = c.boxDepth - 2 * espC;
  const wFundo = larguraInt + 2 * prG;
  const dFundo = profundidadeInt + 2 * prG;
  const yFundo = c.center[1] - c.boxHeight / 2 + dG + c.espessuraFundo / 2;
  return { wFundo, dFundo, yFundo, prG, dG };
}

// ─────────────────────────────────────────────────────────────
// Operações de rasgo (fresa/disco) — carcaça + gavetas
// ─────────────────────────────────────────────────────────────
export function calcularRasgos(config: ModuleConfig): Rasgo[] {
  const out: Rasgo[] = [];
  const { dims, espessuraPadrao, espessuras, fundo, sistemaMontagem } = config;
  const W = dims.width, H = dims.height;
  const e = resolverEspessuras(espessuraPadrao, espessuras);

  if (fundo.modo !== "sobreposto") {
    const pr = fundo.prof_ranhura;
    const recT = fundo.recuoTraseiroRasgo ?? 8;
    const espF = fundo.espessura;
    const pc = fundo.painelComRasgo ?? { laterais: true, tampo: true, base: true };
    const yStartLat = sistemaMontagem === "laterais_cobrem" ? 0 : e.base;
    const yEndLat   = sistemaMontagem === "laterais_cobrem" ? H : H - e.tampo;
    const xStartTB  = sistemaMontagem === "tampo_base_cobrem" ? 0 : e.lateral;
    const xEndTB    = sistemaMontagem === "tampo_base_cobrem" ? W : W - e.lateral;
    if (pc.laterais) {
      out.push({ ref: "fundo_lateral_esq", peca: "lateral", eixo: "Y",
        pos: [e.lateral, yStartLat, recT], comprimento: yEndLat - yStartLat, largura: espF, profundidade: pr });
      out.push({ ref: "fundo_lateral_dir", peca: "lateral", eixo: "Y",
        pos: [W - e.lateral, yStartLat, recT], comprimento: yEndLat - yStartLat, largura: espF, profundidade: pr });
    }
    if (pc.tampo) {
      out.push({ ref: "fundo_tampo", peca: "tampo", eixo: "X",
        pos: [xStartTB, H - e.tampo, recT], comprimento: xEndTB - xStartTB, largura: espF, profundidade: pr });
    }
    if (pc.base) {
      out.push({ ref: "fundo_base", peca: "base", eixo: "X",
        pos: [xStartTB, e.base, recT], comprimento: xEndTB - xStartTB, largura: espF, profundidade: pr });
    }
  }

  // Gavetas — rasgo nas 4 peças da caixa para o fundo encaixar.
  const g = config.gavetas;
  if (g && g.nGavetas > 0) {
    const { caixas } = dimensoesGavetas(config);
    const espC = g.espessuraCaixa;
    const espFG = g.espessuraFundo;
    for (const c of caixas) {
      const fg = dimensoesFundoGaveta(c, config);
      const yR = c.center[1] - c.boxHeight / 2 + fg.dG;
      const xIL = c.center[0] - c.boxWidth / 2 + espC;
      const xIR = c.center[0] + c.boxWidth / 2 - espC;
      const zBackI = c.zBack + espC;
      const zFrontI = c.zFront - espC;
      out.push({ ref: `gaveta${c.idx + 1}_ilharga_esq`, peca: "gaveta_lateral", eixo: "Z",
        pos: [xIL, yR, c.zBack], comprimento: c.boxDepth, largura: espFG, profundidade: fg.prG });
      out.push({ ref: `gaveta${c.idx + 1}_ilharga_dir`, peca: "gaveta_lateral", eixo: "Z",
        pos: [xIR, yR, c.zBack], comprimento: c.boxDepth, largura: espFG, profundidade: fg.prG });
      out.push({ ref: `gaveta${c.idx + 1}_frente`, peca: "gaveta_frenteCaixa", eixo: "X",
        pos: [c.center[0] - c.boxWidth / 2, yR, zFrontI], comprimento: c.boxWidth, largura: espFG, profundidade: fg.prG });
      out.push({ ref: `gaveta${c.idx + 1}_traseira`, peca: "gaveta_frenteCaixa", eixo: "X",
        pos: [c.center[0] - c.boxWidth / 2, yR, zBackI], comprimento: c.boxWidth, largura: espFG, profundidade: fg.prG });
    }
  }

  return out;
}
