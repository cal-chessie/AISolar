-- Create installation checklists table
CREATE TABLE public.installation_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  installer_id UUID REFERENCES public.installers(id),
  
  -- Electrical Verification
  main_fuse_size TEXT,
  network_provider TEXT,
  ct_clamp_location TEXT,
  isolator_installed BOOLEAN DEFAULT false,
  export_limiter_required BOOLEAN DEFAULT false,
  rcd_present_tested BOOLEAN DEFAULT false,
  earth_bond_confirmed BOOLEAN DEFAULT false,
  
  -- Equipment Setup
  panels_installed BOOLEAN DEFAULT false,
  inverter_installed BOOLEAN DEFAULT false,
  battery_installed BOOLEAN DEFAULT false,
  monitoring_online BOOLEAN DEFAULT false,
  customer_app_setup BOOLEAN DEFAULT false,
  myenergi_setup BOOLEAN DEFAULT false,
  
  -- Roofing Checks
  roof_tiles_secure BOOLEAN DEFAULT false,
  flashing_installed BOOLEAN DEFAULT false,
  cable_routing_complete BOOLEAN DEFAULT false,
  weatherproofing_complete BOOLEAN DEFAULT false,
  
  -- Completion
  installer_signature TEXT,
  installer_signed_at TIMESTAMP WITH TIME ZONE,
  customer_signature TEXT,
  customer_signed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SEAI grant applications table
CREATE TABLE public.seai_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Application Details
  application_number TEXT,
  grant_amount NUMERIC,
  property_type TEXT,
  system_size_kw NUMERIC,
  
  -- Status Tracking
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Compliance Checks
  ber_cert_uploaded BOOLEAN DEFAULT false,
  completion_cert_uploaded BOOLEAN DEFAULT false,
  invoice_uploaded BOOLEAN DEFAULT false,
  photos_uploaded BOOLEAN DEFAULT false,
  
  -- Engineer Review (for commercial >50kWp)
  requires_engineer_review BOOLEAN DEFAULT false,
  engineer_email TEXT,
  engineer_reviewed_at TIMESTAMP WITH TIME ZONE,
  engineer_notes TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SEAI documents table
CREATE TABLE public.seai_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.seai_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.installation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seai_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seai_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installation_checklists
CREATE POLICY "Authenticated users can view checklists"
ON public.installation_checklists FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create checklists"
ON public.installation_checklists FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update checklists"
ON public.installation_checklists FOR UPDATE
USING (auth.role() = 'authenticated');

-- RLS Policies for seai_applications
CREATE POLICY "Authenticated users can view SEAI applications"
ON public.seai_applications FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create SEAI applications"
ON public.seai_applications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update SEAI applications"
ON public.seai_applications FOR UPDATE
USING (auth.role() = 'authenticated');

-- RLS Policies for seai_documents
CREATE POLICY "Authenticated users can view SEAI documents"
ON public.seai_documents FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload SEAI documents"
ON public.seai_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete SEAI documents"
ON public.seai_documents FOR DELETE
USING (auth.role() = 'authenticated');

-- Create storage bucket for SEAI documents
INSERT INTO storage.buckets (id, name, public) VALUES ('seai-documents', 'seai-documents', false);

-- Storage policies for SEAI documents
CREATE POLICY "Authenticated users can upload SEAI documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'seai-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view SEAI documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'seai-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete SEAI documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'seai-documents' AND auth.role() = 'authenticated');

-- Add triggers for updated_at
CREATE TRIGGER update_installation_checklists_updated_at
BEFORE UPDATE ON public.installation_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seai_applications_updated_at
BEFORE UPDATE ON public.seai_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();