-- Add first_name and last_name columns to accounts table
-- This allows storing user names during signup

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('first_name', 'last_name');
