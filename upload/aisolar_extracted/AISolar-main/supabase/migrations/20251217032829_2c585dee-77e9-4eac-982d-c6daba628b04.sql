-- Create notifications table for in-app alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to create notifications on workflow events
CREATE OR REPLACE FUNCTION public.create_workflow_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_lead_name TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_consultant_id UUID;
BEGIN
  -- Get lead info and consultant based on trigger source
  CASE TG_TABLE_NAME
    WHEN 'leads' THEN
      v_lead_id := NEW.id;
      v_lead_name := NEW.name;
      -- Get consultant from most recent proposal
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

  -- Insert notification for the consultant
  IF v_consultant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, lead_id, type, title, message, metadata)
    VALUES (
      v_consultant_id,
      v_lead_id,
      v_notification_type,
      v_title,
      v_message,
      jsonb_build_object('triggered_by', TG_TABLE_NAME, 'old_stage', OLD.workflow_stage, 'new_stage', NEW.workflow_stage)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for in-app notifications
CREATE TRIGGER trigger_lead_stage_notification
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_notification();

CREATE TRIGGER trigger_contract_notification_inapp
  AFTER INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_notification();

CREATE TRIGGER trigger_invoice_notification_inapp
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_notification();

CREATE TRIGGER trigger_proposal_notification_inapp
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_notification();

CREATE TRIGGER trigger_survey_notification_inapp
  AFTER UPDATE ON public.site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_notification();

CREATE TRIGGER trigger_installation_notification_inapp
  AFTER UPDATE ON public.installation_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workflow_notification();