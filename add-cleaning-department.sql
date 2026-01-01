-- Migration: Add CLEANING department

-- Step 1: Add CLEANING to the department_name enum type
-- Run this first, then commit the transaction
ALTER TYPE department_name ADD VALUE 'CLEANING';

-- Step 2: After committing the above, run this in a new transaction
-- Insert CLEANING department into departments table
-- INSERT INTO departments (name, display_name) VALUES
--   ('CLEANING', 'Cleaning');

-- OR run both steps together using this approach:
-- ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'CLEANING';
-- COMMIT;
-- INSERT INTO departments (name, display_name) VALUES ('CLEANING', 'Cleaning');
