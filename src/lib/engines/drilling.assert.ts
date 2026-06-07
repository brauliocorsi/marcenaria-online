import { calcularFuros, calcularCorredicas, calcularSistema32 } from "./drilling";
import { DEFAULT_MODULE_CONFIG, type ModuleConfig } from "./module";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";

export function runDrillingAsserts() {
  // ─── FIX 1+2: cenário base 800×720×560, laterais_cobrem, 1 prateleira MÓVEL ───
  const cfg: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, prateleirasMoveis: true };
  const furos = cfg ? calcularFuros(cfg, DEFAULT_TEMPLATE_CONFIG) : [];

  const corpos = furos.filter(f => f.tipo_furo === "minifix_corpo");
  const pernos = furos.filter(f => f.tipo_furo === "minifix_perno");
  const pinos = furos.filter(f => f.tipo_furo === "pino");
  const cavs = furos.filter(f => f.tipo_furo === "cavilha");

  const relogioSoNasLaterais = corpos.length > 0 && corpos.every(f => f.peca === "lateral");
  const pernoSoEmTampoBase = pernos.length > 0 && pernos.every(f => f.peca === "tampo" || f.peca === "base");
  const zeroFurosNaPrateleira = furos.every(f => f.peca !== "prateleira");
  const pinos4Lateral = pinos.length === 4 && pinos.every(f => f.diametro === 5 && f.peca === "lateral" && /prateleira/.test(f.junta));

  // ─── FIX 3: trocar para tampo_base_cobrem → INVERTE (e renderiza) ───
  const cfg2: ModuleConfig = { ...cfg, sistemaMontagem: "tampo_base_cobrem" };
  const f2 = calcularFuros(cfg2, DEFAULT_TEMPLATE_CONFIG);
  const corpos2 = f2.filter(f => f.tipo_furo === "minifix_corpo");
  const pernos2 = f2.filter(f => f.tipo_furo === "minifix_perno");
  const invRelogio = corpos2.length > 0 && corpos2.every(f => f.peca === "tampo" || f.peca === "base");
  const invPerno = pernos2.length > 0 && pernos2.every(f => f.peca === "lateral");

  // ─── 4G.2 Marcação corrediças & Sistema 32 (preservados) ───
  const cfgGav: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, gavetas: { ...DEFAULT_MODULE_CONFIG.gavetas, nGavetas: 3 } };
  const marc = calcularCorredicas(cfgGav, DEFAULT_TEMPLATE_CONFIG);
  const cfgS32: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 800, height: 2000, depth: 560 },
    sistema32: { ativo: true, recuoFrente: 37, recuoTras: 37, passoVertical: 32, inicioY: 100, fimY: 1700 },
  };
  const s32 = calcularSistema32(cfgS32, DEFAULT_TEMPLATE_CONFIG);

  const tests: Array<[string, boolean]> = [
    ["[FIX 1] laterais_cobrem: relógio SÓ nas laterais", relogioSoNasLaterais],
    ["[FIX 1] laterais_cobrem: perno SÓ em tampo/base", pernoSoEmTampoBase],
    ["[FIX 2] ZERO minifix/cavilha em prateleira (móvel)", zeroFurosNaPrateleira],
    ["[FIX 2] Prateleira móvel → 4 pinos Ø5 nas laterais", pinos4Lateral],
    ["[FIX 1+3] tampo_base_cobrem inverte: relógio em tampo/base", invRelogio],
    ["[FIX 1+3] tampo_base_cobrem inverte: perno em laterais", invPerno],
    ["[FIX 3] tampo_base_cobrem renderiza ferragens (furos > 0)", f2.length > 0],
    ["[4G.2] Marcação: 3 gavetas → 18 Ø3/0.5", marc.length === 18 && marc.every(f => f.diametro === 3 && f.profundidade === 0.5)],
    ["[4G.2] Sistema 32: 204 furos Ø5", s32.length === 204 && s32.every(f => f.diametro === 5)],
    ["[4G] Ferramenta resolvida em todos os furos", furos.every(f => !!f.ferramentaNome) && cavs.length > 0],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[drilling.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info(`[drilling.assert] ✓ minifix correto + inversão por sistema + pinos de prateleira — OK.`);
  return ok;
}
