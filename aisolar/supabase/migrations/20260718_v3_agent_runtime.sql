-- Agent Runtime Triggers — enqueues agent jobs when leads change stage.
--
-- This is the bridge between the kernel (Supabase) and the agent-drain worker.
-- When leads.workflow_stage changes, the right agent job is enqueued.
-- The agent-drain edge function (called every minute by pg_cron) claims
-- and executes the job.

BEGIN;

-- ============================================================================
-- enqueue_agent SQL function — called by triggers + manual UI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_agent(
  p_agent_id TEXT,
  p_lead_id UUID,
  p_trigger_data JSONB DEFAULT '{}'::JSONB,
  p_priority INTEGER DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.agent_queue (agent_id, lead_id, trigger_data, priority)
  VALUES (p_agent_id, p_lead_id, p_trigger_data, p_priority)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_agent(TEXT, UUID, JSONB, INTEGER) TO service_role, authenticated;

-- ============================================================================
-- Trigger: enqueues agent jobs when leads.workflow_stage changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_stage_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when workflow_stage actually changed
  IF NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
    -- Map stage → agent
    CASE NEW.workflow_stage
      WHEN 'intake_complete' THEN
        PERFORM public.enqueue_agent('survey_scheduler', NEW.id, jsonb_build_object('trigger_type', 'db_trigger', 'new_stage', NEW.workflow_stage));
      WHEN 'survey_complete' THEN
        PERFORM public.enqueue_agent('proposal_drafter', NEW.id, jsonb_build_object('trigger_type', 'db_trigger', 'new_stage', NEW.workflow_stage));
      WHEN 'proposal_sent' THEN
        PERFORM public.enqueue_agent('follow_up', NEW.id, jsonb_build_object('trigger_type', 'db_trigger', 'new_stage', NEW.workflow_stage));
      WHEN 'approved' THEN
        PERFORM public.enqueue_agent('grant_submitter', NEW.id, jsonb_build_object('trigger_type', 'db_trigger', 'new_stage', NEW.workflow_stage));
      WHEN 'installed' THEN
        PERFORM public.enqueue_agent('post_install', NEW.id, jsonb_build_object('trigger_type', 'db_trigger', 'new_stage', NEW.workflow_stage));
      ELSE
        -- No agent for this stage
        RETURN NEW;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, create new
DROP TRIGGER IF EXISTS trg_enqueue_stage_agent ON public.leads;
CREATE TRIGGER trg_enqueue_stage_agent
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_stage_agent();

-- ============================================================================
-- Trigger: enqueues install_coordinator when deposit is paid
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_install_coordinator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when deposit_paid changes from false to true
  IF NEW.deposit_paid = true AND (OLD.deposit_paid = false OR OLD.deposit_paid IS NULL) THEN
    PERFORM public.enqueue_agent('install_coordinator', NEW.lead_id, jsonb_build_object('trigger_type', 'db_trigger', 'invoice_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_install_coordinator ON public.invoices;
CREATE TRIGGER trg_enqueue_install_coordinator
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_install_coordinator();

-- ============================================================================
-- Trigger: enqueues lead_intake when a new lead is created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_lead_intake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only enqueue for bill_upload leads (not manual / referral)
  IF NEW.source = 'bill_upload' OR NEW.source = 'ai_analyser' THEN
    PERFORM public.enqueue_agent('lead_intake', NEW.id, jsonb_build_object('trigger_type', 'db_trigger', 'lead_source', NEW.source));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_lead_intake ON public.leads;
CREATE TRIGGER trg_enqueue_lead_intake
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_lead_intake();

-- ============================================================================
-- pg_cron: drain the agent queue every minute
-- ============================================================================
DO $$
BEGIN
  BEGIN
    -- Unschedule old version if exists
    PERFORM cron.unschedule('agent-drain');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    PERFORM cron.schedule(
      'agent-drain',
      '* * * * *',  -- every minute
      $QUERY$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/agent-drain',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role')
          ),
          body := '{}'::jsonb
        )
      $QUERY$
    );
    RAISE NOTICE 'Scheduled agent-drain (every minute)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule agent-drain: %', SQLERRM;
  END;
END $$;

COMMIT;

-- Verification:
-- SELECT jobname, schedule FROM cron.job WHERE jobname = 'agent-drain';
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_enqueue%';
-- SELECT proname FROM pg_proc WHERE proname = 'enqueue_agent';
