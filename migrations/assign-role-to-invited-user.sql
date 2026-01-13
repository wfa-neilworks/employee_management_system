-- ====================================================================================
-- ASSIGN ROLE TO INVITED USERS
-- ====================================================================================
-- This script helps assign account types (HR, PROCUREMENT, ACCOUNTS) to users
-- invited through Supabase Authentication.
--
-- ⚠️ IMPORTANT: Run this AFTER the user has accepted their invitation and
--    their account is created in auth.users
--
-- 📋 QUICK START:
--    1. Invite user via Supabase Dashboard (Authentication > Users > Invite User)
--    2. User clicks email link, enters name and sets password on /signup page
--    3. Run one of the queries below (METHOD 1) with the user's email to assign their role
--    4. User can now log in with assigned role and personalized greeting
-- ====================================================================================


-- ====================================================================================
-- METHOD 1: Assign role using user's email (✅ RECOMMENDED - Use this!)
-- ====================================================================================
-- Simply replace the email address and role type, then run the query.
-- Note: The account record is created during signup with first_name and last_name.
-- This query only updates the account_type field.

-- ========================================
-- Example 1: Assign HR role
-- ========================================
-- Replace 'hr@wfa.com' with the actual email address

UPDATE accounts
SET account_type = 'HR'
WHERE email = 'hr@wfa.com';  -- ⚠️ CHANGE THIS to the actual user's email

-- ========================================
-- Example 2: Assign PROCUREMENT role
-- ========================================
-- Replace 'procurement@wfa.com' with the actual email address

UPDATE accounts
SET account_type = 'PROCUREMENT'
WHERE email = 'procurement@wfa.com';  -- ⚠️ CHANGE THIS to the actual user's email

-- ========================================
-- Example 3: Assign ACCOUNTS role
-- ========================================
-- Replace 'accounts@wfa.com' with the actual email address

UPDATE accounts
SET account_type = 'ACCOUNTS'
WHERE email = 'accounts@wfa.com';  -- ⚠️ CHANGE THIS to the actual user's email


-- ====================================================================================
-- METHOD 2: Assign role using user ID (if you have the UUID)
-- ====================================================================================
-- ⚠️ WARNING: DO NOT RUN THIS DIRECTLY - These are EXAMPLE queries only!
-- ⚠️ Replace 'USER_UUID_FROM_AUTH_USERS' with an actual UUID before running
-- ⚠️ Use METHOD 1 instead - it's easier and safer!

/*
-- For HR user (EXAMPLE - DO NOT RUN AS-IS)
INSERT INTO accounts (id, email, account_type, created_at)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',  -- Replace with actual UUID from auth.users
  'hr@wfa.com',                  -- Replace with actual email
  'HR',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET account_type = 'HR',
    email = EXCLUDED.email;

-- For PROCUREMENT user (EXAMPLE - DO NOT RUN AS-IS)
INSERT INTO accounts (id, email, account_type, created_at)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',  -- Replace with actual UUID from auth.users
  'procurement@wfa.com',         -- Replace with actual email
  'PROCUREMENT',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET account_type = 'PROCUREMENT',
    email = EXCLUDED.email;

-- For ACCOUNTS user (EXAMPLE - DO NOT RUN AS-IS)
INSERT INTO accounts (id, email, account_type, created_at)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',  -- Replace with actual UUID from auth.users
  'accounts@wfa.com',            -- Replace with actual email
  'ACCOUNTS',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET account_type = 'ACCOUNTS',
    email = EXCLUDED.email;
*/


-- ====================================================================================
-- HELPER QUERIES
-- ====================================================================================

-- Query 1: Find users who exist in auth.users but not in accounts table
-- (These are users who have been invited but haven't been assigned a role yet)
SELECT
  au.id,
  au.email,
  au.created_at,
  a.account_type
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
WHERE a.id IS NULL
ORDER BY au.created_at DESC;

-- Query 2: View all users and their assigned roles
SELECT
  au.id,
  au.email,
  a.account_type,
  au.created_at
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
ORDER BY au.created_at DESC;

-- Query 3: Find a specific user by email
SELECT
  au.id,
  au.email,
  a.account_type,
  au.created_at
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
WHERE au.email = 'user@example.com'  -- Replace with email to search
ORDER BY au.created_at DESC;

-- Query 4: Count users by account type
SELECT
  COALESCE(a.account_type, 'NO ROLE ASSIGNED') as account_type,
  COUNT(*) as user_count
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
GROUP BY a.account_type
ORDER BY user_count DESC;


-- ====================================================================================
-- USAGE INSTRUCTIONS
-- ====================================================================================

-- STEP 1: Invite user through Supabase Dashboard
--   - Go to Authentication > Users
--   - Click "Invite User"
--   - Enter their email address
--   - User receives invitation email

-- STEP 2: User accepts invitation
--   - User clicks link in email
--   - User sets their password
--   - Account is created in auth.users table

-- STEP 3: Assign role to the user
--   - Use METHOD 1 (recommended) with their email address
--   - Run the appropriate INSERT query for their role (HR, PROCUREMENT, or ACCOUNTS)

-- STEP 4: Verify role assignment
--   - Use Query 2 to view all users and confirm the role was assigned

-- ====================================================================================
-- EXAMPLE WORKFLOW
-- ====================================================================================

/*
-- Example: Assigning HR role to newly invited user

-- 1. First, check if the user exists in auth.users (run after they accept invitation)
SELECT id, email, created_at
FROM auth.users
WHERE email = 'newuser@wfa.com';

-- 2. Assign them the HR role
INSERT INTO accounts (id, email, account_type, created_at)
SELECT
  id,
  email,
  'HR',
  NOW()
FROM auth.users
WHERE email = 'newuser@wfa.com'
ON CONFLICT (id) DO UPDATE
SET account_type = 'HR',
    email = EXCLUDED.email;

-- 3. Verify it worked
SELECT
  au.id,
  au.email,
  a.account_type,
  au.created_at
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
WHERE au.email = 'newuser@wfa.com';
*/


-- ====================================================================================
-- ROLE PERMISSIONS SUMMARY
-- ====================================================================================

/*
HR:
- Full access to all features
- Can add, edit, delete employees
- Can manage departments
- Can manage attendance
- Can manage leaves
- Can resign employees
- Can edit roster
- Can view and print transaction history

PROCUREMENT:
- Can manage knife dockets (products catalog)
- Can sell products to employees
- Can view transaction history
- Can edit roster
- Limited access to employee management

ACCOUNTS:
- Read-only access to most features
- Can view all data but cannot edit
- Can print invoices from transaction history
- Can process transactions (mark as processed)
- CANNOT edit roster
- CANNOT perform CRUD operations on employees, departments, etc.
*/
