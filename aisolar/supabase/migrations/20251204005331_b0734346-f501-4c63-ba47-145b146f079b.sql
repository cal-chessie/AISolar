-- Phase 1-5 Database Changes

-- Add property_type to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'residential',
ADD COLUMN IF NOT EXISTS workflow_stage text DEFAULT 'new';

-- Add property_type and review fields to proposals
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'residential',
ADD COLUMN IF NOT EXISTS requires_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_by uuid,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Create contracts table for digital signatures
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  signed_by_name text NOT NULL,
  signed_by_email text NOT NULL,
  signature_data text,
  gdpr_consent boolean NOT NULL DEFAULT false,
  gdpr_consent_text text,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create invoices table for payment tracking
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  contract_id uuid,
  invoice_number text NOT NULL,
  total_amount numeric NOT NULL,
  deposit_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  deposit_paid_at timestamp with time zone,
  final_amount numeric,
  final_paid boolean DEFAULT false,
  final_paid_at timestamp with time zone,
  status text DEFAULT 'pending',
  due_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for contracts
CREATE POLICY "Authenticated users can view contracts"
ON public.contracts FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete contracts"
ON public.contracts FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for invoices
CREATE POLICY "Authenticated users can view invoices"
ON public.invoices FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoices"
ON public.invoices FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete invoices"
ON public.invoices FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for invoice updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();