-- Add email to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;

-- Add employee_id FK to accounts table (links an EMPLOYEE account to their employee record)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_accounts_employee_id ON accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
