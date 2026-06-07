import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  ambiente_id: z.string().uuid(),
  module_id: z.string().uuid(),
  parede: z.enum(["fundo", "esquerda", "direita"]),
  x_offset_mm: z.number().int().min(-10000).max(10000),
  altura_chao_mm: z.number().int().min(0).max(5000),
  rotacao_deg: z.number().int().min(-180).max(180).default(0),
});

export const listAmbienteModulos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ambienteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ambiente_modulos")
      .select("*")
      .eq("ambiente_id", data.ambienteId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows;
  });

export const upsertAmbienteModulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      ambiente_id: data.ambiente_id,
      module_id: data.module_id,
      parede: data.parede,
      x_offset_mm: data.x_offset_mm,
      altura_chao_mm: data.altura_chao_mm,
      rotacao_deg: data.rotacao_deg,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("ambiente_modulos").update(payload).eq("id", data.id).eq("user_id", userId)
        .select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("ambiente_modulos").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAmbienteModulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ambiente_modulos").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
