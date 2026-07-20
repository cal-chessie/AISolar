-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- System Design
  system_size_kw NUMERIC,
  panel_count INTEGER,
  panel_type TEXT,
  inverter_type TEXT,
  battery_storage BOOLEAN DEFAULT false,
  battery_capacity_kwh NUMERIC,
  
  -- Roof Details
  roof_type TEXT,
  roof_orientation TEXT,
  roof_pitch NUMERIC,
  roof_material TEXT,
  roof_condition TEXT,
  shading_level TEXT,
  
  -- Electrical
  electrical_panel_upgrade_needed BOOLEAN DEFAULT false,
  current_panel_capacity TEXT,
  new_panel_capacity TEXT,
  
  -- Financial
  system_cost NUMERIC,
  seai_grant NUMERIC,
  net_cost NUMERIC,
  monthly_savings NUMERIC,
  payback_period_years NUMERIC,
  installation_cost NUMERIC,
  
  -- Energy
  estimated_annual_production_kwh NUMERIC,
  current_annual_consumption_kwh NUMERIC,
  energy_offset_percentage NUMERIC,
  
  -- Installation
  installation_timeline_weeks INTEGER,
  installation_notes TEXT,
  special_requirements TEXT,
  
  -- Products
  selected_products JSONB,
  
  -- Status
  status TEXT DEFAULT 'draft',
  presented_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  assigned_installer_id UUID REFERENCES public.installers(id)
);

-- Create solar products table
CREATE TABLE public.solar_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  product_type TEXT NOT NULL, -- 'panel', 'inverter', 'battery', 'mounting', 'other'
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  description TEXT,
  
  -- Technical specs
  specifications JSONB,
  power_rating NUMERIC,
  efficiency_percentage NUMERIC,
  warranty_years INTEGER,
  
  -- Pricing
  cost NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Availability
  in_stock BOOLEAN DEFAULT true,
  lead_time_days INTEGER,
  
  -- Metadata
  image_url TEXT,
  datasheet_url TEXT,
  active BOOLEAN DEFAULT true
);

-- Create assignments table for tracking installer assignments
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES public.installers(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  
  assignment_type TEXT NOT NULL, -- 'site_survey', 'installation', 'maintenance'
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
  
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  priority TEXT DEFAULT 'normal' -- 'low', 'normal', 'high', 'urgent'
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Proposals policies
CREATE POLICY "Authenticated users can view all proposals"
  ON public.proposals FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Consultants can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (auth.uid() = consultant_id);

CREATE POLICY "Consultants can update their proposals"
  ON public.proposals FOR UPDATE
  USING (auth.uid() = consultant_id);

CREATE POLICY "Admins can delete proposals"
  ON public.proposals FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Products policies
CREATE POLICY "Authenticated users can view active products"
  ON public.solar_products FOR SELECT
  USING (active = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage products"
  ON public.solar_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Assignments policies
CREATE POLICY "Authenticated users can view assignments"
  ON public.assignments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Consultants and admins can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Consultants and installers can update assignments"
  ON public.assignments FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete assignments"
  ON public.assignments FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for proposals updated_at
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for products updated_at
CREATE TRIGGER update_solar_products_updated_at
  BEFORE UPDATE ON public.solar_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for assignments updated_at
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_proposals_lead_id ON public.proposals(lead_id);
CREATE INDEX idx_proposals_consultant_id ON public.proposals(consultant_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_assignments_installer_id ON public.assignments(installer_id);
CREATE INDEX idx_assignments_lead_id ON public.assignments(lead_id);
CREATE INDEX idx_assignments_status ON public.assignments(status);
CREATE INDEX idx_solar_products_type ON public.solar_products(product_type);
CREATE INDEX idx_solar_products_active ON public.solar_products(active);