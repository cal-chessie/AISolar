-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-documents bucket
CREATE POLICY "Authenticated users can view project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

-- Create project_documents table to track uploaded files
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  category TEXT DEFAULT 'general',
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_documents
CREATE POLICY "Authenticated users can view project documents"
ON public.project_documents FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert project documents"
ON public.project_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project documents"
ON public.project_documents FOR DELETE
USING (auth.role() = 'authenticated');