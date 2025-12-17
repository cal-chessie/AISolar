-- Phase 1: Remove duplicate status column from leads table
-- The workflow_stage column is the single source of truth for lead state

-- First, sync any status values to workflow_stage if workflow_stage is null or different
UPDATE public.leads 
SET workflow_stage = CASE 
  WHEN status = 'contacted' THEN 'survey'
  WHEN status = 'qualified' THEN 'survey'
  WHEN status = 'proposal_sent' THEN 'proposal'
  WHEN status = 'closed_won' THEN 'completed'
  WHEN status = 'closed_lost' THEN 'completed'
  ELSE COALESCE(workflow_stage, 'new')
END
WHERE workflow_stage IS NULL OR workflow_stage = 'new';

-- Now drop the status column
ALTER TABLE public.leads DROP COLUMN IF EXISTS status;