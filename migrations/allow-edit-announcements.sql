-- Allow ADMIN and HR to update announcements
CREATE POLICY "ADMIN and HR can update announcements"
  ON announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type IN ('ADMIN', 'HR')
    )
  );
