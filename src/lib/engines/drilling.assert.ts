import { calcularFuros, calcularCorredicas, calcularSistema32, calcularParafusosFundo } from "./drilling";
import { DEFAULT_MODULE_CONFIG, dimensoesFundoCarcaca, dimensoesFundoGaveta, calcularRasgos, dimensoesGavetas, type ModuleConfig } from "./module";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/drilling.functions";
import { cotasLabels } from "@/components/viewer/Module3D";

export function runDrillingAsserts() {
  // ─── REGRESSÃO da junção (FIX 1+2 anteriores) ───
  const cfg: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, prateleirasMoveis: true };
  const furos = calcularFuros(cfg, DEFAULT_TEMPLATE_CONFIG);
  const corpos = furos.filter(f => f.tipo_furo === "minifix_corpo");
  const pernos = furos.filter(f => f.tipo_furo === "minifix_perno");
  const pinos = furos.filter(f => f.tipo_furo === "pino");
  const relogioSoNasLaterais = corpos.length > 0 && corpos.every(f => f.peca === "lateral");
  const pernoSoEmTampoBase = pernos.length > 0 && pernos.every(f => f.peca === "tampo" || f.peca === "base");
  const zeroFurosNaPrateleira = furos.every(f => f.peca !== "prateleira");
  const pinos4Lateral = pinos.length === 4 && pinos.every(f => f.diametro === 5 && f.peca === "lateral" && /prateleira/.test(f.junta));

  const cfg2: ModuleConfig = { ...cfg, sistemaMontagem: "tampo_base_cobrem" };
  const f2 = calcularFuros(cfg2, DEFAULT_TEMPLATE_CONFIG);
  const corpos2 = f2.filter(f => f.tipo_furo === "minifix_corpo");
  const pernos2 = f2.filter(f => f.tipo_furo === "minifix_perno");
  const invRelogio = corpos2.length > 0 && corpos2.every(f => f.peca === "tampo" || f.peca === "base");
  const invPerno = pernos2.length > 0 && pernos2.every(f => f.peca === "lateral");

  // ─── NOVO: corrediças por tipo ───
  // Telescópica (default): 3 marcas/lado na lateral + 3 marcas/lado na ilharga, por gaveta.
  const cfgTele: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, gavetas: { ...DEFAULT_MODULE_CONFIG.gavetas, nGavetas: 1 } };
  const mTele = calcularCorredicas(cfgTele, DEFAULT_TEMPLATE_CONFIG);
  const teleLateral = mTele.filter(f => f.peca === "lateral").length;
  const teleIlharga = mTele.filter(f => f.peca === "gaveta_lateral").length;
  const teleOk = teleLateral >= 6 && teleIlharga >= 6 && mTele.every(f => f.diametro === 3 && f.profundidade === 0.5);

  // Undermount: clip frontal + 2 suportes traseiros, por gaveta.
  const cfgUnd: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    gavetas: {
      ...DEFAULT_MODULE_CONFIG.gavetas,
      nGavetas: 1,
      corredica: { ...DEFAULT_MODULE_CONFIG.gavetas.corredica, tipo: "oculta", folgaLateralPorLado: 21 },
    },
  };
  const mUnd = calcularCorredicas(cfgUnd, DEFAULT_TEMPLATE_CONFIG);
  const clip = mUnd.filter(f => /clip_frente/.test(f.junta)).length;
  const suporte = mUnd.filter(f => /suporte_tras/.test(f.junta)).length;
  const undOk = clip === 1 && suporte === 2;

  // ─── COTAS: helper devolve 3 labels L/A/P inteiros ───
  const labels = cotasLabels(cfg.dims.width, cfg.dims.height, cfg.dims.depth);
  const cotasOk =
    labels.length === 3 &&
    labels[0].eixo === "L" && labels[0].mm === cfg.dims.width &&
    labels[1].eixo === "A" && labels[1].mm === cfg.dims.height &&
    labels[2].eixo === "P" && labels[2].mm === cfg.dims.depth;

  // ─── Sistema 32 (preservado) ───
  const cfgS32: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 800, height: 2000, depth: 560 },
    sistema32: { ativo: true, recuoFrente: 37, recuoTras: 37, passoVertical: 32, inicioY: 100, fimY: 1700 },
  };
  const s32 = calcularSistema32(cfgS32, DEFAULT_TEMPLATE_CONFIG);

  const tests: Array<[string, boolean]> = [
    ["[regressão] laterais_cobrem: relógio SÓ nas laterais", relogioSoNasLaterais],
    ["[regressão] laterais_cobrem: perno SÓ em tampo/base", pernoSoEmTampoBase],
    ["[regressão] ZERO minifix/cavilha em prateleira (móvel)", zeroFurosNaPrateleira],
    ["[regressão] Prateleira móvel → 4 pinos Ø5 nas laterais", pinos4Lateral],
    ["[regressão] tampo_base_cobrem inverte: relógio em tampo/base", invRelogio],
    ["[regressão] tampo_base_cobrem inverte: perno em laterais", invPerno],
    ["[regressão] tampo_base_cobrem renderiza ferragens (furos>0)", f2.length > 0],
    ["[novo] Telescópica: ≥3 marcas/lado em lateral + ilharga", teleOk],
    ["[novo] Undermount: clip frontal + 2 suportes traseiros", undOk],
    ["[novo] Cotas: 3 labels L/A/P corretos", cotasOk],
    ["[4G.2] Sistema 32: 204 furos Ø5", s32.length === 204 && s32.every(f => f.diametro === 5)],
  ];
  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[drilling.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info(`[drilling.assert] ✓ corrediças por tipo + cotas + regressão junção — OK.`);
  return ok;
}
