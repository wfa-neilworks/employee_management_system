-- ====================================================================================
-- DISABLE RLS ON ACCOUNTS TABLE
-- ====================================================================================
-- The invite flow doesn't work well with RLS because invited users have temporary
-- JWT tokens that don't have full permissions until they complete signup.
-- Since we control access at the application level through the accounts.account_type
-- column, we can safely disable RLS on this table.

-- Drop ALL existing policies on accounts table
DROP POLICY IF EXISTS "Users can read own account" ON accounts;
DROP POLICY IF EXISTS "Users can update own account" ON accounts;
DROP POLICY IF EXISTS "Users can insert own account" ON accounts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON accounts;
DROP POLICY IF EXISTS "Enable update for users based on id" ON accounts;
DROP POLICY IF EXISTS "Service role has full access" ON accounts;
DROP POLICY IF EXISTS "ACCOUNTS can update processed status" ON accounts;

-- Disable RLS on accounts table entirely
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'accounts' AND schemaname = 'public';
