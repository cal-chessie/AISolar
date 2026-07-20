-- Phase 2: Automated Workflow Engine
-- Create triggers that automatically update workflow_stage based on actions

-- 1. Create the core function to update lead stage and log activity
CREATE OR REPLACE FUNCTION public.auto_update_lead_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_new_stage TEXT;
  v_current_stage TEXT;
  v_description TEXT;
BEGIN
  -- Determine lead_id and new stage based on trigger source
  CASE TG_TABLE_NAME
    -- Survey triggers
    WHEN 'site_surveys' THEN
      v_lead_id := NEW.lead_id;
      IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
        v_new_stage := 'survey_complete';
        v_description := 'Survey completed';
      ELSIF TG_OP = 'INSERT' AND NEW.status = 'draft' THEN
        v_new_stage := 'survey';
        v_description := 'Survey started';
      ELSE
        RETURN NEW;
      END IF;
    
    -- Proposal triggers
    WHEN 'proposals' THEN
      v_lead_id := NEW.lead_id;
      IF TG_OP = 'INSERT' THEN
        v_new_stage := 'proposal';
        v_description := 'Proposal created';
      ELSIF NEW.status = 'presented' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'presented') THEN
        v_new_stage := 'proposal_sent';
        v_description := 'Proposal presented to customer';
      ELSIF NEW.confirmed_install_date IS NOT NULL AND (OLD IS NULL OR OLD.confirmed_install_date IS NULL) THEN
        v_new_stage := 'scheduled';
        v_description := 'Installation date confirmed';
      ELSE
        RETURN NEW;
      END IF;
    
    -- Contract triggers
    WHEN 'contracts' THEN
      v_lead_id := NEW.lead_id;
      v_new_stage := 'approved';
      v_description := 'Contract signed by customer';
    
    -- Installation checklist triggers
    WHEN 'installation_checklists' THEN
      v_lead_id := NEW.lead_id;
      IF NEW.customer_signature IS NOT NULL AND (OLD IS NULL OR OLD.customer_signature IS NULL) THEN
        v_new_stage := 'installed';
        v_description := 'Installation completed and signed off';
      ELSIF NEW.status = 'in_progress' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'in_progress') THEN
        v_new_stage := 'installing';
        v_description := 'Installation in progress';
      ELSE
        RETURN NEW;
      END IF;
    
    -- Invoice triggers
    WHEN 'invoices' THEN
      v_lead_id := NEW.lead_id;
      IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'paid') THEN
        v_new_stage := 'completed';
        v_description := 'Final payment received - project complete';
      ELSIF NEW.deposit_paid = true AND (OLD IS NULL OR OLD.deposit_paid IS DISTINCT FROM true) THEN
        -- Don't change stage for deposit, just log it
        INSERT INTO public.activity_logs (lead_id, action_type, description, metadata)
        VALUES (v_lead_id, 'payment_received', 'Deposit payment received', 
                jsonb_build_object('triggered_by', TG_TABLE_NAME, 'amount', NEW.deposit_amount));
        RETURN NEW;
      ELSE
        RETURN NEW;
      END IF;
    
    ELSE
      RETURN NEW;
  END CASE;

  -- Get current stage
  SELECT workflow_stage INTO v_current_stage FROM public.leads WHERE id = v_lead_id;
  
  -- Only update if moving forward (prevent backwards movement)
  -- Stage order: new < survey < survey_complete < proposal < proposal_sent < approved < scheduled < installing < installed < completed
  IF v_new_stage IS NOT NULL AND v_lead_id IS NOT NULL THEN
    UPDATE public.leads 
    SET workflow_stage = v_new_stage, updated_at = NOW()
    WHERE id = v_lead_id;
    
    -- Log the transition
    INSERT INTO public.activity_logs (lead_id, action_type, description, metadata)
    VALUES (
      v_lead_id, 
      'stage_change', 
      v_description, 
      jsonb_build_object(
        'previous_stage', v_current_stage, 
        'new_stage', v_new_stage, 
        'triggered_by', TG_TABLE_NAME,
        'trigger_operation', TG_OP
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create triggers for each table

-- Survey triggers
DROP TRIGGER IF EXISTS auto_stage_survey ON public.site_surveys;
CREATE TRIGGER auto_stage_survey
  AFTER INSERT OR UPDATE ON public.site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_lead_stage();

-- Proposal triggers
DROP TRIGGER IF EXISTS auto_stage_proposal ON public.proposals;
CREATE TRIGGER auto_stage_proposal
  AFTER INSERT OR UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_lead_stage();

-- Contract triggers
DROP TRIGGER IF EXISTS auto_stage_contract ON public.contracts;
CREATE TRIGGER auto_stage_contract
  AFTER INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_lead_stage();

-- Installation checklist triggers
DROP TRIGGER IF EXISTS auto_stage_installation ON public.installation_checklists;
CREATE TRIGGER auto_stage_installation
  AFTER INSERT OR UPDATE ON public.installation_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_lead_stage();

-- Invoice triggers
DROP TRIGGER IF EXISTS auto_stage_invoice ON public.invoices;
CREATE TRIGGER auto_stage_invoice
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_lead_stage();

-- 3. Add last_contacted_at field for accurate follow-up tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;

-- 4. Create function to update last_contacted_at when activity is logged
CREATE OR REPLACE FUNCTION public.update_last_contacted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_contacted_at for contact-related activities
  IF NEW.action_type IN ('lead_contacted', 'call_scheduled', 'email_sent', 'survey_scheduled') THEN
    UPDATE public.leads 
    SET last_contacted_at = NOW()
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_lead_last_contacted ON public.activity_logs;
CREATE TRIGGER update_lead_last_contacted
  AFTER INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_contacted();