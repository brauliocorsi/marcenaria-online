import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUXADORES_DEFAULT, type PuxadorTipo } from "@/lib/engines/puxadores";

export const PUXADOR_TIPOS = ["convencional", "cava", "gola_j", "gola_c"] as const;

const schema = z.object({
  nome: z.string().min(1).max(200),
  tipo: z.enum(PUXADOR_TIPOS),
  fabricante: z.string().max(200).nullable().optional(),
  config: z.record(z.string(), z.any()),
});

export const listPuxadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data, error } = await supabase
      .from("puxadores" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      const rows = PUXADORES_DEFAULT.map((p) => ({
        user_id: userId, nome: p.nome, tipo: p.tipo,
        fabricante: p.fabricante ?? null, config: p.config as any,
      }));
      const ins = await supabase.from("puxadores" as any).insert(rows).select("*");
      if (ins.error) throw new Error(ins.error.message);
      data = ins.data;
    }
    return data;
  });

export const upsertPuxador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), values: schema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data.values, user_id: userId } as any;
    if (data.id) {
      const { error } = await supabase.from("puxadores" as any)
        .update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("puxadores" as any).insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePuxador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("puxadores" as any).delete()
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type { PuxadorTipo };
