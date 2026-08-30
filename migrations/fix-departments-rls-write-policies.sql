-- Allow authenticated users to insert, update, and delete departments
-- (permission gating is handled at the app layer via manage_preset_data permission)

CREATE POLICY "departments_insert" ON departments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "departments_update" ON departments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "departments_delete" ON departments
  FOR DELETE TO authenticated USING (true);
