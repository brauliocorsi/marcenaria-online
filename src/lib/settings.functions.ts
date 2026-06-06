import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALLOWED_THICKNESSES_MM } from "@/lib/constants";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;

    // Defensive: should be created by trigger, but ensure existence.
    const { data: created, error: insertErr } = await supabase
      .from("settings")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);
    return created;
  });

const updateSchema = z.object({
  currency: z.string().min(1),
  iva_percent: z.number().int().min(0).max(100),
  default_thickness_mm: z.number().int().refine((v) => (ALLOWED_THICKNESSES_MM as readonly number[]).includes(v), {
    message: "Espessura não permitida",
  }),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("settings")
      .update({
        currency: data.currency,
        iva_percent: data.iva_percent,
        default_thickness_mm: data.default_thickness_mm,
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });
