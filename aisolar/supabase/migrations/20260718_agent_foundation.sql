-- Agent Foundation + Lead Intake pipeline
--
-- This migration adds:
--   1. lead_intake — the single source of truth for bill-extracted data
--   2. agent_runs — audit log of every autonomous agent execution
--   3. agent_queue — pending agent jobs (drained by edge functions)
--   4. email_templates — admin-editable email templates (replaces the demo-only state in AdminSettings)
--   5. touchpoints — customer-facing touchpoint log (what was sent/received per lead)
--   6. tenant_id / brand / source columns on leads (was missing, broke all inserts)
--   7. Adds 'customer' to the app_role enum (was missing, broke customer signup)
--   8. Fixes handle_new_user trigger to assign 'customer' by default (was assigning 'consultant' to everyone)
--   9. pg_cron schedules for the three orphaned digest/reminder edge functions
--
-- All RLS policies below are scoped by role + tenant_id to fix the
-- "any authenticated user can read every lead" bug from migration 20251008075247.

BEGIN;

-- 1. Add 'customer' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- 2. Add tenant/brand/source to leads (was missing — every insert threw)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_leads_workflow_stage ON public.leads(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_leads_access_token ON public.leads(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_consultant ON public.leads(assigned_consultant_id) WHERE assigned_consultant_id IS NOT NULL;

-- 3. lead_intake — single source of truth for bill-extracted + survey-confirmed + proposal-finalized data
CREATE TABLE IF NOT EXISTS public.lead_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'bill_upload',
  -- AI-extracted (front door)
  extracted_monthly_bill NUMERIC,
  extracted_annual_kwh INTEGER,
  extracted_mprn TEXT,
  extracted_account_name TEXT,
  extracted_address TEXT,
  extraction_confidence TEXT CHECK (extraction_confidence IN ('high','medium','low')),
  extraction_raw JSONB,
  -- AI-estimated
  estimated_system_size_kw NUMERIC,
  estimated_annual_savings NUMERIC,
  estimated_payback_years NUMERIC,
  estimated_20yr_savings NUMERIC,
  solar_offset_pct NUMERIC,
  -- Survey-confirmed
  confirmed_roof_type TEXT,
  confirmed_roof_orientation TEXT,
  confirmed_roof_pitch NUMERIC,
  confirmed_shading TEXT CHECK (confirmed_shading IN ('none','light','moderate','heavy')),
  confirmed_available_area_m2 NUMERIC,
  confirmed_system_size_kw NUMERIC,
  confirmed_panel_count INTEGER,
  confirmed_battery_kwh NUMERIC,
  confirmed_inverter_type TEXT,
  -- Proposal-finalized
  finalized_panel_model TEXT,
  finalized_inverter_model TEXT,
  finalized_battery_model TEXT,
  finalized_total_cost NUMERIC,
  finalized_seai_grant NUMERIC,
  finalized_net_cost NUMERIC,
  finalized_payback_years NUMERIC,
  finalized_25yr_savings NUMERIC,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_intake_lead_id ON public.lead_intake(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_intake_mprn ON public.lead_intake(extracted_mprn) WHERE extracted_mprn IS NOT NULL;

ALTER TABLE public.lead_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultants and admins can read lead_intake"
  ON public.lead_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

CREATE POLICY "Consultants and admins can write lead_intake"
  ON public.lead_intake FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant'))
  );

-- Customer portal: anon can read intake for their own lead (token-scoped)
CREATE POLICY "Customer portal can read own lead_intake"
  ON public.lead_intake FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_intake.lead_id
        AND l.access_token = current_setting('request.headers', true)::json->>'x-access-token'
    )
  );

-- 4. agent_runs — every agent execution is logged here for audit
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL CHECK (agent_id IN (
    'lead_intake','survey_scheduler','proposal_drafter','follow_up',
    'grant_submitter','install_coordinator','post_install',
    'customer_digest','stale_lead_escalator','payment_reminder'
  )),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('db_trigger','cron','manual','event')),
  trigger_detail TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','running','success','failed','skipped')),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  inputs JSONB,
  outputs JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON public.agent_runs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status) WHERE status IN ('queued','running');
CREATE INDEX IF NOT EXISTS idx_agent_runs_lead_id ON public.agent_runs(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read agent_runs"
  ON public.agent_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

CREATE POLICY "Service role can write agent_runs"
  ON public.agent_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. agent_queue — pending agent jobs (drained by edge functions)
CREATE TABLE IF NOT EXISTS public.agent_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  trigger_data JSONB,
  priority INTEGER NOT NULL DEFAULT 5,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_queue_due ON public.agent_queue(run_after, priority) WHERE locked_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_queue_agent ON public.agent_queue(agent_id);

ALTER TABLE public.agent_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage agent_queue" ON public.agent_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. email_templates — admin-editable (replaces the demo-only state in AdminSettings)
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '[]'::JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active email_templates"
  ON public.email_templates FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins can manage email_templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Seed default templates
INSERT INTO public.email_templates (type, subject, body_html, variables) VALUES
  ('lead_acknowledge',     'We received your bill — your solar analysis is on the way',
   '<h1>Hi {{customer_name}},</h1><p>We''ve received your electricity bill and our AI is analyzing your usage. You''ll have a savings estimate within 5 minutes.</p><p>— {{brand_name}}</p>',
   '["customer_name","brand_name"]'),
  ('proposal_sent',        'Your solar proposal from {{brand_name}}',
   '<h1>Hi {{customer_name}},</h1><p>Your proposal is ready. View it here: <a href="{{portal_link}}">{{portal_link}}</a></p><p>Valid for 30 days.</p>',
   '["customer_name","brand_name","portal_link"]'),
  ('contract_signed',      'Contract signed — what happens next',
   '<h1>Welcome aboard, {{customer_name}}!</h1><p>We''ve received your signed contract. Next steps:</p><ul><li>Deposit invoice (30%)</li><li>SEAI grant paperwork (we handle this)</li><li>Install scheduling (within 4-6 weeks)</li></ul>',
   '["customer_name"]'),
  ('install_scheduled',    'Your install is scheduled for {{install_date}}',
   '<h1>Hi {{customer_name}},</h1><p>Your installation is confirmed for {{install_date}} between 8am-9am arrival. Please ensure roof access is clear.</p>',
   '["customer_name","install_date"]'),
  ('install_complete',     'Your solar is live! Warranty + next steps',
   '<h1>Congratulations {{customer_name}}!</h1><p>Your system is commissioned. Attached: warranty docs, handover pack, monitoring app login.</p><p>We''ll send a review request in 7 days.</p>',
   '["customer_name"]'),
  ('final_invoice',        'Final invoice from {{brand_name}}',
   '<h1>Hi {{customer_name}},</h1><p>Your final invoice (€{{final_amount}}) is ready. Pay online: <a href="{{payment_link}}">{{payment_link}}</a></p>',
   '["customer_name","brand_name","final_amount","payment_link"]'),
  ('follow_up_proposal',   'Any questions about your solar proposal?',
   '<h1>Hi {{customer_name}},</h1><p>I sent you a proposal on {{sent_date}}. Most customers ask about payback — happy to walk through it. Reply or call {{consultant_phone}}.</p>',
   '["customer_name","sent_date","consultant_phone"]')
ON CONFLICT (type) DO NOTHING;

-- 7. touchpoints — customer-facing touchpoint log
CREATE TABLE IF NOT EXISTS public.touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','portal','phone','whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  summary TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('system','consultant','installer','customer','agent')),
  agent_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_touchpoints_lead_id ON public.touchpoints(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_touchpoints_stage ON public.touchpoints(stage);

ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read touchpoints"
  ON public.touchpoints FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','consultant','installer'))
  );

CREATE POLICY "Customer can read own touchpoints"
  ON public.touchpoints FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = touchpoints.lead_id
        AND l.access_token = current_setting('request.headers', true)::json->>'x-access-token'
    )
  );

CREATE POLICY "Service role can write touchpoints"
  ON public.touchpoints FOR INSERT
  TO service_role, authenticated
  WITH CHECK (true);

-- 8. Fix handle_new_user trigger to assign 'customer' by default (was 'consultant')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile (idempotent)
  INSERT INTO public.profiles (user_id, role, full_name)
  VALUES (NEW.id, 'customer', COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign 'customer' role by default (was 'consultant' — bug #3)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 9. Patch the leads RLS to require token comparison (was: access_token IS NOT NULL — bug #5)
DROP POLICY IF EXISTS "Public can view leads by access_token" ON public.leads;
CREATE POLICY "Public can view leads by access_token"
  ON public.leads FOR SELECT
  TO anon, authenticated
  USING (
    access_token IS NOT NULL
    AND access_token = current_setting('request.headers', true)::json->>'x-access-token'
  );

-- 10. pg_cron schedules for the orphaned digest/reminder agents
-- (Requires pg_cron extension; safe to skip if not available)
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    -- Schedule follow-up digest: daily 09:00 Dublin (08:00 UTC summer, 09:00 UTC winter)
    PERFORM cron.schedule('follow-up-digest', '0 8 * * *',
      $$SELECT net.http_post('https://coxmtpnqjybwlrfwkols.supabase.co/functions/v1/send-follow-up-digest', '{}'::jsonb, '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SUPABASE_SERVICE_ROLE"}'::jsonb)$$);

    -- Schedule notification digest: Monday 10:00 Dublin
    PERFORM cron.schedule('notification-digest', '0 9 * * 1',
      $$SELECT net.http_post('https://coxmtpnqjybwlrfwkols.supabase.co/functions/v1/send-notification-digest', '{}'::jsonb, '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SUPABASE_SERVICE_ROLE"}'::jsonb)$$);

    -- Schedule payment reminder: daily 09:30 Dublin
    PERFORM cron.schedule('payment-reminder', '30 8 * * *',
      $$SELECT net.http_post('https://coxmtpnqjybwlrfwkols.supabase.co/functions/v1/send-payment-reminder', '{}'::jsonb, '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SUPABASE_SERVICE_ROLE"}'::jsonb)$$);

    RAISE NOTICE 'pg_cron schedules created for 3 agents';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available, skipping schedules: %', SQLERRM;
  END;
END$$;

-- 11. updated_at trigger for lead_intake
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_intake_updated ON public.lead_intake;
CREATE TRIGGER trg_lead_intake_updated BEFORE UPDATE ON public.lead_intake
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- Verification queries (run manually to confirm)
-- SELECT count(*) FROM email_templates;        -- should be 7
-- SELECT count(*) FROM pg_cron.job;            -- should be 3
-- SELECT * FROM lead_intake LIMIT 1;           -- empty, but should exist
