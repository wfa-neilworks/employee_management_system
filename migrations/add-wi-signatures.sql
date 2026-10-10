-- Add signature_url to wi_assignments
ALTER TABLE wi_assignments ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Storage bucket for employee signatures (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wi-signatures', 'wi-signatures', false, 102400, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;

-- Authenticated employees can upload their own signature
CREATE POLICY "Employees can upload their own signature"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wi-signatures'
    AND auth.role() = 'authenticated'
  );

-- ADMIN, HR, QA and the owning employee can read signatures
CREATE POLICY "Authenticated can read WI signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wi-signatures' AND auth.role() = 'authenticated');

-- Employees can replace their own signature
CREATE POLICY "Authenticated can update WI signatures"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wi-signatures' AND auth.role() = 'authenticated');
