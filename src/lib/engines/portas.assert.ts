import { DEFAULT_MODULE_CONFIG, calcularPecas, dimensoesPortas, pecasPortaAluminio, type ModuleConfig } from "./module";
import { calcularDobradicas } from "./drilling";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

export function runPortasAsserts() {
  const cfg: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 800, height: 720, depth: 560 },
    portas: { nPortas: 1, modo: "sobreposta", ladoAbertura: "direita", espessura: null, folga: 2, folgaCentral: 3 },
  };

  const pecas = calcularPecas(cfg);
  const portaPeca = pecas.find((p) => p.tipo === "porta");
  const dims = dimensoesPortas(cfg);
  const dobr = calcularDobradicas(cfg, DEFAULT_TEMPLATE_CONFIG);
  const canecos = dobr.filter((f) => f.tipo_furo === "dobradica");
  const chapaParafusos = dobr.filter((f) => f.tipo_furo === "parafuso");

  const tests: Array<[string, boolean]> = [
    ["1 porta criada", !!portaPeca && portaPeca.qtd === 1],
    ["Porta 716×796×19 (alt×larg×esp)", !!portaPeca && portaPeca.comprimento_mm === 716 && portaPeca.largura_mm === 796 && portaPeca.espessura_mm === 19],
    ["Lado dobradiças = esquerda (puxador à direita)", dims.length === 1 && dims[0].ladoDobradicas === "esquerda"],
    ["2 canecos Ø35 na porta", canecos.length === 2 && canecos.every(f => f.diametro === 35 && f.peca === "porta")],
    ["4 furos parafuso (2 chapas) na lateral", chapaParafusos.length === 4 && chapaParafusos.every(f => f.peca === "lateral")],
  ];

  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[portas.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info("[portas.assert] ✓ Porta 796×716×19, 2 dobradiças (2 canecos Ø35 + 4 parafusos chapa) — OK.");
  return ok;
}
