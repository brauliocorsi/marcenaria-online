CREATE TABLE public.gaveta_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('classica','frente_integrada','legrabox')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gaveta_templates TO authenticated;
GRANT ALL ON public.gaveta_templates TO service_role;

ALTER TABLE public.gaveta_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gaveta_templates_all_own" ON public.gaveta_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);