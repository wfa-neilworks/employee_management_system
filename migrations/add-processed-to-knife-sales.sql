-- Add processed field to knife_sales table
-- Tracks whether a transaction has been processed by ACCOUNTS users
-- Default is false (unprocessed)

ALTER TABLE knife_sales
ADD COLUMN processed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN processed_by UUID REFERENCES accounts(id);

-- Add comment for clarity
COMMENT ON COLUMN knife_sales.processed IS 'Whether the transaction has been processed by ACCOUNTS team';
COMMENT ON COLUMN knife_sales.processed_at IS 'Timestamp when the transaction was marked as processed';
COMMENT ON COLUMN knife_sales.processed_by IS 'Account ID of user who processed the transaction';

-- Create index for faster filtering by processed status
CREATE INDEX idx_knife_sales_processed ON knife_sales(processed);
