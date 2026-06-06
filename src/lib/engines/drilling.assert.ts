import { calcularFuros, calcularCorredicas, calcularSistema32 } from "./drilling";
import { DEFAULT_MODULE_CONFIG, type ModuleConfig } from "./module";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

export function runDrillingAsserts() {
  // ─── Cenário base 4G: 72 furos ───
  const furos = calcularFuros(DEFAULT_MODULE_CONFIG, DEFAULT_TEMPLATE_CONFIG);
  const byType = furos.reduce<Record<string, number>>((a, f) => { a[f.tipo_furo] = (a[f.tipo_furo] ?? 0) + 1; return a; }, {});
  const cav = byType["cavilha"] ?? 0;
  const mc = byType["minifix_corpo"] ?? 0;
  const mp = byType["minifix_perno"] ?? 0;
  const todosComFerramenta = furos.every(f => !!f.ferramentaNome);

  // ─── 4G.2 (A) Marcação de corrediças ───
  const cfgGav: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    gavetas: { ...DEFAULT_MODULE_CONFIG.gavetas, nGavetas: 3 },
  };
  const marc = calcularCorredicas(cfgGav, DEFAULT_TEMPLATE_CONFIG);
  const marcTipoOk = marc.every(f => f.tipo_furo === "marcacao" && f.diametro === 3 && f.profundidade === 0.5);

  // ─── 4G.2 (B) Sistema 32 ───
  const cfgS32: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 800, height: 2000, depth: 560 },
    sistema32: { ativo: true, recuoFrente: 37, recuoTras: 37, passoVertical: 32, inicioY: 100, fimY: 1700 },
  };
  const s32 = calcularSistema32(cfgS32, DEFAULT_TEMPLATE_CONFIG);
  const s32TipoOk = s32.every(f => f.tipo_furo === "pino" && f.diametro === 5);

  const tests: Array<[string, boolean]> = [
    ["[4G] Total = 72 furos", furos.length === 72],
    ["[4G] 18 minifix_corpo (Ø15)", mc === 18],
    ["[4G] 18 minifix_perno (Ø8)", mp === 18],
    ["[4G] 36 cavilha (Ø8)", cav === 36],
    ["[4G] Ferramenta resolvida em todos os furos", todosComFerramenta],
    ["[4G.2] Marcação: 3 gavetas → 18 marcações Ø3 prof 0.5", marc.length === 18 && marcTipoOk],
    ["[4G.2] Sistema 32 (H=2000, 100→1700, 32): 51/fila × 2 × 2 = 204 furos Ø5", s32.length === 204 && s32TipoOk],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[drilling.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info(`[drilling.assert] ✓ 72 furos base · 18 marcações corrediças · 204 furos sistema 32 — OK.`);
  return ok;
}
