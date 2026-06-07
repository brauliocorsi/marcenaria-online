import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- MATERIAIS ----------
const acabamentos = ["mate", "brilho", "madeira", "texturado"] as const;
const materialSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(200),
  brand: z.string().max(120).default("Kronospan"),
  fabricante: z.string().max(120).nullable().optional(),
  decor_nome: z.string().max(200).nullable().optional(),
  decor_code: z.string().max(60).nullable().optional(),
  acabamento: z.enum(acabamentos).default("mate"),
  cor_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)").default("#E8E2D5"),
  textura_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  thickness_mm: z.number().min(0.1).max(100),
  sheet_width_mm: z.number().int().min(100).max(10000),
  sheet_height_mm: z.number().int().min(100).max(10000),
  price_per_sheet: z.number().min(0).nullable().optional(),
  has_grain: z.boolean().default(false),
});
export const ACABAMENTOS = acabamentos;

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("materials").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), values: materialSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.values, user_id: userId };
    if (data.id) {
      const { error } = await supabase.from("materials").update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("materials").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("materials").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ORLAS ----------
const edgeBandSchema = z.object({
  name: z.string().min(1).max(200),
  color: z.string().max(60).nullable().optional(),
  thickness_mm: z.number().min(0.1).max(10), // decimals allowed
  width_mm: z.number().int().min(1).max(500).nullable().optional(),
  price_per_meter: z.number().min(0).nullable().optional(),
});

export const listEdgeBands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("edge_bands").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertEdgeBand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), values: edgeBandSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.values, user_id: userId };
    if (data.id) {
      const { error } = await supabase.from("edge_bands").update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("edge_bands").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteEdgeBand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("edge_bands").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- FERRAGENS ----------
const hardwareCategories = ["minifix","cavilha","parafuso","dobradica","corredica","pe","pino_prateleira","perfil_aluminio","led","outro"] as const;
const pricingUnits = ["unidade","metro"] as const;

const hardwareSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(hardwareCategories),
  reference: z.string().max(120).nullable().optional(),
  pricing_unit: z.enum(pricingUnits),
  price: z.number().min(0).nullable().optional(),
  params: z.record(z.string(), z.any()).default({}),
});

export const listHardware = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hardware").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertHardware = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), values: hardwareSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.values, user_id: userId };
    if (data.id) {
      const { error } = await supabase.from("hardware").update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("hardware").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteHardware = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("hardware").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- SEED: Corrediças padrão (idempotente por nome) ----------
const CORREDICAS_PADRAO = [
  {
    name: "Corrediça telescópica 45mm",
    reference: null,
    pricing_unit: "unidade" as const,
    price: null,
    params: { tipo: "telescopica", folgaLateralPorLado: 13, comprimentosDisponiveis: [250,300,350,400,450,500,550,600], extensao: "total", rebaixoFundo: false },
  },
  {
    name: "Corrediça oculta (undermount)",
    reference: null,
    pricing_unit: "unidade" as const,
    price: null,
    params: { tipo: "oculta", folgaLateralPorLado: 21, comprimentosDisponiveis: [270,300,350,400,450,500], extensao: "total", rebaixoFundo: true },
  },
  {
    name: "Corrediça de roldanas",
    reference: null,
    pricing_unit: "unidade" as const,
    price: null,
    params: { tipo: "roldanas", folgaLateralPorLado: 12.5, comprimentosDisponiveis: [250,300,350,400,450,500], extensao: "parcial", rebaixoFundo: false },
  },
];

export const seedCorredicasPadrao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: e1 } = await supabase
      .from("hardware").select("name").eq("user_id", userId).eq("category", "corredica");
    if (e1) throw new Error(e1.message);
    const have = new Set((existing ?? []).map((r: any) => r.name));
    const toInsert = CORREDICAS_PADRAO
      .filter((c) => !have.has(c.name))
      .map((c) => ({ ...c, category: "corredica" as const, user_id: userId }));
    if (toInsert.length === 0) return { inserted: 0, skipped: CORREDICAS_PADRAO.length };
    const { error: e2 } = await supabase.from("hardware").insert(toInsert);
    if (e2) throw new Error(e2.message);
    return { inserted: toInsert.length, skipped: CORREDICAS_PADRAO.length - toInsert.length };
  });


// ---------- BROCAS / FERRAMENTAS ----------
const drillPurposes = ["parafuso","cavilha","minifix","geral"] as const;
const toolTypes = ["broca","fresa","disco_corte"] as const;
const drillSchema = z.object({
  name: z.string().min(1).max(200),
  diameter_mm: z.number().min(0.1).max(100),
  purpose: z.enum(drillPurposes),
  max_depth_mm: z.number().int().min(0).max(500).nullable().optional(),
  tool_type: z.enum(toolTypes).default("broca"),
  passante: z.boolean().default(false),
});

export const listDrillBits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drill_bits").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertDrillBit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), values: drillSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.values, user_id: userId } as any;
    if (data.id) {
      const { error } = await supabase.from("drill_bits").update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("drill_bits").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteDrillBit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("drill_bits").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- SEED: Ferramentas padrão (idempotente por nome) ----------
const FERRAMENTAS_PADRAO = [
  { name: "Broca 3 mm", tool_type: "broca", diameter_mm: 3, purpose: "geral", passante: false, max_depth_mm: 30 },
  { name: "Broca 5 mm (parafuso)", tool_type: "broca", diameter_mm: 5, purpose: "parafuso", passante: false, max_depth_mm: 40 },
  { name: "Broca 5 mm passante", tool_type: "broca", diameter_mm: 5, purpose: "parafuso", passante: true, max_depth_mm: 0 },
  { name: "Broca 8 mm (cavilha)", tool_type: "broca", diameter_mm: 8, purpose: "cavilha", passante: false, max_depth_mm: 30 },
  { name: "Broca 8 mm (perno minifix)", tool_type: "broca", diameter_mm: 8, purpose: "minifix", passante: false, max_depth_mm: 34 },
  { name: "Broca 15 mm (corpo minifix)", tool_type: "broca", diameter_mm: 15, purpose: "minifix", passante: false, max_depth_mm: 13 },
  { name: "Broca 35 mm (dobradiça)", tool_type: "broca", diameter_mm: 35, purpose: "geral", passante: false, max_depth_mm: 13 },
  { name: "Fresa 6 mm", tool_type: "fresa", diameter_mm: 6, purpose: "geral", passante: false, max_depth_mm: null },
  { name: "Fresa 8 mm", tool_type: "fresa", diameter_mm: 8, purpose: "geral", passante: false, max_depth_mm: null },
  { name: "Disco de corte 3,5 mm (rasgo de fundo)", tool_type: "disco_corte", diameter_mm: 3.5, purpose: "geral", passante: false, max_depth_mm: null },
] as const;

function toolSig(t: { diameter_mm: number | string; purpose: string; tool_type: string; passante: boolean }) {
  return `${Number(t.diameter_mm)}|${t.purpose}|${t.tool_type}|${t.passante ? 1 : 0}`;
}

export const seedFerramentasPadrao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: e1 } = await supabase
      .from("drill_bits").select("diameter_mm,purpose,tool_type,passante").eq("user_id", userId);
    if (e1) throw new Error(e1.message);
    const have = new Set((existing ?? []).map((r: any) => toolSig(r)));
    const toInsert = FERRAMENTAS_PADRAO
      .filter((f) => !have.has(toolSig(f as any)))
      .map((f) => ({ ...f, user_id: userId })) as any[];
    if (toInsert.length === 0) return { inserted: 0, skipped: FERRAMENTAS_PADRAO.length };
    const { error: e2 } = await supabase.from("drill_bits").insert(toInsert);
    if (e2) throw new Error(e2.message);
    return { inserted: toInsert.length, skipped: FERRAMENTAS_PADRAO.length - toInsert.length };
  });

// Consolida ferramentas duplicadas: canónicas = FERRAMENTAS_PADRAO; re-aponta templates e apaga duplicados.
export const consolidarFerramentas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: bits, error: e1 } = await supabase
      .from("drill_bits").select("id,name,diameter_mm,purpose,tool_type,passante,created_at")
      .eq("user_id", userId).order("created_at", { ascending: true });
    if (e1) throw new Error(e1.message);

    const before = bits?.length ?? 0;
    const padraoNames = new Set(FERRAMENTAS_PADRAO.map((f) => f.name));

    // Agrupa por assinatura
    const bySig = new Map<string, any[]>();
    for (const b of bits ?? []) {
      const sig = toolSig(b as any);
      const arr = bySig.get(sig) ?? [];
      arr.push(b);
      bySig.set(sig, arr);
    }

    // Map de IDs antigos → canónico
    const remap = new Map<string, string>();
    const toDelete: string[] = [];

    for (const group of bySig.values()) {
      if (group.length < 2) continue;
      // Canónica: a que tem nome em FERRAMENTAS_PADRAO; senão a mais recente.
      let canonical = group.find((g) => padraoNames.has(g.name));
      if (!canonical) canonical = group[group.length - 1];
      for (const g of group) {
        if (g.id === canonical.id) continue;
        remap.set(g.id, canonical.id);
        toDelete.push(g.id);
      }
    }

    // Re-aponta templates
    let templatesUpdated = 0;
    if (remap.size > 0) {
      const { data: templates, error: e2 } = await supabase
        .from("drilling_templates").select("id,config").eq("user_id", userId);
      if (e2) throw new Error(e2.message);
      for (const t of templates ?? []) {
        const cfg = (t.config ?? {}) as any;
        const brocas = { ...(cfg.brocas ?? {}) };
        let changed = false;
        for (const k of Object.keys(brocas)) {
          const v = brocas[k];
          if (v && remap.has(v)) { brocas[k] = remap.get(v); changed = true; }
        }
        if (changed) {
          const { error: e3 } = await supabase
            .from("drilling_templates").update({ config: { ...cfg, brocas } }).eq("id", t.id).eq("user_id", userId);
          if (e3) throw new Error(e3.message);
          templatesUpdated++;
        }
      }
    }

    // Apaga duplicados
    if (toDelete.length > 0) {
      const { error: e4 } = await supabase
        .from("drill_bits").delete().in("id", toDelete).eq("user_id", userId);
      if (e4) throw new Error(e4.message);
    }

    const after = before - toDelete.length;
    return { before, after, removed: toDelete.length, templatesUpdated };
  });

// ---------- SEED: Fundos padrão (platex/HDF) ----------
const FUNDOS_PADRAO = [
  { name: "Platex/HDF 3,5 mm (fundo)", brand: "Genérico", thickness_mm: 3.5, decor_code: null, sheet_width_mm: 2750, sheet_height_mm: 2070, price_per_sheet: null, has_grain: false },
  { name: "Platex/HDF 6 mm (fundo)", brand: "Genérico", thickness_mm: 6, decor_code: null, sheet_width_mm: 2750, sheet_height_mm: 2070, price_per_sheet: null, has_grain: false },
  { name: "Platex/HDF 8 mm (fundo)", brand: "Genérico", thickness_mm: 8, decor_code: null, sheet_width_mm: 2750, sheet_height_mm: 2070, price_per_sheet: null, has_grain: false },
];

export const seedFundosPadrao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: e1 } = await supabase
      .from("materials").select("name").eq("user_id", userId);
    if (e1) throw new Error(e1.message);
    const have = new Set((existing ?? []).map((r: any) => r.name));
    const toInsert = FUNDOS_PADRAO
      .filter((m) => !have.has(m.name))
      .map((m) => ({ ...m, user_id: userId })) as any[];
    if (toInsert.length === 0) return { inserted: 0, skipped: FUNDOS_PADRAO.length };
    const { error: e2 } = await supabase.from("materials").insert(toInsert);
    if (e2) throw new Error(e2.message);
    return { inserted: toInsert.length, skipped: FUNDOS_PADRAO.length - toInsert.length };
  });

export const HARDWARE_CATEGORIES = hardwareCategories;
export const PRICING_UNITS = pricingUnits;
export const DRILL_PURPOSES = drillPurposes;
export const TOOL_TYPES = toolTypes;

