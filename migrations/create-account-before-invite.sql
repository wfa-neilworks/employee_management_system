-- ====================================================================================
-- PRE-INVITE ACCOUNT CREATION
-- ====================================================================================
-- Run this BEFORE inviting a user to create their account record with assigned role.
-- When they sign up, they'll just add their name and the record will be updated.
--
-- 📋 WORKFLOW:
--    1. Run one of the queries below with user's email and desired role
--    2. Go to Supabase Dashboard > Authentication > Users > Invite User
--    3. Enter the SAME email address and send invite
--    4. User receives email, clicks link, enters name and password
--    5. User logs in with assigned role and personalized greeting
-- ====================================================================================

-- ========================================
-- Create HR Account (before invite)
-- ========================================
-- Replace 'hr@wfa.com' with the email you're about to invite

INSERT INTO accounts (email, account_type, created_at)
VALUES ('hr@wfa.com', 'HR', NOW());  -- ⚠️ CHANGE THIS to the user's email

-- ========================================
-- Create PROCUREMENT Account (before invite)
-- ========================================
-- Replace 'procurement@wfa.com' with the email you're about to invite

INSERT INTO accounts (email, account_type, created_at)
VALUES ('procurement@wfa.com', 'PROCUREMENT', NOW());  -- ⚠️ CHANGE THIS to the user's email

-- ========================================
-- Create ACCOUNTS Account (before invite)
-- ========================================
-- Replace 'accounts@wfa.com' with the email you're about to invite

INSERT INTO accounts (email, account_type, created_at)
VALUES ('accounts@wfa.com', 'ACCOUNTS', NOW());  -- ⚠️ CHANGE THIS to the user's email


-- ====================================================================================
-- HELPER: View all accounts without user IDs (not yet signed up)
-- ====================================================================================
SELECT email, account_type, created_at
FROM accounts
WHERE id IS NULL
ORDER BY created_at DESC;


-- ====================================================================================
-- IMPORTANT NOTES
-- ====================================================================================
-- 1. The account record is created WITHOUT an ID initially
-- 2. When user signs up, the SignupPage will UPDATE this record with their user ID
-- 3. This links the Supabase auth user to the accounts table
-- 4. The user's first_name and last_name are also added during signup
