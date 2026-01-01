-- Fix RLS policies for employee_gears table to work with Supabase Auth

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read gears" ON employee_gears;
DROP POLICY IF EXISTS "Allow procurement to manage gears" ON employee_gears;

-- Allow all authenticated users to read employee gears
CREATE POLICY "Allow authenticated users to read gears"
  ON employee_gears FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert gears
CREATE POLICY "Allow authenticated users to insert gears"
  ON employee_gears FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update gears
CREATE POLICY "Allow authenticated users to update gears"
  ON employee_gears FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to delete gears
CREATE POLICY "Allow authenticated users to delete gears"
  ON employee_gears FOR DELETE
  TO authenticated
  USING (true);
