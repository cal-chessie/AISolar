-- Enable pg_net extension for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send notification via edge function
CREATE OR REPLACE FUNCTION public.send_event_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_event_type TEXT;
  v_payload JSONB;
  v_supabase_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Get Supabase URL and anon key from environment (set via pg_net config)
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- If settings not available, try to get from vault or skip
  IF v_supabase_url IS NULL OR v_anon_key IS NULL THEN
    RAISE LOG 'Notification skipped: Supabase settings not configured';
    RETURN NEW;
  END IF;

  -- Determine event type and payload based on trigger source
  CASE TG_TABLE_NAME
    -- Contract signed notification
    WHEN 'contracts' THEN
      IF TG_OP = 'INSERT' THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'contract_signed';
        v_payload := jsonb_build_object(
          'type', 'contract_signed',
          'leadId', NEW.lead_id,
          'proposalId', NEW.proposal_id,
          'signedBy', NEW.signed_by_name,
          'signedAt', NEW.signed_at
        );
      ELSE
        RETURN NEW;
      END IF;
    
    -- Installation scheduled notification
    WHEN 'proposals' THEN
      IF NEW.confirmed_install_date IS NOT NULL AND (OLD IS NULL OR OLD.confirmed_install_date IS NULL) THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'installation_scheduled';
        v_payload := jsonb_build_object(
          'type', 'installation_scheduled',
          'leadId', NEW.lead_id,
          'proposalId', NEW.id,
          'installDate', NEW.confirmed_install_date
        );
      ELSIF NEW.status = 'presented' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'presented') THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'proposal_sent';
        v_payload := jsonb_build_object(
          'type', 'proposal_sent',
          'leadId', NEW.lead_id,
          'proposalId', NEW.id
        );
      ELSE
        RETURN NEW;
      END IF;
    
    -- Payment completed notification
    WHEN 'invoices' THEN
      IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'paid') THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'payment_completed';
        v_payload := jsonb_build_object(
          'type', 'payment_completed',
          'leadId', NEW.lead_id,
          'invoiceId', NEW.id,
          'amount', NEW.total_amount
        );
      ELSIF NEW.deposit_paid = true AND (OLD IS NULL OR OLD.deposit_paid IS DISTINCT FROM true) THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'deposit_received';
        v_payload := jsonb_build_object(
          'type', 'deposit_received',
          'leadId', NEW.lead_id,
          'invoiceId', NEW.id,
          'amount', NEW.deposit_amount
        );
      ELSE
        RETURN NEW;
      END IF;
    
    -- Survey scheduled notification
    WHEN 'site_surveys' THEN
      IF TG_OP = 'INSERT' AND NEW.survey_date IS NOT NULL THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'survey_scheduled';
        v_payload := jsonb_build_object(
          'type', 'survey_scheduled',
          'leadId', NEW.lead_id,
          'surveyId', NEW.id,
          'surveyDate', NEW.survey_date
        );
      ELSIF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'survey_completed';
        v_payload := jsonb_build_object(
          'type', 'survey_completed',
          'leadId', NEW.lead_id,
          'surveyId', NEW.id
        );
      ELSE
        RETURN NEW;
      END IF;
    
    -- Installation completed notification
    WHEN 'installation_checklists' THEN
      IF NEW.customer_signature IS NOT NULL AND (OLD IS NULL OR OLD.customer_signature IS NULL) THEN
        v_lead_id := NEW.lead_id;
        v_event_type := 'installation_completed';
        v_payload := jsonb_build_object(
          'type', 'installation_completed',
          'leadId', NEW.lead_id,
          'proposalId', NEW.proposal_id,
          'completedAt', NEW.customer_signed_at
        );
      ELSE
        RETURN NEW;
      END IF;
    
    ELSE
      RETURN NEW;
  END CASE;

  -- Make async HTTP request to edge function
  IF v_event_type IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := v_payload
    );
    
    -- Log the notification attempt
    INSERT INTO public.activity_logs (lead_id, action_type, description, metadata)
    VALUES (
      v_lead_id,
      'notification_sent',
      'Email notification triggered: ' || v_event_type,
      jsonb_build_object('event_type', v_event_type, 'payload', v_payload)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for email notifications
CREATE TRIGGER trigger_contract_notification
  AFTER INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_notification();

CREATE TRIGGER trigger_proposal_notification
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_notification();

CREATE TRIGGER trigger_invoice_notification
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_notification();

CREATE TRIGGER trigger_survey_notification
  AFTER INSERT OR UPDATE ON public.site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_notification();

CREATE TRIGGER trigger_installation_notification
  AFTER UPDATE ON public.installation_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_notification();