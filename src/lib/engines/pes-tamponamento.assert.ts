// Asserts: pés + tamponamento (Fase 4D.1)
import { calcularPecas, calcularPes, DEFAULT_MODULE_CONFIG, type ModuleConfig } from "./module";

export function runPesTamponamentoAsserts() {
  // Cenário 1 — tamponamento direita on, espessura 19, 800×720×560
  const cfgT: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    tamponamento: { esquerda: false, direita: true, topo: false, espessura: 19 },
  };
  const pecas = calcularPecas(cfgT);
  const td = pecas.find((p) => p.tipo === "tamponamento" && p.descricao === "Tamponamento direita");
  const okTamp = !!td && td.comprimento_mm === 720 && td.largura_mm === 560 && td.espessura_mm === 19 && td.qtd === 1;
  console.assert(okTamp, "[pes-tamp.assert] FALHOU: Tamponamento direita 720×560×19", td);

  // Cenário 2 — pés ativos, W=800 → 4; W=1400 → permite 6
  const cfgP4 = { ...DEFAULT_MODULE_CONFIG, pes: { ativo: true, altura: 100, quantidade: 4 as const, recuo: 50 } };
  const p4 = calcularPes(cfgP4);
  const ok4 = p4.quantidade === 4 && p4.posicoes.length === 4;
  console.assert(ok4, "[pes-tamp.assert] FALHOU: 4 pés esperados", p4);

  const cfgP6: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { ...DEFAULT_MODULE_CONFIG.dims, width: 1400 },
    pes: { ativo: true, altura: 100, quantidade: 6, recuo: 50 },
  };
  const p6 = calcularPes(cfgP6);
  const ok6 = p6.quantidade === 6 && p6.posicoes.length === 6;
  console.assert(ok6, "[pes-tamp.assert] FALHOU: 6 pés esperados (W=1400)", p6);

  if (okTamp && ok4 && ok6) {
    // eslint-disable-next-line no-console
    console.info("[pes-tamp.assert] ✓ Tamponamento direito 720×560×19 + 4 pés (W=800) + 6 pés (W=1400).");
  }
  return okTamp && ok4 && ok6;
}
