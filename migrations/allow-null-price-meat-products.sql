-- Allow price_per_kg to be NULL (NA rows in CSV)
ALTER TABLE meat_products ALTER COLUMN price_per_kg DROP NOT NULL;
ALTER TABLE meat_order_items ALTER COLUMN price_per_kg DROP NOT NULL;
