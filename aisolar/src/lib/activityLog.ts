import { supabase } from '@/integrations/supabase/client';

export type ActivityActionType = 
  | 'lead_created'
  | 'lead_updated'
  | 'lead_contacted'
  | 'lead_status_changed'
  | 'survey_started'
  | 'survey_completed'
  | 'proposal_created'
  | 'proposal_updated'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'contract_signed'
  | 'invoice_created'
  | 'payment_received'
  | 'installation_scheduled'
  | 'installation_completed'
  | 'note_added'
  | 'assignment_created'
  | 'seai_application_submitted';

interface LogActivityParams {
  leadId: string;
  actionType: ActivityActionType;
  description: string;
  metadata?: Record<string, any>;
}

export async function logActivity({ leadId, actionType, description, metadata = {} }: LogActivityParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        lead_id: leadId,
        user_id: user?.id || null,
        action_type: actionType,
        description,
        metadata
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export function getActionIcon(actionType: ActivityActionType): string {
  const icons: Record<ActivityActionType, string> = {
    lead_created: '👤',
    lead_updated: '✏️',
    lead_contacted: '📞',
    lead_status_changed: '🔄',
    survey_started: '📋',
    survey_completed: '✅',
    proposal_created: '📝',
    proposal_updated: '📝',
    proposal_sent: '📤',
    proposal_accepted: '🎉',
    contract_signed: '✍️',
    invoice_created: '💳',
    payment_received: '💰',
    installation_scheduled: '📅',
    installation_completed: '🏠',
    note_added: '📌',
    assignment_created: '👷',
    seai_application_submitted: '🏛️'
  };
  return icons[actionType] || '📌';
}

export function getActionColor(actionType: ActivityActionType): string {
  const colors: Record<string, string> = {
    lead_created: 'bg-primary/10 text-primary',
    lead_updated: 'bg-slate-100 text-slate-700',
    lead_contacted: 'bg-primary/10 text-primary',
    lead_status_changed: 'bg-primary/10 text-primary',
    survey_started: 'bg-yellow-100 text-yellow-700',
    survey_completed: 'bg-primary/10 text-primary',
    proposal_created: 'bg-primary/10 text-primary',
    proposal_updated: 'bg-primary/10 text-primary',
    proposal_sent: 'bg-primary/10 text-primary',
    proposal_accepted: 'bg-primary/10 text-primary',
    contract_signed: 'bg-primary/10 text-primary',
    invoice_created: 'bg-orange-100 text-orange-700',
    payment_received: 'bg-primary/10 text-primary',
    installation_scheduled: 'bg-primary/10 text-primary',
    installation_completed: 'bg-primary/10 text-primary',
    note_added: 'bg-slate-100 text-slate-700',
    assignment_created: 'bg-primary/10 text-primary',
    seai_application_submitted: 'bg-primary/10 text-primary'
  };
  return colors[actionType] || 'bg-slate-100 text-slate-700';
}
