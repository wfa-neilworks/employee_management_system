-- Add QA account type
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'QA';

-- Work instructions master table
CREATE TABLE IF NOT EXISTS work_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL UNIQUE,         -- e.g. AARR-01
  dept_code TEXT NOT NULL,                  -- e.g. AARR
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  aim TEXT NOT NULL,
  ppe TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]',  -- [{ text: "..." }, ...]
  issue_no INTEGER NOT NULL DEFAULT 1,
  revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  authorized_by TEXT NOT NULL DEFAULT 'QA Manager',
  status TEXT NOT NULL DEFAULT 'draft',    -- draft | published
  created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps for each work instruction
CREATE TABLE IF NOT EXISTS wi_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wi_id UUID NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  step_text TEXT NOT NULL,
  criteria_text TEXT,
  criteria_image_url TEXT
);

-- Employee assignments & signatures
CREATE TABLE IF NOT EXISTS wi_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wi_id UUID NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  signed_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  UNIQUE(wi_id, employee_id)
);

-- RLS
ALTER TABLE work_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wi_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE wi_assignments ENABLE ROW LEVEL SECURITY;

-- work_instructions: all authenticated can read published; ADMIN/HR/QA can do everything
CREATE POLICY "Authenticated can read published WIs"
  ON work_instructions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ADMIN HR QA can insert WIs"
  ON work_instructions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );

CREATE POLICY "ADMIN HR QA can update WIs"
  ON work_instructions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );

CREATE POLICY "ADMIN HR QA can delete WIs"
  ON work_instructions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );

-- wi_steps: same as parent
CREATE POLICY "Authenticated can read wi_steps"
  ON wi_steps FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ADMIN HR QA can manage wi_steps"
  ON wi_steps FOR ALL
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );

-- wi_assignments
CREATE POLICY "Authenticated can read their own assignments"
  ON wi_assignments FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "ADMIN HR QA can manage assignments"
  ON wi_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );

CREATE POLICY "Employees can sign their own assignment"
  ON wi_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = auth.uid()
      AND employee_id = wi_assignments.employee_id
    )
  );

-- Storage bucket for WI images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wi-images', 'wi-images', true, 5242880, ARRAY['image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ADMIN HR QA can upload WI images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wi-images'
    AND EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );

CREATE POLICY "Public can read WI images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wi-images');

CREATE POLICY "ADMIN HR QA can delete WI images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wi-images'
    AND EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR','QA'))
  );
