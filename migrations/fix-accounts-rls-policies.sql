-- ====================================================================================
-- FIX ACCOUNTS TABLE RLS POLICIES
-- ====================================================================================
-- This ensures users can read their own account record after signup
-- The error "User from sub claim in JWT does not exist" happens when RLS blocks access

-- Drop ALL existing policies on accounts table
DROP POLICY IF EXISTS "Users can read own account" ON accounts;
DROP POLICY IF EXISTS "Users can update own account" ON accounts;
DROP POLICY IF EXISTS "Users can insert own account" ON accounts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON accounts;
DROP POLICY IF EXISTS "Enable update for users based on id" ON accounts;

-- Disable RLS temporarily to allow service role access
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own account
CREATE POLICY "Users can read own account"
ON accounts
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to update their own account
CREATE POLICY "Users can update own account"
ON accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow service role to do anything (for admin operations)
CREATE POLICY "Service role has full access"
ON accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'accounts';
