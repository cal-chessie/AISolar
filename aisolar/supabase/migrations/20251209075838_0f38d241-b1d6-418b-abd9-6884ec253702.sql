-- Add installer logistics fields to site_surveys (all optional)
ALTER TABLE public.site_surveys 
ADD COLUMN IF NOT EXISTS property_storeys INTEGER,
ADD COLUMN IF NOT EXISTS scaffolding_required TEXT,
ADD COLUMN IF NOT EXISTS parking_situation TEXT,
ADD COLUMN IF NOT EXISTS attic_access TEXT,
ADD COLUMN IF NOT EXISTS access_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_availability TEXT,
ADD COLUMN IF NOT EXISTS existing_solar BOOLEAN DEFAULT false;

-- Add comment explaining these are optional fields for installer handoff
COMMENT ON COLUMN public.site_surveys.property_storeys IS 'Number of storeys - helps with scaffolding planning';
COMMENT ON COLUMN public.site_surveys.scaffolding_required IS 'yes, no, or partial';
COMMENT ON COLUMN public.site_surveys.parking_situation IS 'Description of parking for installer van';
COMMENT ON COLUMN public.site_surveys.attic_access IS 'easy, difficult, or none';
COMMENT ON COLUMN public.site_surveys.access_notes IS 'Gate codes, restrictions, etc';
COMMENT ON COLUMN public.site_surveys.customer_availability IS 'Best times to contact customer';
COMMENT ON COLUMN public.site_surveys.existing_solar IS 'Whether property already has solar panels';