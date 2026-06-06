// Asserts: pivô de porta + abertura de gaveta (Fase 4H)
import { aberturaGaveta, pivotPorta } from "./hardware-anim";
import { DEFAULT_MODULE_CONFIG, dimensoesPortas, type ModuleConfig } from "./module";

export function runHardwareAnimAsserts() {
  // Cenário: 800×720×560 com 2 portas sobrepostas
  const cfg: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    portas: { ...DEFAULT_MODULE_CONFIG.portas, nPortas: 2, modo: "sobreposta" },
  };
  const portas = dimensoesPortas(cfg);
  const pe = portas.find((p) => p.ladoDobradicas === "esquerda");
  const pd = portas.find((p) => p.ladoDobradicas === "direita");
  const okPivE = !!pe && pivotPorta(pe) === pe.xMin;
  const okPivD = !!pd && pivotPorta(pd) === pd.xMax;
  console.assert(okPivE, "[hw-anim.assert] FALHOU: pivô porta esquerda devia ser xMin", pe);
  console.assert(okPivD, "[hw-anim.assert] FALHOU: pivô porta direita devia ser xMax", pd);

  // aberturaGaveta: total → boxDepth*pct ; parcial → boxDepth*0.75*pct
  const okTotal = aberturaGaveta(500, "total", 1) === 500
    && aberturaGaveta(500, "total", 0.5) === 250;
  const okParcial = aberturaGaveta(500, "parcial", 1) === 375
    && Math.abs(aberturaGaveta(500, "parcial", 0.5) - 187.5) < 1e-6;
  console.assert(okTotal, "[hw-anim.assert] FALHOU: extensao 'total' devia retornar boxDepth*pct");
  console.assert(okParcial, "[hw-anim.assert] FALHOU: extensao 'parcial' devia retornar boxDepth*0.75*pct");

  if (okPivE && okPivD && okTotal && okParcial) {
    // eslint-disable-next-line no-console
    console.info("[hw-anim.assert] ✓ pivôPorta (esq→xMin, dir→xMax) + aberturaGaveta (total→bd·pct, parcial→bd·0.75·pct).");
  }
  return okPivE && okPivD && okTotal && okParcial;
}
