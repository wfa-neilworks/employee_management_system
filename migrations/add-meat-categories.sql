-- Categories admin defines before uploading products
CREATE TABLE IF NOT EXISTS meat_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,        -- matched against CSV category column
  description TEXT NOT NULL DEFAULT '', -- shown as collapsible header to employees
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meat_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read meat categories"
  ON meat_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ADMIN can manage meat categories"
  ON meat_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type = 'ADMIN'));
