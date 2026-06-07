// Biblioteca de presets de cozinha (standards PT). Cada preset gera um
// ModuleConfig pronto a editar. Função pura — não toca BD nem UI.
import { DEFAULT_MODULE_CONFIG, type ModuleConfig } from "./module";

export type CategoriaModulo =
  | "base" | "superior" | "coluna" | "gaveteiro" | "canto" | "ilha" | "roupeiro" | "nicho";

export interface PresetCozinha {
  id: string;
  nome: string;
  categoria: CategoriaModulo;
  descricao: string;
  config: ModuleConfig;
}

/** Devolve sempre uma cópia profunda do DEFAULT — preset nunca é mutado. */
function baseCfg(): ModuleConfig {
  return JSON.parse(JSON.stringify(DEFAULT_MODULE_CONFIG)) as ModuleConfig;
}

function makeBase(w: number, h: number, d: number, categoria: CategoriaModulo): ModuleConfig {
  const c = baseCfg();
  c.dims = { width: w, height: h, depth: d };
  c.categoria = categoria;
  c.fundo.modo = "rasgo";
  c.pes = { ...c.pes, ativo: categoria !== "superior", altura: 100, quantidade: 4, recuo: 50 };
  return c;
}

export const PRESETS_COZINHA: PresetCozinha[] = [
  (() => {
    const cfg = makeBase(400, 720, 560, "base");
    cfg.portas = { ...cfg.portas, nPortas: 1, ladoAbertura: "direita" };
    cfg.nPrateleiras = 1;
    cfg.prateleirasMoveis = true;
    return { id: "base-1p", nome: "Base 1 porta", categoria: "base",
      descricao: "Base 400×720×560 · 1 porta + 1 prateleira móvel + pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(800, 720, 560, "base");
    cfg.portas = { ...cfg.portas, nPortas: 2 };
    cfg.nPrateleiras = 1;
    cfg.prateleirasMoveis = true;
    return { id: "base-2p", nome: "Base 2 portas", categoria: "base",
      descricao: "Base 800×720×560 · 2 portas + 1 prateleira móvel + pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(600, 720, 560, "gaveteiro");
    cfg.gavetas = {
      ...cfg.gavetas, nGavetas: 3,
      corredica: { ...cfg.gavetas.corredica, tipo: "telescopica" as const, comprimento: 500 },
    };
    cfg.nPrateleiras = 0;
    return { id: "base-3g", nome: "Base 3 gavetões", categoria: "gaveteiro",
      descricao: "Base 600×720×560 · 3 gavetas (telescópica) + pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(600, 720, 560, "base");
    cfg.gavetas = {
      ...cfg.gavetas, nGavetas: 1,
      corredica: { ...cfg.gavetas.corredica, tipo: "telescopica" as const, comprimento: 500 },
    };
    cfg.portas = { ...cfg.portas, nPortas: 1 };
    cfg.nPrateleiras = 1;
    return { id: "base-1p1g", nome: "Base 1 porta + 1 gavetão", categoria: "base",
      descricao: "Base 600×720×560 · 1 gavetão (topo) + 1 porta + pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(800, 720, 560, "base");
    cfg.portas = { ...cfg.portas, nPortas: 2 };
    cfg.nPrateleiras = 0;
    return { id: "base-lavaloica", nome: "Base sob-lava-loiça", categoria: "base",
      descricao: "Base 800×720×560 · 2 portas, sem prateleiras + pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(400, 700, 350, "superior");
    cfg.pes = { ...cfg.pes, ativo: false };
    cfg.portas = { ...cfg.portas, nPortas: 1, ladoAbertura: "direita" };
    cfg.nPrateleiras = 1;
    return { id: "sup-1p", nome: "Superior 1 porta", categoria: "superior",
      descricao: "Superior 400×700×350 · 1 porta + 1 prateleira, sem pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(800, 700, 350, "superior");
    cfg.pes = { ...cfg.pes, ativo: false };
    cfg.portas = { ...cfg.portas, nPortas: 2 };
    cfg.nPrateleiras = 1;
    return { id: "sup-2p", nome: "Superior 2 portas", categoria: "superior",
      descricao: "Superior 800×700×350 · 2 portas + 1 prateleira, sem pés.", config: cfg };
  })(),
  (() => {
    const cfg = makeBase(600, 2000, 560, "coluna");
    cfg.portas = { ...cfg.portas, nPortas: 2 };
    cfg.nPrateleiras = 4;
    return { id: "col-despenseiro", nome: "Coluna despenseiro", categoria: "coluna",
      descricao: "Coluna 600×2000×560 · 2 portas + 4 prateleiras + pés.", config: cfg };
  })(),
];

/** Devolve uma cópia profunda da config do preset (nunca o original). */
export function instanciarPreset(id: string): { nome: string; config: ModuleConfig } | null {
  const p = PRESETS_COZINHA.find((x) => x.id === id);
  if (!p) return null;
  return { nome: p.nome, config: JSON.parse(JSON.stringify(p.config)) as ModuleConfig };
}

// ---- Asserts (corre apenas em dev via router.tsx) ----
export function runPresetsCozinhaAsserts(): boolean {
  const tests: Array<[string, boolean]> = [];
  const b2 = PRESETS_COZINHA.find((p) => p.id === "base-2p")!;
  tests.push(["[presets] Base 2 portas: n=2, 800×720×560",
    b2.config.portas.nPortas === 2 &&
    b2.config.dims.width === 800 && b2.config.dims.height === 720 && b2.config.dims.depth === 560]);

  // Cópia não muta original
  const inst = instanciarPreset("base-2p")!;
  inst.config.dims.width = 9999;
  inst.config.portas.nPortas = 0;
  tests.push(["[presets] instanciarPreset não muta original",
    b2.config.dims.width === 800 && b2.config.portas.nPortas === 2]);

  const s1 = PRESETS_COZINHA.find((p) => p.id === "sup-1p")!;
  tests.push(["[presets] Superior 1 porta: categoria=superior, pes.ativo=false",
    s1.categoria === "superior" && s1.config.pes.ativo === false]);

  let ok = true;
  for (const [label, pass] of tests) {
    console.assert(pass, `[presets-cozinha.assert] FALHOU: ${label}`);
    if (!pass) ok = false;
  }
  if (ok) console.info("[presets-cozinha.assert] ✓ presets de cozinha OK.");
  return ok;
}
