-- Set all existing transactions to unprocessed (false)
-- This is for transactions that were created before the processed field was added

UPDATE knife_sales
SET processed = FALSE
WHERE processed IS NULL;
