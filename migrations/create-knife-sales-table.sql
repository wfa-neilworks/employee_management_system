-- Create knife_sales table to track all transactions
CREATE TABLE knife_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(20) NOT NULL UNIQUE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL,
  employee_payroll VARCHAR(50),
  wage_status VARCHAR(50) NOT NULL, -- WFA or LABOR_HIRE
  department_name VARCHAR(255) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL, -- Array of {product_id, product_code, product_name, category, quantity, unit_price, subtotal}
  subtotal DECIMAL(10, 2) NOT NULL,
  gst DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES accounts(id)
);

-- Create index for faster queries
CREATE INDEX idx_knife_sales_invoice_number ON knife_sales(invoice_number);
CREATE INDEX idx_knife_sales_employee_id ON knife_sales(employee_id);
CREATE INDEX idx_knife_sales_sale_date ON knife_sales(sale_date);

-- Create sequence for invoice numbering
CREATE SEQUENCE knife_sales_invoice_seq START 1;

-- Enable RLS
ALTER TABLE knife_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All users can view knife sales"
  ON knife_sales FOR SELECT
  USING (true);

CREATE POLICY "PROCUREMENT can insert knife sales"
  ON knife_sales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );

CREATE POLICY "PROCUREMENT can update knife sales"
  ON knife_sales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );

CREATE POLICY "PROCUREMENT can delete knife sales"
  ON knife_sales FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );
