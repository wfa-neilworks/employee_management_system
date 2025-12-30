-- Create HR and Procurement Accounts
-- Step-by-step guide

-- STEP 1: Create users in Supabase Auth Dashboard first
-- Go to: Authentication > Users > Add User
-- Create two users:
--   1. Email: hr@example.com, Password: (your choice), Check "Auto Confirm User"
--   2. Email: procurement@example.com, Password: (your choice), Check "Auto Confirm User"

-- STEP 2: After creating the users, copy their UUIDs from the Users table
-- Then run this query, replacing the UUIDs with the actual ones:

-- Example (REPLACE THE UUIDs WITH YOUR ACTUAL UUIDs):
INSERT INTO accounts (id, email, account_type) VALUES
('paste-hr-user-uuid-here', 'hr@example.com', 'HR'::account_type),
('paste-procurement-user-uuid-here', 'procurement@example.com', 'PROCUREMENT'::account_type);

-- STEP 3: Verify the accounts were created:
SELECT * FROM accounts;

-- That's it! You can now log in with these credentials at http://localhost:5173/
