-- Allow ACCOUNTS users to update the processed field in knife_sales
-- This enables the Process functionality for ACCOUNTS account type

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ACCOUNTS can update processed status" ON knife_sales;

-- Create policy to allow ACCOUNTS users to update the processed, processed_at, and processed_by fields
CREATE POLICY "ACCOUNTS can update processed status"
ON knife_sales
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = auth.uid()
    AND accounts.account_type = 'ACCOUNTS'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = auth.uid()
    AND accounts.account_type = 'ACCOUNTS'
  )
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'knife_sales';
