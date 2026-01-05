-- Fix ALL RLS policies to work with Supabase Auth
-- This allows all authenticated users to manage all tables

-- ======================
-- EMPLOYEES TABLE
-- ======================
DROP POLICY IF EXISTS "Allow HR to manage employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to read employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON employees;

CREATE POLICY "Allow authenticated users to read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- ======================
-- EMPLOYEE_GEARS TABLE
-- ======================
DROP POLICY IF EXISTS "Allow procurement to manage gears" ON employee_gears;
DROP POLICY IF EXISTS "Allow authenticated users to read gears" ON employee_gears;
DROP POLICY IF EXISTS "Allow authenticated users to insert gears" ON employee_gears;
DROP POLICY IF EXISTS "Allow authenticated users to update gears" ON employee_gears;
DROP POLICY IF EXISTS "Allow authenticated users to delete gears" ON employee_gears;

CREATE POLICY "Allow authenticated users to read gears"
  ON employee_gears FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert gears"
  ON employee_gears FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update gears"
  ON employee_gears FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete gears"
  ON employee_gears FOR DELETE
  TO authenticated
  USING (true);

-- ======================
-- EMPLOYEE_HISTORY TABLE
-- ======================
DROP POLICY IF EXISTS "Allow authenticated users to read history" ON employee_history;
DROP POLICY IF EXISTS "Allow authenticated users to create history" ON employee_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert history" ON employee_history;

CREATE POLICY "Allow authenticated users to read history"
  ON employee_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert history"
  ON employee_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ======================
-- DEPARTMENTS TABLE
-- ======================
-- Keep as read-only for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to read departments" ON departments;

CREATE POLICY "Allow authenticated users to read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- ======================
-- LEAVE TABLE
-- ======================
DROP POLICY IF EXISTS "Allow authenticated users to read leave" ON leave;
DROP POLICY IF EXISTS "Allow authenticated users to insert leave" ON leave;
DROP POLICY IF EXISTS "Allow authenticated users to update leave" ON leave;
DROP POLICY IF EXISTS "Allow authenticated users to delete leave" ON leave;

CREATE POLICY "Allow authenticated users to read leave"
  ON leave FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert leave"
  ON leave FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update leave"
  ON leave FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete leave"
  ON leave FOR DELETE
  TO authenticated
  USING (true);
