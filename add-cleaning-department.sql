-- Migration: Add CLEANING department

-- Add CLEANING to the department_name enum type
ALTER TYPE department_name ADD VALUE 'CLEANING';

-- Insert CLEANING department into departments table
INSERT INTO departments (name, display_name) VALUES
  ('CLEANING', 'Cleaning');
