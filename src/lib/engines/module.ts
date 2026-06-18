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

export type EspelhoModo = "nenhum" | "todas" | "alternadas" | "apenas_uma";

export interface PortasCorrerConfig {
  ativo: boolean;
  nFolhas: 2 | 3 | 4;
  espelho: EspelhoModo;
  perfilLarguraMm: number;       // perfil alumínio (largura)
  perfilEspessuraMm: number;     // espessura do painel/perfil
  recuoFrente: number;           // mm — distância das calhas à frente do módulo
  alturaCalhaSup: number;        // mm — altura da calha superior (perfil)
  alturaCalhaInf: number;        // mm — altura da calha inferior
  folga: number;                 // mm — folga lateral entre folhas e laterais
  sobreposicao: number;          // mm — quanto as folhas sobrepõem entre si
}

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
  /** [Roupeiros] Portas de correr globais. Quando ativo suprime portas batentes (módulo + secções). */
  correr?: PortasCorrerConfig;
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

// ─── Secções (Fase B1 + Roupeiros) ─────────────────────────
export type SecaoTipo =
  | "nicho_aberto"
  | "porta"
  | "gavetas"
  | "varao"
  | "maleiro_aberto"
  | "maleiro_fechado";

export interface SecaoNichoConfig { prateleirasMoveis?: number; }
export interface SecaoPortaConfig {
  nPortas?: 0 | 1 | 2;
  ladoAbertura?: LadoAbertura;
  folga?: number;
  folgaCentral?: number;
  espessura?: number | null;
}
export interface SecaoGavetasConfig {
  nGavetas?: number;
  folga?: number;
  espessuraFrente?: number;
  corredica?: CorredicaConfig;
  espessuraCaixa?: number;
  espessuraFundo?: number;
  alturaCaixaFolga?: number;
  distanciaFundoGaveta?: number;
  profundidadeRasgoGaveta?: number;
  /** [Roupeiros] Gaveteiro interno: frente em material de carcaça, sem puxador. */
  interno?: boolean;
  /** [Roupeiros] Frente cega (sem puxador, sem rasgo) vs com puxador. Default true para internas. */
  frenteCega?: boolean;
  /** [Roupeiros] Alturas individuais por gaveta (mm). Quando definido, ignora divisão igualitária. Soma deve = altura útil. */
  alturasGavetas_mm?: number[];
}
export interface SecaoVaraoConfig {
  /** Distância do topo da secção ao varão (mm). Default 40. */
  recuoTopoVarao_mm?: number;
  /** Recuo do varão à frente do roupeiro (mm). Default = profundidade/2. */
  recuoFrontalVarao_mm?: number;
  /** Altura útil mínima para roupa pendurada (mm). Informativo/validação. Default 1000. */
  alturaUtilRoupa_mm?: number;
  /** Adiciona prateleira superior (típico maleiro pequeno acima do varão). */
  prateleiraSuperior?: boolean;
  /** Distância do topo da secção à prateleira superior (mm). Default 80. */
  alturaPrateleira_mm?: number;
}
export interface SecaoMaleiroConfig {
  /** Altura da prateleira fixa dentro da secção (a partir do fundo da secção). Default = metade da secção. */
  alturaPrateleira_mm?: number;
  /** Nº de prateleiras fixas extra (default 1). */
  nPrateleiras?: number;
  /** Só para maleiro_fechado — reusa SecaoPortaConfig. */
  nPortas?: 0 | 1 | 2;
  ladoAbertura?: LadoAbertura;
  folga?: number;
  folgaCentral?: number;
  espessura?: number | null;
}
export interface Secao {
  id: string;
  altura_mm: number;
  tipo: SecaoTipo;
  config?: Partial<
    SecaoNichoConfig & SecaoPortaConfig & SecaoGavetasConfig & SecaoVaraoConfig & SecaoMaleiroConfig
  >;
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
  /** [novo A1] Categoria do módulo. Opcional → módulos antigos inalterados. */
  categoria?: "base" | "superior" | "coluna" | "gaveteiro" | "canto" | "ilha" | "roupeiro" | "nicho";
  /** [novo B1] Secções (divisórias estruturais + delegação por tipo). Opcional. */
  secoes?: Secao[];
  /** [Roupeiros P2] Colunas verticais (largura + pilha de secções). Quando presente, substitui `secoes`. */
  colunas?: ColunaRoupeiro[];
  /** [novo B3] Subtipo de canto (categoria==='canto'). */
  cantoTipo?: "l" | "cego" | "diagonal";
  /** [novo B3] Parâmetros do canto diagonal (footprint pentagonal). */
  cantoDiagonal?: {
    ladoEsq: number;
    ladoDir: number;
    profRetornoEsq: number;
    profRetornoDir: number;
  };
  /** [novo B5] Parâmetros do canto em L (footprint 6 vértices). */
  cantoL?: {
    ladoEsq: number;
    ladoDir: number;
    profundidade: number;
  };
  /** [novo B5] Parâmetros do canto cego (caixa + filler frontal). */
  cantoCego?: {
    largura: number;
    profundidade: number;
    larguraFiller: number;
    larguraPortaUtil: number;
  };
}

/** [Roupeiros P2] Coluna vertical de um roupeiro. */
export interface ColunaRoupeiro {
  id: string;
  largura_mm: number;
  secoes?: Secao[];
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

  if (nPrateleiras > 0 && !temSecoesOuColunas(config)) {
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

  // [B1] Divisórias + prateleiras móveis por secção 'nicho_aberto'.
  if (temSecoesOuColunas(config)) {
    const dd = dimensoesDivisorias(config);
    for (const c of dd.centers) {
      pecas.push({
        tipo: "prateleira", descricao: `Divisória horiz. col${c.idx + 1}`,
        qtd: 1,
        comprimento_mm: r(c.comprimento), largura_mm: r(c.largura),
        espessura_mm: r(dd.espessura), veio: "comprimento",
      });
    }
    // [Roupeiros P2] Divisórias verticais entre colunas
    if (temColunas(config)) {
      const ci = colunasIntervalos(config);
      for (const dv of ci.divisoriasVerticais) {
        pecas.push({
          tipo: "lateral", descricao: `Divisória vertical ${dv.idx + 1}`,
          qtd: 1,
          comprimento_mm: r(dv.yMax - dv.yMin),
          largura_mm: r(D),
          espessura_mm: r(dv.espessura),
          veio: "comprimento",
        });
      }
    }
    // Prateleiras móveis por nicho (iteradas por coluna via paraCadaColuna)
    const nichos = paraCadaColuna(config, ({ col, intervalos }) =>
      intervalos.filter(it => it.secao.tipo === "nicho_aberto").map(it => ({
        col, it, np: (it.secao.config as SecaoNichoConfig | undefined)?.prateleirasMoveis ?? 0,
      }))
    );
    for (const n of nichos) {
      if (n.np <= 0) continue;
      pecas.push({
        tipo: "prateleira", descricao: `Prateleira nicho col${n.col.idx + 1}#${n.it.idx + 1}`,
        qtd: n.np,
        comprimento_mm: r(n.col.larguraUtil - folgas.prateleira_lateral),
        largura_mm: r(D - folgas.prateleira_recuo),
        espessura_mm: r(e.prateleira), veio: "comprimento",
      });
    }
    // [Roupeiros] Maleiro prateleiras
    for (const mp of dimensoesMaleiroPrateleiras(config)) {
      pecas.push({
        tipo: "prateleira", descricao: `Prateleira maleiro col${mp.colIdx + 1} sec${mp.idx + 1}`,
        qtd: 1,
        comprimento_mm: r(mp.size[0]), largura_mm: r(mp.size[2]),
        espessura_mm: r(mp.size[1]), veio: "comprimento",
      });
    }
    // [Roupeiros] Varões
    for (const v of dimensoesVaroes(config)) {
      pecas.push({
        tipo: "puxador", descricao: `Varão Ø${v.diametro_mm} cromado col${v.colIdx + 1} sec${v.idx + 1}`,
        qtd: 1, comprimento_mm: r(v.comprimento_mm), largura_mm: v.diametro_mm,
        espessura_mm: v.diametro_mm, veio: "sem",
      });
      pecas.push({
        tipo: "puxador", descricao: `Suporte varão col${v.colIdx + 1} sec${v.idx + 1}`,
        qtd: 2, comprimento_mm: 40, largura_mm: 25, espessura_mm: 25, veio: "sem",
      });
    }
  }


  // [Roupeiros] Portas de correr — folhas + calhas
  if (config.portas?.correr?.ativo) {
    const cr = config.portas.correr;
    const { folhas, calhas } = dimensoesPortasCorrer(config);
    for (const f of folhas) {
      pecas.push({
        tipo: "porta",
        descricao: `Folha correr ${f.idx + 1}${f.espelho ? " (espelho)" : ""}`,
        qtd: 1,
        comprimento_mm: r(f.altura),
        largura_mm: r(f.largura),
        espessura_mm: r(f.espessura),
        veio: "comprimento",
      });
    }
    for (const k of calhas) {
      pecas.push({
        tipo: "tamponamento",
        descricao: `Calha correr ${k.posicao} (alu duas-vias)`,
        qtd: 1,
        comprimento_mm: r(k.comprimento),
        largura_mm: r(k.largura),
        espessura_mm: r(k.espessura),
        veio: "sem",
      });
    }
    // perfis verticais nas folhas (puramente acessório informativo)
    pecas.push({
      tipo: "puxador", descricao: `Perfil vertical folha (alu)`,
      qtd: cr.nFolhas * 2,
      comprimento_mm: r(config.dims.height - cr.alturaCalhaSup - cr.alturaCalhaInf),
      largura_mm: cr.perfilLarguraMm, espessura_mm: cr.perfilEspessuraMm, veio: "sem",
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
// Secções (Fase B1) — divisórias estruturais + delegação por tipo
// ─────────────────────────────────────────────────────────────
export interface SecaoIntervalo {
  idx: number;
  secao: Secao;
  yMin: number;
  yMax: number;
}
export interface DivisoriaInfo {
  idx: number;
  espessura: number;
  yMin: number;
  yMax: number;
  yCenter: number;
}

export function temSecoes(c: ModuleConfig): boolean {
  return Array.isArray(c.secoes) && c.secoes.length > 0;
}

export function intervalosSecoes(config: ModuleConfig): {
  intervalos: SecaoIntervalo[]; divisorias: DivisoriaInfo[]; alturaInterna: number;
} {
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const yBot = e.base;
  const yTop = config.dims.height - e.tampo;
  const alturaInterna = yTop - yBot;
  if (!temSecoes(config)) return { intervalos: [], divisorias: [], alturaInterna };
  const arr = config.secoes!;
  const intervalos: SecaoIntervalo[] = [];
  const divisorias: DivisoriaInfo[] = [];
  let y = yBot;
  arr.forEach((s, idx) => {
    const yMin = y;
    const yMax = y + s.altura_mm;
    intervalos.push({ idx, secao: s, yMin, yMax });
    if (idx < arr.length - 1) {
      const espD = e.prateleira;
      divisorias.push({ idx, espessura: espD, yMin: yMax, yMax: yMax + espD, yCenter: yMax + espD / 2 });
      y = yMax + espD;
    }
  });
  return { intervalos, divisorias, alturaInterna };
}

/** Helper: existe alguma estrutura de secções (legado `secoes` OU novo `colunas`). */
export function temSecoesOuColunas(c: ModuleConfig): boolean {
  return temSecoes(c) || temColunas(c);
}

export function dimensoesDivisorias(config: ModuleConfig): {
  espessura: number;
  centers: { yCenter: number; idx: number; xMin: number; xMax: number; comprimento: number; largura: number }[];
} {
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const D = config.dims.depth;
  const larg = D - config.folgas.prateleira_recuo;
  const fLat = config.folgas.prateleira_lateral;
  const centers: { yCenter: number; idx: number; xMin: number; xMax: number; comprimento: number; largura: number }[] = [];
  const { intervalos: cols } = colunasIntervalos(config);
  for (const col of cols) {
    const secoes = temColunas(config) ? col.secoes : (config.secoes ?? []);
    if (secoes.length === 0) continue;
    const { divisorias } = intervalosSecoesLista(config, secoes);
    for (const d of divisorias) {
      centers.push({
        yCenter: d.yCenter, idx: d.idx,
        xMin: col.xMin, xMax: col.xMax,
        comprimento: col.larguraUtil - fLat, largura: larg,
      });
    }
  }
  return { espessura: e.prateleira, centers };
}


// ─────────────────────────────────────────────────────────────
// [Roupeiros] Varões, prateleiras de maleiro e portas de correr
// ─────────────────────────────────────────────────────────────
export interface VaraoItem {
  idx: number;
  colIdx: number;
  cy: number;          // altura do eixo do varão (mm)
  cz: number;          // profundidade central (mm)
  comprimento_mm: number;
  diametro_mm: number; // Ø25 cromado
  xMin: number; xMax: number;
}
export interface MaleiroPrateleira {
  idx: number;
  colIdx: number;
  cy: number;
  size: Vec3; // [largura, espessura, profundidade]
  center: Vec3;
}

export function dimensoesVaroes(config: ModuleConfig): VaraoItem[] {
  if (!temSecoesOuColunas(config)) return [];
  const D = config.dims.depth;
  return paraCadaColuna(config, ({ col, intervalos }) => {
    const out: VaraoItem[] = [];
    for (const it of intervalos) {
      if (it.secao.tipo !== "varao") continue;
      const sc = (it.secao.config ?? {}) as SecaoVaraoConfig;
      const recuo = sc.recuoTopoVarao_mm ?? 40;
      const cy = Math.max(it.yMin + 20, it.yMax - recuo);
      out.push({
        idx: it.idx, colIdx: col.idx, cy, cz: D / 2,
        comprimento_mm: col.xMax - col.xMin, diametro_mm: 25,
        xMin: col.xMin, xMax: col.xMax,
      });
    }
    return out;
  });
}

export function dimensoesMaleiroPrateleiras(config: ModuleConfig): MaleiroPrateleira[] {
  if (!temSecoesOuColunas(config)) return [];
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const D = config.dims.depth;
  const fLat = config.folgas.prateleira_lateral;
  const pratDep = D - config.folgas.prateleira_recuo;
  return paraCadaColuna(config, ({ col, intervalos }) => {
    const pratLen = col.larguraUtil - fLat;
    const xCenter = (col.xMin + col.xMax) / 2;
    const out: MaleiroPrateleira[] = [];
    for (const it of intervalos) {
      if (it.secao.tipo === "maleiro_aberto" || it.secao.tipo === "maleiro_fechado") {
        const sc = (it.secao.config ?? {}) as SecaoMaleiroConfig;
        const n = Math.max(1, sc.nPrateleiras ?? 1);
        const innerH = it.yMax - it.yMin;
        for (let i = 1; i <= n; i++) {
          const cy = it.yMin + (innerH * i) / (n + 1);
          out.push({
            idx: it.idx, colIdx: col.idx, cy,
            size: [pratLen, e.prateleira, pratDep],
            center: [xCenter, cy, pratDep / 2],
          });
        }
      } else if (it.secao.tipo === "varao") {
        const sc = (it.secao.config ?? {}) as SecaoVaraoConfig;
        if (sc.prateleiraSuperior) {
          const altP = sc.alturaPrateleira_mm ?? 80;
          const cy = Math.max(it.yMin + 20, it.yMax - altP);
          out.push({
            idx: it.idx, colIdx: col.idx, cy,
            size: [pratLen, e.prateleira, pratDep],
            center: [xCenter, cy, pratDep / 2],
          });
        }
      }
    }
    return out;
  });
}


export interface CorrerFolha {
  idx: number;          // 0..n-1
  largura: number;
  altura: number;
  espessura: number;
  espelho: boolean;
  cx: number; cy: number; cz: number;
  trilho: 0 | 1;        // qual via (frontal/traseira) no perfil duas-vias
}
export interface CorrerCalha {
  posicao: "sup" | "inf";
  comprimento: number;  // = W
  largura: number;      // perfilLargura
  espessura: number;    // altura do perfil
  cy: number;
  cz: number;
}
export interface CorrerResult {
  folhas: CorrerFolha[];
  calhas: CorrerCalha[];
}

function folhaTemEspelho(modo: EspelhoModo, i: number, n: number): boolean {
  if (modo === "todas") return true;
  if (modo === "alternadas") return i % 2 === 0;
  if (modo === "apenas_uma") return i === 0;
  return false;
}

export function dimensoesPortasCorrer(config: ModuleConfig): CorrerResult {
  const c = config.portas?.correr;
  if (!c || !c.ativo) return { folhas: [], calhas: [] };
  const W = config.dims.width, H = config.dims.height, D = config.dims.depth;
  const n = c.nFolhas;
  const sob = Math.max(0, c.sobreposicao);
  const fl = Math.max(0, c.folga);
  // largura útil entre laterais externas
  const usefulW = W - 2 * fl + (n - 1) * sob;
  const larguraFolha = usefulW / n;
  const alturaFolha = H - c.alturaCalhaSup - c.alturaCalhaInf;
  const cyFolha = c.alturaCalhaInf + alturaFolha / 2;
  // 2 vias (frontal/traseira) — pares numa via, ímpares na outra
  const zVia0 = D + c.recuoFrente + c.perfilEspessuraMm / 2;
  const zVia1 = D + c.recuoFrente + c.perfilEspessuraMm + c.perfilEspessuraMm / 2;
  const folhas: CorrerFolha[] = [];
  for (let i = 0; i < n; i++) {
    const cx = fl + larguraFolha / 2 + i * (larguraFolha - sob);
    const via = (i % 2) as 0 | 1;
    folhas.push({
      idx: i,
      largura: larguraFolha,
      altura: alturaFolha,
      espessura: c.perfilEspessuraMm,
      espelho: folhaTemEspelho(c.espelho, i, n),
      cx, cy: cyFolha, cz: via === 0 ? zVia0 : zVia1,
      trilho: via,
    });
  }
  const zCalhaCenter = D + c.recuoFrente + c.perfilEspessuraMm;
  const calhas: CorrerCalha[] = [
    { posicao: "sup", comprimento: W, largura: c.perfilLarguraMm, espessura: c.alturaCalhaSup,
      cy: H - c.alturaCalhaSup / 2, cz: zCalhaCenter },
    { posicao: "inf", comprimento: W, largura: c.perfilLarguraMm, espessura: c.alturaCalhaInf,
      cy: c.alturaCalhaInf / 2, cz: zCalhaCenter },
  ];
  return { folhas, calhas };
}


// ─────────────────────────────────────────────────────────────
// [Roupeiros P2] Colunas verticais
// ─────────────────────────────────────────────────────────────
export interface ColunaIntervalo {
  idx: number;
  coluna: ColunaRoupeiro;
  xMin: number;
  xMax: number;
  larguraUtil: number;
  secoes: Secao[];
}
export interface DivisoriaVertical {
  idx: number;
  xCenter: number;
  espessura: number;
  yMin: number;
  yMax: number;
}
export function temColunas(c: ModuleConfig): boolean {
  return Array.isArray(c.colunas) && c.colunas.length > 0;
}

export function colunasIntervalos(config: ModuleConfig): {
  intervalos: ColunaIntervalo[];
  divisoriasVerticais: DivisoriaVertical[];
  larguraInterna: number;
} {
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const xLeft = e.lateral;
  const xRight = config.dims.width - e.lateral;
  const larguraInterna = xRight - xLeft;
  const yBot = e.base;
  const yTop = config.dims.height - e.tampo;
  if (!temColunas(config)) {
    return {
      intervalos: [{ idx: 0, coluna: { id: "_default", largura_mm: larguraInterna, secoes: config.secoes ?? [] }, xMin: xLeft, xMax: xRight, larguraUtil: larguraInterna, secoes: config.secoes ?? [] }],
      divisoriasVerticais: [],
      larguraInterna,
    };
  }
  const cols = config.colunas!;
  const intervalos: ColunaIntervalo[] = [];
  const divisorias: DivisoriaVertical[] = [];
  let x = xLeft;
  cols.forEach((col, i) => {
    const xMin = x;
    const xMax = x + col.largura_mm;
    intervalos.push({ idx: i, coluna: col, xMin, xMax, larguraUtil: col.largura_mm, secoes: col.secoes ?? [] });
    if (i < cols.length - 1) {
      const esp = e.lateral;
      divisorias.push({ idx: i, xCenter: xMax + esp / 2, espessura: esp, yMin: yBot, yMax: yTop });
      x = xMax + esp;
    } else {
      x = xMax;
    }
  });
  return { intervalos, divisoriasVerticais: divisorias, larguraInterna };
}

/** Calcula intervalos verticais (yMin/yMax + divisórias horizontais) a partir de um array de secoes
 *  com base/tampo do módulo. Reusa lógica de `intervalosSecoes` mas para uma lista arbitrária. */
function intervalosSecoesLista(config: ModuleConfig, secoes: Secao[]): {
  intervalos: SecaoIntervalo[]; divisorias: DivisoriaInfo[]; alturaInterna: number;
} {
  const e = resolverEspessuras(config.espessuraPadrao, config.espessuras);
  const yBot = e.base;
  const yTop = config.dims.height - e.tampo;
  const alturaInterna = yTop - yBot;
  if (secoes.length === 0) return { intervalos: [], divisorias: [], alturaInterna };
  const intervalos: SecaoIntervalo[] = [];
  const divisorias: DivisoriaInfo[] = [];
  let y = yBot;
  secoes.forEach((s, idx) => {
    const yMin = y;
    const yMax = y + s.altura_mm;
    intervalos.push({ idx, secao: s, yMin, yMax });
    if (idx < secoes.length - 1) {
      const espD = e.prateleira;
      divisorias.push({ idx, espessura: espD, yMin: yMax, yMax: yMax + espD, yCenter: yMax + espD / 2 });
      y = yMax + espD;
    }
  });
  return { intervalos, divisorias, alturaInterna };
}

/** Itera todas as colunas (ou única "coluna implícita" quando não há colunas) e devolve
 *  para cada uma os intervalos verticais e bounds X. Usado pelos emit-helpers. */
export function paraCadaColuna<T>(
  config: ModuleConfig,
  fn: (ctx: { col: ColunaIntervalo; intervalos: SecaoIntervalo[]; divisorias: DivisoriaInfo[] }) => T[],
): T[] {
  const out: T[] = [];
  const { intervalos: cols } = colunasIntervalos(config);
  for (const col of cols) {
    const secoes = temColunas(config) ? col.secoes : (config.secoes ?? []);
    const { intervalos, divisorias } = intervalosSecoesLista(config, secoes);
    out.push(...fn({ col, intervalos, divisorias }));
  }
  return out;
}



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

  if (nPrateleiras > 0 && !temSecoesOuColunas(config)) {
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

  // [B1 + P2 Roupeiros] Divisórias verticais (colunas), divisórias horizontais por coluna,
  // nichos, maleiro shelves, prateleira superior de varão.
  if (temSecoesOuColunas(config)) {
    const pratDep = D - folgas.prateleira_recuo;

    // Divisórias verticais entre colunas
    if (temColunas(config)) {
      const ci = colunasIntervalos(config);
      for (const dv of ci.divisoriasVerticais) {
        const h = dv.yMax - dv.yMin;
        out.push({
          tipo: "lateral", descricao: `Divisória vertical ${dv.idx + 1}`, veio: "comprimento",
          size: [dv.espessura, h, D],
          center: [dv.xCenter, dv.yMin + h / 2, D / 2],
        });
      }
    }

    // Divisórias horizontais por coluna
    const dd = dimensoesDivisorias(config);
    for (const c of dd.centers) {
      out.push({
        tipo: "prateleira", descricao: `Divisória horiz. col${c.idx + 1}`, veio: "comprimento",
        size: [c.comprimento, dd.espessura, c.largura],
        center: [(c.xMin + c.xMax) / 2, c.yCenter, c.largura / 2],
      });
    }

    // Prateleiras móveis por nicho
    const nichoExt = paraCadaColuna(config, ({ col, intervalos }) =>
      intervalos.filter(it => it.secao.tipo === "nicho_aberto").map(it => ({ col, it }))
    );
    for (const { col, it } of nichoExt) {
      const np = (it.secao.config as SecaoNichoConfig | undefined)?.prateleirasMoveis ?? 0;
      if (np <= 0) continue;
      const innerH = it.yMax - it.yMin;
      const pratLen = col.larguraUtil - folgas.prateleira_lateral;
      const xC = (col.xMin + col.xMax) / 2;
      for (let i = 1; i <= np; i++) {
        const cy = it.yMin + (innerH * i) / (np + 1);
        out.push({
          tipo: "prateleira", descricao: `Prateleira nicho col${col.idx + 1} sec${it.idx + 1}#${i}`, veio: "comprimento",
          size: [pratLen, e.prateleira, pratDep],
          center: [xC, cy, pratDep / 2],
        });
      }
    }

    // Prateleiras fixas de maleiro (aberto/fechado) + prateleira sup. varão
    for (const mp of dimensoesMaleiroPrateleiras(config)) {
      out.push({
        tipo: "prateleira",
        descricao: `Prateleira maleiro col${mp.colIdx + 1} sec${mp.idx + 1}`,
        veio: "comprimento",
        size: mp.size, center: mp.center,
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
  // [Roupeiros] Portas de correr globais suprimem TODAS as batentes (módulo + secções).
  if (config.portas?.correr?.ativo) return [];
  // [B1] Secções: gera portas por cada secção do tipo 'porta' OU 'maleiro_fechado'.
  if (temSecoesOuColunas(config)) {
    const out: PortaDim[] = [];
    const D = config.dims.depth;
    const baseP = config.portas;
    const colsIter = paraCadaColuna(config, ({ col, intervalos }) =>
      intervalos.map(it => ({ col, it }))
    );
    for (const { col, it } of colsIter) {
      if (it.secao.tipo !== "porta" && it.secao.tipo !== "maleiro_fechado") continue;
      const sc = (it.secao.config ?? {}) as SecaoPortaConfig;
      const nP = (sc.nPortas ?? 1) as 0 | 1 | 2;
      if (nP === 0) continue;
      const f = sc.folga ?? baseP.folga;
      const fc = sc.folgaCentral ?? baseP.folgaCentral;
      const espOv = sc.espessura ?? baseP.espessura;
      const espP = espOv && espOv > 0 ? espOv : config.espessuraPadrao;
      const lado = (sc.ladoAbertura ?? baseP.ladoAbertura) as LadoAbertura;
      const zBack = D, zFront = D + espP, cz = D + espP / 2;
      const yMin = it.yMin + f, yMax = it.yMax - f, altura = yMax - yMin, cy = (yMin + yMax) / 2;
      const tag = `col${col.idx + 1} sec${it.idx + 1}`;
      const cxMin = col.xMin, cxMax = col.xMax;
      if (nP === 1) {
        const xMin = cxMin + f, xMax = cxMax - f, largura = xMax - xMin, cx = (xMin + xMax) / 2;
        const ladoDob: LadoDobradicas = lado === "direita" ? "esquerda" : "direita";
        const xCharneira = ladoDob === "esquerda" ? xMin : xMax;
        out.push({ idx: 0, descricao: `Porta ${tag}`, largura, altura, espessura: espP,
          cx, cy, cz, xMin, xMax, yMin, yMax, zBack, zFront, ladoDobradicas: ladoDob, xCharneira });
      } else {
        const larguraTotal = (cxMax - cxMin) - 2 * f - fc;
        const largura = larguraTotal / 2;
        const xMinE = cxMin + f, xMaxE = xMinE + largura;
        out.push({ idx: 0, descricao: `Porta esq ${tag}`, largura, altura, espessura: espP,
          cx: xMinE + largura / 2, cy, cz, xMin: xMinE, xMax: xMaxE, yMin, yMax, zBack, zFront, ladoDobradicas: "esquerda", xCharneira: xMinE });
        const xMaxD = cxMax - f, xMinD = xMaxD - largura;
        out.push({ idx: 1, descricao: `Porta dir ${tag}`, largura, altura, espessura: espP,
          cx: xMinD + largura / 2, cy, cz, xMin: xMinD, xMax: xMaxD, yMin, yMax, zBack, zFront, ladoDobradicas: "direita", xCharneira: xMaxD });
      }
    }
    const reveal = revealOfPuxador((config.portas.puxador ?? null) as PuxadorSnapshot | null);
    if (reveal > 0) {
      const pos = config.portas.puxadorPos ?? "superior";
      for (const p of out) {
        const adj = aplicarRevealFrente(p.yMin, p.yMax, p.altura, p.cy, reveal, pos);
        p.yMin = adj.yMin; p.yMax = adj.yMax; p.altura = adj.altura; p.cy = adj.cy;
      }
    }
    return out;
  }

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
  // [B1] Secções: gera gavetas por cada secção do tipo 'gavetas'.
  if (temSecoesOuColunas(config)) {
    const frentes: GavetaFrente[] = [];
    const caixas: GavetaCaixa[] = [];
    const baseG = config.gavetas ?? DEFAULT_MODULE_CONFIG.gavetas;
    const D = config.dims.depth;
    let cnt = 0;
    const colsIter = paraCadaColuna(config, ({ col, intervalos }) =>
      intervalos.map(it => ({ col, it }))
    );
    for (const { col, it } of colsIter) {
      if (it.secao.tipo !== "gavetas") continue;
      const sc = (it.secao.config ?? {}) as SecaoGavetasConfig;
      const n = sc.nGavetas ?? baseG.nGavetas ?? 1;
      if (n <= 0) continue;
      const f = sc.folga ?? baseG.folga;
      const eF = sc.espessuraFrente && sc.espessuraFrente > 0 ? sc.espessuraFrente : (baseG.espessuraFrente || config.espessuraPadrao);
      const corr = sc.corredica ?? baseG.corredica;
      const espC = sc.espessuraCaixa ?? baseG.espessuraCaixa;
      const espFundo = sc.espessuraFundo ?? baseG.espessuraFundo;
      const alturaFolga = sc.alturaCaixaFolga ?? baseG.alturaCaixaFolga;
      const xMin = col.xMin + f, xMax = col.xMax - f;
      const yMin = it.yMin + f, yMax = it.yMax - f;
      const zBack = D, zFront = D + eF, cz = D + eF / 2;
      const larguraFrente = xMax - xMin;
      const cx = (xMin + xMax) / 2;
      const espacoY = yMax - yMin;
      const alturaFrente = Math.round((espacoY - (n - 1) * f) / n);
      const fl = corr.folgaLateralPorLado ?? corr.folgaLateral ?? 13;
      const boxWidth = col.larguraUtil - 2 * fl;
      const boxDepth = Math.min(corr.comprimento, D - 10);
      const boxHeight = Math.max(60, alturaFrente - alturaFolga);
      const zStartCaixa = 0;
      const cz_caixa = zStartCaixa + boxDepth / 2;
      for (let j = 0; j < n; j++) {
        const cyFrente = yMin + j * (alturaFrente + f) + alturaFrente / 2;
        frentes.push({
          idx: cnt,
          descricao: `Frente gaveta ${cnt + 1} (col${col.idx + 1} sec${it.idx + 1})`,
          size: [larguraFrente, alturaFrente, eF],
          center: [cx, cyFrente, cz],
        });
        caixas.push({
          idx: cnt,
          center: [cx, cyFrente, cz_caixa],
          boxWidth, boxHeight, boxDepth,
          espessuraCaixa: espC, espessuraFundo: espFundo,
          zBack: zStartCaixa, zFront: zStartCaixa + boxDepth,
          folgaLateralPorLado: fl,
          tipoCorredica: corr.tipo,
          requerRasgoTraseira: corr.tipo === "oculta" && !!corr.rebaixoFundo,
        });
        cnt++;
      }
    }
    return { frentes, caixas };
  }

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
