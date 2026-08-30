-- Dynamic wage_statuses table replacing the hardcoded WAGE_STATUS constant

CREATE TABLE IF NOT EXISTS wage_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed existing hardcoded values
INSERT INTO wage_statuses (value, label, sort_order) VALUES
  ('WFA',        'WFA',        1),
  ('LABOR_HIRE', 'Labor Hire', 2)
ON CONFLICT (value) DO NOTHING;

-- RLS
ALTER TABLE wage_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wage_statuses_select" ON wage_statuses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wage_statuses_all" ON wage_statuses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_wage_statuses_updated_at
  BEFORE UPDATE ON wage_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
