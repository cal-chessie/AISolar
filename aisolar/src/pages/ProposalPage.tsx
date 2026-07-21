/**
 * /p/:leadId — the customer's proposal link (what gets emailed/shared).
 * Demo: unknown id falls back to the first lead that has a proposal.
 */
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import CustomerProposal from '@/components/customer/CustomerProposal';
import { generateDummyLeads } from '@/lib/dummyData';
import { toast } from 'sonner';

export default function ProposalPage() {
  const { leadId } = useParams();
  const lead = useMemo(() => {
    const leads = generateDummyLeads();
    return leads.find(l => l.id === leadId && l.proposal)
      ?? leads.find(l => l.proposal)!;
  }, [leadId]);

  return (
    <CustomerProposal
      lead={lead}
      onAccept={() => toast.success('Proposal accepted — kernel: ProposalAccepted (ref only)')}
      onPayDeposit={() => toast.info('Deposit flow — Stripe wiring lands with payments chunk')}
      onQuestion={() => toast.info('Opens the consultant chat thread')}
    />
  );
}
