-- Add signature field to employees table
-- Stores the employee's signature as base64 encoded PNG
-- Each employee has only one signature that gets replaced when they sign a new document

ALTER TABLE employees
ADD COLUMN signature TEXT;

-- Add comment for clarity
COMMENT ON COLUMN employees.signature IS 'Base64 encoded PNG image of employee signature. Replaced with each new signature.';
