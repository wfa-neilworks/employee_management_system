-- Add JSONB content blocks to announcements
-- content is an ordered array of blocks:
--   { "type": "text", "value": "paragraph text" }
--   { "type": "image", "url": "https://...supabase storage url..." }
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Allow ADMIN and HR to upload images
CREATE POLICY "ADMIN and HR can upload announcement images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type IN ('ADMIN', 'HR')
    )
  );

-- Allow ADMIN and HR to delete announcement images
CREATE POLICY "ADMIN and HR can delete announcement images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'announcement-images'
    AND EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid()
      AND accounts.account_type IN ('ADMIN', 'HR')
    )
  );

-- Public read for announcement images (bucket is public)
CREATE POLICY "Public can read announcement images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-images');
