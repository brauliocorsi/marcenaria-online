import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const projectTypeEnum = z.enum(["cozinha", "roupeiro", "movel"]);
const projectStatusEnum = z.enum(["rascunho", "finalizado"]);

export const projectUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  type: projectTypeEnum.default("movel"),
  status: projectStatusEnum.default("rascunho"),
  cliente_nome: z.string().max(200).nullable().optional(),
  cliente_nif: z.string().max(50).nullable().optional(),
  cliente_morada: z.string().max(500).nullable().optional(),
});

export type ProjectUpsertInput = z.infer<typeof projectUpsertSchema>;

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      name: data.name,
      type: data.type,
      status: data.status,
      cliente_nome: data.cliente_nome ?? null,
      cliente_nif: data.cliente_nif ?? null,
      cliente_morada: data.cliente_morada ?? null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("projects")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setActiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("settings")
      .update({ active_project_id: data.id })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, active_project_id: data.id };
  });

export const getActiveProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: s, error } = await supabase
      .from("settings")
      .select("active_project_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!s?.active_project_id) return null;
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", s.active_project_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    return project ?? null;
  });
