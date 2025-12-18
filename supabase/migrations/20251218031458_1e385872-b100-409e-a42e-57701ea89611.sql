-- Add proposal_id column to assignments table for direct linking
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id);

-- Update existing installation assignment to link to the correct proposal
UPDATE assignments 
SET proposal_id = '543e7cf3-c0d9-4652-a1a3-cb4a3914acb7'
WHERE lead_id = '68fa8237-66b9-4643-b863-71510623f717'
AND assignment_type = 'installation'
AND proposal_id IS NULL;