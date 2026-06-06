import { calcularPecas, dimensoesGavetas, DEFAULT_MODULE_CONFIG, type ModuleConfig } from "./module";
import { calcularCorredicas, contarCorredicas } from "./drilling";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

function build(fl: number, tipo: "telescopica" | "oculta", rebaixo = false): ModuleConfig {
  return {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 900, height: 720, depth: 560 },
    gavetas: {
      nGavetas: 3, modo: "sobreposta", folga: 3, espessuraFrente: 19,
      corredica: { hardwareId: null, comprimento: 500, folgaLateralPorLado: fl, tipo, rebaixoFundo: rebaixo },
      espessuraCaixa: 16, espessuraFundo: 4, alturaCaixaFolga: 30,
    },
  };
}

export function runGavetasAsserts() {
  // Cenário 1: telescópica (fl=13) → boxWidth 836
  const cfgT = build(13, "telescopica");
  const gT = dimensoesGavetas(cfgT);
  const frT = gT.frentes[0];
  const cxT = gT.caixas[0];

  // Cenário 2: oculta (fl=21, rebaixoFundo) → boxWidth 820
  const cfgO = build(21, "oculta", true);
  const cxO = dimensoesGavetas(cfgO).caixas[0];

  const tests: Array<[string, boolean]> = [
    ["Telescópica: 3 frentes", gT.frentes.length === 3],
    ["Telescópica: frente 894×236×19", frT.size[0] === 894 && frT.size[1] === 236 && frT.size[2] === 19],
    ["Telescópica: boxWidth 836", cxT.boxWidth === 836],
    ["Telescópica: boxDepth 500", cxT.boxDepth === 500],
    ["Telescópica: boxHeight 206", cxT.boxHeight === 206],
    ["Telescópica: NÃO requer rasgo na traseira", cxT.requerRasgoTraseira === false],
    ["Oculta:      boxWidth 820", cxO.boxWidth === 820],
    ["Oculta:      requer rasgo na traseira (rebaixoFundo)", cxO.requerRasgoTraseira === true],
    ["6 corrediças (3 pares)", contarCorredicas(cfgT) === 6],
    ["18 furos corrediça", calcularCorredicas(cfgT, DEFAULT_TEMPLATE_CONFIG).length === 18],
  ];

  const pecas = calcularPecas(cfgT);
  tests.push(["Peças: 3 frentes de gaveta", pecas.filter((p) => p.tipo === "gaveta_frente").length === 3]);

  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[gavetas.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info(`[gavetas.assert] ✓ boxWidth telescópica=${cxT.boxWidth} · oculta=${cxO.boxWidth} — trocar corrediça muda a medida. OK.`);
  return ok;
}
