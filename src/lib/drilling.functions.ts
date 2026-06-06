import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SISTEMAS_UNIAO = [
  "minifix_cavilha",
  "cavilha_parafuso",
  "parafuso_cavilha",
  "parafuso_direto",
] as const;

export const SISTEMA_LABELS: Record<string, string> = {
  minifix_cavilha: "Minifix + Cavilha",
  cavilha_parafuso: "Cavilha + Parafuso",
  parafuso_cavilha: "Parafuso + Cavilha",
  parafuso_direto: "Parafuso direto",
};

const brocasSchema = z.object({
  cavilha: z.string().uuid().nullable().optional(),
  minifix_corpo: z.string().uuid().nullable().optional(),
  minifix_perno: z.string().uuid().nullable().optional(),
  parafuso: z.string().uuid().nullable().optional(),
  dobradica: z.string().uuid().nullable().optional(),
});

const regrasSchema = z.object({
  recuo_extremidade: z.number().min(0).max(500),
  espacamento_sistema: z.number().min(1).max(500),
  recuo_frontal: z.number().min(0).max(500),
  conectores_min: z.number().int().min(1).max(20),
  conectores_por_mm: z.number().int().min(50).max(2000),
  prof_cavilha: z.number().min(1).max(100),
  prof_minifix: z.number().min(1).max(100),
  diam_cavilha: z.number().min(1).max(50),
  diam_parafuso: z.number().min(1).max(50),
});

const configSchema = z.object({
  sistemaUniao: z.enum(SISTEMAS_UNIAO),
  brocas: brocasSchema,
  regras: regrasSchema,
});

const templateSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(200),
  is_default: z.boolean().default(false),
  config: configSchema,
});

export type TemplateConfig = z.infer<typeof configSchema>;

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  sistemaUniao: "minifix_cavilha",
  brocas: {},
  regras: {
    recuo_extremidade: 37,
    espacamento_sistema: 32,
    recuo_frontal: 37,
    conectores_min: 2,
    conectores_por_mm: 250,
    prof_cavilha: 30,
    prof_minifix: 13,
    diam_cavilha: 8,
    diam_parafuso: 5,
  },
};

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drilling_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), values: templateSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.values.is_default) {
      const { error: clearErr } = await supabase
        .from("drilling_templates")
        .update({ is_default: false })
        .eq("user_id", userId);
      if (clearErr) throw new Error(clearErr.message);
    }
    const payload = {
      name: data.values.name,
      is_default: data.values.is_default,
      config: data.values.config as any,
      user_id: userId,
    };
    if (data.id) {
      const { error } = await supabase
        .from("drilling_templates")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("drilling_templates").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("drilling_templates")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDefaultTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error: clearErr } = await supabase
      .from("drilling_templates")
      .update({ is_default: false })
      .eq("user_id", userId);
    if (clearErr) throw new Error(clearErr.message);
    const { error } = await supabase
      .from("drilling_templates")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BROCAS_PADRAO = [
  { name: "Broca cavilha Ø8", diameter_mm: 8, purpose: "cavilha" as const, max_depth_mm: 30 },
  { name: "Broca minifix corpo Ø15", diameter_mm: 15, purpose: "minifix" as const, max_depth_mm: 13 },
  { name: "Broca minifix perno Ø8", diameter_mm: 8, purpose: "minifix" as const, max_depth_mm: 34 },
  { name: "Broca pré-furo parafuso Ø5", diameter_mm: 5, purpose: "parafuso" as const, max_depth_mm: 40 },
  { name: "Broca dobradiça Ø35", diameter_mm: 35, purpose: "geral" as const, max_depth_mm: 13 },
];

export const seedBrocasPadrao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: listErr } = await supabase
      .from("drill_bits")
      .select("name")
      .eq("user_id", userId);
    if (listErr) throw new Error(listErr.message);
    const existingNames = new Set((existing ?? []).map((d: any) => d.name));
    const toInsert = BROCAS_PADRAO.filter((b) => !existingNames.has(b.name)).map((b) => ({
      ...b,
      user_id: userId,
    }));
    if (toInsert.length === 0) return { inserted: 0 };
    const { error } = await supabase.from("drill_bits").insert(toInsert);
    if (error) throw new Error(error.message);
    return { inserted: toInsert.length };
  });
