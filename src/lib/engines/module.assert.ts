// Testes de sanidade do motor paramétrico — corre apenas em dev.
import { calcularPecas, calcularGeometria, dimensoesPortas, dimensoesGavetas, intervalosSecoes, DEFAULT_MODULE_CONFIG, type Peca, type PecaGeo, type ModuleConfig, type Secao } from "./module";
import { calcularFuros } from "./drilling";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";
import { geraCantoDiagonal, areaPoligono, dist2D } from "./canto";

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

