-- Migration: Add wage_status field to employees table

-- Create wage_status enum type
CREATE TYPE wage_status AS ENUM ('WFA', 'LABOR_HIRE');

-- Add wage_status column to employees table
ALTER TABLE employees
ADD COLUMN wage_status wage_status NOT NULL DEFAULT 'WFA';

-- Add payroll_number column (using english_name as payroll number based on your current data)
ALTER TABLE employees
ADD COLUMN payroll_number TEXT;

-- Create index for payroll_number
CREATE INDEX idx_employees_payroll ON employees(payroll_number);

-- Update existing records to use english_name as payroll_number
UPDATE employees SET payroll_number = english_name WHERE english_name IS NOT NULL;
