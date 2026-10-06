-- Add targeting and scheduling columns to announcements
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'ALL', -- ALL | DEPARTMENT | INDIVIDUAL
  ADD COLUMN IF NOT EXISTS target_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- Read receipts table
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (announcement_id, employee_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Employees can insert and read their own read receipts
CREATE POLICY "Employees can mark announcements as read"
  ON announcement_reads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.employee_id = announcement_reads.employee_id
    )
  );

CREATE POLICY "Employees can read their own receipts"
  ON announcement_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.employee_id = announcement_reads.employee_id
    )
  );

-- Drop old broad RLS policies on announcements and replace with targeted ones
DROP POLICY IF EXISTS "Authenticated users can read announcements" ON announcements;
DROP POLICY IF EXISTS "ADMIN and HR can insert announcements" ON announcements;
DROP POLICY IF EXISTS "ADMIN and HR can delete announcements" ON announcements;

CREATE POLICY "Authenticated users can read announcements"
  ON announcements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ADMIN and HR can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type IN ('ADMIN', 'HR')
    )
  );

CREATE POLICY "ADMIN and HR can delete announcements"
  ON announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type IN ('ADMIN', 'HR')
    )
  );
