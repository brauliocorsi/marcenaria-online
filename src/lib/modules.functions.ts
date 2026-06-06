import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  width_mm: z.number().int().min(50).max(10000),
  height_mm: z.number().int().min(50).max(10000),
  depth_mm: z.number().int().min(50).max(2000),
  config: z.record(z.string(), z.any()),
  pieces: z.array(z.record(z.string(), z.any())),
  material_id: z.string().uuid().nullable().optional(),
});

export const listModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("modules")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      name: data.name,
      width_mm: data.width_mm,
      height_mm: data.height_mm,
      depth_mm: data.depth_mm,
      config: data.config,
      pieces: data.pieces,
      material_id: data.material_id ?? null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("modules").update(payload).eq("id", data.id).eq("user_id", userId)
        .select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("modules").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("modules").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
