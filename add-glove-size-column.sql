-- Add size column to employee_gears table for mesh gloves

-- Create glove_size enum
CREATE TYPE glove_size AS ENUM ('BROWN', 'GREEN', 'RED', 'WHITE', 'BLUE', 'ORANGE');

-- Add size column to employee_gears table (nullable for non-glove gears)
ALTER TABLE employee_gears
ADD COLUMN size glove_size;

-- Add comment to explain the column
COMMENT ON COLUMN employee_gears.size IS 'Size for MESH_GLOVES gear type. Required when gear_type is MESH_GLOVES, null for other gear types.';
