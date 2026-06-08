
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cliente_nome text,
  ADD COLUMN IF NOT EXISTS cliente_nif text,
  ADD COLUMN IF NOT EXISTS cliente_morada text;

ALTER TABLE public.ambientes
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ambientes_project_id_idx ON public.ambientes(project_id);

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS active_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
