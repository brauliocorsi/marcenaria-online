import { calcularFuros } from "./drilling";
import { DEFAULT_MODULE_CONFIG } from "./module";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

export function runDrillingAsserts() {
  const furos = calcularFuros(DEFAULT_MODULE_CONFIG, DEFAULT_TEMPLATE_CONFIG);
  const total = furos.length;
  const byType = furos.reduce<Record<string, number>>((a, f) => { a[f.tipo_furo] = (a[f.tipo_furo] ?? 0) + 1; return a; }, {});
  const cav = byType["cavilha"] ?? 0;
  const mc = byType["minifix_corpo"] ?? 0;
  const mp = byType["minifix_perno"] ?? 0;
  const todosComFerramenta = furos.every(f => !!f.ferramentaNome);

  const tests: Array<[string, boolean]> = [
    ["Total = 72 furos", total === 72],
    ["18 minifix_corpo (Ø15)", mc === 18 && furos.filter(f => f.tipo_furo === "minifix_corpo").every(f => f.diametro === 15)],
    ["18 minifix_perno (Ø8)", mp === 18 && furos.filter(f => f.tipo_furo === "minifix_perno").every(f => f.diametro === 8)],
    ["36 cavilha (Ø8)", cav === 36 && furos.filter(f => f.tipo_furo === "cavilha").every(f => f.diametro === 8)],
    ["Ferramenta resolvida em todos os furos", todosComFerramenta],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[drilling.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info(`[drilling.assert] ✓ 72 furos (18 mfx_corpo + 18 mfx_perno + 36 cavilha) · ferramentas resolvidas — OK.`);
  return ok;
}
