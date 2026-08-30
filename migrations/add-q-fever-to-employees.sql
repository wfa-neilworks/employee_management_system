-- Add Q-Fever vaccination/status attribute to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS q_fever BOOLEAN NOT NULL DEFAULT false;
