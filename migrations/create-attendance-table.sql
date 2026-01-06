-- Create attendance status enum
CREATE TYPE attendance_status AS ENUM (
  'PRESENT',
  'ABSENT',
  'SICK_LEAVE',
  'ANNUAL_LEAVE',
  'LEAVE_WITHOUT_PAY',
  'PUBLIC_HOLIDAY',
  'REST_DAY'
);

-- Create attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES accounts(id),
  updated_by UUID REFERENCES accounts(id),
  UNIQUE(employee_id, date)
);

-- Create index for faster queries
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All users can view attendance"
  ON attendance FOR SELECT
  USING (true);

CREATE POLICY "HR can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'HR'
    )
  );

CREATE POLICY "HR can update attendance"
  ON attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'HR'
    )
  );

CREATE POLICY "HR can delete attendance"
  ON attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'HR'
    )
  );
