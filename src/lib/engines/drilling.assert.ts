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

  const tests: Array<[string, boolean]> = [
    ["Total = 36 furos", total === 36],
    ["24 cavilha", cav === 24],
    ["6 minifix_corpo", mc === 6],
    ["6 minifix_perno", mp === 6],
    ["Cavilha Ø8", furos.filter(f => f.tipo_furo === "cavilha").every(f => f.diametro === 8)],
    ["minifix_corpo Ø15", furos.filter(f => f.tipo_furo === "minifix_corpo").every(f => f.diametro === 15)],
    ["minifix_perno Ø8", furos.filter(f => f.tipo_furo === "minifix_perno").every(f => f.diametro === 8)],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[drilling.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info(`[drilling.assert] ✓ 36 furos (24 cav + 6 mfx_corpo + 6 mfx_perno) — OK.`);
  return ok;
}
