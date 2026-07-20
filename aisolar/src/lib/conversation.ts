/**
 * Shared conversation model — used by both CustomerPortalV2 and ConsultantCockpitV5.
 *
 * Phase 3 fix: previously, the consultant's `leadToMessages` was a stripped-down
 * version that only mapped raw touchpoints. The customer portal had a rich
 * `buildConversation` that added welcome messages, bill-uploaded system messages,
 * proposal-ready cards, install-scheduled cards, install-complete cards, and
 * inline action buttons. The user said "bring back the real chat" — this shared
 * lib lets both sides see the same rich thread.
 *
 * Usage:
 *   import { buildConversation, generateAIResponse, type ChatMessage } from '@/lib/conversation';
 *   const messages = buildConversation(lead);
 */

import {
  Sun, Send, Sparkles, FileText, Calendar, Phone, MapPin,
  CheckCircle2, Clock, Bot, User, ArrowRight, ArrowLeft,
  Download, CreditCard, Award, Zap, TrendingUp, AlertCircle,
  MessageSquare, Star, Shield, type LucideIcon,
} from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';
import { getStage, PIPELINE_STAGES } from '@/lib/leadIntake';
import { brand } from '@/config/brand';

export type { LucideIcon };

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export interface ChatMessage {
  id: string;
  type: 'system' | 'agent' | 'company' | 'customer' | 'ai';
  body: string;
  timestamp: string;
  /** Inline action button — rendered below the message body. */
  actionLabel?: string;
  actionIcon?: LucideIcon;
  /** Semantic route or document key the action should open. */
  actionData?: string;
  /** Optional rich card metadata — when present, the message renders as a
   * card (e.g. proposal thumbnail + cost + CTA) instead of a plain bubble. */
  card?: {
    kind: 'proposal' | 'contract' | 'invoice' | 'warranty' | 'install' | 'estimate';
    title: string;
    subtitle?: string;
    rows?: Array<{ label: string; value: string }>;
    ctaLabel: string;
    ctaIcon?: LucideIcon;
    ctaData?: string;
  };
}

/**
 * Build the unified conversation thread for a lead.
 *
 * The same thread is shown to:
 *   - the customer (in CustomerPortalV2)
 *   - the consultant (in ConsultantCockpitV5 Chats tab)
 *
 * Both sides see the same events in the same order. The only difference is
 * which action buttons are interactive (the customer can pay/sign; the
 * consultant can edit/resend).
 */
export function buildConversation(lead: DummyLead): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  // Welcome
  msgs.push({
    id: 'welcome',
    type: 'system',
    body: `Welcome to ${brand.name}, ${lead.name.split(' ')[0]}! Your solar journey starts here.`,
    timestamp: lead.touchpoints[0]?.timestamp || new Date(Date.now() - 7 * 86400000).toISOString(),
  });

  // Bill uploaded
  msgs.push({
    id: 'bill_uploaded',
    type: 'system',
    body: `We received your electricity bill. Our AI analyzed your usage: ${lead.annual_kwh?.toLocaleString()} kWh/year, €${lead.monthly_bill}/month. Recommended system: ${lead.intake.estimated_system_size_kw}kWp.`,
    timestamp: lead.touchpoints[0]?.timestamp || new Date(Date.now() - 7 * 86400000).toISOString(),
    actionLabel: 'See your estimate',
    actionIcon: TrendingUp,
    actionData: 'estimate',
  });

  // Touchpoints as messages
  lead.touchpoints.forEach((tp, i) => {
    if (tp.actor === 'customer' && tp.channel === 'portal') {
      msgs.push({
        id: `tp_${i}`,
        type: 'system',
        body: tp.summary,
        timestamp: tp.timestamp,
      });
    } else if (tp.actor === 'agent') {
      msgs.push({
        id: `tp_${i}`,
        type: 'agent',
        body: tp.summary,
        timestamp: tp.timestamp,
        actionLabel: tp.channel === 'email' ? 'View email' : undefined,
        actionIcon: tp.channel === 'email' ? FileText : undefined,
      });
    } else if (tp.actor === 'consultant') {
      msgs.push({
        id: `tp_${i}`,
        type: 'company',
        body: tp.summary,
        timestamp: tp.timestamp,
        actionLabel: tp.channel === 'email' ? 'View email' : undefined,
        actionIcon: tp.channel === 'email' ? FileText : undefined,
      });
    }
  });

  // AI chat history (for leads with active proposals)
  if (['proposal_sent', 'approved', 'deposit_paid'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'ai_chat_1',
      type: 'customer',
      body: 'When will my installation happen?',
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
    msgs.push({
      id: 'ai_chat_2',
      type: 'ai',
      body: `Your installation is scheduled based on your deposit payment. Once you pay the 30% deposit, the Install Coordinator Agent will book your install within 4-6 weeks, weather permitting. You'll get an SMS 7 days and 1 day before.`,
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
  }

  // Proposal ready — RENDER AS A RICH CARD
  if (lead.proposal && ['proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'proposal_ready',
      type: 'agent',
      body: `Your ${lead.proposal.system_size_kw}kWp solar proposal is ready! System size: ${lead.proposal.panel_count} panels. Net cost after SEAI grant: ${eur(lead.proposal.net_cost)}. Annual savings: ${eur(lead.proposal.annual_savings)}. Payback: ${lead.proposal.payback_years} years.`,
      timestamp: lead.proposal.sent_date || new Date(Date.now() - 5 * 86400000).toISOString(),
      actionLabel: 'View proposal',
      actionIcon: FileText,
      actionData: 'proposal',
      card: lead.proposal ? {
        kind: 'proposal',
        title: `${lead.proposal.system_size_kw} kWp Solar System`,
        subtitle: `${lead.proposal.panel_count} × ${lead.proposal.panel_model}`,
        rows: [
          { label: 'Net cost (after SEAI)', value: eur(lead.proposal.net_cost) },
          { label: 'SEAI grant', value: eur(lead.proposal.seai_grant) },
          { label: 'Annual savings', value: `${eur(lead.proposal.annual_savings)}/yr` },
          { label: 'Payback', value: `${lead.proposal.payback_years} years` },
        ],
        ctaLabel: 'View proposal',
        ctaIcon: FileText,
        ctaData: 'proposal',
      } : undefined,
    });
  }

  // Contract signed
  if (lead.contract) {
    msgs.push({
      id: 'contract_signed',
      type: 'system',
      body: 'Contract signed! Your SEAI grant paperwork has been auto-started. Invoice created.',
      timestamp: lead.contract.signed_date,
      actionLabel: 'View contract',
      actionIcon: FileText,
      actionData: 'contract',
      card: {
        kind: 'contract',
        title: 'Contract signed',
        subtitle: `Signed by ${lead.name} on ${new Date(lead.contract.signed_date).toLocaleDateString('en-IE')}`,
        rows: [
          { label: 'Net cost', value: eur(lead.proposal?.net_cost || 0) },
          { label: 'Deposit (30%)', value: eur((lead.proposal?.net_cost || 0) * 0.3) },
          { label: 'Balance (70%)', value: eur((lead.proposal?.net_cost || 0) * 0.7) },
        ],
        ctaLabel: 'View contract',
        ctaIcon: FileText,
        ctaData: 'contract',
      },
    });
  }

  // Install scheduled
  if (lead.assignment && ['install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'install_scheduled',
      type: 'agent',
      body: `Your installation is scheduled for ${new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}. Our crew will arrive between 8-9am. Please ensure roof access is clear.`,
      timestamp: lead.assignment.scheduled_date,
      card: {
        kind: 'install',
        title: 'Installation scheduled',
        subtitle: `${new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })} · 8-9am arrival`,
        rows: [
          { label: 'Installer', value: lead.assignment.installer_name },
          { label: 'Address', value: lead.address.split(',').slice(-2).join(', ').trim() },
          { label: 'Status', value: lead.assignment.status },
        ],
        ctaLabel: 'Add to calendar',
        ctaIcon: Calendar,
        ctaData: 'install',
      },
    });
  }

  // Install complete
  if (['installed', 'final_paid', 'completed'].includes(lead.workflow_stage)) {
    msgs.push({
      id: 'install_complete',
      type: 'agent',
      body: 'Your solar system is installed and commissioned! Warranty docs sent. Your system is now generating clean energy.',
      timestamp: lead.assignment?.completed_date || new Date().toISOString(),
      actionLabel: 'View warranty',
      actionIcon: Award,
      actionData: 'warranty',
      card: {
        kind: 'warranty',
        title: 'System commissioned',
        subtitle: 'Warranty documents sent',
        rows: [
          { label: 'Workmanship', value: '10 years' },
          { label: 'Panels', value: '25 years (performance)' },
          { label: 'Inverter', value: '10 years' },
          ...(lead.proposal?.battery_model ? [{ label: 'Battery', value: '10 years' }] : []),
        ],
        ctaLabel: 'View warranty',
        ctaIcon: Award,
        ctaData: 'warranty',
      },
    });
  }

  // Sort by timestamp
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Generate an AI response to a customer/consultant question.
 * Keyword-based for now — will be replaced by a real LLM call in Phase 4.
 */
export function generateAIResponse(question: string, lead: DummyLead): string {
  const q = question.toLowerCase();
  if (q.includes('when') && (q.includes('install') || q.includes('date'))) {
    return lead.assignment?.scheduled_date
      ? `Your installation is scheduled for ${new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}. The crew will arrive between 8-9am. You'll get a reminder SMS the day before.`
      : `Your installation will be scheduled once you pay the deposit. Typically within 4-6 weeks of deposit payment, weather permitting.`;
  }
  if (q.includes('save') || q.includes('saving') || q.includes('bill')) {
    return lead.proposal
      ? `Based on your ${lead.proposal.system_size_kw}kWp system, you'll save approximately ${eur(lead.proposal.annual_savings)} per year. Over 20 years (accounting for inflation), that's ${eur(lead.proposal.twenty_year_savings)} net of installation cost. Your payback period is ${lead.proposal.payback_years} years.`
      : `Based on your bill of €${lead.monthly_bill}/month, you could save €800-1,400/year with solar.`;
  }
  if (q.includes('grant') || q.includes('seai')) {
    return lead.proposal
      ? `Your SEAI Solar Electricity Grant is ${eur(lead.proposal.seai_grant)} (€900/kWp, capped at €1,800). We handle all the paperwork — once your contract is signed, the SEAI Grant Agent auto-starts the application.`
      : `The SEAI grant is €900/kWp installed, capped at €1,800. For a typical 6kWp system, that's the full €1,800 off. We handle all paperwork.`;
  }
  if (q.includes('pay') || q.includes('deposit') || q.includes('cost') || q.includes('price')) {
    return lead.proposal
      ? `Your net cost after the SEAI grant is ${eur(lead.proposal.net_cost)}. The deposit is 30% (${eur(lead.proposal.net_cost * 0.3)}) due on contract signing, and the balance of 70% (${eur(lead.proposal.net_cost * 0.7)}) is due after installation. You can pay by card or bank transfer.`
      : `Once your proposal is ready, you'll see the full cost breakdown. Typically a 6kWp system costs €8,000-12,000 after the SEAI grant.`;
  }
  if (q.includes('warranty')) {
    return `Your solar system comes with: (1) 10-year workmanship warranty from us, (2) 25-year performance guarantee on panels, (3) 10-year inverter warranty${lead.proposal?.battery_model ? ', (4) 10-year battery warranty' : ''}. Full warranty docs are in your portal after installation.`;
  }
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hi ${lead.name.split(' ')[0]}! I'm your solar assistant. Ask me anything about your project — timing, savings, grants, warranty, payments. I'm here 24/7.`;
  }
  if (q.includes('progress') || q.includes('status') || q.includes('where')) {
    return `Your project is currently at: ${getStage(lead.workflow_stage).label}. ${getStage(lead.workflow_stage).automation}. You can see the full timeline in our conversation below.`;
  }
  return `Great question! I've noted it and your consultant will follow up by email within 24 hours. For anything urgent, call ${brand.contact.phoneDisplay}. You can also review your documents using the 📄 button below.`;
}

/**
 * Summarize a conversation in 3 bullet points.
 * Used by the "Ask AI to summarize" button in the consultant cockpit.
 *
 * NOTE: this is a deterministic keyword-based summarizer for the demo.
 * Phase 4 will replace it with a real LLM call to OpenRouter.
 */
export function summarizeConversation(messages: ChatMessage[], lead: DummyLead): string[] {
  const bullets: string[] = [];
  const stage = getStage(lead.workflow_stage);

  // Lead stage + score
  bullets.push(`Currently at ${stage.label} stage${lead.score > 80 ? ' (hot lead)' : ''}, last activity ${formatRelative(messages[messages.length - 1]?.timestamp)}.`);

  // Proposal status
  if (lead.proposal) {
    bullets.push(`Proposal sent: ${lead.proposal.system_size_kw}kWp for ${eur(lead.proposal.net_cost)} (after ${eur(lead.proposal.seai_grant)} SEAI grant). ${lead.contract ? 'Contract signed.' : 'Awaiting contract signature.'}`);
  } else {
    bullets.push(`No proposal yet — estimate is ${lead.intake.estimated_system_size_kw}kWp, ${eur(lead.intake.estimated_annual_savings || 0)}/yr savings.`);
  }

  // Open items / next step
  if (['new', 'intake_complete'].includes(lead.workflow_stage)) {
    bullets.push(`Next step: book a site survey to confirm roof details and finalize the system design.`);
  } else if (['survey_scheduled', 'survey_complete'].includes(lead.workflow_stage)) {
    bullets.push(`Next step: draft proposal from survey data — Proposal Drafter Agent will prepare it.`);
  } else if (lead.workflow_stage === 'proposal_sent') {
    bullets.push(`Next step: follow up with customer — they haven't responded to the proposal yet.`);
  } else if (lead.workflow_stage === 'approved') {
    bullets.push(`Next step: collect 30% deposit to trigger Install Coordinator Agent.`);
  } else if (['install_scheduled', 'installing'].includes(lead.workflow_stage)) {
    bullets.push(`Next step: installation in progress — confirm installer has uploaded all photos + signatures.`);
  } else if (['installed', 'final_paid'].includes(lead.workflow_stage)) {
    bullets.push(`Next step: PostInstall Agent should send warranty docs + schedule review request.`);
  }

  return bullets;
}

function formatRelative(iso?: string): string {
  if (!iso) return 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}
