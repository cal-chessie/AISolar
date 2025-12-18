-- Create storage bucket for installation photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('installation-photos', 'installation-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for installation photos bucket
CREATE POLICY "Authenticated users can upload installation photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'installation-photos');

CREATE POLICY "Authenticated users can view installation photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'installation-photos');

CREATE POLICY "Users can delete their own installation photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'installation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track installation photos
CREATE TABLE IF NOT EXISTS public.installation_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES installation_checklists(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after', 'progress', 'issue')),
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on installation_photos
ALTER TABLE public.installation_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for installation_photos
CREATE POLICY "Authenticated users can view installation photos"
ON public.installation_photos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert installation photos"
ON public.installation_photos FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Uploaders can delete their photos"
ON public.installation_photos FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());