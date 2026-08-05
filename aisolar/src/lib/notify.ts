/**
 * notify — THE outbound spine (Sprint 2D). One call → the bell (notifications
 * table) + a branded email with the portal link always in. Replaces the scattered
 * "queued — goes out with your approval" toasts that never actually sent.
 *
 * Laws (ONBOARDING_SPEC / SAAS_MAP):
 *  - BOTH-ENDS (L1): every customer-facing event notifies the customer (email +
 *    portal link) AND the tenant staff (bell). `bothEnds` defaults on when there's
 *    a lead.
 *  - The bell is the guaranteed rail (a DB row the UI reads); email is layered on
 *    top via the send-notification edge fn (Postmark), best-effort, never blocks.
 *  - Truth-pass: draft-gated. The human approves in the UI; THEN notify() fires the
 *    real send. notify() never auto-sends on its own.
 *  - Demo-safe: no session (demo / signed-out) → no-op, so the demo never writes
 *    rows or emails. Verifies for real signed-in, per tenant (RLS-scoped).
 *  - Fire-and-forget: a failed send never blocks the human flow; it logs + returns
 *    an honest result.
 */
import { supabase } from '@/integrations/supabase/client';

export type NotifyEventType =
  | 'proposal_sent'
  | 'deposit_link'
  | 'photo_request'
  | 'reschedule'
  | 'handover_pack'
  | 'referral'
  | 'team_invite'
  | 'stage_change'
  | 'callback_request'
  | 'seai_offer_reminder'   // the parked SEAI 8-month clock nudge rides this
  | 'seai_ber_overdue';     // and the BER-overdue chase

export interface NotifyEvent {
  type: NotifyEventType;
  /** The lead this concerns. Drives both-ends recipient resolution + the portal link. */
  leadId?: string;
  /** Bell title (staff-facing) + email subject when no explicit subject. */
  title: string;
  /** Body — bell message + email text. Keep it human. */
  message: string;
  /** Explicit customer email (team_invite has no lead — pass the invitee's email). */
  email?: string | null;
  /** The path the portal link should deep-link to (always appended for the reader). */
  portalPath?: string;
  /** Notify BOTH the customer (email) and staff (bell). Default: true when leadId set. */
  bothEnds?: boolean;
  /** Extra structured data carried on the bell + email metadata. */
  metadata?: Record<string, unknown>;
}

export interface NotifyResult { ok: boolean; bell: boolean; email: boolean; reason?: string; }

async function currentUserId(): Promise<string | null> {
  try { return (await supabase.auth.getUser()).data.user?.id ?? null; } catch { return null; }
}

/** Staff user ids to bell for a lead: everyone in the lead's tenant with a staff
 *  role. Falls back to the current user when the lead can't be resolved. */
async function staffRecipients(leadId?: string, fallback?: string | null): Promise<string[]> {
  if (!leadId) return fallback ? [fallback] : [];
  try {
    const { data: lead } = await supabase.from('leads').select('tenant_id').eq('id', leadId).maybeSingle();
    if (lead?.tenant_id) {
      const { data: staff } = await supabase
        .from('user_roles').select('user_id')
        .eq('tenant_id', lead.tenant_id).in('role', ['admin', 'consultant', 'installer', 'owner']);
      const ids = Array.from(new Set((staff ?? []).map(r => r.user_id as string)));
      if (ids.length) return ids;
    }
  } catch (e) { console.warn('[notify] staffRecipients', e); }
  return fallback ? [fallback] : [];
}

/**
 * Fire an outbound event. Writes the bell (both-ends staff) and — when there's a
 * customer email + a lead — the branded email via the edge fn. Returns what landed.
 */
export async function notify(e: NotifyEvent): Promise<NotifyResult> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, bell: false, email: false, reason: 'demo' }; // demo / signed-out → no-op

  const both = e.bothEnds ?? !!e.leadId;
  let bell = false, email = false;

  // 1. THE BELL — the guaranteed rail. One row per staff recipient.
  try {
    const recips = await staffRecipients(e.leadId, uid);
    if (recips.length) {
      const rows = recips.map(user_id => ({
        user_id, lead_id: e.leadId ?? null, type: e.type, title: e.title, message: e.message,
        metadata: { ...(e.metadata ?? {}), ...(e.portalPath ? { portalPath: e.portalPath } : {}) },
        read: false,
      }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) console.warn('[notify] bell', error.message); else bell = true;
    }
  } catch (err) { console.warn('[notify] bell threw', err); }

  // 2. THE EMAIL — branded, portal link in, best-effort. Customer-facing events only.
  if (both && (e.email || e.leadId)) {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { type: e.type, leadId: e.leadId ?? null, to: e.email ?? null,
                subject: e.title, message: e.message, portalPath: e.portalPath ?? null,
                metadata: e.metadata ?? {} },
      });
      if (error) console.warn('[notify] email', error.message); else email = true;
    } catch (err) { console.warn('[notify] email threw', err); }
  }

  return { ok: bell || email, bell, email };
}
