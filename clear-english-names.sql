-- Clear all english_name values from employees table
-- This fixes the issue where payroll numbers were incorrectly inserted as english names

UPDATE employees
SET english_name = NULL;
