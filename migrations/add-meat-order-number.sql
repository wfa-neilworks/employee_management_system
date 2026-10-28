-- Order number entered by admin when marking as placed (6 digits)
ALTER TABLE meat_orders ADD COLUMN IF NOT EXISTS order_number TEXT;
