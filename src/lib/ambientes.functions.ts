import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roomConfigSchema = z.object({
  largura: z.number().int().min(500).max(8000),
  profundidade: z.number().int().min(500).max(8000),
  altura: z.number().int().min(2000).max(3500),
  espessuraParede: z.number().int().min(20).max(500),
  paredesVisiveis: z.object({
    fundo: z.boolean(),
    frente: z.boolean(),
    esquerda: z.boolean(),
    direita: z.boolean(),
  }),
});

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  config: roomConfigSchema,
});

export const listAmbientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ambientes").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getAmbiente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ambientes").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertAmbiente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { user_id: userId, name: data.name, config: data.config };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("ambientes").update(payload).eq("id", data.id).eq("user_id", userId)
        .select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("ambientes").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAmbiente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ambientes").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
