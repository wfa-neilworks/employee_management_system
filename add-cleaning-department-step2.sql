-- Migration Step 2: Insert CLEANING department
-- Run this AFTER step 1 has been committed

INSERT INTO departments (name, display_name) VALUES
  ('CLEANING', 'Cleaning');
