ALTER TABLE public.drill_bits
  ADD COLUMN IF NOT EXISTS tool_type text NOT NULL DEFAULT 'broca',
  ADD COLUMN IF NOT EXISTS passante boolean NOT NULL DEFAULT false;

ALTER TABLE public.drill_bits
  DROP CONSTRAINT IF EXISTS drill_bits_tool_type_check;

ALTER TABLE public.drill_bits
  ADD CONSTRAINT drill_bits_tool_type_check
  CHECK (tool_type IN ('broca','fresa','disco_corte'));