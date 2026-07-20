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
    lead_created: 'bg-blue-100 text-blue-700',
    lead_updated: 'bg-slate-100 text-slate-700',
    lead_contacted: 'bg-green-100 text-green-700',
    lead_status_changed: 'bg-purple-100 text-purple-700',
    survey_started: 'bg-yellow-100 text-yellow-700',
    survey_completed: 'bg-emerald-100 text-emerald-700',
    proposal_created: 'bg-indigo-100 text-indigo-700',
    proposal_updated: 'bg-indigo-100 text-indigo-700',
    proposal_sent: 'bg-cyan-100 text-cyan-700',
    proposal_accepted: 'bg-green-100 text-green-700',
    contract_signed: 'bg-emerald-100 text-emerald-700',
    invoice_created: 'bg-orange-100 text-orange-700',
    payment_received: 'bg-green-100 text-green-700',
    installation_scheduled: 'bg-blue-100 text-blue-700',
    installation_completed: 'bg-emerald-100 text-emerald-700',
    note_added: 'bg-slate-100 text-slate-700',
    assignment_created: 'bg-purple-100 text-purple-700',
    seai_application_submitted: 'bg-teal-100 text-teal-700'
  };
  return colors[actionType] || 'bg-slate-100 text-slate-700';
}
