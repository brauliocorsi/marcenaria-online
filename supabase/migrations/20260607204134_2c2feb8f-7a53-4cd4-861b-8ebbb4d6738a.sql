CREATE TABLE public.puxadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('convencional','cava','gola_j','gola_c')),
  fabricante TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puxadores TO authenticated;
GRANT ALL ON public.puxadores TO service_role;
ALTER TABLE public.puxadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "puxadores_all_own" ON public.puxadores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_puxadores_user ON public.puxadores(user_id);