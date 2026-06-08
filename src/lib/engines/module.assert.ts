// Testes de sanidade do motor paramétrico — corre apenas em dev.
import { calcularPecas, calcularGeometria, dimensoesPortas, dimensoesGavetas, intervalosSecoes, DEFAULT_MODULE_CONFIG, type Peca, type PecaGeo, type ModuleConfig, type Secao } from "./module";
import { calcularFuros } from "./drilling";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

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

