// Motor puro de peças de gaveta por TEMPLATE de construção.
// Independente do pipeline existente do módulo: recebe dimensões da caixa
// (boxWidth × boxHeight × boxDepth) e devolve peças, rasgos e furos.
//
// 3 tipos suportados:
//  - "classica":        4 peças (2 ilhargas + frente + traseira) + fundo em rasgo
//  - "frente_integrada": SEM frente de caixa; frente decorativa aparafusa nas ilhargas
//  - "legrabox":        ilhargas altas (alturaIlharga ≠ boxHeight); frente decorativa cobre o vão

export type GavetaTipo = "classica" | "frente_integrada" | "legrabox";

export interface GavetaTemplateConfigClassica {
  e_ilharga: number; e_frente: number; e_traseira: number; e_fundo: number;
  modoFundo: "rasgo" | "sobreposto";
  profRasgo: number; distanciaFundo: number;
  ilhargasCobrem: "frente_traseira";
}
export interface GavetaTemplateConfigFrenteIntegrada {
  e_ilharga: number; e_traseira: number; e_fundo: number;
  modoFundo: "rasgo" | "sobreposto";
  profRasgo: number; distanciaFundo: number;
  parafusosFrenteN: number;
}
export interface GavetaTemplateConfigLegrabox {
  e_ilharga: number; alturaIlharga: number; e_traseira: number; e_fundo: number;
  modoFundo: "rasgo" | "sobreposto";
  profRasgo: number; distanciaFundo: number;
  e_frente?: number; // para fundo (placeholder traseiro/frontal)
}

export type GavetaTemplateConfig =
  | GavetaTemplateConfigClassica
  | GavetaTemplateConfigFrenteIntegrada
  | GavetaTemplateConfigLegrabox;

export interface GavetaTemplate {
  id?: string;
  nome: string;
  tipo: GavetaTipo;
  config: GavetaTemplateConfig;
}

export const DEFAULT_CLASSICA: GavetaTemplateConfigClassica = {
  e_ilharga: 16, e_frente: 16, e_traseira: 16, e_fundo: 3.5,
  modoFundo: "rasgo", profRasgo: 8, distanciaFundo: 10,
  ilhargasCobrem: "frente_traseira",
};
export const DEFAULT_FRENTE_INTEGRADA: GavetaTemplateConfigFrenteIntegrada = {
  e_ilharga: 16, e_traseira: 16, e_fundo: 3.5,
  modoFundo: "rasgo", profRasgo: 8, distanciaFundo: 10,
  parafusosFrenteN: 2,
};
export const DEFAULT_LEGRABOX: GavetaTemplateConfigLegrabox = {
  e_ilharga: 16, alturaIlharga: 90, e_traseira: 16, e_fundo: 3.5,
  modoFundo: "rasgo", profRasgo: 8, distanciaFundo: 10, e_frente: 16,
};

export const GAVETA_TEMPLATES_DEFAULT: GavetaTemplate[] = [
  { nome: "Caixa Clássica", tipo: "classica", config: DEFAULT_CLASSICA },
  { nome: "Frente Integrada", tipo: "frente_integrada", config: DEFAULT_FRENTE_INTEGRADA },
  { nome: "Legrabox / Alto", tipo: "legrabox", config: DEFAULT_LEGRABOX },
];

export const TIPO_LABEL: Record<GavetaTipo, string> = {
  classica: "Caixa Clássica",
  frente_integrada: "Frente Integrada",
  legrabox: "Legrabox / Alto",
};

// ─── Resultado ──────────────────────────────────────────────────────────
export type PieceKind = "ilharga" | "frente" | "traseira" | "fundo";
export interface GavetaPieceOut {
  kind: PieceKind;
  descricao: string;
  qtd: number;
  comprimento: number;
  largura: number;
  espessura: number;
}
export interface GavetaRasgoOut {
  ref: string; peca: PieceKind;
  largura: number; profundidade: number;
}
export interface GavetaFuroOut {
  ref: string; peca: PieceKind;
  diametro: number; profundidade: number;
}
export interface GavetaTemplateResult {
  pecas: GavetaPieceOut[];
  rasgos: GavetaRasgoOut[];
  furos: GavetaFuroOut[];
  // Render hint para o 3D
  alturaCaixa: number;        // ilharga.height (legrabox < boxHeight; outros = boxHeight)
  alturaFrenteDecorativa: number; // sempre boxHeight (= altura do vão)
  desenhaFrenteCaixa: boolean; // false para frente_integrada
}

const r = (v: number) => Math.round(v * 10) / 10;

export function pecasGavetaPorTemplate(
  tpl: GavetaTemplate,
  dims: { boxWidth: number; boxHeight: number; boxDepth: number },
  e_frente_decorativa = 19,
): GavetaTemplateResult {
  const { boxWidth: W, boxHeight: H, boxDepth: D } = dims;
  const pecas: GavetaPieceOut[] = [];
  const rasgos: GavetaRasgoOut[] = [];
  const furos: GavetaFuroOut[] = [];

  if (tpl.tipo === "classica") {
    const c = tpl.config as GavetaTemplateConfigClassica;
    const ei = c.e_ilharga, ef = c.e_frente, et = c.e_traseira, pr = c.profRasgo;
    pecas.push({ kind: "ilharga", descricao: "Ilharga", qtd: 2,
      comprimento: r(D), largura: r(H), espessura: r(ei) });
    pecas.push({ kind: "frente", descricao: "Frente caixa", qtd: 1,
      comprimento: r(W - 2 * ei), largura: r(H), espessura: r(ef) });
    pecas.push({ kind: "traseira", descricao: "Traseira caixa", qtd: 1,
      comprimento: r(W - 2 * ei), largura: r(H), espessura: r(et) });
    const fW = (W - 2 * ei) + 2 * pr;
    const fD = (D - ef - et) + 2 * pr;
    pecas.push({ kind: "fundo", descricao: "Fundo", qtd: 1,
      comprimento: r(fW), largura: r(fD), espessura: r(c.e_fundo) });
    if (c.modoFundo === "rasgo") {
      (["ilharga", "frente", "traseira"] as PieceKind[]).forEach((p, i) => {
        const refs = ["ilharga_esq+dir", "frente", "traseira"];
        rasgos.push({ ref: `fundo_${refs[i]}`, peca: p,
          largura: c.e_fundo, profundidade: pr });
      });
      // Conta como rasgo nas 4 peças (ilharga × 2 + frente + traseira)
      rasgos.push({ ref: "fundo_ilharga_dup", peca: "ilharga", largura: c.e_fundo, profundidade: pr });
    }
    return { pecas, rasgos, furos,
      alturaCaixa: H, alturaFrenteDecorativa: H, desenhaFrenteCaixa: true };
  }

  if (tpl.tipo === "frente_integrada") {
    const c = tpl.config as GavetaTemplateConfigFrenteIntegrada;
    const ei = c.e_ilharga, et = c.e_traseira, pr = c.profRasgo;
    // Ilharga vai de frente a trás: profundidade total = D
    pecas.push({ kind: "ilharga", descricao: "Ilharga (frente integrada)", qtd: 2,
      comprimento: r(D), largura: r(H), espessura: r(ei) });
    pecas.push({ kind: "traseira", descricao: "Traseira caixa", qtd: 1,
      comprimento: r(W - 2 * ei), largura: r(H), espessura: r(et) });
    const fW = (W - 2 * ei) + 2 * pr;
    const fD = (D - et) + pr;
    pecas.push({ kind: "fundo", descricao: "Fundo", qtd: 1,
      comprimento: r(fW), largura: r(fD), espessura: r(c.e_fundo) });
    if (c.modoFundo === "rasgo") {
      rasgos.push({ ref: "fundo_ilharga_esq", peca: "ilharga", largura: c.e_fundo, profundidade: pr });
      rasgos.push({ ref: "fundo_ilharga_dir", peca: "ilharga", largura: c.e_fundo, profundidade: pr });
      rasgos.push({ ref: "fundo_traseira", peca: "traseira", largura: c.e_fundo, profundidade: pr });
    }
    // Furos de fixação da frente decorativa: parafusosFrenteN por ilharga (Ø5)
    for (let lado = 0; lado < 2; lado++) {
      for (let k = 0; k < c.parafusosFrenteN; k++) {
        furos.push({ ref: `fix_frente_${lado === 0 ? "esq" : "dir"}_${k + 1}`,
          peca: "ilharga", diametro: 5, profundidade: 30 });
      }
    }
    return { pecas, rasgos, furos,
      alturaCaixa: H, alturaFrenteDecorativa: H, desenhaFrenteCaixa: false };
  }

  // legrabox
  {
    const c = tpl.config as GavetaTemplateConfigLegrabox;
    const ei = c.e_ilharga, et = c.e_traseira, pr = c.profRasgo;
    const hI = c.alturaIlharga;
    const ef = c.e_frente ?? 16;
    pecas.push({ kind: "ilharga", descricao: "Ilharga (legrabox)", qtd: 2,
      comprimento: r(D), largura: r(hI), espessura: r(ei) });
    pecas.push({ kind: "traseira", descricao: "Traseira", qtd: 1,
      comprimento: r(W - 2 * ei), largura: r(hI), espessura: r(et) });
    const fW = (W - 2 * ei) + 2 * pr;
    const fD = (D - ef - et) + 2 * pr;
    pecas.push({ kind: "fundo", descricao: "Fundo", qtd: 1,
      comprimento: r(fW), largura: r(fD), espessura: r(c.e_fundo) });
    if (c.modoFundo === "rasgo") {
      rasgos.push({ ref: "fundo_ilharga_esq", peca: "ilharga", largura: c.e_fundo, profundidade: pr });
      rasgos.push({ ref: "fundo_ilharga_dir", peca: "ilharga", largura: c.e_fundo, profundidade: pr });
      rasgos.push({ ref: "fundo_traseira", peca: "traseira", largura: c.e_fundo, profundidade: pr });
    }
    return { pecas, rasgos, furos,
      alturaCaixa: hI, alturaFrenteDecorativa: H, desenhaFrenteCaixa: false };
  }
}

// ─── Asserts ─────────────────────────────────────────────────────────────
export function runGavetaTemplateAsserts() {
  const dims = { boxWidth: 762, boxHeight: 200, boxDepth: 500 };

  const cla = pecasGavetaPorTemplate(
    { nome: "C", tipo: "classica", config: DEFAULT_CLASSICA }, dims);
  const ilC = cla.pecas.find(p => p.kind === "ilharga")!;
  const frC = cla.pecas.find(p => p.kind === "frente")!;
  const fdC = cla.pecas.find(p => p.kind === "fundo")!;
  const okC = ilC.comprimento === 500 && ilC.largura === 200 && ilC.espessura === 16 &&
    frC.comprimento === 730 && frC.largura === 200 && frC.espessura === 16 &&
    fdC.comprimento === 746 && fdC.largura === 484 &&
    cla.rasgos.length === 4 && cla.desenhaFrenteCaixa === true;

  const fi = pecasGavetaPorTemplate(
    { nome: "FI", tipo: "frente_integrada", config: DEFAULT_FRENTE_INTEGRADA }, dims);
  const ilFI = fi.pecas.find(p => p.kind === "ilharga")!;
  const okFI = fi.pecas.every(p => p.kind !== "frente") &&
    ilFI.comprimento === 500 &&
    fi.furos.filter(f => f.peca === "ilharga" && f.diametro === 5).length === 4 &&
    fi.desenhaFrenteCaixa === false;

  const lg = pecasGavetaPorTemplate(
    { nome: "LG", tipo: "legrabox", config: DEFAULT_LEGRABOX }, dims);
  const ilLG = lg.pecas.find(p => p.kind === "ilharga")!;
  const okLG = ilLG.largura === 90 && lg.alturaCaixa === 90 &&
    lg.alturaFrenteDecorativa === 200 && lg.desenhaFrenteCaixa === false;

  const tests: Array<[string, boolean]> = [
    ["[novo] classica: ilharga 500×200×16, frente 730×200×16, fundo 746×484, 4 rasgos", okC],
    ["[novo] frente_integrada: ZERO frente, ilharga.depth=500, 4 furos Ø5 (2/ilharga)", okFI],
    ["[novo] legrabox: ilharga.height=90, frente_decorativa=vão (boxHeight)", okLG],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[gaveta-template.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info("[gaveta-template.assert] ✓ 3 templates produzem peças/rasgos/furos corretos.");
  return ok;
}
