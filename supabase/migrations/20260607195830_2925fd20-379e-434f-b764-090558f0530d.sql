CREATE TABLE public.ambiente_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ambiente_id uuid NOT NULL REFERENCES public.ambientes(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  parede text NOT NULL CHECK (parede IN ('fundo','esquerda','direita')),
  x_offset_mm integer NOT NULL DEFAULT 0,
  altura_chao_mm integer NOT NULL DEFAULT 0,
  rotacao_deg integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambiente_modulos TO authenticated;
GRANT ALL ON public.ambiente_modulos TO service_role;
ALTER TABLE public.ambiente_modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ambiente_modulos_all_own ON public.ambiente_modulos FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE INDEX ambiente_modulos_ambiente_idx ON public.ambiente_modulos(ambiente_id);