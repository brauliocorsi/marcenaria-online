import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GAVETA_TEMPLATES_DEFAULT, type GavetaTipo } from "@/lib/engines/gaveta-template";

export const GAVETA_TIPOS = ["classica", "frente_integrada", "legrabox"] as const;

const schema = z.object({
  nome: z.string().min(1).max(200),
  tipo: z.enum(GAVETA_TIPOS),
  config: z.record(z.string(), z.any()),
});

export const listGavetaTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data, error } = await supabase
      .from("gaveta_templates" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      // Seed automático
      const rows = GAVETA_TEMPLATES_DEFAULT.map((t) => ({
        user_id: userId, nome: t.nome, tipo: t.tipo, config: t.config as any,
      }));
      const ins = await supabase.from("gaveta_templates" as any).insert(rows).select("*");
      if (ins.error) throw new Error(ins.error.message);
      data = ins.data;
    }
    return data;
  });

export const upsertGavetaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), values: schema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.values, user_id: userId } as any;
    if (data.id) {
      const { error } = await supabase.from("gaveta_templates" as any)
        .update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("gaveta_templates" as any).insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteGavetaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("gaveta_templates" as any)
      .delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type { GavetaTipo };
