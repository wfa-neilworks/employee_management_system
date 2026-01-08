-- Add ACCOUNTS account type
-- ACCOUNTS accounts can view everything but cannot make any changes
-- They can only print invoices from transaction history

-- Update the account_type enum to include ACCOUNTS
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'ACCOUNTS';

-- Add comment for clarity
COMMENT ON TYPE account_type IS 'Account types: HR (full access), PROCUREMENT (knife dockets management), ACCOUNTS (read-only access)';
