-- Allow employees to insert their own sick leave records
-- The leave table has no RLS enabled, so this is informational
-- If RLS is ever enabled, add this policy:

-- ALTER TABLE leave ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Employees can insert their own leave"
--   ON leave FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM accounts
--       WHERE accounts.id = auth.uid()
--       AND accounts.employee_id = leave.employee_id
--     )
--   );
