-- Create leave_type enum
CREATE TYPE leave_type AS ENUM ('SICK_LEAVE', 'ANNUAL_LEAVE', 'LEAVE_WITHOUT_PAY');

-- Create leave table
CREATE TABLE IF NOT EXISTS leave (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on employee_id for faster queries
CREATE INDEX idx_leave_employee_id ON leave(employee_id);

-- Create index on dates for calendar queries
CREATE INDEX idx_leave_dates ON leave(start_date, end_date);

-- Enable RLS
ALTER TABLE leave ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all leave records
CREATE POLICY "Allow authenticated users to read leave" ON leave
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert leave records
CREATE POLICY "Allow authenticated users to insert leave" ON leave
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update leave records
CREATE POLICY "Allow authenticated users to update leave" ON leave
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy to allow authenticated users to delete leave records
CREATE POLICY "Allow authenticated users to delete leave" ON leave
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leave_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leave_updated_at
  BEFORE UPDATE ON leave
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_updated_at();
