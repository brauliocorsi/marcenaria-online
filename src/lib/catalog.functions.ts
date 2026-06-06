import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- MATERIAIS ----------
const materialSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(200),
  brand: z.string().max(120).default("Kronospan"),
  decor_code: z.string().max(60).nullable().optional(),
  thickness_mm: z.number().int().refine((v) => [3, 4, 6, 8, 16, 19, 25].includes(v)),
  sheet_width_mm: z.number().int().min(100).max(10000),
  sheet_height_mm: z.number().int().min(100).max(10000),
  price_per_sheet: z.number().min(0).nullable().optional(),
  has_grain: z.boolean().default(false),
});

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
const hardwareCategories = ["minifix","cavilha","parafuso","dobradica","corredica","pe","perfil_aluminio","led","outro"] as const;
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


// ---------- BROCAS ----------
const drillPurposes = ["parafuso","cavilha","minifix","geral"] as const;
const drillSchema = z.object({
  name: z.string().min(1).max(200),
  diameter_mm: z.number().min(0.1).max(100),
  purpose: z.enum(drillPurposes),
  max_depth_mm: z.number().int().min(1).max(500).nullable().optional(),
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
    const payload = { ...data.values, user_id: userId };
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

export const HARDWARE_CATEGORIES = hardwareCategories;
export const PRICING_UNITS = pricingUnits;
export const DRILL_PURPOSES = drillPurposes;
