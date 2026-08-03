/**
 * realLeads — the live data layer.
 *
 * Fetches real leads from Supabase (tenant-scoped by RLS) plus their child
 * records (surveys, proposals, contracts, invoices, assignments, notifications)
 * and assembles them into the exact `DummyLead` shape the workbench UI already
 * consumes. We feed the real data through the existing UI — no rewrite.
 *
 * Demo mode (dev + explicit opt-in) still returns generateDummyLeads() so the
 * app can be demoed on fabricated data; production always shows real data.
 */
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { generateDummyLeads, type DummyLead } from './dummyData';
import { isDemoMode } from './demoMode';

type Row = Record<string, any>;

function groupBy(rows: Row[] | null | undefined, key = 'lead_id'): Record<string, Row[]> {
  const m: Record<string, Row[]> = {};
  (rows || []).forEach((r) => {
    const k = r[key];
    if (k) (m[k] ||= []).push(r);
  });
  return m;
}

function mapSource(s: string | null): DummyLead['source'] {
  const v = (s || '').toLowerCase();
  if (/bill|estimate|upload|calculator|modal/.test(v)) return 'bill_upload';
  if (/refer/.test(v)) return 'referral';
  return 'manual';
}

function mapProposalStatus(s: string | null): NonNullable<DummyLead['proposal']>['status'] {
  const v = (s || '').toLowerCase();
  if (/approve/.test(v)) return 'approved';
  if (/reject|declin/.test(v)) return 'rejected';
  if (/present|sent/.test(v)) return 'presented';
  return 'draft';
}

function mapAssignmentStatus(s: string | null): NonNullable<DummyLead['assignment']>['status'] {
  const v = (s || '').toLowerCase();
  if (/accept/.test(v)) return 'accepted';
  if (/declin|reject/.test(v)) return 'declined';
  if (/complete|done/.test(v)) return 'completed';
  return 'pending';
}

interface Related {
  surveys: Row[];
  proposals: Row[];
  contracts: Row[];
  invoices: Row[];
  assignments: Row[];
  notifs: Row[];
}

function mapRow(l: Row, rel: Related, installerNames: Record<string, string>): DummyLead {
  const survey = rel.surveys[0];
  const proposal = rel.proposals[0];
  const contract = rel.contracts[0];
  const invoice = rel.invoices[0];
  const assignment = rel.assignments[0];

  const touchpoints = (rel.notifs || [])
    .map((n): DummyLead['touchpoints'][number] => ({
      id: n.id,
      stage: l.workflow_stage || 'new',
      channel: 'portal',
      direction: 'outbound',
      summary: n.message || n.title || n.type || '',
      timestamp: n.created_at,
      actor: 'system',
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    id: l.id,
    name: l.name || 'Unnamed lead',
    email: l.email || '',
    phone: l.phone || '',
    address: l.address || '',
    mprn: l.mprn || '',
    access_token: l.access_token || undefined,
    monthly_bill: Number(l.monthly_bill) || 0,
    annual_kwh: Number(l.annual_consumption_kwh) || 0,
    workflow_stage: l.workflow_stage || 'new',
    status: l.workflow_stage || 'new',
    source: mapSource(l.source),
    score: Number(l.score) || 0,
    assigned_consultant: '',
    assigned_installer: assignment ? installerNames[assignment.installer_id] : undefined,
    // Surface the lead's own eircode/mprn as intake fields so every reader
    // (roof geocode, estimate, NC6 §2) sees them before any bill read.
    intake: { extracted_eircode: l.eircode ?? null, extracted_mprn: l.mprn ?? null },
    survey: survey
      ? {
          scheduled_date: survey.survey_date || survey.created_at || '',
          completed_date: survey.completed_at || undefined,
          surveyor: survey.surveyor_id || '',
          roof_type: survey.roof_type || '',
          roof_orientation: survey.roof_orientation || '',
          roof_pitch: Number(survey.roof_pitch) || 0,
          shading: survey.shading_analysis || '',
          available_area_m2: 0,
          confirmed_system_size_kw: Number(survey.recommended_system_size) || 0,
          confirmed_panel_count: Number(survey.recommended_panel_count) || 0,
          confirmed_battery_kwh: 0,
          confirmed_inverter_type: '',
          photo_count: 0,
        }
      : undefined,
    proposal: proposal
      ? {
          id: proposal.id,
          status: mapProposalStatus(proposal.status),
          system_size_kw: Number(proposal.system_size_kw) || 0,
          panel_count: Number(proposal.panel_count) || 0,
          panel_model: proposal.panel_type || '',
          inverter_model: proposal.inverter_type || '',
          battery_model: proposal.battery_storage ? `${proposal.battery_capacity_kwh || ''}kWh`.trim() : null,
          gross_cost: Number(proposal.system_cost) || 0,
          seai_grant: Number(proposal.seai_grant) || 0,
          net_cost: Number(proposal.net_cost) || 0,
          annual_savings: Number(proposal.monthly_savings) ? Number(proposal.monthly_savings) * 12 : 0,
          payback_years: Number(proposal.payback_period_years) || 0,
          twenty_year_savings: Number(proposal.lifetime_savings) || 0,
          sent_date: proposal.presented_at || undefined,
        }
      : undefined,
    contract: contract
      ? { id: contract.id, signed_date: contract.signed_at || '', signed_by: contract.signed_by_name || '' }
      : undefined,
    invoice: invoice
      ? {
          id: invoice.id,
          invoice_number: invoice.invoice_number || '',
          deposit_amount: Number(invoice.deposit_amount) || 0,
          final_amount: Number(invoice.final_amount) || 0,
          deposit_paid: !!invoice.deposit_paid,
          final_paid: !!invoice.final_paid,
          deposit_paid_date: invoice.deposit_paid_at || undefined,
          final_paid_date: invoice.final_paid_at || undefined,
        }
      : undefined,
    assignment: assignment
      ? {
          id: assignment.id,
          installer_id: assignment.installer_id || '',
          installer_name: installerNames[assignment.installer_id] || '',
          status: mapAssignmentStatus(assignment.status),
          scheduled_date: assignment.scheduled_date || '',
          completed_date: assignment.completed_date || undefined,
        }
      : undefined,
    touchpoints,
  };
}

/** Fetch all real leads (RLS scopes them to the caller's tenant) + children. */
export async function fetchRealLeads(): Promise<DummyLead[]> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!leads || leads.length === 0) return [];

  const ids = leads.map((l) => l.id);
  const [surveys, proposals, contracts, invoices, assignments, notifs, installers] = await Promise.all([
    supabase.from('site_surveys').select('*').in('lead_id', ids),
    supabase.from('proposals').select('*').in('lead_id', ids),
    supabase.from('contracts').select('*').in('lead_id', ids),
    supabase.from('invoices').select('*').in('lead_id', ids),
    supabase.from('assignments').select('*').in('lead_id', ids),
    supabase.from('notifications').select('*').in('lead_id', ids),
    supabase.from('installers').select('*'),
  ]);

  const gS = groupBy(surveys.data), gP = groupBy(proposals.data), gC = groupBy(contracts.data);
  const gI = groupBy(invoices.data), gA = groupBy(assignments.data), gN = groupBy(notifs.data);

  const installerNames: Record<string, string> = {};
  (installers.data || []).forEach((i: Row) => {
    installerNames[i.id] = i.business_name || i.company_name || i.name || i.contact_name || '';
  });

  return leads.map((l) =>
    mapRow(
      l,
      {
        surveys: gS[l.id] || [],
        proposals: gP[l.id] || [],
        contracts: gC[l.id] || [],
        invoices: gI[l.id] || [],
        assignments: gA[l.id] || [],
        notifs: gN[l.id] || [],
      },
      installerNames,
    ),
  );
}

/** Fetch a single lead by id (RLS-scoped) with its children. */
export async function fetchRealLead(id: string): Promise<DummyLead | null> {
  const all = await fetchRealLeads();
  return all.find((l) => l.id === id) || null;
}

/**
 * fetchLeadByToken — the CUSTOMER magic-link read (P0, /customer/:token).
 *
 * No session: a dedicated client carries the lead's 64-char access_token as the
 * `x-access-token` header, and the V5 security floor does the rest — leads_sel
 * and every child's can_see_lead() admit exactly THIS lead's rows, nothing else
 * (verified live: the token clause is in the policies). The customer IS the
 * token; a wrong/revoked token reads zero rows and we return null — the route
 * shows the honest "link not active" state, never a blank screen.
 * Same mapRow as staff → the portal renders the identical shape.
 */
export async function fetchLeadByToken(token: string): Promise<DummyLead | null> {
  if (!/^[a-f0-9]{40,64}$/i.test(token || '')) return null; // shape guard — junk never hits the network
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return null;
  const client = createClient(url, key, {
    global: { headers: { 'x-access-token': token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: l } = await client.from('leads').select('*').eq('access_token', token).maybeSingle();
  if (!l) return null;
  const [surveys, proposals, contracts, invoices, assignments, notifs] = await Promise.all([
    client.from('site_surveys').select('*').eq('lead_id', l.id),
    client.from('proposals').select('*').eq('lead_id', l.id),
    client.from('contracts').select('*').eq('lead_id', l.id),
    client.from('invoices').select('*').eq('lead_id', l.id),
    client.from('assignments').select('*').eq('lead_id', l.id),
    client.from('notifications').select('*').eq('lead_id', l.id),
  ]);
  // installers is staff-only by policy — the customer view degrades gracefully
  // (assignment carries what the portal shows). Empty name map by design.
  return mapRow(
    l as Row,
    {
      surveys: surveys.data || [],
      proposals: proposals.data || [],
      contracts: contracts.data || [],
      invoices: invoices.data || [],
      assignments: assignments.data || [],
      notifs: notifs.data || [],
    },
    {},
  );
}

/**
 * useLead — real single-lead loader for LeadFlow / JobViewV2, which initialise
 * synchronously from one lead. Returns { lead, setLead, loading }; a loader
 * wrapper guards on `loading` so the inner view still gets a non-null lead.
 */
export function useLead(id: string | undefined) {
  const [lead, setLead] = useState<DummyLead | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (isDemoMode()) {
          const demo = generateDummyLeads();
          const found = id ? demo.find((l) => l.id === id) : undefined;
          if (alive) setLead(found || demo.find((l) => l.proposal) || demo[0] || null);
        } else if (id) {
          const l = await fetchRealLead(id);
          if (alive) setLead(l);
        } else if (alive) {
          setLead(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);
  return { lead, setLead, loading };
}

/**
 * useLeads — drop-in replacement for `useState(() => generateDummyLeads())`.
 * Returns real, tenant-scoped leads (or demo data when demo mode is on).
 */
export function useLeads() {
  const [leads, setLeads] = useState<DummyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        setLeads(generateDummyLeads());
      } else {
        setLeads(await fetchRealLeads());
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { leads, setLeads, loading, error, refetch };
}
