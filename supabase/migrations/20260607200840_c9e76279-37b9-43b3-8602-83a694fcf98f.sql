-- Extend materials with decor/finish/color metadata for realistic 3D rendering.
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS fabricante text,
  ADD COLUMN IF NOT EXISTS decor_nome text,
  ADD COLUMN IF NOT EXISTS acabamento text NOT NULL DEFAULT 'mate',
  ADD COLUMN IF NOT EXISTS cor_hex text NOT NULL DEFAULT '#E8E2D5',
  ADD COLUMN IF NOT EXISTS textura_url text;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_acabamento_chk
  CHECK (acabamento IN ('mate','brilho','madeira','texturado'));