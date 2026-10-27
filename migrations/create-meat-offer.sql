-- Products from CSV upload (replaced on each upload)
CREATE TABLE IF NOT EXISTS meat_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL,
  description TEXT NOT NULL,
  price_per_kg NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders submitted by employees
CREATE TABLE IF NOT EXISTS meat_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | order_placed
  signature_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items per order
CREATE TABLE IF NOT EXISTS meat_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES meat_orders(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  description TEXT NOT NULL,
  price_per_kg NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1
);

-- RLS
ALTER TABLE meat_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE meat_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meat_order_items ENABLE ROW LEVEL SECURITY;

-- meat_products: all authenticated can read; ADMIN can manage
CREATE POLICY "Authenticated can read meat products"
  ON meat_products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ADMIN can manage meat products"
  ON meat_products FOR ALL
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type = 'ADMIN'));

-- meat_orders: employees see own; ADMIN/HR see all
CREATE POLICY "Employees can read own orders"
  ON meat_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND employee_id = meat_orders.employee_id)
    OR EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR'))
  );

CREATE POLICY "Employees can insert own orders"
  ON meat_orders FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND employee_id = meat_orders.employee_id)
  );

CREATE POLICY "ADMIN HR can update order status"
  ON meat_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND account_type IN ('ADMIN','HR')));

CREATE POLICY "Employees can update own order signature"
  ON meat_orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid() AND employee_id = meat_orders.employee_id)
  );

-- meat_order_items: follow parent order access
CREATE POLICY "Authenticated can read order items"
  ON meat_order_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert order items"
  ON meat_order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket for meat order signatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meat-signatures', 'meat-signatures', true, 102400, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload meat signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meat-signatures' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read meat signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meat-signatures');
