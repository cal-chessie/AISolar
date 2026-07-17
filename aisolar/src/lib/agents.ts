/**
 * AGENT FOUNDATION — autonomous agents that do the heavy lifting.
 *
 * Design principle: every recurring workflow step that doesn't need human judgment
 * is owned by an agent. Agents are triggered by:
 *   1. DB triggers (when a row changes stage)
 *   2. pg_cron schedules (time-based)
 *   3. Manual invocation (consultant clicks "Run now")
 *
 * Each agent has:
 *   - id, name, description
 *   - trigger: what fires it
 *   - inputs: what it reads
 *   - outputs: what it writes/sends
 *   - run(): the actual logic (in edge function or pg_cron job)
 *   - status: idle | running | success | failed
 *
 * The UI panel (AgentFoundation.tsx) shows all agents, their last run, their
 * queue depth, and lets the user manually trigger / pause them.
 */

export type AgentId =
  | 'lead_intake'
  | 'survey_scheduler'
  | 'proposal_drafter'
  | 'follow_up'
  | 'grant_submitter'
  | 'install_coordinator'
  | 'post_install'
  | 'customer_digest'
  | 'stale_lead_escalator'
  | 'payment_reminder';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  /** What fires this agent */
  trigger: 'db_trigger' | 'cron' | 'manual' | 'event';
  triggerDetails: string;
  /** What this agent reads */
  inputs: string[];
  /** What this agent writes/sends */
  outputs: string[];
  /** Best practices / guardrails */
  guardrails: string[];
  /** Default cron schedule (if applicable) */
  schedule?: string;
  /** Whether the agent is enabled by default */
  enabledByDefault: boolean;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'lead_intake',
    name: 'Lead Intake Agent',
    description: 'Normalizes bill-extracted data, dedupes by email/MPRN, scores the lead, and creates the lead_intake row that all downstream stages read from.',
    trigger: 'db_trigger',
    triggerDetails: 'AFTER INSERT on leads WHERE source = "bill_upload"',
    inputs: ['leads (raw)', 'lead_intake (extracted)', 'existing leads (for dedup)'],
    outputs: ['lead_intake (normalized)', 'lead.score (1-100)', 'activity_logs', 'notification to assigned consultant'],
    guardrails: [
      'Never overwrites a higher-confidence extraction with a lower one',
      'Flags duplicate MPRNs for human review, does not auto-merge',
      'Anonymizes PII when sending to external AI extraction service',
    ],
    enabledByDefault: true,
  },
  {
    id: 'survey_scheduler',
    name: 'Survey Scheduler Agent',
    description: 'Auto-books a site survey based on installer availability, lead location, and lead priority. Sends calendar invites to installer + customer.',
    trigger: 'event',
    triggerDetails: 'lead.workflow_stage → "intake_complete"',
    inputs: ['lead_intake', 'installer_availability', 'installer.skills', 'lead.address (for route optimization)'],
    outputs: ['site_surveys row', 'calendar invites (installer + customer)', 'lead.workflow_stage → "survey_scheduled"'],
    guardrails: [
      'Never double-books an installer',
      'Honors installer blackout dates',
      'Caps travel radius at 80km unless override',
      'Books within 5 business days for hot leads, 10 for cold',
    ],
    enabledByDefault: true,
  },
  {
    id: 'proposal_drafter',
    name: 'Proposal Drafter Agent',
    description: 'Auto-generates a proposal draft from survey data. Uses lead_intake estimate + survey-confirmed roof details. Consultant reviews and sends.',
    trigger: 'event',
    triggerDetails: 'lead.workflow_stage → "survey_complete"',
    inputs: ['lead_intake', 'site_surveys (confirmed fields)', 'solar_products (catalog)', 'current pricing rules'],
    outputs: ['proposals row (status="draft")', 'proposal line items', 'lead.workflow_stage → "proposal_drafted"', 'notification to consultant'],
    guardrails: [
      'Uses ONLY products in stock',
      'Caps grant at SEAI maximum',
      'Adds 15% contingency to roof-mount if shading = "moderate" or "heavy"',
      'Marks draft for human review — never auto-sends to customer',
    ],
    enabledByDefault: true,
  },
  {
    id: 'follow_up',
    name: 'Follow-Up Agent',
    description: 'Sends stage-appropriate follow-ups and escalates stale leads. Per-stage thresholds set in admin/email_templates.',
    trigger: 'cron',
    triggerDetails: 'Daily 09:00 Europe/Dublin',
    schedule: '0 9 * * *',
    inputs: ['leads (workflow_stage, updated_at)', 'follow_up_settings (thresholds)', 'email_templates'],
    outputs: ['emails (stage-appropriate)', 'notifications (escalation if 2x threshold)', 'lead.score adjustments'],
    guardrails: [
      'Never emails a lead more than once per 3 days',
      'Caps total emails per lead at 5',
      'Auto-pauses if customer has replied in any channel in last 7 days',
      'Escalates to human at 2x threshold (does not auto-close)',
    ],
    enabledByDefault: true,
  },
  {
    id: 'grant_submitter',
    name: 'SEAI Grant Agent',
    description: 'Auto-starts SEAI grant application when contract is signed. Tracks paperwork status, flags missing docs, submits when complete.',
    trigger: 'event',
    triggerDetails: 'lead.workflow_stage → "approved" (contract signed)',
    inputs: ['contracts', 'leads (MPRN, address)', 'proposals (system_size_kw)', 'installation_checklists (serial numbers)'],
    outputs: ['seai_applications row', 'seai_documents checklist', 'notifications for missing docs'],
    guardrails: [
      'Never submits without all required docs (MPRN, BER cert, invoice, install photo)',
      'Tracks SEAI response deadline (28 days) and escalates',
      'Pulls grant amount from current SEAI schedule, never hardcodes',
    ],
    enabledByDefault: true,
  },
  {
    id: 'install_coordinator',
    name: 'Install Coordinator Agent',
    description: 'Schedules the installation after deposit is paid. Orders materials, books installer, sends customer reminders (T-7, T-1, T-day).',
    trigger: 'event',
    triggerDetails: 'invoice.deposit_paid = true',
    inputs: ['proposals (panel_count, battery_kwh)', 'installer_availability', 'solar_products (stock levels)', 'lead.address'],
    outputs: ['assignments row', 'purchase_orders (if stock low)', 'customer reminders (T-7, T-1)', 'lead.workflow_stage → "install_scheduled"'],
    guardrails: [
      'Never schedules before materials are confirmed in stock',
      'Requires 2 installer-days for systems > 6kWp',
      'Sends customer SMS 24h before with installer name + ETA',
      'Auto-reschedules on weather warning (Met Éireann orange/red)',
    ],
    enabledByDefault: true,
  },
  {
    id: 'post_install',
    name: 'Post-Install Agent',
    description: 'After install marked complete, sends warranty docs, requests a Google review, schedules a 30-day check-in, generates the handover PDF pack.',
    trigger: 'event',
    triggerDetails: 'lead.workflow_stage → "installed"',
    inputs: ['installation_checklists (serial numbers, photos)', 'proposals', 'contracts (warranty terms)'],
    outputs: ['warranty email + PDF', 'review request email (with timing logic — 7 days after install)', 'handover pack PDF', 'lead.workflow_stage → "completed" (after final paid + review request sent)'],
    guardrails: [
      'Warranty email within 24h of install',
      'Review request exactly 7 days after install (not sooner)',
      '30-day check-in auto-scheduled',
      'Never marks "completed" until final invoice paid',
    ],
    enabledByDefault: true,
  },
  {
    id: 'customer_digest',
    name: 'Customer Digest Agent',
    description: 'Sends customers a weekly status update on their project. Personalized per stage. Reduces inbound "what\'s happening" calls.',
    trigger: 'cron',
    triggerDetails: 'Monday 10:00 Europe/Dublin',
    schedule: '0 10 * * 1',
    inputs: ['leads (workflow_stage, last_customer_contact)', 'activity_logs (customer-visible events)'],
    outputs: ['customer email (per-stage template)'],
    guardrails: [
      'Opt-out per customer preference',
      'Skips stages where customer has been contacted in last 48h',
      'Includes a clear next-step CTA (e.g. "sign contract", "pay deposit")',
    ],
    enabledByDefault: false, // opt-in
  },
  {
    id: 'stale_lead_escalator',
    name: 'Stale Lead Escalator',
    description: 'Identifies leads stuck at any stage past their threshold and escalates to the assigned consultant + their manager.',
    trigger: 'cron',
    triggerDetails: 'Daily 08:00 Europe/Dublin',
    schedule: '0 8 * * *',
    inputs: ['leads (workflow_stage, updated_at)', 'follow_up_settings', 'profiles (managers)'],
    outputs: ['notifications to consultant', 'notifications to manager if 2x threshold', 'lead.score decay'],
    guardrails: [
      'Respects business hours (no 3am pings)',
      'Caps escalations at 1 per consultant per day',
      'Auto-reassigns if consultant has not touched lead in 14 days',
    ],
    enabledByDefault: true,
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder Agent',
    description: 'Sends polite reminders for unpaid invoices. Escalates tone at T+7, T+14, T+30. Auto-sends final demand at T+45.',
    trigger: 'cron',
    triggerDetails: 'Daily 09:30 Europe/Dublin',
    schedule: '30 9 * * *',
    inputs: ['invoices (due_date, status)', 'leads (preferred contact)', 'email_templates'],
    outputs: ['payment reminder emails (escalating tone)', 'notification to consultant at T+14', 'final demand at T+45'],
    guardrails: [
      'Never threatens legal action before T+45',
      'Pauses if customer has raised a dispute',
      'CCs consultant on all reminders',
    ],
    enabledByDefault: true,
  },
];

/** Get an agent by ID */
export function getAgent(id: AgentId): AgentDefinition | undefined {
  return AGENTS.find(a => a.id === id);
}

/**
 * Determine which agent(s) should fire for a given stage transition.
 * Used by the Pipeline View to show "what happens next, automatically".
 */
export function getAgentsForStage(newStage: string): AgentDefinition[] {
  const map: Record<string, AgentId[]> = {
    intake_complete: ['survey_scheduler'],
    survey_scheduled: [], // human-driven (installer attends)
    survey_complete: ['proposal_drafter'],
    proposal_drafted: [], // human-driven (consultant reviews)
    proposal_sent: ['follow_up'],
    approved: ['grant_submitter'],
    deposit_paid: ['install_coordinator'],
    install_scheduled: [], // human-driven (installer shows up)
    installing: [],        // human-driven
    installed: ['post_install'],
    final_paid: [],
    completed: ['customer_digest'],
  };
  const ids = map[newStage] || [];
  return ids.map(id => getAgent(id)!).filter(Boolean);
}
