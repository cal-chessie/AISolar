/**
 * leadWrites — the write path. Persists workbench actions to calchessie:
 * create / update a lead, advance its stage, log a touchpoint. An insert is
 * auto-routed (the `route-lead-on-insert` trigger → kernel.transfer_lead) and
 * bridged to the kernel by DB triggers — the UI just creates the lead.
 *
 * NOTE (tracked in the RLS task): leads RLS is currently
 * `auth.role() = 'authenticated'` — NOT tenant-scoped — so any signed-in user
 * can read/write any lead. Per-tenant isolation is tightened before go-live.
 */
import { supabase } from '@/integrations/supabase/client';
import type { DummyLead } from './dummyData';

/** 64-char hex token for the customer magic-link (`leads.access_token`). */
function token64(): string {
  const hex = () => (crypto.randomUUID?.() ?? '').replace(/-/g, '');
  return (hex() + hex()).slice(0, 64);
}

/** Resolve the signed-in user's tenant (leads.tenant_id is NOT NULL). */
export async function getCurrentTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const prof = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (prof.data?.tenant_id) return prof.data.tenant_id as string;
  const role = await supabase.from('user_roles').select('tenant_id').eq('user_id', user.id).limit(1).maybeSingle();
  return (role.data?.tenant_id as string) ?? null;
}

export interface NewLeadInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
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
  patch: Partial<Pick<DummyLead, 'name' | 'email' | 'phone' | 'address' | 'monthly_bill' | 'annual_kwh' | 'mprn'>>,
): Promise<void> {
  const db: Record<string, unknown> = {};
  if (patch.name !== undefined) db.name = patch.name;
  if (patch.email !== undefined) db.email = patch.email;
  if (patch.phone !== undefined) db.phone = patch.phone;
  if (patch.address !== undefined) db.address = patch.address;
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
