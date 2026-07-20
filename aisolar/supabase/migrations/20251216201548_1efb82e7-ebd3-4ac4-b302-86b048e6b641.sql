-- Create activity logs table for tracking lead interactions
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_lead_id ON public.activity_logs(lead_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view activity logs"
ON public.activity_logs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create follow_up_settings table for stage thresholds
CREATE TABLE public.follow_up_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_stage TEXT NOT NULL UNIQUE,
  threshold_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.follow_up_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view follow_up_settings"
ON public.follow_up_settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage follow_up_settings"
ON public.follow_up_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default thresholds per stage
INSERT INTO public.follow_up_settings (workflow_stage, threshold_days) VALUES
  ('new', 2),
  ('survey', 3),
  ('proposal', 5),
  ('approved', 3),
  ('scheduled', 7),
  ('installed', 14);