-- Create storage bucket for survey photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-photos',
  'survey-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policies for survey photos bucket
CREATE POLICY "Authenticated users can upload survey photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "Authenticated users can view survey photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'survey-photos');

CREATE POLICY "Users can update their own survey photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'survey-photos');

CREATE POLICY "Users can delete their own survey photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'survey-photos');