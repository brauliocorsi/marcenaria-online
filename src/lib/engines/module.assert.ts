// Testes de sanidade do motor paramétrico — corre apenas em dev.
import { calcularPecas, DEFAULT_MODULE_CONFIG, type Peca } from "./module";

function find(ps: Peca[], tipo: string) {
  return ps.find((p) => p.tipo === tipo)!;
}

export function runModuleAsserts() {
  const pecas = calcularPecas(DEFAULT_MODULE_CONFIG);
  const lateral = find(pecas, "lateral");
  const tampo = find(pecas, "tampo");
  const base = find(pecas, "base");
  const prat = find(pecas, "prateleira");
  const fundo = find(pecas, "fundo");

  const tests: Array<[string, boolean]> = [
    ["Lateral 720×560×19", lateral.comprimento_mm === 720 && lateral.largura_mm === 560 && lateral.espessura_mm === 19 && lateral.qtd === 2],
    ["Tampo 762×560×19", tampo.comprimento_mm === 762 && tampo.largura_mm === 560 && tampo.espessura_mm === 19],
    ["Base 762×560×19", base.comprimento_mm === 762 && base.largura_mm === 560 && base.espessura_mm === 19],
    ["Prateleira 760×550×19", prat.comprimento_mm === 760 && prat.largura_mm === 550 && prat.espessura_mm === 19],
    ["Fundo 800×720×4", fundo.comprimento_mm === 800 && fundo.largura_mm === 720 && fundo.espessura_mm === 4],
  ];

  let allOk = true;
  for (const [label, ok] of tests) {
    console.assert(ok, `[module.assert] FALHOU: ${label}`);
    if (!ok) allOk = false;
  }
  if (allOk) {
    // eslint-disable-next-line no-console
    console.info("[module.assert] ✓ Todos os testes de sanidade do motor passaram.");
  }
  return allOk;
}
