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
--    4. Find the UUID from Supabase Dashboard or by checking the invite link
--    5. Run one of the queries below with the correct UUID
--    6. User receives email, clicks link, enters name and password
--    7. User logs in with assigned role and personalized greeting
-- ====================================================================================

-- ========================================
-- ASSIGN ROLE TO CURRENT INVITED USER
-- ========================================
-- This user is currently trying to sign up with ID: ab1c6f89-5572-4641-8a65-b7e87c94f977
-- Run this to assign PROCUREMENT role to this user

INSERT INTO accounts (id, email, account_type, created_at)
SELECT id, email, 'PROCUREMENT', NOW()
FROM auth.users
WHERE id = 'ab1c6f89-5572-4641-8a65-b7e87c94f977'
ON CONFLICT (id) DO UPDATE
SET account_type = 'PROCUREMENT';

-- Verify the account was created
SELECT * FROM accounts WHERE id = 'ab1c6f89-5572-4641-8a65-b7e87c94f977';


-- ====================================================================================
-- ALTERNATIVE: Assign role by email (if you don't know the UUID)
-- ====================================================================================
-- This finds the user by email from auth.users and creates account record

-- INSERT INTO accounts (id, email, account_type, created_at)
-- SELECT id, email, 'PROCUREMENT', NOW()
-- FROM auth.users
-- WHERE email = 'user@example.com'  -- ⚠️ CHANGE THIS to the user's email
-- ON CONFLICT (id) DO UPDATE
-- SET account_type = 'PROCUREMENT';


-- ====================================================================================
-- HELPER: View all invited users and their current account status
-- ====================================================================================
SELECT
  au.id,
  au.email,
  au.created_at as invited_at,
  a.account_type,
  a.first_name,
  a.last_name,
  CASE
    WHEN a.id IS NULL THEN '❌ No role assigned'
    WHEN a.first_name IS NULL THEN '⏳ Role assigned, waiting for signup'
    ELSE '✅ Signup complete'
  END as status
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
ORDER BY au.created_at DESC;


-- ====================================================================================
-- CLEANUP: Delete incorrect user if needed
-- ====================================================================================
-- If you want to remove the old user (9f9e0397-5a5a-4656-b79e-1273f4d7de32) that had
-- the role assigned but isn't being used:

-- DELETE FROM accounts WHERE id = '9f9e0397-5a5a-4656-b79e-1273f4d7de32';
-- DELETE FROM auth.users WHERE id = '9f9e0397-5a5a-4656-b79e-1273f4d7de32';


-- ====================================================================================
-- IMPORTANT NOTES
-- ====================================================================================
-- 1. When you invite a user, Supabase creates the auth.users record immediately
-- 2. The user has a UUID even before they click the invite link
-- 3. This query creates the accounts record with that UUID and the assigned role
-- 4. When user signs up, they add their first_name and last_name to the existing record
-- 5. The account record is matched by ID (UUID), so no JWT errors occur
-- 6. RLS is disabled on accounts table to prevent JWT permission issues during invite flow
