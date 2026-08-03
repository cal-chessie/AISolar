/**
 * leadWrites — the write path. Persists workbench actions to the V5 DB:
 * create / update a lead, advance its stage, log a touchpoint. An insert is
 * auto-routed (the route-lead trigger → aigrids.route_lead, recorded via
 * gate_bridge) — the UI just creates the lead.
 *
 * RLS (verified live on V5, 1–2 Aug): leads is TENANT-SCOPED — 4 policies on
 * has_tenant_access(auth.uid(), tenant_id), customer read via x-access-token.
 * (An earlier note here claimed authenticated-any; that was the pre-floor
 * calchessie state — closed by 20260731_tenant_rls_floor.)
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveTenantId } from './serverStore';
import type { DummyLead } from './dummyData';

/** 64-char hex token for the customer magic-link (`leads.access_token`). */
function token64(): string {
  const hex = () => (crypto.randomUUID?.() ?? '').replace(/-/g, '');
  return (hex() + hex()).slice(0, 64);
}

/** Resolve the signed-in user's tenant (leads.tenant_id is NOT NULL).
 *  Delegates to serverStore's resolveTenantId — ONE ladder for the whole app
 *  (profiles → user_roles real-tenant row → JWT claim), cached per user. */
export async function getCurrentTenantId(): Promise<string | null> {
  return resolveTenantId();
}

export interface NewLeadInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  eircode?: string;
  monthly_bill?: number;
  annual_kwh?: number;
  mprn?: string;
}

/** Insert a real lead (auto-routed + kernel-bridged by DB triggers). Returns its id. */
export async function createLead(input: NewLeadInput): Promise<string> {
  const tenant_id = await getCurrentTenantId();
  if (!tenant_id) throw new Error('createLead: no tenant for the current user');
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      eircode: input.eircode ?? null,
      monthly_bill: input.monthly_bill ?? null,
      annual_consumption_kwh: input.annual_kwh ?? null,
      mprn: input.mprn ?? null,
      tenant_id,
      access_token: token64(),
      source: 'manual',
      workflow_stage: 'new',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Patch a lead's core fields (DummyLead field names → real columns). */
export async function updateLead(
  id: string,
  patch: Partial<Pick<DummyLead, 'name' | 'email' | 'phone' | 'address' | 'monthly_bill' | 'annual_kwh' | 'mprn'>> & { eircode?: string },
): Promise<void> {
  const db: Record<string, unknown> = {};
  if (patch.name !== undefined) db.name = patch.name;
  if (patch.email !== undefined) db.email = patch.email;
  if (patch.phone !== undefined) db.phone = patch.phone;
  if (patch.address !== undefined) db.address = patch.address;
  if (patch.eircode !== undefined) db.eircode = patch.eircode;
  if (patch.monthly_bill !== undefined) db.monthly_bill = patch.monthly_bill;
  if (patch.annual_kwh !== undefined) db.annual_consumption_kwh = patch.annual_kwh;
  if (patch.mprn !== undefined) db.mprn = patch.mprn;
  if (Object.keys(db).length === 0) return;
  const { error } = await supabase.from('leads').update(db).eq('id', id);
  if (error) throw error;
}

/** Move a lead to a new pipeline stage. */
export async function advanceLeadStage(id: string, stage: string): Promise<void> {
  const { error } = await supabase.from('leads').update({ workflow_stage: stage }).eq('id', id);
  if (error) throw error;
}

/** Log an outbound touchpoint against a lead (notifications = the comms log). */
export async function addTouchpoint(leadId: string, message: string, title = 'Reply sent'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenant_id = await getCurrentTenantId();
  const { error } = await supabase.from('notifications').insert({
    lead_id: leadId,
    user_id: user?.id ?? null,
    tenant_id,
    type: 'reply',
    title,
    message,
    read: false,
  });
  if (error) throw error;
}
