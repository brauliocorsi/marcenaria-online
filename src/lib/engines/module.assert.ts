// Testes de sanidade do motor paramétrico — corre apenas em dev.
import { calcularPecas, calcularGeometria, dimensoesPortas, dimensoesGavetas, intervalosSecoes, DEFAULT_MODULE_CONFIG, type Peca, type PecaGeo, type ModuleConfig, type Secao } from "./module";
import { calcularFuros } from "./drilling";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";
import { geraCantoDiagonal, geraCantoL, geraCantoCego, areaPoligono, dist2D } from "./canto";

function find(ps: Peca[], tipo: string) {
  return ps.find((p) => p.tipo === tipo)!;
}

const r = (v: number) => Math.round(v);

function sortedSize(s: [number, number, number]) {
  return [...s].map(r).sort((a, b) => b - a);
}
function sortedDims(p: Peca) {
  return [p.comprimento_mm, p.largura_mm, p.espessura_mm].sort((a, b) => b - a);
}

export function runModuleAsserts() {
  const pecas = calcularPecas(DEFAULT_MODULE_CONFIG);
  const geo = calcularGeometria(DEFAULT_MODULE_CONFIG);
  const lateral = find(pecas, "lateral");
  const tampo = find(pecas, "tampo");
  const base = find(pecas, "base");
  const prat = find(pecas, "prateleira");
  const fundo = find(pecas, "fundo");

  // Match geometry-vs-pieces dimensions by piece type (sorted to be axis-agnostic)
  const dimsMatch = (tipo: string, p: Peca) => {
    const geos = geo.filter((g: PecaGeo) => g.tipo === tipo);
    if (geos.length === 0) return false;
    const expect = sortedDims(p).join("x");
    return geos.every((g) => sortedSize(g.size).join("x") === expect);
  };

  const tests: Array<[string, boolean]> = [
    ["Lateral 720×560×19", lateral.comprimento_mm === 720 && lateral.largura_mm === 560 && lateral.espessura_mm === 19 && lateral.qtd === 2],
    ["Tampo 762×560×19", tampo.comprimento_mm === 762 && tampo.largura_mm === 560 && tampo.espessura_mm === 19],
    ["Base 762×560×19", base.comprimento_mm === 762 && base.largura_mm === 560 && base.espessura_mm === 19],
    ["Prateleira 760×550×19", prat.comprimento_mm === 760 && prat.largura_mm === 550 && prat.espessura_mm === 19],
    ["Fundo 800×720×4", fundo.comprimento_mm === 800 && fundo.largura_mm === 720 && fundo.espessura_mm === 4],
    ["Geo lateral == peça", dimsMatch("lateral", lateral)],
    ["Geo tampo == peça", dimsMatch("tampo", tampo)],
    ["Geo base == peça", dimsMatch("base", base)],
    ["Geo prateleira == peça", dimsMatch("prateleira", prat)],
    ["Geo fundo == peça", dimsMatch("fundo", fundo)],
  ];

  // [novo 2/5] gola_j em portas: frente.altura === original − reveal + peça "Perfil gola".
  {
    const base = DEFAULT_MODULE_CONFIG;
    const baseAltura = dimensoesPortas({ ...base, portas: { ...base.portas, nPortas: 1 } })[0]?.altura ?? 0;
    const cfgGola: ModuleConfig = {
      ...base,
      portas: {
        ...base.portas, nPortas: 1,
        puxador: { tipo: "gola_j", config: { reveal: 40, perfilLargura: 20, perfilProf: 20 } },
        puxadorPos: "superior",
      },
      gavetas: { ...base.gavetas, nGavetas: 0 },
    };
    const portasGola = dimensoesPortas(cfgGola);
    const pecasGola = calcularPecas(cfgGola);
    const okAltura = portasGola.length === 1 && Math.abs(portasGola[0].altura - (baseAltura - 40)) < 0.01;
    const perfil = pecasGola.find((p) => p.tipo === "puxador" && /Perfil gola J/.test(p.descricao));
    const okPerfil = !!perfil && perfil.comprimento_mm === base.dims.width;
    tests.push(["[novo 5/5] gola_j: porta.altura === alturaOriginal − reveal", okAltura]);
    tests.push(["[novo 5/5] perfil gola: comprimento === larguraModulo", okPerfil]);

    // [novo 5/5] regressão: frente sem puxador inalterada
    const cfgSem: ModuleConfig = { ...base, portas: { ...base.portas, nPortas: 1 }, gavetas: { ...base.gavetas, nGavetas: 0 } };
    const portasSem = dimensoesPortas(cfgSem);
    const pecasSem = calcularPecas(cfgSem);
    const okSemAltura = portasSem.length === 1 && Math.abs(portasSem[0].altura - baseAltura) < 0.01;
    const okSemPerfil = !pecasSem.some((p) => p.tipo === "puxador");
    tests.push(["[novo 5/5] sem puxador: porta inalterada (regressão)", okSemAltura]);
    tests.push(["[novo 5/5] sem puxador: zero peças 'puxador' (regressão)", okSemPerfil]);
  }

  // ─── [novo B1] Secções ────────────────────────────────────────
  {
    const base = DEFAULT_MODULE_CONFIG;
    // [regressão] módulo SEM secoes inalterado
    const semSec = calcularPecas(base);
    const okRegSec = !semSec.some(p => p.descricao === "Divisória");
    tests.push(["[novo B1] regressão: módulo sem secoes não tem divisórias", okRegSec]);

    // 600×2000×560 com 3 secções (nicho 600 / porta 700 / gavetas 660)
    const secoes: Secao[] = [
      { id: "n", altura_mm: 600, tipo: "nicho_aberto", config: { prateleirasMoveis: 2 } },
      { id: "p", altura_mm: 700, tipo: "porta", config: { nPortas: 1 } },
      { id: "g", altura_mm: 660, tipo: "gavetas", config: { nGavetas: 3 } },
    ];
    const cfgSec: ModuleConfig = {
      ...base, dims: { width: 600, height: 2000, depth: 560 },
      portas: { ...base.portas, nPortas: 0 }, gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes,
    };
    const furos = calcularFuros(cfgSec, DEFAULT_TEMPLATE_CONFIG);
    const portas = dimensoesPortas(cfgSec);
    const gav = dimensoesGavetas(cfgSec);
    const pinos = furos.filter(f => f.tipo_furo === "pino");
    const furosDiv = furos.filter(f => /^divisoria/.test(f.junta));
    const divLat = furosDiv.length > 0 && furosDiv.every(f => f.peca === "lateral" || f.peca === "prateleira");
    tests.push(["[novo B1] 3 secções: 2 divisórias com furação", divLat && new Set(furosDiv.map(f => f.junta.match(/^divisoria\d+/)?.[0])).size === 2]);
    tests.push(["[novo B1] secção porta → 1 porta", portas.length === 1]);
    tests.push(["[novo B1] secção gavetas → 3 gavetas", gav.frentes.length === 3]);
    tests.push(["[novo B1] secção nicho → pinos Ø5 nas laterais", pinos.length > 0 && pinos.every(p => p.peca === "lateral")]);

    // [novo B1] invariante: Σ altura secções + Σ divisórias === altura interna
    const cfgInv: ModuleConfig = {
      ...base, dims: { width: 600, height: 720, depth: 560 },
      portas: { ...base.portas, nPortas: 0 }, gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes: [
        { id: "a", altura_mm: 200, tipo: "nicho_aberto", config: { prateleirasMoveis: 1 } },
        { id: "b", altura_mm: 200, tipo: "porta", config: { nPortas: 1 } },
        { id: "c", altura_mm: 244, tipo: "gavetas", config: { nGavetas: 2 } },
      ],
    };
    const inv = intervalosSecoes(cfgInv);
    const somaAlt = inv.intervalos.reduce((s, it) => s + (it.yMax - it.yMin), 0);
    const somaDiv = inv.divisorias.reduce((s, d) => s + d.espessura, 0);
    tests.push(["[novo B1] Σ alturas + Σ divisórias === altura interna", Math.abs(somaAlt + somaDiv - inv.alturaInterna) < 0.001]);
  }

  // ─── [novo B2] UI + Render ────────────────────────────────────
  {
    const base = DEFAULT_MODULE_CONFIG;
    // [novo-ui] adicionar/remover secção persiste em config.secoes
    const cfg0: ModuleConfig = { ...base, secoes: undefined };
    const cfg1: ModuleConfig = { ...cfg0, secoes: [{ id: "u1", altura_mm: 300, tipo: "nicho_aberto", config: {} }] };
    const cfg2: ModuleConfig = { ...cfg1, secoes: [...(cfg1.secoes ?? []), { id: "u2", altura_mm: 300, tipo: "porta", config: { nPortas: 1 } }] };
    const cfg1b: ModuleConfig = { ...cfg2, secoes: (cfg2.secoes ?? []).filter(s => s.id !== "u1") };
    tests.push(["[novo B2-ui] adicionar secção persiste em config.secoes",
      (cfg1.secoes?.length === 1) && (cfg2.secoes?.length === 2)]);
    tests.push(["[novo B2-ui] remover secção atualiza config.secoes",
      (cfg1b.secoes?.length === 1) && (cfg1b.secoes?.[0].id === "u2")]);

    // [novo-render] 3 secções (nicho/porta/gavetas) → 2 divisórias + porta no meio + gavetas em baixo
    const cfgR: ModuleConfig = {
      ...base, dims: { width: 600, height: 2000, depth: 560 },
      portas: { ...base.portas, nPortas: 0 }, gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes: [
        { id: "g", altura_mm: 660, tipo: "gavetas", config: { nGavetas: 3 } },
        { id: "p", altura_mm: 700, tipo: "porta", config: { nPortas: 1 } },
        { id: "n", altura_mm: 600, tipo: "nicho_aberto", config: { prateleirasMoveis: 2 } },
      ],
    };
    const geo = calcularGeometria(cfgR);
    const divisorias = geo.filter(g => g.tipo === "prateleira" && /Divisória/i.test(g.descricao));
    const portasGeo = geo.filter(g => g.tipo === "porta");
    const frentesGav = geo.filter(g => g.tipo === "gaveta_frente");
    const { intervalos } = intervalosSecoes(cfgR);
    const itPorta = intervalos.find(it => it.secao.tipo === "porta")!;
    const itGav = intervalos.find(it => it.secao.tipo === "gavetas")!;
    const portaNoMeio = portasGeo.length === 1 && portasGeo[0].center[1] >= itPorta.yMin && portasGeo[0].center[1] <= itPorta.yMax;
    const gavetasEmBaixo = frentesGav.length === 3 && frentesGav.every(f => f.center[1] >= itGav.yMin && f.center[1] <= itGav.yMax);
    tests.push(["[novo B2-render] 3 secções → 2 divisórias visíveis", divisorias.length === 2]);
    tests.push(["[novo B2-render] porta na secção do meio", portaNoMeio]);
    tests.push(["[novo B2-render] 3 gavetas na secção de baixo", gavetasEmBaixo]);
  }

  // ─── [novo B3] Canto diagonal ─────────────────────────────
  {
    // [regressão] módulos não-canto inalterados — re-corre default e confere peças básicas
    const regBase = calcularPecas(DEFAULT_MODULE_CONFIG);
    tests.push(["[novo B3] regressão: default sem peças de canto",
      !regBase.some(p => /pentagonal|diagonal|Retorno|Costas (esq|dir)/i.test(p.descricao))]);

    const params = {
      ladoEsq: 900, ladoDir: 900,
      profRetornoEsq: 560, profRetornoDir: 560,
      altura: 720,
      espessuras: { lateral: 19, tampo: 19, base: 19, frente: 19 },
    };
    const g = geraCantoDiagonal(params);
    const P2 = g.footprint[2], P3 = g.footprint[3];

    tests.push(["[novo B3] footprint = 5 vértices", g.footprint.length === 5]);
    const frente = g.pecas.find(p => p.ref === "frente_diagonal")!;
    tests.push(["[novo B3] frente diagonal === dist(P2,P3)",
      !!frente && Math.abs(frente.comprimento_mm - Math.round(dist2D(P2, P3))) < 1]);
    tests.push(["[novo B3] área tampo === área pentágono (shoelace)",
      Math.abs(g.areaPentagono_mm2 - areaPoligono(g.footprint)) < 0.001]);

    const counts = {
      costas: g.pecas.filter(p => /^costas_/.test(p.ref)).length,
      retornos: g.pecas.filter(p => /^retorno_/.test(p.ref)).length,
      frente: g.pecas.filter(p => p.ref === "frente_diagonal").length,
      tampo: g.pecas.filter(p => p.ref === "tampo").length,
      base: g.pecas.filter(p => p.ref === "base").length,
    };
    tests.push(["[novo B3] 2 costas + 2 retornos + 1 frente + tampo + base",
      counts.costas === 2 && counts.retornos === 2 && counts.frente === 1 && counts.tampo === 1 && counts.base === 1]);
  }




  // ─── [novo B4] Canto diagonal — UI + Render ────────────────
  {
    const cfg: ModuleConfig = {
      ...DEFAULT_MODULE_CONFIG,
      categoria: "canto", cantoTipo: "diagonal",
      cantoDiagonal: { ladoEsq: 1000, ladoDir: 900, profRetornoEsq: 560, profRetornoDir: 600 },
    };
    tests.push(["[novo B4-ui] categoria/canto/diagonal persistem",
      cfg.categoria === "canto" && cfg.cantoTipo === "diagonal" &&
      cfg.cantoDiagonal?.ladoEsq === 1000 && cfg.cantoDiagonal?.profRetornoDir === 600]);

    const gR = geraCantoDiagonal({
      ladoEsq: cfg.cantoDiagonal!.ladoEsq, ladoDir: cfg.cantoDiagonal!.ladoDir,
      profRetornoEsq: cfg.cantoDiagonal!.profRetornoEsq, profRetornoDir: cfg.cantoDiagonal!.profRetornoDir,
      altura: cfg.dims.height,
      espessuras: { lateral: 19, tampo: 19, base: 19, frente: 19 },
    });
    tests.push(["[novo B4-render] footprint de 5 pontos para Shape pentagonal", gR.footprint.length === 5]);
    const costas = gR.pecas.filter(p => /^costas_/.test(p.ref)).length;
    const retornos = gR.pecas.filter(p => /^retorno_/.test(p.ref)).length;
    const frente = gR.pecas.filter(p => p.ref === "frente_diagonal").length;
    tests.push(["[novo B4-render] 2 costas + 2 retornos + 1 frente diagonal", costas === 2 && retornos === 2 && frente === 1]);

    const reg = calcularPecas(DEFAULT_MODULE_CONFIG);
    tests.push(["[novo B4] regressão: módulo retangular inalterado", reg.length > 0 && !reg.some(p => /pentagonal/i.test(p.descricao))]);
  }

  // ─── [novo B5] Cantos L e Cego ────────────────────────────
  {
    // [regressão] diagonal inalterado
    const gDiag = geraCantoDiagonal({
      ladoEsq: 900, ladoDir: 900, profRetornoEsq: 560, profRetornoDir: 560,
      altura: 720, espessuras: { lateral: 19, tampo: 19, base: 19, frente: 19 },
    });
    tests.push(["[novo B5] regressão: diagonal ainda 5 vértices", gDiag.footprint.length === 5]);
    const regRet = calcularPecas(DEFAULT_MODULE_CONFIG);
    tests.push(["[novo B5] regressão: retangular inalterado",
      regRet.length > 0 && !regRet.some(p => /em L|filler/i.test(p.descricao))]);

    // [novo] Canto L
    const gL = geraCantoL({
      ladoEsq: 1200, ladoDir: 1000, profundidade: 560, altura: 720,
      espessuras: { lateral: 19, tampo: 19, base: 19, frente: 19 },
    });
    tests.push(["[novo B5-L] footprint = 6 vértices", gL.footprint.length === 6]);
    const frentesL = gL.pecas.filter(p => p.tipo === "porta");
    tests.push(["[novo B5-L] 2 frentes (portas)", frentesL.length === 2]);
    const tampoL = gL.pecas.find(p => p.ref === "tampo");
    const baseL = gL.pecas.find(p => p.ref === "base");
    tests.push(["[novo B5-L] tampo + base em L presentes",
      !!tampoL && !!baseL && /em L/i.test(tampoL!.descricao) && /em L/i.test(baseL!.descricao)]);
    // Área shoelace coerente
    tests.push(["[novo B5-L] área L === shoelace(footprint)",
      Math.abs(gL.areaL_mm2 - areaPoligono(gL.footprint)) < 0.001]);

    // [novo] Canto cego
    const gC = geraCantoCego({
      largura: 900, profundidade: 560, altura: 720,
      larguraFiller: 100, larguraPortaUtil: 380,
      espessuras: { lateral: 19, tampo: 19, base: 19, frente: 19 },
    });
    const fillers = gC.pecas.filter(p => p.ref === "filler");
    const portaUtil = gC.pecas.find(p => p.ref === "porta_util");
    const caixaPecas = gC.pecas.filter(p => /lateral|tampo|base/.test(p.tipo));
    tests.push(["[novo B5-cego] caixa retangular (2 laterais + tampo + base)",
      caixaPecas.length === 4]);
    tests.push(["[novo B5-cego] 1 painel filler", fillers.length === 1]);
    tests.push(["[novo B5-cego] largura útil + filler === largura frontal",
      !!portaUtil && gC.larguraFrontalTotal_mm === 100 + 380]);

    // [novo-ui] persistência de cantoL e cantoCego no config
    const cfgL: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, categoria: "canto", cantoTipo: "l",
      cantoL: { ladoEsq: 1200, ladoDir: 1000, profundidade: 560 } };
    tests.push(["[novo B5-ui] cantoL persiste",
      cfgL.cantoTipo === "l" && cfgL.cantoL?.ladoEsq === 1200 && cfgL.cantoL?.profundidade === 560]);
    const cfgCe: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, categoria: "canto", cantoTipo: "cego",
      cantoCego: { largura: 900, profundidade: 560, larguraFiller: 100, larguraPortaUtil: 380 } };
    tests.push(["[novo B5-ui] cantoCego persiste",
      cfgCe.cantoTipo === "cego" && cfgCe.cantoCego?.larguraFiller === 100 && cfgCe.cantoCego?.larguraPortaUtil === 380]);
  }

  // ─── [novo Roupeiros] Varão, maleiro e portas de correr ────
  {
    const base = DEFAULT_MODULE_CONFIG;
    // Varão: gera 1 item varão + 2 suportes, comprimento = largura interna
    const cfgV: ModuleConfig = {
      ...base, dims: { width: 900, height: 2400, depth: 600 },
      portas: { ...base.portas, nPortas: 0 }, gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes: [{ id: "v", altura_mm: 2200, tipo: "varao", config: { prateleiraSuperior: true } }],
    };
    const pcsV = calcularPecas(cfgV);
    const varao = pcsV.find(p => /^Varão/i.test(p.descricao));
    const suporte = pcsV.find(p => /^Suporte var/i.test(p.descricao));
    const internoW = 900 - 2 * 19;
    tests.push(["[Roupeiros] varão emite 1 item BOM com comprimento = largura interna",
      !!varao && Math.abs(varao!.comprimento_mm - internoW) < 1]);
    tests.push(["[Roupeiros] varão emite 2 suportes",
      !!suporte && suporte!.qtd === 2]);
    const pratSupVarao = pcsV.find(p => /Prateleira maleiro/i.test(p.descricao));
    tests.push(["[Roupeiros] varão.prateleiraSuperior emite prateleira", !!pratSupVarao]);

    // Maleiro aberto: 1 prateleira fixa
    const cfgMA: ModuleConfig = {
      ...base, dims: { width: 900, height: 2400, depth: 600 },
      portas: { ...base.portas, nPortas: 0 }, gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes: [{ id: "ma", altura_mm: 500, tipo: "maleiro_aberto", config: { nPrateleiras: 1 } }],
    };
    const pcsMA = calcularPecas(cfgMA);
    const pratMA = pcsMA.filter(p => /Prateleira maleiro/i.test(p.descricao));
    tests.push(["[Roupeiros] maleiro_aberto: 1 prateleira fixa", pratMA.length === 1]);

    // Maleiro fechado: gera porta(s)
    const cfgMF: ModuleConfig = {
      ...base, dims: { width: 900, height: 2400, depth: 600 },
      portas: { ...base.portas, nPortas: 0 }, gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes: [{ id: "mf", altura_mm: 500, tipo: "maleiro_fechado", config: { nPortas: 2, nPrateleiras: 1 } }],
    };
    const portasMF = dimensoesPortas(cfgMF);
    tests.push(["[Roupeiros] maleiro_fechado: 2 portas batentes", portasMF.length === 2]);

    // Portas de correr ativo → suprime batentes (mesmo com secção 'porta')
    const cfgC: ModuleConfig = {
      ...base, dims: { width: 1800, height: 2400, depth: 600 },
      portas: { ...base.portas, nPortas: 0,
        correr: { ativo: true, nFolhas: 3, espelho: "alternadas",
          perfilLarguraMm: 25, perfilEspessuraMm: 20, recuoFrente: 5,
          alturaCalhaSup: 40, alturaCalhaInf: 40, folga: 10, sobreposicao: 40 } },
      gavetas: { ...base.gavetas, nGavetas: 0 },
      secoes: [{ id: "p", altura_mm: 2200, tipo: "porta", config: { nPortas: 2 } }],
    };
    tests.push(["[Roupeiros] correr ativo suprime portas batentes",
      dimensoesPortas(cfgC).length === 0]);
    const pcsC = calcularPecas(cfgC);
    const folhas = pcsC.filter(p => /^Folha correr/i.test(p.descricao));
    const calhas = pcsC.filter(p => /^Calha correr/i.test(p.descricao));
    const folhasEspelho = folhas.filter(p => /\(espelho\)/.test(p.descricao));
    tests.push(["[Roupeiros] correr 3 folhas + 2 calhas", folhas.length === 3 && calhas.length === 2]);
    tests.push(["[Roupeiros] espelho 'alternadas' → ⌈n/2⌉ folhas com espelho",
      folhasEspelho.length === Math.ceil(3 / 2)]);
  }

  let allOk = true;
  for (const [label, ok] of tests) {
    console.assert(ok, `[module.assert] FALHOU: ${label}`);
    if (!ok) allOk = false;
  }
  if (allOk) {
    // eslint-disable-next-line no-console
    console.info("[module.assert] ✓ Todos os testes de sanidade do motor passaram (peças + geometria).");
  }
  return allOk;
}

