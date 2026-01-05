-- Fix RLS policies for employees table to work with Supabase Auth

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow HR to manage employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to read employees" ON employees;

-- Allow all authenticated users to read employees
CREATE POLICY "Allow authenticated users to read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert employees
CREATE POLICY "Allow authenticated users to insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update employees
CREATE POLICY "Allow authenticated users to update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to delete employees (soft delete via is_active)
CREATE POLICY "Allow authenticated users to delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);
