-- Production Employee System Database Schema

-- Create enum types
CREATE TYPE account_type AS ENUM ('HR', 'PROCUREMENT');
CREATE TYPE employment_status AS ENUM ('CASUAL', 'FULL_TIME');
CREATE TYPE resignation_reason AS ENUM ('TERMINATE', 'RESIGN');
CREATE TYPE gear_type AS ENUM ('HELMET', 'MESH_GLOVES', 'LONG_MESH_GLOVES', 'MESH_APRON', 'GUMBOOTS');
CREATE TYPE department_name AS ENUM (
  'LAMB_BR',
  'BEEF_BR',
  'KILL_FLOOR',
  'HALAL',
  'QA',
  'LOADOUT',
  'SKIN_SHED',
  'RENDERING',
  'COLD_STORE',
  'HOOK_ROOM',
  'MAINTENANCE'
);

-- Users/Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  account_type account_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name department_name UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert departments
INSERT INTO departments (name, display_name) VALUES
  ('LAMB_BR', 'Lamb BR'),
  ('BEEF_BR', 'Beef BR'),
  ('KILL_FLOOR', 'Kill Floor'),
  ('HALAL', 'HALAL'),
  ('QA', 'QA'),
  ('LOADOUT', 'Loadout'),
  ('SKIN_SHED', 'Skin Shed'),
  ('RENDERING', 'Rendering'),
  ('COLD_STORE', 'Cold Store'),
  ('HOOK_ROOM', 'Hook Room'),
  ('MAINTENANCE', 'Maintenance');

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  english_name TEXT,
  department_id UUID REFERENCES departments(id),
  employment_status employment_status NOT NULL,
  locker_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  resignation_reason resignation_reason,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES accounts(id),
  updated_by UUID REFERENCES accounts(id)
);

-- Employee Gears table
CREATE TABLE employee_gears (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  gear_type gear_type NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES accounts(id),
  UNIQUE(employee_id, gear_type)
);

-- Employee History table (for tracking department moves and changes)
CREATE TABLE employee_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES accounts(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_employees_locker ON employees(locker_number);
CREATE INDEX idx_employee_gears_employee ON employee_gears(employee_id);
CREATE INDEX idx_employee_history_employee ON employee_history(employee_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to employees table
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to accounts table
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_gears ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read departments
CREATE POLICY "Allow authenticated users to read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read all employees
CREATE POLICY "Allow authenticated users to read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- Allow HR accounts to insert, update employees
CREATE POLICY "Allow HR to manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'HR'
    )
  );

-- Allow authenticated users to read employee gears
CREATE POLICY "Allow authenticated users to read gears"
  ON employee_gears FOR SELECT
  TO authenticated
  USING (true);

-- Allow procurement accounts to manage gears
CREATE POLICY "Allow procurement to manage gears"
  ON employee_gears FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );

-- Allow authenticated users to read history
CREATE POLICY "Allow authenticated users to read history"
  ON employee_history FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert history
CREATE POLICY "Allow authenticated users to create history"
  ON employee_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create employee with history
CREATE OR REPLACE FUNCTION create_employee_with_history(
  p_name TEXT,
  p_english_name TEXT,
  p_department_id UUID,
  p_employment_status employment_status,
  p_locker_number TEXT,
  p_start_date DATE,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  INSERT INTO employees (name, english_name, department_id, employment_status, locker_number, start_date, created_by, updated_by)
  VALUES (p_name, p_english_name, p_department_id, p_employment_status, p_locker_number, p_start_date, p_created_by, p_created_by)
  RETURNING id INTO v_employee_id;

  INSERT INTO employee_history (employee_id, action, new_value, changed_by)
  VALUES (v_employee_id, 'CREATED', p_name, p_created_by);

  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Function to move employee department
CREATE OR REPLACE FUNCTION move_employee_department(
  p_employee_id UUID,
  p_new_department_id UUID,
  p_changed_by UUID
)
RETURNS VOID AS $$
DECLARE
  v_old_dept_name TEXT;
  v_new_dept_name TEXT;
BEGIN
  SELECT d.display_name INTO v_old_dept_name
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  WHERE e.id = p_employee_id;

  SELECT display_name INTO v_new_dept_name
  FROM departments
  WHERE id = p_new_department_id;

  UPDATE employees
  SET department_id = p_new_department_id, updated_by = p_changed_by
  WHERE id = p_employee_id;

  INSERT INTO employee_history (employee_id, action, old_value, new_value, changed_by)
  VALUES (p_employee_id, 'DEPARTMENT_CHANGE', v_old_dept_name, v_new_dept_name, p_changed_by);
END;
$$ LANGUAGE plpgsql;

-- Function to resign employee
CREATE OR REPLACE FUNCTION resign_employee(
  p_employee_id UUID,
  p_end_date DATE,
  p_resignation_reason resignation_reason,
  p_changed_by UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE employees
  SET
    is_active = FALSE,
    end_date = p_end_date,
    resignation_reason = p_resignation_reason,
    updated_by = p_changed_by
  WHERE id = p_employee_id;

  INSERT INTO employee_history (employee_id, action, new_value, changed_by)
  VALUES (p_employee_id, 'RESIGNED', p_resignation_reason::TEXT, p_changed_by);
END;
$$ LANGUAGE plpgsql;
