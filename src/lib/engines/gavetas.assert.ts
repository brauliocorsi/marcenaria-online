import { calcularPecas, dimensoesGavetas, DEFAULT_MODULE_CONFIG, type ModuleConfig } from "./module";
import { calcularCorredicas, contarCorredicas } from "./drilling";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

export function runGavetasAsserts() {
  const cfg: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 900, height: 720, depth: 560 },
    gavetas: {
      nGavetas: 3, modo: "sobreposta", folga: 3, espessuraFrente: 19,
      corredica: { comprimento: 500, folgaLateral: 13 },
      espessuraCaixa: 16, espessuraFundo: 4, alturaCaixaFolga: 30,
    },
  };
  const g = dimensoesGavetas(cfg);
  const fr = g.frentes[0];
  const cx = g.caixas[0];

  const tests: Array<[string, boolean]> = [
    ["3 frentes", g.frentes.length === 3],
    ["Frente largura 894", fr.size[0] === 894],
    ["Frente altura 236", fr.size[1] === 236],
    ["Frente espessura 19", fr.size[2] === 19],
    ["boxWidth 836", cx.boxWidth === 836],
    ["boxDepth 500", cx.boxDepth === 500],
    ["boxHeight 206", cx.boxHeight === 206],
    ["6 corrediças (3 pares)", contarCorredicas(cfg) === 6],
    // Furos corrediça: 3 furos × 2 laterais × 3 gavetas = 18
    ["18 furos corrediça", calcularCorredicas(cfg, DEFAULT_TEMPLATE_CONFIG).length === 18],
  ];

  // Peças geradas devem incluir 3 frentes + 3 fundos + 6 laterais (2 por gaveta) + 6 frente/traseira
  const pecas = calcularPecas(cfg);
  const frentes = pecas.filter((p) => p.tipo === "gaveta_frente");
  const laterais = pecas.filter((p) => p.tipo === "gaveta_lateral");
  const fundos = pecas.filter((p) => p.tipo === "gaveta_fundo");
  tests.push(["Peças: 3 frentes de gaveta", frentes.length === 3]);
  tests.push(["Peças: 3 grupos laterais (qtd 2)", laterais.length === 3 && laterais.every((p) => p.qtd === 2)]);
  tests.push(["Peças: 3 fundos", fundos.length === 3]);

  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[gavetas.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info("[gavetas.assert] ✓ frente 894×236×19 · boxWidth 836 · boxDepth 500 · boxHeight 206 — OK.");
  return ok;
}
