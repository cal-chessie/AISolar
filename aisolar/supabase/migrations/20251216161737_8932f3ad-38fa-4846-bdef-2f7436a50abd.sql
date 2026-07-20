-- Add access_token to leads for secure customer portal access
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_leads_access_token ON public.leads(access_token);

-- Add preferred install dates to proposals
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS preferred_install_dates JSONB,
ADD COLUMN IF NOT EXISTS confirmed_install_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS installation_status TEXT DEFAULT 'pending';

-- Add RLS policy for public access via token (for customer portal)
CREATE POLICY "Public can view leads by access_token" 
ON public.leads 
FOR SELECT 
TO anon
USING (access_token IS NOT NULL AND access_token = current_setting('request.headers', true)::json->>'x-access-token');

-- Allow authenticated users to generate tokens
CREATE POLICY "Authenticated users can update lead access_token"
ON public.leads
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');