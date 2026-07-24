/**
 * Dummy data seeder — for demo mode + first-run population.
 *
 * Seeds realistic Irish solar leads with full pipeline state so the installer,
 * consultant, admin, and owner views all have something to show.
 *
 * All data is fictional. Names are common Irish surnames; addresses are real
 * Dublin suburbs; MPRNs are 11-digit numbers (valid format, not real meters).
 */

import { calculateSystemEstimate, LeadIntake } from './leadIntake';
import { getPricingConfig } from './pricing';

// One battery premium for the demo, from the tenant pricing model — a 13.5kWh
// Powerwall priced at the configured €/kWh, so demo numbers match live math.
const DEMO_BATTERY_KWH = 13.5;
const DEMO_BATTERY_PREMIUM = Math.round(DEMO_BATTERY_KWH * getPricingConfig().batteryPerKwh);

export interface DummyLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  mprn: string;
  monthly_bill: number;
  annual_kwh: number;
  workflow_stage: string;
  status: string;
  source: 'bill_upload' | 'referral' | 'manual';
  score: number;
  assigned_consultant: string;
  assigned_installer?: string;
  intake: Partial<LeadIntake>;
  survey?: {
    scheduled_date: string;
    completed_date?: string;
    surveyor: string;
    roof_type: string;
    roof_orientation: string;
    roof_pitch: number;
    shading: string;
    available_area_m2: number;
    confirmed_system_size_kw: number;
    confirmed_panel_count: number;
    confirmed_battery_kwh: number;
    confirmed_inverter_type: string;
    photo_count: number;
  };
  proposal?: {
    id: string;
    status: 'draft' | 'presented' | 'approved' | 'rejected';
    system_size_kw: number;
    panel_count: number;
    panel_model: string;
    inverter_model: string;
    battery_model: string | null;
    gross_cost: number;
    seai_grant: number;
    net_cost: number;
    annual_savings: number;
    payback_years: number;
    twenty_year_savings: number;
    sent_date?: string;
  };
  contract?: {
    id: string;
    signed_date: string;
    signed_by: string;
  };
  invoice?: {
    id: string;
    invoice_number: string;
    deposit_amount: number;
    final_amount: number;
    deposit_paid: boolean;
    final_paid: boolean;
    deposit_paid_date?: string;
    final_paid_date?: string;
  };
  assignment?: {
    id: string;
    installer_id: string;
    installer_name: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed';
    scheduled_date: string;
    completed_date?: string;
  };
  touchpoints: Array<{
    id?: string;
    stage: string;
    channel: 'email' | 'sms' | 'portal' | 'phone';
    direction: 'outbound' | 'inbound';
    summary: string;
    timestamp: string;
    actor: 'system' | 'consultant' | 'installer' | 'customer' | 'agent';
  }>;
}

const now = new Date();
const iso = (daysAgo: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const isoFuture = (daysAhead: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const DUBLIN_ADDRESSES = [
  '12 Beech Hill Road, Donnybrook, Dublin 4',
  '47 Shrewsbury Road, Ballsbridge, Dublin 4',
  '8 Castle Park Road, Sandymount, Dublin 4',
  '23 Torquay Road, Bray, Co. Wicklow',
  '5 Foxrock Road, Foxrock, Dublin 18',
  '18 Mulberry Lane, Dundrum, Dublin 16',
  '34 Seafield Road, Clontarf, Dublin 3',
  '9 Howth Road, Howth, Dublin 13',
  '27 Ranelagh Village, Ranelagh, Dublin 6',
  '14 Orwell Road, Rathgar, Dublin 6',
  '6 Silchester Road, Glasnevin, Dublin 11',
  '31 Rathmines Road Lower, Rathmines, Dublin 6',
];

const INSTALLERS = [
  { id: 'ins-001', name: 'Mike Doyle',  skills: ['roof-mount', 'battery', 'commercial'] },
  { id: 'ins-002', name: 'Liam Brennan', skills: ['roof-mount', 'inverter'] },
  { id: 'ins-003', name: 'Cian Murphy',  skills: ['ground-mount', 'battery'] },
];

const CONSULTANTS = ['Aoife O\'Connor', 'Cian Walsh'];

function makeMprn(seed: number): string {
  return String(10000000000 + seed * 7919).slice(0, 11);
}

/** Generate 12 realistic leads spanning every pipeline stage. */
export function generateDummyLeads(): DummyLead[] {
  const leads: DummyLead[] = [];

  const scenarios = [
    // 1. New lead — bill uploaded 2 hours ago
    {
      name: 'Mary O\'Brien', stage: 'new', daysAgo: 0, bill: 245, kwh: 8400,
      address: DUBLIN_ADDRESSES[0], consultant: CONSULTANTS[0],
      touchpoints: [
        { stage: 'new', channel: 'portal', direction: 'inbound', summary: 'Bill uploaded via landing page', timestamp: iso(0, 9), actor: 'customer' },
        { stage: 'new', channel: 'email', direction: 'outbound', summary: 'LeadIntakeAgent sent auto-acknowledge', timestamp: iso(0, 9), actor: 'agent' },
      ],
    },
    // 2. Intake complete
    {
      name: 'Patrick Kelly', stage: 'intake_complete', daysAgo: 1, bill: 312, kwh: 10800,
      address: DUBLIN_ADDRESSES[1], consultant: CONSULTANTS[1],
      touchpoints: [
        { stage: 'new', channel: 'portal', direction: 'inbound', summary: 'Bill uploaded', timestamp: iso(1, 14), actor: 'customer' },
        { stage: 'intake_complete', channel: 'email', direction: 'outbound', summary: 'AI analysis sent to customer', timestamp: iso(1, 14), actor: 'agent' },
      ],
    },
    // 3. Survey scheduled
    {
      name: 'Linda O\'Sullivan', stage: 'survey_scheduled', daysAgo: 2, bill: 198, kwh: 6800,
      address: DUBLIN_ADDRESSES[2], consultant: CONSULTANTS[0], installer: INSTALLERS[1],
      surveyDate: isoFuture(2),
      touchpoints: [
        { stage: 'intake_complete', channel: 'email', direction: 'outbound', summary: 'SurveySchedulerAgent booked Tue 10am', timestamp: iso(2, 11), actor: 'agent' },
        { stage: 'survey_scheduled', channel: 'email', direction: 'outbound', summary: 'Survey confirmation emailed — Tue 10am with Liam', timestamp: iso(2, 11), actor: 'agent' },
      ],
    },
    // 4. Survey complete — proposal not yet drafted
    {
      name: 'Tom Brennan', stage: 'survey_complete', daysAgo: 3, bill: 278, kwh: 9600,
      address: DUBLIN_ADDRESSES[3], consultant: CONSULTANTS[1], installer: INSTALLERS[0],
      touchpoints: [
        { stage: 'survey_complete', channel: 'portal', direction: 'inbound', summary: 'Installer uploaded 8 photos + roof data', timestamp: iso(1, 15), actor: 'installer' },
        { stage: 'survey_complete', channel: 'email', direction: 'outbound', summary: 'ProposalDrafter Agent notified consultant', timestamp: iso(1, 15), actor: 'agent' },
      ],
    },
    // 5. Proposal drafted — awaiting consultant review
    {
      name: 'Sarah McDonald', stage: 'proposal_drafted', daysAgo: 4, bill: 356, kwh: 12200,
      address: DUBLIN_ADDRESSES[4], consultant: CONSULTANTS[0], installer: INSTALLERS[2],
      touchpoints: [
        { stage: 'proposal_drafted', channel: 'portal', direction: 'outbound', summary: 'Auto-drafted 6.4kWp system for consultant review', timestamp: iso(2, 9), actor: 'agent' },
      ],
    },
    // 6. Proposal sent — customer opening repeatedly (hot lead)
    {
      name: 'James Wilson', stage: 'proposal_sent', daysAgo: 5, bill: 289, kwh: 9900,
      address: DUBLIN_ADDRESSES[5], consultant: CONSULTANTS[0],
      touchpoints: [
        { stage: 'proposal_sent', channel: 'email', direction: 'outbound', summary: 'Proposal link emailed to customer', timestamp: iso(3, 11), actor: 'consultant' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (1st time)', timestamp: iso(2, 19), actor: 'customer' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (2nd time)', timestamp: iso(2, 21), actor: 'customer' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (3rd time)', timestamp: iso(1, 8), actor: 'customer' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (4th time)', timestamp: iso(0, 18), actor: 'customer' },
      ],
    },
    // 7. Approved — contract just signed, invoice auto-created, grant agent starting
    {
      name: 'Siobhán Murphy', stage: 'approved', daysAgo: 6, bill: 412, kwh: 14100,
      address: DUBLIN_ADDRESSES[6], consultant: CONSULTANTS[1],
      touchpoints: [
        { stage: 'approved', channel: 'portal', direction: 'inbound', summary: 'Customer signed contract', timestamp: iso(0, 14), actor: 'customer' },
        { stage: 'approved', channel: 'email', direction: 'outbound', summary: 'Invoice auto-created + deposit link emailed', timestamp: iso(0, 14), actor: 'agent' },
        { stage: 'approved', channel: 'email', direction: 'outbound', summary: 'GrantAgent started SEAI application', timestamp: iso(0, 14), actor: 'agent' },
      ],
    },
    // 8. Deposit paid — install being scheduled
    {
      name: 'David Walsh', stage: 'deposit_paid', daysAgo: 7, bill: 234, kwh: 8100,
      address: DUBLIN_ADDRESSES[7], consultant: CONSULTANTS[0], installer: INSTALLERS[1],
      touchpoints: [
        { stage: 'deposit_paid', channel: 'portal', direction: 'inbound', summary: 'Stripe deposit €2,940 confirmed', timestamp: iso(1, 12), actor: 'customer' },
        { stage: 'deposit_paid', channel: 'email', direction: 'outbound', summary: 'InstallCoordinator Agent: scheduling for week of Jul 24', timestamp: iso(1, 12), actor: 'agent' },
      ],
    },
    // 9. Install scheduled
    {
      name: 'Anna Kowalski', stage: 'install_scheduled', daysAgo: 8, bill: 198, kwh: 6800,
      address: DUBLIN_ADDRESSES[8], consultant: CONSULTANTS[1], installer: INSTALLERS[0],
      surveyDate: isoFuture(7),
      touchpoints: [
        { stage: 'install_scheduled', channel: 'email', direction: 'outbound', summary: 'Install confirmed for Jul 24, 8am', timestamp: iso(1, 15), actor: 'agent' },
        { stage: 'install_scheduled', channel: 'email', direction: 'outbound', summary: 'T-7 reminder: materials ordered, crew confirmed', timestamp: iso(0, 10), actor: 'agent' },
      ],
    },
    // 10. Installing — currently on site
    {
      name: 'John O\'Connor', stage: 'installing', daysAgo: 9, bill: 267, kwh: 9200,
      address: DUBLIN_ADDRESSES[9], consultant: CONSULTANTS[0], installer: INSTALLERS[2],
      touchpoints: [
        { stage: 'installing', channel: 'portal', direction: 'inbound', summary: 'Installer marked "on site" + uploaded 4 progress photos', timestamp: iso(0, 9), actor: 'installer' },
      ],
    },
    // 11. Installed — awaiting final payment
    {
      name: 'Emma Ryan', stage: 'installed', daysAgo: 10, bill: 245, kwh: 8400,
      address: DUBLIN_ADDRESSES[10], consultant: CONSULTANTS[1], installer: INSTALLERS[0],
      touchpoints: [
        { stage: 'installed', channel: 'portal', direction: 'inbound', summary: 'Install checklist 100% complete + final photos', timestamp: iso(1, 16), actor: 'installer' },
        { stage: 'installed', channel: 'email', direction: 'outbound', summary: 'PostInstallAgent: warranty docs + final invoice sent', timestamp: iso(1, 16), actor: 'agent' },
        { stage: 'installed', channel: 'email', direction: 'outbound', summary: 'Review request scheduled for Jul 24 (7-day rule)', timestamp: iso(1, 16), actor: 'agent' },
      ],
    },
    // 12. Completed — closed out
    {
      name: 'Michael Byrne', stage: 'completed', daysAgo: 30, bill: 312, kwh: 10800,
      address: DUBLIN_ADDRESSES[11], consultant: CONSULTANTS[0], installer: INSTALLERS[1],
      touchpoints: [
        { stage: 'final_paid', channel: 'portal', direction: 'inbound', summary: 'Final payment €8,460 received', timestamp: iso(7, 14), actor: 'customer' },
        { stage: 'completed', channel: 'email', direction: 'outbound', summary: 'GrantAgent: SEAI paperwork submitted', timestamp: iso(6, 10), actor: 'agent' },
        { stage: 'completed', channel: 'email', direction: 'outbound', summary: 'Handover pack + referral request sent', timestamp: iso(5, 11), actor: 'agent' },
        { stage: 'completed', channel: 'email', direction: 'inbound', summary: 'Customer left 5★ review', timestamp: iso(2, 9), actor: 'customer' },
      ],
    },
  ];

  scenarios.forEach((s, idx) => {
    const estimate = calculateSystemEstimate({
      monthlyBill: s.bill,
      annualKwh: s.kwh,
    });

    const lead: DummyLead = {
      id: `lead-${String(idx + 1).padStart(3, '0')}`,
      name: s.name,
      email: s.name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.') + '@example.com',
      phone: `+353 8${idx} 123 4${String(idx).padStart(2, '0')}`,
      address: s.address,
      mprn: makeMprn(idx + 1),
      monthly_bill: s.bill,
      annual_kwh: s.kwh,
      workflow_stage: s.stage,
      status: 'active',
      source: 'bill_upload',
      score: 50 + (s.bill > 300 ? 20 : 0) + (s.stage === 'proposal_sent' ? 15 : 0) + (s.stage === 'approved' ? 25 : 0),
      assigned_consultant: s.consultant,
      assigned_installer: s.installer?.name,
      intake: {
        source: 'bill_upload',
        extracted_monthly_bill: s.bill,
        extracted_annual_kwh: s.kwh,
        extracted_mprn: makeMprn(idx + 1),
        extracted_account_name: s.name,
        extracted_address: s.address,
        extraction_confidence: idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low',
        // Full 21-field extract, so the demo shows what the bill reader
        // actually pulls rather than the five fields a web form collects.
        // Rates are real Irish domestic ranges (2026): day 0.33-0.38,
        // night ~0.17, standing charge ~0.60/day, VAT 9% on electricity.
        extracted_provider: ['Electric Ireland', 'Energia', 'SSE Airtricity', 'Bord Gáis Energy', 'Pinergy'][idx % 5],
        extracted_tariff_name: idx % 2 === 0 ? 'Home Electric+ Night Boost' : 'Standard 24hr Urban',
        extracted_unit_rate: [0.3512, 0.3390, 0.3745, 0.3298, 0.3611][idx % 5],
        extracted_night_rate: idx % 2 === 0 ? [0.1721, 0.1690, 0.1802][idx % 3] : null,
        extracted_standing_charge: 0.6027,
        extracted_standing_charge_unit: 'per day',
        extracted_vat_rate: 9,
        extracted_day_night_meter: idx % 2 === 0,
        extracted_billing_period: 'Bi-monthly',
        extracted_billing_period_kwh: Math.round(s.kwh / 6),
        extracted_eircode: s.address.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0] ?? null,
        // The pair that decides the battery case. Split varies by household so
        // both the night-heavy and day-heavy narratives appear in the demo.
        extracted_day_usage_kwh: Math.round((s.kwh / 6) * [0.72, 0.55, 0.68, 0.49, 0.77][idx % 5]),
        extracted_night_usage_kwh: Math.round((s.kwh / 6) * [0.28, 0.45, 0.32, 0.51, 0.23][idx % 5]),
        // one estimated read in the set, so the caveat path is exercised
        extracted_estimated_reading: idx % 4 === 3,
        extracted_notes: idx % 4 === 3 ? 'Reading marked E on the bill; totals may move on next actual read.' : null,
        estimated_system_size_kw: estimate.systemSizeKw,
        estimated_annual_savings: estimate.annualSavings,
        estimated_payback_years: estimate.paybackYears,
        estimated_20yr_savings: estimate.twentyYearSavings,
        solar_offset_pct: estimate.solarOffsetPct,
      },
      touchpoints: s.touchpoints as DummyLead['touchpoints'],
    };

    // Add survey data for stages >= survey_scheduled
    if (['survey_scheduled', 'survey_complete', 'proposal_drafted', 'proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage)) {
      lead.survey = {
        scheduled_date: (s as any).surveyDate || isoFuture(idx),
        completed_date: ['survey_complete', 'proposal_drafted', 'proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage) ? iso(idx + 1) : undefined,
        surveyor: s.installer?.name || 'Unassigned',
        roof_type: idx % 2 === 0 ? 'concrete_tile' : 'slate',
        roof_orientation: idx % 2 === 0 ? 'south' : 'south_west',
        roof_pitch: 30 + (idx % 3) * 5,
        shading: idx % 4 === 0 ? 'light' : 'none',
        available_area_m2: 20 + (idx % 4) * 5,
        confirmed_system_size_kw: estimate.systemSizeKw,
        confirmed_panel_count: estimate.systemSizeKw * 2,
        confirmed_battery_kwh: idx % 2 === 0 ? 5 : 0,
        confirmed_inverter_type: idx % 2 === 0 ? 'hybrid' : 'string',
        photo_count: 6 + (idx % 4),
      };
    }

    // Add proposal data for stages >= proposal_drafted
    if (['proposal_drafted', 'proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage)) {
      lead.proposal = {
        id: `prop-${String(idx + 1).padStart(3, '0')}`,
        status: s.stage === 'proposal_drafted' ? 'draft' : s.stage === 'proposal_sent' ? 'presented' : 'approved',
        system_size_kw: estimate.systemSizeKw,
        panel_count: estimate.systemSizeKw * 2,
        panel_model: 'Longi Hi-MO 6 435W',
        inverter_model: 'SolarEdge SE5K',
        battery_model: idx % 2 === 0 ? 'Tesla Powerwall 3 (13.5kWh)' : null,
        gross_cost: estimate.grossCost + (idx % 2 === 0 ? DEMO_BATTERY_PREMIUM : 0), // battery premium (tenant €/kWh)
        seai_grant: estimate.seaiGrant,
        net_cost: estimate.netCost + (idx % 2 === 0 ? DEMO_BATTERY_PREMIUM : 0),
        annual_savings: estimate.annualSavings,
        payback_years: estimate.paybackYears,
        twenty_year_savings: estimate.twentyYearSavings,
        sent_date: s.stage !== 'proposal_drafted' ? iso(idx + 1) : undefined,
      };
    }

    // Add contract + invoice for stages >= approved
    if (['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage)) {
      lead.contract = {
        id: `con-${String(idx + 1).padStart(3, '0')}`,
        signed_date: iso(idx),
        signed_by: s.name,
      };
      const net = lead.proposal!.net_cost;
      lead.invoice = {
        id: `inv-${String(idx + 1).padStart(3, '0')}`,
        invoice_number: `INV-2026-${String(idx + 1).padStart(3, '0')}`,
        deposit_amount: Math.round(net * 0.3),
        final_amount: net - Math.round(net * 0.3),
        deposit_paid: ['deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage),
        final_paid: ['final_paid', 'completed'].includes(s.stage),
        deposit_paid_date: ['deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage) ? iso(idx - 1) : undefined,
        final_paid_date: ['final_paid', 'completed'].includes(s.stage) ? iso(idx - 5) : undefined,
      };
    }

    // Add installer assignment for stages >= install_scheduled
    if (['install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(s.stage) && s.installer) {
      lead.assignment = {
        id: `asg-${String(idx + 1).padStart(3, '0')}`,
        installer_id: s.installer.id,
        installer_name: s.installer.name,
        status: s.stage === 'installing' ? 'accepted' : s.stage === 'installed' || s.stage === 'final_paid' || s.stage === 'completed' ? 'completed' : 'accepted',
        scheduled_date: (s as any).surveyDate || isoFuture(idx - 2),
        completed_date: ['installed', 'final_paid', 'completed'].includes(s.stage) ? iso(idx - 3) : undefined,
      };
    }

    leads.push(lead);
  });

  return leads;
}

/** Pipeline stats for the dashboard. */
export function computePipelineStats(leads: DummyLead[]) {
  const byStage: Record<string, number> = {};
  let totalValue = 0;
  let activeLeads = 0;
  let staleLeads = 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  leads.forEach(lead => {
    byStage[lead.workflow_stage] = (byStage[lead.workflow_stage] || 0) + 1;
    if (lead.proposal) {
      totalValue += lead.proposal.net_cost;
    } else {
      totalValue += (lead.intake.estimated_system_size_kw || 0) * getPricingConfig().perKwp;
    }
    if (!['completed', 'final_paid'].includes(lead.workflow_stage)) {
      activeLeads++;
    }
    if (new Date(lead.touchpoints[lead.touchpoints.length - 1]?.timestamp || Date.now()).getTime() < sevenDaysAgo
        && !['completed', 'final_paid', 'installed', 'installing'].includes(lead.workflow_stage)) {
      staleLeads++;
    }
  });

  return {
    byStage,
    totalValue,
    activeLeads,
    staleLeads,
    completedLeads: byStage.completed || 0,
  };
}
