import { supabase } from "@/integrations/supabase/client";

export type WorkflowStage = 'new' | 'contacted' | 'survey' | 'proposal' | 'approved' | 'scheduled' | 'installed' | 'completed';

const stageLabels: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  survey: 'Survey Scheduled',
  proposal: 'Proposal Sent',
  approved: 'Proposal Approved',
  scheduled: 'Installation Scheduled',
  installed: 'Installation Complete',
  completed: 'Project Completed',
};

export const getStageLabel = (stage: string): string => {
  return stageLabels[stage] || stage;
};

export const sendStageChangeNotification = async (
  leadId: string,
  previousStage: string | null,
  newStage: string
): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'stage_change',
        leadId,
        previousStage: previousStage || 'new',
        newStage,
      },
    });

    if (error) {
      console.error('Failed to send stage change notification:', error);
    }
  } catch (error) {
    console.error('Error sending stage change notification:', error);
  }
};

export const updateLeadStageWithNotification = async (
  leadId: string,
  newStage: string,
  currentStage: string | null
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ workflow_stage: newStage })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to update lead stage:', error);
      return false;
    }

    // Send notification if stage actually changed
    if (currentStage !== newStage) {
      await sendStageChangeNotification(leadId, currentStage, newStage);
    }

    return true;
  } catch (error) {
    console.error('Error updating lead stage:', error);
    return false;
  }
};
