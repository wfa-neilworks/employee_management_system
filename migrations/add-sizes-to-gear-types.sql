-- Add sizes array to gear_types table
-- Stores the preset size options for gears that require sizes (has_sizes = true)

ALTER TABLE gear_types ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}';

-- Seed existing mesh gloves with the original hardcoded glove sizes
UPDATE gear_types
SET sizes = ARRAY['Brown', 'Green', 'Red', 'White', 'Blue', 'Orange']
WHERE value = 'MESH_GLOVES';
