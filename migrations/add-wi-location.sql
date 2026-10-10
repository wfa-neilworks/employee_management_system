-- Add location/section field to work_instructions
ALTER TABLE work_instructions ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
