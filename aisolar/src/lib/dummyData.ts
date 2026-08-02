/**
 * Dummy data seeder — the DEMO CAST (flip on/off).
 *
 * Demo ON (dev / VITE_ENABLE_DEMO, via demoMode.ts) = this cast; demo OFF =
 * the real DB (realLeads.ts). One lead at every pipeline stage, and every kind
 * of customer the system serves — the five archetypes Cal named:
 * domestic small · domestic large + battery · farm (agri) · commercial small ·
 * commercial large/industrial.
 *
 * INVARIANT-TRUE BY CONSTRUCTION: every lead's money runs through the ONE
 * engine, `computeQuote()`, with the archetype's real propertyType. Domestic
 * shows the tiered €700/€200 grant (cap €1,800) at 0% install VAT; farm and
 * commercial show the NDMG grant at 13% VAT — computed, never hand-typed
 * (the engine is executed-assertion verified, 27/27). Change the tenant's
 * pricing dial in Settings and every demo number moves with it. The demo can't
 * drift from the live maths, because it IS the live maths.
 *
 * Classification rides the ONE field — `property_type` on the intake
 * ('residential' | 'commercial', the survey's "home or business?") — the same
 * field the drafter, Estimate/Proposal/Design views and compliance all read.
 * (An earlier draft wrote the dead `extracted_premises_type`; killed.)
 *
 * All data is fictional: Irish names + trading names, real-format addresses/
 * Eircodes/11-digit MPRNs — correct in SHAPE, not lookups of real premises.
 */

import { computeQuote, ratesFromIntake, type LeadIntake } from './leadIntake';
import { getPricingConfig } from './pricing';
import type { PropertyType } from './seaiPipeline';

export interface DummyLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  mprn: string;
  /** The customer's magic-link token (real leads only; demo leads carry none).
   *  Staff surfaces build the portal link as `${origin}/customer/${access_token}`. */
  access_token?: string;
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
    household_occupants?: string;
    home_during_day?: string;
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

const INSTALLERS = [
  { id: 'ins-001', name: 'Mike Doyle',   skills: ['roof-mount', 'battery', 'commercial'] },
  { id: 'ins-002', name: 'Liam Brennan', skills: ['roof-mount', 'inverter'] },
  { id: 'ins-003', name: 'Cian Murphy',  skills: ['ground-mount', 'battery', 'commercial'] },
];

const CONSULTANTS = ['Aoife O\'Connor', 'Cian Walsh'];

function makeMprn(seed: number): string {
  return String(10000000000 + seed * 7919).slice(0, 11);
}

/**
 * The five archetypes — "all the types of people in the system" (Cal).
 * Each carries the facts that DECIDE its economics; computeQuote turns them
 * into the exact grant, VAT, savings and payback. The invariant is guaranteed
 * by the engine, not asserted by this file.
 */
interface Archetype {
  label: string;
  propertyType: PropertyType;                    // domestic | commercial (the engine's fork)
  /** The survey's "home or business?" answer — the ONE classification field. */
  propertyTypeField: 'residential' | 'commercial';
  systemSizeKw: number;
  batteryKwh: number;
  monthlyBill: number;
  annualKwh: number;
  panelModel: string;
  inverterModel: string;
  batteryModel: string | null;
  provider: string;
  unitRate: number;
  nightRate: number | null;
  dayNightMeter: boolean;
  /** Electricity VAT on the BILL (9% domestic reduced rate, 13.5% business). */
  billVatRate: number;
  roofOrientation: string;
  roofType: string;
  roofPitch: number;
  shading: string;
  occupants: string;
  homeDuringDay: string;
}

type ArchetypeId = 'domestic_small' | 'domestic_large' | 'farm' | 'commercial_small' | 'commercial_large';

const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  // Domestic · small — 3.5 kWp, no battery. Grant 2×€700 + 1.5×€200 = €1,700
  // (under the cap — shows the taper), 0% install VAT.
  domestic_small: {
    label: 'Domestic · small', propertyType: 'domestic', propertyTypeField: 'residential',
    systemSizeKw: 3.5, batteryKwh: 0, monthlyBill: 155, annualKwh: 5200,
    panelModel: 'Longi Hi-MO 6 LR5-435W', inverterModel: 'SolaX X1-Boost 3.6 G4', batteryModel: null,
    provider: 'Electric Ireland', unitRate: 0.3512, nightRate: null, dayNightMeter: false, billVatRate: 9,
    roofOrientation: 'south', roofType: 'concrete_tile', roofPitch: 35, shading: 'none',
    occupants: '2', homeDuringDay: 'out',
  },
  // Domestic · large + battery — 6.8 kWp + 13.5 kWh. Grant caps at €1,800,
  // 0% VAT; battery + day/night meter unlocks night-rate arbitrage.
  domestic_large: {
    label: 'Domestic · large + battery', propertyType: 'domestic', propertyTypeField: 'residential',
    systemSizeKw: 6.8, batteryKwh: 13.5, monthlyBill: 340, annualKwh: 11500,
    panelModel: 'Longi Hi-MO 6 LR5-435W', inverterModel: 'SolaX X1-Hybrid 5.0 G4', batteryModel: 'Tesla Powerwall 3 (13.5kWh)',
    provider: 'Energia', unitRate: 0.3390, nightRate: 0.1690, dayNightMeter: true, billVatRate: 9,
    roofOrientation: 'south_west', roofType: 'slate', roofPitch: 30, shading: 'light',
    occupants: '4', homeDuringDay: 'usually',
  },
  // Farm · agricultural — 14 kWp shed roof. COMMERCIAL pathway: NDMG
  // (2×€900 + 12×€300 = €5,400) at 13% install VAT. High daytime self-use.
  farm: {
    label: 'Farm · agricultural', propertyType: 'commercial', propertyTypeField: 'commercial',
    systemSizeKw: 14, batteryKwh: 0, monthlyBill: 520, annualKwh: 24000,
    panelModel: 'JA Solar JAM72D40 575W', inverterModel: 'SolaX X3-PRO 15K G2', batteryModel: null,
    provider: 'SSE Airtricity', unitRate: 0.3298, nightRate: 0.1721, dayNightMeter: true, billVatRate: 13.5,
    roofOrientation: 'south', roofType: 'agri_shed_steel', roofPitch: 15, shading: 'none',
    occupants: '5+', homeDuringDay: 'usually',
  },
  // Commercial · small business — 20 kWp. NDMG 2×€900 + 18×€300 = €7,200, 13% VAT.
  commercial_small: {
    label: 'Commercial · small business', propertyType: 'commercial', propertyTypeField: 'commercial',
    systemSizeKw: 20, batteryKwh: 0, monthlyBill: 780, annualKwh: 42000,
    panelModel: 'JA Solar JAM72D40 575W', inverterModel: 'SolaX X3-PRO 20K G2', batteryModel: null,
    provider: 'Bord Gáis Energy', unitRate: 0.3611, nightRate: null, dayNightMeter: false, billVatRate: 13.5,
    roofOrientation: 'south', roofType: 'trapezoidal_steel', roofPitch: 10, shading: 'none',
    occupants: '5+', homeDuringDay: 'usually',
  },
  // Commercial · large / industrial — 75 kWp. NDMG 2×€900 + 18×€300 + 55×€200
  // = €18,200 at 13% VAT — the headline commercial case.
  commercial_large: {
    label: 'Commercial · large / industrial', propertyType: 'commercial', propertyTypeField: 'commercial',
    systemSizeKw: 75, batteryKwh: 0, monthlyBill: 2900, annualKwh: 175000,
    panelModel: 'JA Solar JAM72D40 575W', inverterModel: 'Huawei SUN2000-60KTL-M0 ×2', batteryModel: null,
    provider: 'Pinergy', unitRate: 0.3745, nightRate: null, dayNightMeter: false, billVatRate: 13.5,
    roofOrientation: 'south', roofType: 'trapezoidal_steel', roofPitch: 10, shading: 'none',
    occupants: '5+', homeDuringDay: 'usually',
  },
};

interface Scenario {
  archetype: ArchetypeId;
  name: string;
  address: string;
  stage: string;
  daysAgo: number;
  routeDate?: number;
  surveyDate?: string;
  consultant: string;
  installer?: typeof INSTALLERS[number];
  source?: DummyLead['source'];
  /** Per-lead size override so same-type leads aren't carbon copies. */
  sizeKw?: number;
  touchpoints: DummyLead['touchpoints'];
}

/** One lead at every pipeline stage; every archetype represented. */
export function generateDummyLeads(): DummyLead[] {
  const leads: DummyLead[] = [];
  const panelWatts = getPricingConfig().panelWatts;

  const scenarios: Scenario[] = [
    // 1. NEW — bill just uploaded (domestic · small)
    {
      archetype: 'domestic_small', name: 'Aoife Nolan', address: '9 Howth Road, Howth, Dublin 13, D13 E8W1',
      stage: 'new', daysAgo: 0, consultant: CONSULTANTS[0],
      touchpoints: [
        { stage: 'new', channel: 'portal', direction: 'inbound', summary: 'Bill uploaded via landing page', timestamp: iso(0, 9), actor: 'customer' },
        { stage: 'new', channel: 'email', direction: 'outbound', summary: 'LeadIntakeAgent sent auto-acknowledge', timestamp: iso(0, 9), actor: 'agent' },
      ],
    },
    // 2. INTAKE COMPLETE — small business (commercial · small)
    {
      archetype: 'commercial_small', name: 'Nolan Motors Ltd', address: 'Unit 4, Liosban Business Park, Tuam Road, Galway, H91 K2XR',
      stage: 'intake_complete', daysAgo: 1, consultant: CONSULTANTS[1], source: 'referral',
      touchpoints: [
        { stage: 'new', channel: 'portal', direction: 'inbound', summary: 'Bill uploaded', timestamp: iso(1, 14), actor: 'customer' },
        { stage: 'intake_complete', channel: 'email', direction: 'outbound', summary: 'AI analysis sent — commercial NDMG grant + ex-VAT price', timestamp: iso(1, 14), actor: 'agent' },
      ],
    },
    // 3. SURVEY SCHEDULED — domestic · large + battery
    {
      archetype: 'domestic_large', name: 'Patrick Kelly', address: '5 Foxrock Road, Foxrock, Dublin 18, D18 F5T2',
      stage: 'survey_scheduled', daysAgo: 2, routeDate: 3, consultant: CONSULTANTS[0], installer: INSTALLERS[1],
      surveyDate: isoFuture(2),
      touchpoints: [
        { stage: 'intake_complete', channel: 'email', direction: 'outbound', summary: 'SurveySchedulerAgent booked Tue 10am', timestamp: iso(2, 11), actor: 'agent' },
        { stage: 'survey_scheduled', channel: 'email', direction: 'outbound', summary: 'Survey confirmation emailed — Tue 10am with Liam', timestamp: iso(2, 11), actor: 'agent' },
      ],
    },
    // 4. SURVEY COMPLETE — farm (agri)
    {
      archetype: 'farm', name: 'Brennan Dairy Farm', address: 'Corrandulla, Co. Galway, H91 XR68',
      stage: 'survey_complete', daysAgo: 3, routeDate: 3, consultant: CONSULTANTS[1], installer: INSTALLERS[0],
      touchpoints: [
        { stage: 'survey_complete', channel: 'portal', direction: 'inbound', summary: 'Installer uploaded 8 photos + shed-roof measurements', timestamp: iso(1, 15), actor: 'installer' },
        { stage: 'survey_complete', channel: 'email', direction: 'outbound', summary: 'ProposalDrafter Agent notified consultant', timestamp: iso(1, 15), actor: 'agent' },
      ],
    },
    // 5. PROPOSAL DRAFTED — domestic · large (awaiting review)
    {
      archetype: 'domestic_large', name: 'Sarah McDonald', address: '18 Mulberry Lane, Dundrum, Dublin 16, D16 H9K4',
      stage: 'proposal_drafted', daysAgo: 4, sizeKw: 7.2, consultant: CONSULTANTS[0], installer: INSTALLERS[2],
      touchpoints: [
        { stage: 'proposal_drafted', channel: 'portal', direction: 'outbound', summary: 'Auto-drafted system for consultant review', timestamp: iso(2, 9), actor: 'agent' },
      ],
    },
    // 6. PROPOSAL SENT — large industrial, opening repeatedly (hot)
    {
      archetype: 'commercial_large', name: 'Corrib Logistics', address: 'IDA Business & Technology Park, Athlone, Co. Westmeath, N37 DX59',
      stage: 'proposal_sent', daysAgo: 5, consultant: CONSULTANTS[0], source: 'referral',
      touchpoints: [
        { stage: 'proposal_sent', channel: 'email', direction: 'outbound', summary: 'Proposal link emailed to the finance director', timestamp: iso(3, 11), actor: 'consultant' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (1st time)', timestamp: iso(2, 19), actor: 'customer' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (2nd time)', timestamp: iso(2, 21), actor: 'customer' },
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (3rd time) — forwarded to accountant', timestamp: iso(0, 18), actor: 'customer' },
      ],
    },
    // 7. APPROVED — contract signed (domestic · small)
    {
      archetype: 'domestic_small', name: 'David Walsh', address: '34 Seafield Road, Clontarf, Dublin 3, D03 V2N6',
      stage: 'approved', daysAgo: 6, sizeKw: 4.0, consultant: CONSULTANTS[1],
      touchpoints: [
        { stage: 'proposal_sent', channel: 'portal', direction: 'inbound', summary: 'Customer opened proposal (2nd time)', timestamp: iso(1, 9), actor: 'customer' },
        { stage: 'approved', channel: 'portal', direction: 'inbound', summary: 'Customer signed contract', timestamp: iso(0, 14), actor: 'customer' },
        { stage: 'approved', channel: 'email', direction: 'outbound', summary: 'Invoice auto-created + deposit link emailed', timestamp: iso(0, 14), actor: 'agent' },
        { stage: 'approved', channel: 'email', direction: 'outbound', summary: 'GrantAgent started SEAI application', timestamp: iso(0, 14), actor: 'agent' },
      ],
    },
    // 8. DEPOSIT PAID — farm, install being scheduled
    {
      archetype: 'farm', name: 'O\'Sullivan Agri', address: 'Ballinlough, Co. Roscommon, F42 YH03',
      stage: 'deposit_paid', daysAgo: 7, sizeKw: 12, consultant: CONSULTANTS[0], installer: INSTALLERS[1],
      touchpoints: [
        { stage: 'deposit_paid', channel: 'portal', direction: 'inbound', summary: 'Stripe deposit confirmed', timestamp: iso(1, 12), actor: 'customer' },
        { stage: 'deposit_paid', channel: 'email', direction: 'outbound', summary: 'InstallCoordinator Agent: scheduling the fit', timestamp: iso(1, 12), actor: 'agent' },
      ],
    },
    // 9. INSTALL SCHEDULED — domestic · large
    {
      archetype: 'domestic_large', name: 'Anna Kowalski', address: '27 Ranelagh Village, Ranelagh, Dublin 6, D06 P3Y9',
      stage: 'install_scheduled', daysAgo: 8, routeDate: 3, consultant: CONSULTANTS[1], installer: INSTALLERS[0],
      surveyDate: isoFuture(7),
      touchpoints: [
        { stage: 'install_scheduled', channel: 'email', direction: 'outbound', summary: 'Install confirmed, 8am start', timestamp: iso(1, 15), actor: 'agent' },
        { stage: 'install_scheduled', channel: 'email', direction: 'outbound', summary: 'T-7 reminder: materials ordered, crew confirmed', timestamp: iso(0, 10), actor: 'agent' },
      ],
    },
    // 10. INSTALLING — small business, crew on site
    {
      archetype: 'commercial_small', name: 'Ryan\'s SuperValu', address: 'Main Street, Roscommon Town, Co. Roscommon, F42 AK21',
      stage: 'installing', daysAgo: 9, routeDate: 3, consultant: CONSULTANTS[0], installer: INSTALLERS[2],
      touchpoints: [
        { stage: 'installing', channel: 'portal', direction: 'inbound', summary: 'Installer marked "on site" + uploaded 4 progress photos', timestamp: iso(0, 9), actor: 'installer' },
      ],
    },
    // 11. INSTALLED — domestic · small, awaiting final payment
    {
      archetype: 'domestic_small', name: 'Emma Ryan', address: '6 Silchester Road, Glasnevin, Dublin 11, D11 A7C3',
      stage: 'installed', daysAgo: 10, routeDate: 3, sizeKw: 3.2, consultant: CONSULTANTS[1], installer: INSTALLERS[0],
      touchpoints: [
        { stage: 'installed', channel: 'portal', direction: 'inbound', summary: 'Install checklist 100% complete + final photos', timestamp: iso(1, 16), actor: 'installer' },
        { stage: 'installed', channel: 'email', direction: 'outbound', summary: 'PostInstallAgent: warranty docs + final invoice sent', timestamp: iso(1, 16), actor: 'agent' },
      ],
    },
    // 12. FINAL PAID — large industrial, SEAI paperwork in flight
    {
      archetype: 'commercial_large', name: 'Galway Cold Storage', address: 'Oranmore Business Park, Oranmore, Co. Galway, H91 F8PX',
      stage: 'final_paid', daysAgo: 20, sizeKw: 60, consultant: CONSULTANTS[0], installer: INSTALLERS[2],
      touchpoints: [
        { stage: 'final_paid', channel: 'portal', direction: 'inbound', summary: 'Final payment received', timestamp: iso(3, 14), actor: 'customer' },
        { stage: 'final_paid', channel: 'email', direction: 'outbound', summary: 'GrantAgent: SEAI NDMG paperwork submitted', timestamp: iso(2, 10), actor: 'agent' },
      ],
    },
    // 13. COMPLETED — domestic · large, closed with a review
    {
      archetype: 'domestic_large', name: 'Michael Byrne', address: '31 Rathmines Road Lower, Rathmines, Dublin 6, D06 T4M2',
      stage: 'completed', daysAgo: 30, sizeKw: 6.5, consultant: CONSULTANTS[0], installer: INSTALLERS[1],
      touchpoints: [
        { stage: 'final_paid', channel: 'portal', direction: 'inbound', summary: 'Final payment received', timestamp: iso(7, 14), actor: 'customer' },
        { stage: 'completed', channel: 'email', direction: 'outbound', summary: 'GrantAgent: SEAI paperwork submitted', timestamp: iso(6, 10), actor: 'agent' },
        { stage: 'completed', channel: 'email', direction: 'outbound', summary: 'Handover pack + referral request sent', timestamp: iso(5, 11), actor: 'agent' },
        { stage: 'completed', channel: 'email', direction: 'inbound', summary: 'Customer left 5★ review', timestamp: iso(2, 9), actor: 'customer' },
      ],
    },
  ];

  const SURVEY_STAGES = ['survey_scheduled', 'survey_complete', 'proposal_drafted', 'proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'];
  const SURVEY_DONE_STAGES = SURVEY_STAGES.slice(1);
  const PROPOSAL_STAGES = SURVEY_STAGES.slice(2);
  const CONTRACT_STAGES = SURVEY_STAGES.slice(4);
  const DEPOSIT_STAGES = SURVEY_STAGES.slice(5);
  const ASSIGN_STAGES = SURVEY_STAGES.slice(6);
  const FINAL_STAGES = ['final_paid', 'completed'];

  scenarios.forEach((s, idx) => {
    const a = ARCHETYPES[s.archetype];
    const systemSizeKw = s.sizeKw ?? a.systemSizeKw;
    const panelCount = Math.max(1, Math.round((systemSizeKw * 1000) / panelWatts));
    const isCommercial = a.propertyType === 'commercial';

    // The ONE engine, twice: the pre-survey estimate (no roof/occupancy → flat
    // yield + fallback self-use) and the post-survey quote (roof + occupancy
    // known). Both fork on the archetype's propertyType, so grant + VAT are
    // right at BOTH stages, for every type.
    const rates = ratesFromIntake({
      extracted_unit_rate: a.unitRate,
      extracted_night_rate: a.nightRate,
      extracted_standing_charge: 0.6027,
      extracted_day_night_meter: a.dayNightMeter,
      extracted_provider: a.provider,
    });
    const roof = { orientation: a.roofOrientation, pitchDeg: a.roofPitch, shading: a.shading };
    const occupancy = { occupants: a.occupants, homeDuringDay: a.homeDuringDay };

    const preQuote = computeQuote({
      systemSizeKw, batteryKwh: a.batteryKwh, rates,
      annualUseKwh: a.annualKwh, propertyType: a.propertyType,
    });
    const quote = computeQuote({
      systemSizeKw, batteryKwh: a.batteryKwh, roof, occupancy, rates,
      annualUseKwh: a.annualKwh, propertyType: a.propertyType,
    });

    const periodKwh = Math.round(a.annualKwh / 6); // bi-monthly bill period
    const dayFrac = a.homeDuringDay === 'usually' ? 0.7 : a.homeDuringDay === 'mixed' ? 0.55 : 0.45;

    const lead: DummyLead = {
      id: `lead-${String(idx + 1).padStart(3, '0')}`,
      name: s.name,
      email: isCommercial
        ? 'accounts@' + s.name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.ie'
        : s.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@example.com',
      phone: `+353 8${idx % 8} 1${String(200 + idx).padStart(3, '0')} ${String(4000 + idx).padStart(4, '0')}`,
      address: s.address,
      mprn: makeMprn(idx + 1),
      monthly_bill: a.monthlyBill,
      annual_kwh: a.annualKwh,
      workflow_stage: s.stage,
      status: 'active',
      source: s.source ?? 'bill_upload',
      score: Math.min(99, 50 + (isCommercial ? 15 : 0) + (a.monthlyBill > 300 ? 15 : 0)
        + (s.stage === 'proposal_sent' ? 20 : 0) + (s.stage === 'approved' ? 25 : 0)),
      assigned_consultant: s.consultant,
      assigned_installer: s.installer?.name,
      intake: {
        source: s.source ?? 'bill_upload',
        // THE classification field — what the drafter, the views and compliance read.
        property_type: a.propertyTypeField,
        extracted_monthly_bill: a.monthlyBill,
        extracted_annual_kwh: a.annualKwh,
        extracted_mprn: makeMprn(idx + 1),
        extracted_account_name: s.name,
        extracted_address: s.address,
        extraction_confidence: idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low',
        // The full 21-point bill read (typed in LeadIntake since 1 Aug), so the
        // demo shows what the reader actually pulls, per archetype.
        extracted_provider: a.provider,
        extracted_tariff_name: a.dayNightMeter ? 'Smart Day/Night' : 'Standard 24hr',
        extracted_unit_rate: a.unitRate,
        extracted_night_rate: a.nightRate,
        extracted_standing_charge: 0.6027,
        extracted_standing_charge_unit: 'per day',
        extracted_vat_rate: a.billVatRate,
        extracted_day_night_meter: a.dayNightMeter,
        extracted_billing_period: 'Bi-monthly',
        extracted_billing_period_kwh: periodKwh,
        extracted_eircode: s.address.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0] ?? null,
        extracted_day_usage_kwh: Math.round(periodKwh * dayFrac),
        extracted_night_usage_kwh: Math.round(periodKwh * (1 - dayFrac)),
        extracted_estimated_reading: idx % 5 === 4,
        extracted_notes: idx % 5 === 4 ? 'Reading marked E on the bill; totals may move on next actual read.' : null,
        estimated_system_size_kw: systemSizeKw,
        estimated_annual_savings: preQuote.annualSavings,
        estimated_payback_years: preQuote.paybackYears,
        estimated_20yr_savings: preQuote.twentyYearBenefit,
        solar_offset_pct: preQuote.coveragePct,
      },
      touchpoints: s.touchpoints,
    };

    // Survey — stages at survey_scheduled and beyond.
    if (SURVEY_STAGES.includes(s.stage)) {
      lead.survey = {
        scheduled_date: s.routeDate != null ? isoFuture(s.routeDate) : (s.surveyDate || isoFuture(idx)),
        completed_date: SURVEY_DONE_STAGES.includes(s.stage) ? iso(idx + 1) : undefined,
        surveyor: s.installer?.name || 'Unassigned',
        household_occupants: a.occupants,
        home_during_day: a.homeDuringDay,
        roof_type: a.roofType,
        roof_orientation: a.roofOrientation,
        roof_pitch: a.roofPitch,
        shading: a.shading,
        available_area_m2: Math.round(panelCount * 2.1),
        confirmed_system_size_kw: systemSizeKw,
        confirmed_panel_count: panelCount,
        confirmed_battery_kwh: a.batteryKwh,
        confirmed_inverter_type: a.batteryKwh > 0 ? 'hybrid' : 'string',
        photo_count: 6 + (idx % 4),
      };
    }

    // Proposal — stages at proposal_drafted and beyond. Money = the post-survey
    // quote (correct grant + VAT + battery for THIS type).
    if (PROPOSAL_STAGES.includes(s.stage)) {
      lead.proposal = {
        id: `prop-${String(idx + 1).padStart(3, '0')}`,
        status: s.stage === 'proposal_drafted' ? 'draft' : s.stage === 'proposal_sent' ? 'presented' : 'approved',
        system_size_kw: systemSizeKw,
        panel_count: panelCount,
        panel_model: a.panelModel,
        inverter_model: a.inverterModel,
        battery_model: a.batteryModel,
        gross_cost: quote.grossCost,
        seai_grant: quote.seaiGrant,
        net_cost: quote.netCost,
        annual_savings: quote.annualSavings,
        payback_years: quote.paybackYears,
        twenty_year_savings: quote.twentyYearBenefit,
        sent_date: s.stage !== 'proposal_drafted' ? iso(idx + 1) : undefined,
      };
    }

    // Contract + invoice — stages at approved and beyond.
    if (CONTRACT_STAGES.includes(s.stage)) {
      lead.contract = {
        id: `con-${String(idx + 1).padStart(3, '0')}`,
        signed_date: iso(idx),
        signed_by: s.name,
      };
      const net = lead.proposal!.net_cost;
      const deposit = Math.round(net * 0.3);
      lead.invoice = {
        id: `inv-${String(idx + 1).padStart(3, '0')}`,
        invoice_number: `INV-2026-${String(idx + 1).padStart(3, '0')}`,
        deposit_amount: deposit,
        final_amount: net - deposit,
        deposit_paid: DEPOSIT_STAGES.includes(s.stage),
        final_paid: FINAL_STAGES.includes(s.stage),
        deposit_paid_date: DEPOSIT_STAGES.includes(s.stage) ? iso(Math.max(0, idx - 1)) : undefined,
        final_paid_date: FINAL_STAGES.includes(s.stage) ? iso(Math.max(0, idx - 5)) : undefined,
      };
    }

    // Installer assignment — stages at install_scheduled and beyond.
    if (ASSIGN_STAGES.includes(s.stage) && s.installer) {
      lead.assignment = {
        id: `asg-${String(idx + 1).padStart(3, '0')}`,
        installer_id: s.installer.id,
        installer_name: s.installer.name,
        status: ['installed', 'final_paid', 'completed'].includes(s.stage) ? 'completed' : 'accepted',
        scheduled_date: s.routeDate != null ? isoFuture(s.routeDate) : (s.surveyDate || isoFuture(Math.max(1, idx - 2))),
        completed_date: ['installed', 'final_paid', 'completed'].includes(s.stage) ? iso(Math.max(1, idx - 3)) : undefined,
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
