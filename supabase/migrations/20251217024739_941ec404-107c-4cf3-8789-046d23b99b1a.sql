-- Add MPRN column to leads table for meter point reference number
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mprn TEXT;

-- Add annual_consumption_kwh for extracted kWh from bill
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS annual_consumption_kwh NUMERIC;

-- Create index for MPRN lookups
CREATE INDEX IF NOT EXISTS idx_leads_mprn ON public.leads(mprn) WHERE mprn IS NOT NULL;