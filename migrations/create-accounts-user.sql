-- Create ACCOUNTS type user in accounts table
-- Replace the UUID with the actual user ID from authenticator
-- User ID: c4de9061-f309-4815-967a-28606829de71

INSERT INTO accounts (id, email, account_type, created_at)
VALUES (
  'c4de9061-f309-4815-967a-28606829de71',
  'accounts@example.com', -- Replace with actual email from auth.users
  'ACCOUNTS',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET account_type = 'ACCOUNTS',
    email = EXCLUDED.email;

-- To verify the user was added correctly:
SELECT * FROM accounts WHERE id = 'c4de9061-f309-4815-967a-28606829de71';
