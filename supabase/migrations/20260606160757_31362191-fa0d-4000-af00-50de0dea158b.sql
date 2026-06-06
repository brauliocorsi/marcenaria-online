ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_thickness_mm_check;
ALTER TABLE public.materials ALTER COLUMN thickness_mm TYPE numeric USING thickness_mm::numeric;
ALTER TABLE public.materials ADD CONSTRAINT materials_thickness_mm_check CHECK (thickness_mm > 0 AND thickness_mm <= 100);
UPDATE public.materials SET thickness_mm = 3.5 WHERE name = 'Platex/HDF 3,5 mm (fundo)' AND thickness_mm = 3;