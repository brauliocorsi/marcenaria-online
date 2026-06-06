
-- Enums
CREATE TYPE public.hardware_category AS ENUM ('minifix','cavilha','parafuso','dobradica','corredica','pe','perfil_aluminio','led','outro');
CREATE TYPE public.pricing_unit AS ENUM ('unidade','metro');
CREATE TYPE public.drill_purpose AS ENUM ('parafuso','cavilha','minifix','geral');
CREATE TYPE public.project_type AS ENUM ('cozinha','roupeiro','movel');
CREATE TYPE public.project_status AS ENUM ('rascunho','finalizado');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  nif TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Settings
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  iva_percent NUMERIC NOT NULL DEFAULT 23,
  default_thickness_mm INTEGER NOT NULL DEFAULT 19,
  unit TEXT NOT NULL DEFAULT 'mm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_all_own" ON public.settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Materials
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Kronospan',
  decor_code TEXT,
  thickness_mm INTEGER NOT NULL CHECK (thickness_mm IN (3,4,6,8,16,19,25)),
  sheet_width_mm INTEGER NOT NULL DEFAULT 2750,
  sheet_height_mm INTEGER NOT NULL DEFAULT 2070,
  price_per_sheet NUMERIC,
  has_grain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_all_own" ON public.materials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Edge bands
CREATE TABLE public.edge_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  thickness_mm NUMERIC NOT NULL,
  width_mm NUMERIC,
  price_per_meter NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edge_bands TO authenticated;
GRANT ALL ON public.edge_bands TO service_role;
ALTER TABLE public.edge_bands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edge_bands_all_own" ON public.edge_bands FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hardware
CREATE TABLE public.hardware (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.hardware_category NOT NULL,
  name TEXT NOT NULL,
  reference TEXT,
  pricing_unit public.pricing_unit NOT NULL DEFAULT 'unidade',
  price NUMERIC,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware TO authenticated;
GRANT ALL ON public.hardware TO service_role;
ALTER TABLE public.hardware ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hardware_all_own" ON public.hardware FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Drill bits
CREATE TABLE public.drill_bits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  diameter_mm NUMERIC NOT NULL,
  purpose public.drill_purpose NOT NULL DEFAULT 'geral',
  max_depth_mm INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drill_bits TO authenticated;
GRANT ALL ON public.drill_bits TO service_role;
ALTER TABLE public.drill_bits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drill_bits_all_own" ON public.drill_bits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Drilling templates
CREATE TABLE public.drilling_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drilling_templates TO authenticated;
GRANT ALL ON public.drilling_templates TO service_role;
ALTER TABLE public.drilling_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drilling_templates_all_own" ON public.drilling_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.project_type NOT NULL DEFAULT 'movel',
  status public.project_status NOT NULL DEFAULT 'rascunho',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all_own" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, nif)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'nif'
  );
  INSERT INTO public.settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
