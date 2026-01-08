-- Create knife_dockets table
CREATE TABLE knife_dockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL CHECK (buy_price >= 0),
  selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES accounts(id),
  updated_by UUID REFERENCES accounts(id)
);

-- Create indexes for faster queries
CREATE INDEX idx_knife_dockets_product_code ON knife_dockets(product_code);
CREATE INDEX idx_knife_dockets_product_name ON knife_dockets(product_name);
CREATE INDEX idx_knife_dockets_product_type ON knife_dockets(product_type);
CREATE INDEX idx_knife_dockets_category ON knife_dockets(category);

-- Enable RLS
ALTER TABLE knife_dockets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All users can view knife dockets"
  ON knife_dockets FOR SELECT
  USING (true);

CREATE POLICY "PROCUREMENT can insert knife dockets"
  ON knife_dockets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );

CREATE POLICY "PROCUREMENT can update knife dockets"
  ON knife_dockets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );

CREATE POLICY "PROCUREMENT can delete knife dockets"
  ON knife_dockets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type = 'PROCUREMENT'
    )
  );
