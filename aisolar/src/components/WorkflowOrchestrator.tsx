/**
 * WorkflowOrchestrator — the connective tissue between all workflow steps.
 *
 * This is what was MISSING from the v3 build. We had:
 *   - SiteSurveyForm (survey capture with photos)
 *   - ProposalQuestionnaire (proposal builder)
 *   - InstallationChecklist (installer toggles + photos + signature)
 *   - ContractSignature (customer sign + GDPR consent)
 *
 * But none of them were wired into the new dashboards. The user rightfully
 * called this out: "where did all the survey and proposal steps go?"
 *
 * This component renders the RIGHT workflow step based on the lead's current
 * stage, and advances the lead through the pipeline as each step completes.
 * It's the kernel-to-UI bridge.
 *
 * Stage → Component mapping:
 *   new / intake_complete    → (nothing — agent handles)
 *   survey_scheduled         → SiteSurveyForm (read-only preview)
 *   survey_complete          → ProposalQuestionnaire (draft auto-started)
 *   proposal_drafted         → ProposalQuestionnaire (review + send)
 *   proposal_sent            → ContractSignature (customer signs)
 *   approved                 → InvoiceCard (customer pays deposit)
 *   deposit_paid             → InstallationChecklist (installer preps)
 *   install_scheduled        → InstallationChecklist (installer executes)
 *   installing               → InstallationChecklist (live progress)
 *   installed                → HandoverPack (warranty + review request)
 *   final_paid / completed   → ProjectComplete
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, ClipboardList, FileText, PenLine, CreditCard, Wrench,
  CheckCircle2, Package, Camera, Sparkles, ArrowRight,
  Sun, Shield, Award, Calendar,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES } from '@/lib/leadIntake';

// Lazy-load the heavy workflow components so they don't bloat the initial bundle
const SiteSurveyForm = lazy(() => import('@/components/SiteSurveyForm'));
const ProposalQuestionnaire = lazy(() => import('@/components/ProposalQuestionnaire'));
const ContractSignature = lazy(() => import('@/components/contracts/ContractSignature'));
const InstallationChecklist = lazy(() => import('@/components/installer/InstallationChecklist'));

interface WorkflowOrchestratorProps {
  lead: DummyLead;
  /** Who's viewing — determines which steps are interactive vs read-only */
  viewer: 'consultant' | 'installer' | 'customer' | 'admin';
  /** Called when a step completes — kernel hook for stage advancement */
  onStepComplete?: (step: string, data?: unknown) => void;
}

type WorkflowStep =
  | 'awaiting_survey'
  | 'survey_in_progress'
  | 'survey_complete_awaiting_proposal'
  | 'proposal_draft_in_progress'
  | 'proposal_draft_ready'
  | 'proposal_sent_awaiting_signature'
  | 'contract_signed_awaiting_deposit'
  | 'deposit_paid_awaiting_install'
  | 'install_scheduled'
  | 'install_in_progress'
  | 'install_complete_awaiting_handover'
  | 'project_complete';

function determineStep(lead: DummyLead): WorkflowStep {
  switch (lead.workflow_stage) {
    case 'new':
    case 'intake_complete':
      return 'awaiting_survey';
    case 'survey_scheduled':
      return lead.survey?.completed_date ? 'survey_complete_awaiting_proposal' : 'survey_in_progress';
    case 'survey_complete':
      return 'survey_complete_awaiting_proposal';
    case 'proposal_drafted':
      return 'proposal_draft_ready';
    case 'proposal_sent':
      return 'proposal_sent_awaiting_signature';
    case 'approved':
      return 'contract_signed_awaiting_deposit';
    case 'deposit_paid':
      return 'deposit_paid_awaiting_install';
    case 'install_scheduled':
      return 'install_scheduled';
    case 'installing':
      return 'install_in_progress';
    case 'installed':
      return 'install_complete_awaiting_handover';
    case 'final_paid':
    case 'completed':
      return 'project_complete';
    default:
      return 'awaiting_survey';
  }
}

const STEP_META: Record<WorkflowStep, { label: string; description: string; icon: typeof Sun; color: string }> = {
  awaiting_survey: { label: 'Awaiting site survey', description: 'Survey Scheduler Agent will book this automatically', icon: ClipboardList, color: 'blue' },
  survey_in_progress: { label: 'Site survey in progress', description: 'Installer capturing roof data + 8 photos', icon: Camera, color: 'indigo' },
  survey_complete_awaiting_proposal: { label: 'Survey complete', description: 'Proposal Drafter Agent auto-drafting proposal', icon: Sparkles, color: 'violet' },
  proposal_draft_in_progress: { label: 'Proposal being drafted', description: 'AI generating proposal from survey data', icon: Sparkles, color: 'violet' },
  proposal_draft_ready: { label: 'Proposal draft ready', description: 'Consultant reviewing — 2 min to send', icon: FileText, color: 'violet' },
  proposal_sent_awaiting_signature: { label: 'Proposal sent — awaiting signature', description: 'Customer reviewing in portal', icon: PenLine, color: 'amber' },
  contract_signed_awaiting_deposit: { label: 'Contract signed — awaiting deposit', description: 'Invoice auto-created, SEAI grant started', icon: CreditCard, color: 'emerald' },
  deposit_paid_awaiting_install: { label: 'Deposit paid — scheduling install', description: 'Install Coordinator Agent booking crew + materials', icon: Wrench, color: 'amber' },
  install_scheduled: { label: 'Install scheduled', description: 'Materials ordered, customer reminded', icon: Calendar, color: 'amber' },
  install_in_progress: { label: 'Install in progress', description: 'Installer on site — live checklist active', icon: Wrench, color: 'orange' },
  install_complete_awaiting_handover: { label: 'Install complete — awaiting handover', description: 'Warranty email sent, review request scheduled T+7', icon: CheckCircle2, color: 'emerald' },
  project_complete: { label: 'Project complete', description: 'SEAI submitted, handover pack delivered, review received', icon: Award, color: 'green' },
};

export default function WorkflowOrchestrator({ lead, viewer, onStepComplete }: WorkflowOrchestratorProps) {
  const [step, setStep] = useState<WorkflowStep>(() => determineStep(lead));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setStep(determineStep(lead));
    const idx = PIPELINE_STAGES.findIndex(s => s.id === lead.workflow_stage);
    setProgress(Math.round((idx / (PIPELINE_STAGES.length - 1)) * 100));
  }, [lead.workflow_stage]);

  const meta = STEP_META[step];
  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      {/* Current step banner */}
      <Card className={`border-${meta.color}-200 dark:border-${meta.color}-800 bg-${meta.color}-50/30 dark:bg-${meta.color}-950/10`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl bg-${meta.color}-100 dark:bg-${meta.color}-950/40 flex-shrink-0`}>
              <Icon className={`h-5 w-5 text-${meta.color}-700 dark:text-${meta.color}-300`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{meta.label}</h3>
                <Badge variant="outline" className={`text-[10px] bg-${meta.color}-50 text-${meta.color}-700 border-${meta.color}-200`}>
                  {lead.workflow_stage}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={progress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render the right workflow component based on step + viewer */}
      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>}>
        {renderWorkflowComponent(step, lead, viewer, onStepComplete)}
      </Suspense>
    </div>
  );
}

function renderWorkflowComponent(
  step: WorkflowStep,
  lead: DummyLead,
  viewer: 'consultant' | 'installer' | 'customer' | 'admin',
  onStepComplete?: (step: string, data?: unknown) => void,
) {
  // For customer viewers, only show contract signature + invoice payment
  if (viewer === 'customer') {
    if (step === 'proposal_sent_awaiting_signature' && lead.proposal) {
      return (
        <ContractSignature
          proposalId={lead.proposal.id}
          leadId={lead.id}
          leadName={lead.name}
          leadEmail={lead.email}
          totalAmount={lead.proposal.net_cost}
          onSignComplete={(contractId) => onStepComplete?.('contract_signed', { contractId })}
        />
      );
    }
    if (step === 'contract_signed_awaiting_deposit' || step === 'install_complete_awaiting_handover') {
      return <CustomerPaymentCard lead={lead} onPay={() => onStepComplete?.('payment_initiated')} />;
    }
    if (step === 'project_complete') {
      return <ProjectCompleteCard lead={lead} />;
    }
    return <WaitingCard message="Your project is in progress. We'll notify you when action is needed." />;
  }

  // For installer viewers, show survey form + installation checklist
  if (viewer === 'installer') {
    if (step === 'survey_in_progress' || step === 'awaiting_survey') {
      return (
        <SiteSurveyForm
          leadId={lead.id}
          onCreateProposal={(surveyData, leadData) => onStepComplete?.('survey_complete', surveyData)}
        />
      );
    }
    if (step === 'install_scheduled' || step === 'install_in_progress' || step === 'deposit_paid_awaiting_install') {
      if (lead.proposal) {
        return (
          <InstallationChecklist
            proposalId={lead.proposal.id}
            leadId={lead.id}
            leadName={lead.name}
          />
        );
      }
    }
    if (step === 'install_complete_awaiting_handover') {
      return <HandoverCard lead={lead} onHandoverComplete={() => onStepComplete?.('handover_complete')} />;
    }
    if (step === 'project_complete') {
      return <ProjectCompleteCard lead={lead} />;
    }
    return <WaitingCard message="Waiting for prior steps to complete. You'll be notified when this lead is ready for installation." />;
  }

  // For consultant + admin viewers, show everything (with edit access)
  if (step === 'survey_in_progress' || step === 'awaiting_survey') {
    return (
      <SiteSurveyForm
        leadId={lead.id}
        onSurveyComplete={(data) => onStepComplete?.('survey_complete', data)}
      />
    );
  }
  if (step === 'survey_complete_awaiting_proposal' || step === 'proposal_draft_ready') {
    if (lead.proposal) {
      return (
        <ProposalQuestionnaire
          leadId={lead.id}
          proposalId={lead.proposal.id}
          initialData={{
            systemSize: String(lead.proposal.system_size_kw ?? ''),
            panelType: lead.proposal.panel_model,
            inverterType: lead.proposal.inverter_model,
            batteryCapacity: lead.proposal.battery_model || '',
            budget: String(lead.proposal.net_cost ?? ''),
            _prefilledFromSurvey: true,
          }}
          onBack={() => onStepComplete?.('proposal_back')}
        />
      );
    }
  }
  if (step === 'proposal_sent_awaiting_signature') {
    return <WaitingCard message="Proposal sent to customer. They'll sign in their portal. You'll be notified." />;
  }
  if (step === 'contract_signed_awaiting_deposit') {
    return <WaitingCard message="Contract signed. Invoice auto-created. Waiting for deposit payment." />;
  }
  if (step === 'deposit_paid_awaiting_install' || step === 'install_scheduled' || step === 'install_in_progress') {
    if (lead.proposal) {
      return (
        <InstallationChecklist
          proposalId={lead.proposal.id}
          leadId={lead.id}
          leadName={lead.name}
        />
      );
    }
  }
  if (step === 'install_complete_awaiting_handover') {
    return <HandoverCard lead={lead} onHandoverComplete={() => onStepComplete?.('handover_complete')} />;
  }
  if (step === 'project_complete') {
    return <ProjectCompleteCard lead={lead} />;
  }

  return <WaitingCard message="No workflow step active for this lead." />;
}

function WaitingCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function CustomerPaymentCard({ lead, onPay }: { lead: DummyLead; onPay: () => void }) {
  const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const invoice = lead.invoice;
  if (!invoice) return <WaitingCard message="Invoice being generated. Check back in a moment." />;

  const depositDue = !invoice.deposit_paid;
  const finalDue = invoice.deposit_paid && !invoice.final_paid;

  return (
    <Card className="border-emerald-200 dark:border-emerald-800">
      <CardContent className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          Payment due
        </h3>
        <div className="space-y-3">
          {depositDue && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Deposit (30%)</div>
                  <div className="text-xs text-muted-foreground">Due now to lock in your SEAI grant</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{eur(invoice.deposit_amount)}</div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 mt-1" onClick={onPay}>
                    Pay deposit <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {finalDue && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Final payment (70%)</div>
                  <div className="text-xs text-muted-foreground">Due after installation complete</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{eur(invoice.final_amount)}</div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 mt-1" onClick={onPay}>
                    Pay final <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {invoice.deposit_paid && invoice.final_paid && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold">All payments received</div>
              <div className="text-xs text-muted-foreground">Thank you! Your SEAI grant is being submitted.</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HandoverCard({ lead, onHandoverComplete }: { lead: DummyLead; onHandoverComplete: () => void }) {
  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardContent className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Post-install handover
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Warranty email sent to customer', done: true },
            { label: 'Handover pack PDF generated', done: true },
            { label: 'SEAI grant application compiled', done: true },
            { label: 'Review request scheduled (T+7 days)', done: true },
            { label: 'Monitoring app login sent', done: false },
            { label: 'Final invoice sent', done: !lead.invoice?.final_paid },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-amber-400" />
              )}
              <span className={item.done ? '' : 'text-amber-700 dark:text-amber-400'}>{item.label}</span>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" onClick={onHandoverComplete}>
          Complete handover <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ProjectCompleteCard({ lead }: { lead: DummyLead }) {
  return (
    <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
      <CardContent className="p-6 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 mb-3">
          <Award className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
        </div>
        <h3 className="font-bold text-xl mb-1">Project complete!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {lead.name}'s {lead.proposal?.system_size_kw}kWp solar system is installed, commissioned, and generating clean energy.
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-background rounded">
            <div className="text-muted-foreground">SEAI grant</div>
            <div className="font-bold text-emerald-600">Submitted</div>
          </div>
          <div className="p-2 bg-background rounded">
            <div className="text-muted-foreground">Warranty</div>
            <div className="font-bold">10 years</div>
          </div>
          <div className="p-2 bg-background rounded">
            <div className="text-muted-foreground">Review</div>
            <div className="font-bold">5.0 ★</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
