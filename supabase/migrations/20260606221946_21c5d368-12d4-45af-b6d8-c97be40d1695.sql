CREATE TABLE public.ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambientes TO authenticated;
GRANT ALL ON public.ambientes TO service_role;

ALTER TABLE public.ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ambientes_all_own ON public.ambientes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ambientes_set_updated_at
  BEFORE UPDATE ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();