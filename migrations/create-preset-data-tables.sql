-- Preset Data Tables Migration
-- Creates gear_types and employment_statuses as dynamic DB tables
-- replacing previously hardcoded constants in supabase.js

-- ─── GEAR TYPES ───────────────────────────────────────────────────────────────
-- has_sizes: when true, a size input is shown when assigning this gear to an employee
CREATE TABLE IF NOT EXISTS gear_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,       -- internal key stored in employee_gears.gear_type
  label TEXT NOT NULL,              -- display name
  has_sizes BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed existing hardcoded gears
INSERT INTO gear_types (value, label, has_sizes, sort_order) VALUES
  ('HELMET',           'Helmet',            false, 1),
  ('MESH_GLOVES',      'Mesh Gloves',       true,  2),
  ('LONG_MESH_GLOVES', 'Long Mesh Gloves',  false, 3),
  ('MESH_APRON',       'Mesh Apron',        false, 4),
  ('GUMBOOTS',         'Gumboots',          false, 5)
ON CONFLICT (value) DO NOTHING;

-- ─── EMPLOYMENT STATUSES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,       -- internal key stored in employees.employment_status
  label TEXT NOT NULL,              -- display name
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed existing hardcoded statuses
INSERT INTO employment_statuses (value, label, sort_order) VALUES
  ('CASUAL',    'Casual',    1),
  ('FULL_TIME', 'Full Time', 2)
ON CONFLICT (value) DO NOTHING;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE gear_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_statuses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "gear_types_select" ON gear_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "employment_statuses_select" ON employment_statuses
  FOR SELECT TO authenticated USING (true);

-- Any authenticated user can insert/update/delete (permission gating done in app layer)
CREATE POLICY "gear_types_all" ON gear_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "employment_statuses_all" ON employment_statuses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────────────────────────
CREATE TRIGGER update_gear_types_updated_at
  BEFORE UPDATE ON gear_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employment_statuses_updated_at
  BEFORE UPDATE ON employment_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
