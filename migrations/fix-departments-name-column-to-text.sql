-- Fix departments.name column: change from enum to TEXT
-- The department_name enum is too restrictive and prevents adding new departments dynamically.

ALTER TABLE departments ALTER COLUMN name TYPE TEXT;
