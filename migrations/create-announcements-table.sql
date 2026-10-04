CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read announcements
CREATE POLICY "Authenticated users can read announcements"
  ON announcements FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only ADMIN and HR can create announcements
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
