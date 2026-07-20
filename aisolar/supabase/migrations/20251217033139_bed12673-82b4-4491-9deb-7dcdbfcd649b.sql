-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_contract_signed BOOLEAN DEFAULT true,
  email_payment_received BOOLEAN DEFAULT true,
  email_installation_scheduled BOOLEAN DEFAULT true,
  email_survey_completed BOOLEAN DEFAULT true,
  email_proposal_approved BOOLEAN DEFAULT true,
  email_stage_changes BOOLEAN DEFAULT false,
  inapp_contract_signed BOOLEAN DEFAULT true,
  inapp_payment_received BOOLEAN DEFAULT true,
  inapp_installation_scheduled BOOLEAN DEFAULT true,
  inapp_survey_completed BOOLEAN DEFAULT true,
  inapp_proposal_approved BOOLEAN DEFAULT true,
  inapp_stage_changes BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update notification creation to respect preferences
CREATE OR REPLACE FUNCTION public.create_workflow_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_lead_name TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_consultant_id UUID;
  v_prefs RECORD;
  v_should_notify BOOLEAN DEFAULT true;
BEGIN
  -- Get lead info and consultant based on trigger source
  CASE TG_TABLE_NAME
    WHEN 'leads' THEN
      v_lead_id := NEW.id;
      v_lead_name := NEW.name;
      SELECT consultant_id INTO v_consultant_id FROM proposals WHERE lead_id = NEW.id ORDER BY created_at DESC LIMIT 1;
      
      IF NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
        v_notification_type := 'stage_change';
        v_title := 'Workflow Stage Updated';
        v_message := v_lead_name || ' moved to ' || COALESCE(NEW.workflow_stage, 'new');
      ELSE
        RETURN NEW;
      END IF;
    
    WHEN 'contracts' THEN
      v_lead_id := NEW.lead_id;
      SELECT name INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
      SELECT consultant_id INTO v_consultant_id FROM proposals WHERE id = NEW.proposal_id;
      v_notification_type := 'contract_signed';
      v_title := 'Contract Signed!';
      v_message := v_lead_name || ' has signed the contract';
    
    WHEN 'invoices' THEN
      v_lead_id := NEW.lead_id;
      SELECT name INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
      SELECT consultant_id INTO v_consultant_id FROM proposals WHERE id = NEW.proposal_id;
      
      IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'paid') THEN
        v_notification_type := 'payment_received';
        v_title := 'Payment Received!';
        v_message := 'Full payment received from ' || v_lead_name;
      ELSIF NEW.deposit_paid = true AND (OLD IS NULL OR OLD.deposit_paid IS DISTINCT FROM true) THEN
        v_notification_type := 'deposit_received';
        v_title := 'Deposit Received!';
        v_message := 'Deposit payment received from ' || v_lead_name;
      ELSE
        RETURN NEW;
      END IF;
    
    WHEN 'proposals' THEN
      v_lead_id := NEW.lead_id;
      SELECT name INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
      v_consultant_id := NEW.consultant_id;
      
      IF NEW.confirmed_install_date IS NOT NULL AND (OLD IS NULL OR OLD.confirmed_install_date IS NULL) THEN
        v_notification_type := 'installation_scheduled';
        v_title := 'Installation Scheduled';
        v_message := 'Installation confirmed for ' || v_lead_name || ' on ' || TO_CHAR(NEW.confirmed_install_date, 'DD Mon YYYY');
      ELSIF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'approved') THEN
        v_notification_type := 'proposal_approved';
        v_title := 'Proposal Approved!';
        v_message := v_lead_name || ' has approved the proposal';
      ELSE
        RETURN NEW;
      END IF;
    
    WHEN 'site_surveys' THEN
      v_lead_id := NEW.lead_id;
      SELECT name INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
      v_consultant_id := NEW.surveyor_id;
      
      IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
        v_notification_type := 'survey_completed';
        v_title := 'Survey Completed';
        v_message := 'Site survey completed for ' || v_lead_name;
      ELSE
        RETURN NEW;
      END IF;
    
    WHEN 'installation_checklists' THEN
      v_lead_id := NEW.lead_id;
      SELECT name INTO v_lead_name FROM leads WHERE id = NEW.lead_id;
      SELECT consultant_id INTO v_consultant_id FROM proposals WHERE id = NEW.proposal_id;
      
      IF NEW.customer_signature IS NOT NULL AND (OLD IS NULL OR OLD.customer_signature IS NULL) THEN
        v_notification_type := 'installation_completed';
        v_title := 'Installation Complete!';
        v_message := 'Installation completed and signed off for ' || v_lead_name;
      ELSE
        RETURN NEW;
      END IF;
    
    ELSE
      RETURN NEW;
  END CASE;

  -- Check user preferences
  IF v_consultant_id IS NOT NULL THEN
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_consultant_id;
    
    IF v_prefs IS NOT NULL THEN
      CASE v_notification_type
        WHEN 'stage_change' THEN v_should_notify := v_prefs.inapp_stage_changes;
        WHEN 'contract_signed' THEN v_should_notify := v_prefs.inapp_contract_signed;
        WHEN 'payment_received', 'deposit_received' THEN v_should_notify := v_prefs.inapp_payment_received;
        WHEN 'installation_scheduled' THEN v_should_notify := v_prefs.inapp_installation_scheduled;
        WHEN 'proposal_approved' THEN v_should_notify := v_prefs.inapp_proposal_approved;
        WHEN 'survey_completed' THEN v_should_notify := v_prefs.inapp_survey_completed;
        WHEN 'installation_completed' THEN v_should_notify := v_prefs.inapp_installation_scheduled;
        ELSE v_should_notify := true;
      END CASE;
    END IF;

    -- Insert notification if allowed by preferences
    IF v_should_notify THEN
      INSERT INTO public.notifications (user_id, lead_id, type, title, message, metadata)
      VALUES (
        v_consultant_id,
        v_lead_id,
        v_notification_type,
        v_title,
        v_message,
        jsonb_build_object('triggered_by', TG_TABLE_NAME)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;