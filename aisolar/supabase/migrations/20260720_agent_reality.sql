-- ============================================================================
-- 20260720_agent_reality.sql
-- ============================================================================
-- Phase 4: Make the "AI-OS" pitch true.
--
-- Adds:
--   1. LLM cost tracking columns to agent_runs (cost_usd, model, prompt_tokens,
--      completion_tokens, worker_id)
--   2. ai_config table — stores OpenRouter API key, default model, daily cost
--      cap. Admin-only RLS. The agent-drain edge function reads these via
--      service role.
--   3. agent_prompts table — versioned system + user prompt templates per
--      agent. The drain reads the active version before each LLM call.
--   4. Replaces the 3 standalone-digest cron schedules (send-follow-up-digest,
--      send-notification-digest, send-payment-reminder) with agent-drain
--      invocations so customer_digest / stale_lead_escalator / payment_reminder
--      agents actually run and are audited in agent_runs.
--
-- Safe to re-run: every CREATE uses IF NOT EXISTS, every DROP uses IF EXISTS.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. agent_runs — add LLM cost tracking columns
-- ============================================================================
ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- Index for daily cost aggregation queries
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at_cost
  ON public.agent_runs(created_at DESC)
  WHERE cost_usd IS NOT NULL;

-- ============================================================================
-- 2. ai_config — OpenRouter key, default model, daily cost cap
-- ============================================================================
-- Stored as a key-value table so we can add new settings without migrations.
-- The OpenRouter API key is stored here (admin-only RLS). In production you
-- might prefer Supabase Vault, but this avoids needing a separate edge
-- function to write to vault.
CREATE TABLE IF NOT EXISTS public.ai_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write AI config (contains API keys)
DROP POLICY IF EXISTS "ai_config_select_admin" ON public.ai_config;
CREATE POLICY "ai_config_select_admin" ON public.ai_config
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ai_config_write_admin" ON public.ai_config;
CREATE POLICY "ai_config_write_admin" ON public.ai_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default config (no real key — operators must set via AIConfig UI)
INSERT INTO public.ai_config (key, value, description) VALUES
  ('openrouter_api_key', '', 'OpenRouter API key. Set via AIConfig UI. Required for LLM calls in agent-drain.'),
  ('openrouter_default_model', 'google/gemini-2.5-flash', 'Default model for agent LLM calls. Options: google/gemini-2.5-flash, openai/gpt-4o-mini, anthropic/claude-3.5-haiku, meta-llama/llama-3.1-70b-instruct'),
  ('daily_cost_cap_usd', '5.00', 'Maximum USD spend per day on LLM calls. When exceeded, agent-drain skips LLM calls and uses fallback deterministic logic.'),
  ('enable_llm_calls', 'true', 'Master switch. Set to false to disable all LLM calls (agents fall back to deterministic logic).')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. agent_prompts — versioned prompts per agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL CHECK (agent_id IN (
    'lead_intake','survey_scheduler','proposal_drafter','follow_up',
    'grant_submitter','install_coordinator','post_install',
    'customer_digest','stale_lead_escalator','payment_reminder'
  )),
  version INTEGER NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT,  -- overrides ai_config.openrouter_default_model if set
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_active
  ON public.agent_prompts(agent_id) WHERE is_active = true;

ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;

-- Staff can read prompts; only admins can write
DROP POLICY IF EXISTS "agent_prompts_select_staff" ON public.agent_prompts;
CREATE POLICY "agent_prompts_select_staff" ON public.agent_prompts
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'consultant')
  );

DROP POLICY IF EXISTS "agent_prompts_write_admin" ON public.agent_prompts;
CREATE POLICY "agent_prompts_write_admin" ON public.agent_prompts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default prompts for the 2 agents that use LLM calls (Phase 4)
INSERT INTO public.agent_prompts (agent_id, version, system_prompt, user_prompt_template, model, is_active, notes) VALUES
  (
    'proposal_drafter',
    1,
    'You are the Proposal Drafter Agent for AISOLAR, an Irish solar installer. Given lead + survey data, draft a compelling proposal narrative that the consultant can review and send to the customer. Tone: professional but warm, Irish English, no hype. Always mention the SEAI grant and payback period. Keep to 3 short paragraphs. Do NOT invent numbers — use only the figures provided.',
    'Lead: {lead_name}\nAddress: {address}\nMonthly bill: €{monthly_bill}\nAnnual usage: {annual_kwh} kWh\nSystem size: {system_size_kw} kWp\nPanel count: {panel_count}\nPanel model: {panel_model}\nInverter: {inverter_model}\nBattery: {battery_model}\nGross cost: €{gross_cost}\nSEAI grant: €{seai_grant}\nNet cost: €{net_cost}\nAnnual savings: €{annual_savings}\nPayback: {payback_years} years\n20-year savings: €{twenty_year_savings}\n\nDraft the proposal narrative:',
    'google/gemini-2.5-flash',
    true,
    'Phase 4 default. Generates 3-paragraph proposal narrative from lead + survey data.'
  ),
  (
    'follow_up',
    1,
    'You are the Follow-Up Agent for AISOLAR. Draft a friendly follow-up email to a customer who hasn''t responded to their proposal. Tone: warm, not pushy, Irish English. Mention the SEAI grant urgency (rates may change) and offer to answer questions. Keep to 2 short paragraphs + a subject line. Do NOT invent details — use only the info provided.',
    'Customer name: {lead_name}\nStage: {stage_label}\nDays since last contact: {days_stale}\nProposal: {system_size_kw} kWp, €{net_cost} net, {payback_years}yr payback\nLast touchpoint: {last_touchpoint_summary}\n\nDraft the follow-up email (Subject line + body):',
    'google/gemini-2.5-flash',
    true,
    'Phase 4 default. Generates follow-up email subject + body.'
  )
ON CONFLICT (agent_id, version) DO NOTHING;

-- ============================================================================
-- 4. Replace 3 standalone-digest cron schedules with agent-drain invocations
-- ============================================================================
-- Previously:
--   follow-up-digest    → /functions/v1/send-follow-up-digest   (09:00 daily)
--   notification-digest → /functions/v1/send-notification-digest (10:00 Monday)
--   payment-reminder    → /functions/v1/send-payment-reminder    (09:30 daily)
--
-- Now they all go through agent-drain so the work is audited in agent_runs
-- and the agent handlers (which now send real emails + write touchpoints)
-- are the single source of truth. The standalone edge functions remain
-- available for manual triggering but are no longer cron-scheduled.

DO $$
BEGIN
  -- Unschedule the old standalone-digest crons
  BEGIN PERFORM cron.unschedule('follow-up-digest'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('notification-digest'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('payment-reminder'); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Re-schedule as agent-drain invocations with the right agent_id
  -- follow_up agent: 09:00 Dublin daily
  BEGIN
    PERFORM cron.schedule(
      'agent-follow-up',
      '0 9 * * *',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/agent-drain',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := jsonb_build_object('agent_id', 'follow_up', 'trigger_type', 'cron')
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled agent-follow-up (09:00 Dublin daily → agent-drain)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule agent-follow-up: %', SQLERRM;
  END;

  -- customer_digest agent: 10:00 Dublin Monday (was notification-digest)
  BEGIN
    PERFORM cron.schedule(
      'agent-customer-digest',
      '0 10 * * 1',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/agent-drain',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := jsonb_build_object('agent_id', 'customer_digest', 'trigger_type', 'cron')
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled agent-customer-digest (10:00 Dublin Monday → agent-drain)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule agent-customer-digest: %', SQLERRM;
  END;

  -- payment_reminder agent: 09:30 Dublin daily
  BEGIN
    PERFORM cron.schedule(
      'agent-payment-reminder',
      '30 9 * * *',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/agent-drain',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := jsonb_build_object('agent_id', 'payment_reminder', 'trigger_type', 'cron')
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled agent-payment-reminder (09:30 Dublin daily → agent-drain)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule agent-payment-reminder: %', SQLERRM;
  END;

  -- stale_lead_escalator: 08:00 Dublin daily (NEW — was never scheduled before)
  BEGIN
    PERFORM cron.schedule(
      'agent-stale-lead-escalator',
      '0 8 * * *',
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/agent-drain',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := jsonb_build_object('agent_id', 'stale_lead_escalator', 'trigger_type', 'cron')
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled agent-stale-lead-escalator (08:00 Dublin daily → agent-drain)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule agent-stale-lead-escalator: %', SQLERRM;
  END;
END $$;

COMMIT;
