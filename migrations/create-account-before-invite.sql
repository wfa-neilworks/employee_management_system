-- ====================================================================================
-- ASSIGN ROLE AFTER INVITE (✅ CORRECT WORKFLOW)
-- ====================================================================================
-- Run this AFTER inviting the user via Supabase Dashboard
-- When you invite a user, Supabase creates their auth record with a UUID immediately
-- This query creates the account record with that UUID and assigned role
--
-- 📋 WORKFLOW:
--    1. Go to Supabase Dashboard > Authentication > Users > Invite User
--    2. Enter the user's email and send invite
--    3. Supabase creates auth.users record with UUID immediately
--    4. Run one of the queries below with the user's email and desired role
--    5. User receives email, clicks link, enters name and password
--    6. User logs in with assigned role and personalized greeting
-- ====================================================================================

-- ========================================
-- Create HR Account (run AFTER invite)
-- ========================================
-- This finds the user by email from auth.users and creates account record

INSERT INTO accounts (id, email, account_type, created_at)
SELECT id, email, 'HR', NOW()
FROM auth.users
WHERE email = 'hr@wfa.com'  -- ⚠️ CHANGE THIS to the user's email
ON CONFLICT (id) DO UPDATE
SET account_type = 'HR';

-- ========================================
-- Create PROCUREMENT Account (run AFTER invite)
-- ========================================

INSERT INTO accounts (id, email, account_type, created_at)
SELECT id, email, 'PROCUREMENT', NOW()
FROM auth.users
WHERE email = 'procurement@wfa.com'  -- ⚠️ CHANGE THIS to the user's email
ON CONFLICT (id) DO UPDATE
SET account_type = 'PROCUREMENT';

-- ========================================
-- Create ACCOUNTS Account (run AFTER invite)
-- ========================================

INSERT INTO accounts (id, email, account_type, created_at)
SELECT id, email, 'ACCOUNTS', NOW()
FROM auth.users
WHERE email = 'accounts@wfa.com'  -- ⚠️ CHANGE THIS to the user's email
ON CONFLICT (id) DO UPDATE
SET account_type = 'ACCOUNTS';


-- ====================================================================================
-- HELPER: View all invited users who don't have roles yet
-- ====================================================================================
SELECT
  au.id,
  au.email,
  au.created_at as invited_at,
  a.account_type
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
WHERE a.id IS NULL
ORDER BY au.created_at DESC;


-- ====================================================================================
-- IMPORTANT NOTES
-- ====================================================================================
-- 1. When you invite a user, Supabase creates the auth.users record immediately
-- 2. The user has a UUID even before they click the invite link
-- 3. This query creates the accounts record with that UUID and the assigned role
-- 4. When user signs up, they add their first_name and last_name to the existing record
-- 5. The account record is matched by ID (UUID), so no JWT errors occur
