/**
 * seaiGrant — the SEAI Domestic Solar PV grant LIFECYCLE, from grant offer to
 * payment. This is the spine every grant surface reads: the customer card, the
 * owner tracker, the DoW/BER steps, the notifications all hang off it.
 *
 * SEAI has NO API — every submission is a manual portal action. So AISolar does
 * not integrate; it ORCHESTRATES the two humans (customer + owner) through
 * SEAI's own steps and generates the paperwork. See docs/SEAI_GRANT_WORKFLOW.md
 * for the verified real-world flow (seai.ie, Aug 2026).
 *
 * Laws it holds (same discipline as the ESB paper trail):
 *  - Truth-pass: a stage only advances on a real PROOF (offer ref, BER cert,
 *    signed DoW, SEAI claim ref, payment) — never optimistically.
 *  - The 8-month clock: works must NOT start before the grant offer, and the
 *    offer expires 8 months after it's received. The model exposes both.
 *  - The grant is NET to the customer: SEAI pays the homeowner directly (their
 *    bank details, submitted on the SEAI portal) — the owner does not discount
 *    and reclaim. Copy everywhere reflects that.
 *  - Demo-safe: localStorage per lead (like fieldRecord); a DB dual-write lands
 *    only when authed, so the demo never fabricates rows.
 */

export type SeaiGrantStage =
  | 'offer_applied'    // customer applied for the grant offer on the SEAI portal
  | 'offer_received'   // grant offer in hand — the 8-month clock starts; safe to install
  | 'installed'        // system installed + commissioned
  | 'docs_shared'      // DoW draft + data sheets prepared and shared to the customer (pre-handover, for the BER assessor)
  | 'ber_booked'       // customer booked the post-works BER
  | 'ber_published'    // post-works BER published by the assessor
  | 'dow_submitted'    // registered installer signed the DoW + submitted the evidence + BER to SEAI
  | 'paid';            // SEAI paid the grant to the customer's bank

export type SeaiGrantStatus = 'not_started' | SeaiGrantStage | 'ineligible' | 'offer_expired';

export type GrantActor = 'customer' | 'owner' | 'installer' | 'seai';

export interface GrantStageSpec {
  id: SeaiGrantStage;
  order: number;
  label: string;
  /** Who performs the action that COMPLETES this stage. */
  actor: GrantActor;
  /** The one next action to prompt while the grant sits at the previous stage. */
  action: string;
  /** The proof that counts as done — what advances the stage. */
  doneMeans: string;
}

/** The eight stages, in order. Ordering matches Cal's build + the real SEAI flow:
 *  offer → install → DoW & data sheets (for the BER assessor) → BER → submit → paid. */
export const GRANT_STAGES: GrantStageSpec[] = [
  { id: 'offer_applied',  order: 1, label: 'Grant offer applied',   actor: 'customer',
    action: 'Customer applies for the SEAI grant offer, naming us as their registered company',
    doneMeans: 'Grant application submitted on the SEAI portal' },
  { id: 'offer_received', order: 2, label: 'Grant offer received',  actor: 'customer',
    action: 'Confirm the grant offer has arrived — do NOT install before this (8-month clock starts)',
    doneMeans: 'Grant offer reference + expiry recorded' },
  { id: 'installed',      order: 3, label: 'Installed',             actor: 'owner',
    action: 'Install & commission the system',
    doneMeans: 'Commissioning gate confirmed' },
  { id: 'docs_shared',    order: 4, label: 'DoW & data sheets shared', actor: 'owner',
    action: 'Prepare the Declaration of Works + data sheets and share them to the customer for their BER assessor',
    doneMeans: 'DoW + data sheets on the customer portal' },
  { id: 'ber_booked',     order: 5, label: 'BER booked',            actor: 'customer',
    action: 'Customer books the post-works BER (hands the assessor the DoW + data sheets)',
    doneMeans: 'BER assessor + appointment recorded' },
  { id: 'ber_published',  order: 6, label: 'BER published',         actor: 'customer',
    action: 'Post-works BER completed & published by the assessor',
    doneMeans: 'BER cert number + rating recorded' },
  { id: 'dow_submitted',  order: 7, label: 'DoW submitted to SEAI', actor: 'installer',
    action: 'Registered installer signs the DoW and submits the evidence + BER to SEAI',
    doneMeans: 'Signed DoW + SEAI claim reference' },
  { id: 'paid',           order: 8, label: 'Grant paid',            actor: 'seai',
    action: 'SEAI pays the grant to the customer’s bank (their details on the SEAI portal)',
    doneMeans: 'Grant payment confirmed' },
];

export const GRANT_OFFER_VALID_MONTHS = 8;

export interface SeaiGrantRecord {
  status: SeaiGrantStatus;
  /** Proofs captured along the way — each gates a stage; NULL until real. */
  offerAppliedAt?: string;
  offerRef?: string;
  offerReceivedAt?: string;   // start of the 8-month clock
  offerExpiresAt?: string;    // offerReceivedAt + 8 months
  installedAt?: string;
  docsSharedAt?: string;
  berAssessor?: string;
  berBookedFor?: string;
  berRating?: string;
  berCertNo?: string;
  berPublishedAt?: string;
  dowSignedBy?: string;
  dowSignedAt?: string;
  seaiClaimRef?: string;
  paidAt?: string;
  /** Grant amount as offered/expected (from calculateSEAI), for display only. */
  grantAmount?: number;
  updatedAt?: string;
}

const DEFAULT_GRANT: SeaiGrantRecord = { status: 'not_started' };

const key = (leadId: string) => `aisolar_seai_grant_${leadId}`;

export function getGrant(leadId: string): SeaiGrantRecord {
  try {
    const raw = localStorage.getItem(key(leadId));
    return raw ? { ...DEFAULT_GRANT, ...JSON.parse(raw) } : DEFAULT_GRANT;
  } catch {
    return DEFAULT_GRANT;
  }
}

export function saveGrant(leadId: string, patch: Partial<SeaiGrantRecord>): SeaiGrantRecord {
  const next = { ...getGrant(leadId), ...patch, updatedAt: new Date().toISOString() };
  // Derive the 8-month expiry whenever the offer-received date is set.
  if (next.offerReceivedAt && !next.offerExpiresAt) {
    const d = new Date(next.offerReceivedAt);
    d.setMonth(d.getMonth() + GRANT_OFFER_VALID_MONTHS);
    next.offerExpiresAt = d.toISOString();
  }
  try { localStorage.setItem(key(leadId), JSON.stringify(next)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('seai-grant-changed', { detail: { leadId } }));
  void recordGrantRemote(leadId, next); // dual-write when authed (no-op in demo)
  return next;
}

/** The stage the grant is currently AT (the highest reached), or null before start. */
export function currentStage(rec: SeaiGrantRecord): GrantStageSpec | null {
  if (rec.status === 'not_started' || rec.status === 'ineligible') return null;
  if (rec.status === 'offer_expired') return GRANT_STAGES[1]; // sits at offer_received
  return GRANT_STAGES.find(s => s.id === rec.status) ?? null;
}

/** The NEXT action to prompt — the spec of the stage after the current one. */
export function nextStage(rec: SeaiGrantRecord): GrantStageSpec | null {
  if (rec.status === 'ineligible') return null;
  if (rec.status === 'not_started') return GRANT_STAGES[0];
  const cur = GRANT_STAGES.find(s => s.id === rec.status);
  if (!cur) return GRANT_STAGES[0];
  return GRANT_STAGES.find(s => s.order === cur.order + 1) ?? null; // null = paid (done)
}

/** 0–100 progress across the eight stages. */
export function grantProgress(rec: SeaiGrantRecord): number {
  const cur = currentStage(rec);
  if (!cur) return rec.status === 'paid' ? 100 : 0;
  return Math.round((cur.order / GRANT_STAGES.length) * 100);
}

/** The offer's 8-month clock — expired when past expiry and not yet submitted. */
export function offerClock(rec: SeaiGrantRecord): { expiresAt?: string; daysLeft?: number; expired: boolean } {
  if (!rec.offerExpiresAt) return { expired: false };
  const ms = new Date(rec.offerExpiresAt).getTime() - Date.now();
  const daysLeft = Math.ceil(ms / 86_400_000);
  const submitted = GRANT_STAGES.find(s => s.id === rec.status)?.order ?? 0;
  const dowOrder = GRANT_STAGES.find(s => s.id === 'dow_submitted')!.order;
  return { expiresAt: rec.offerExpiresAt, daysLeft, expired: daysLeft < 0 && submitted < dowOrder };
}

/** Advance to a specific stage with its proof patch (the one write the UI calls). */
export function advanceGrant(leadId: string, to: SeaiGrantStage, proof: Partial<SeaiGrantRecord> = {}): SeaiGrantRecord {
  return saveGrant(leadId, { status: to, ...proof });
}

/** React hook — re-renders when this lead's grant changes here or in another tab. */
import { useEffect, useState } from 'react';
export function useGrant(leadId: string): SeaiGrantRecord {
  const [rec, setRec] = useState<SeaiGrantRecord>(() => getGrant(leadId));
  useEffect(() => {
    const update = (e: Event) => {
      if ((e as CustomEvent).detail?.leadId && (e as CustomEvent).detail.leadId !== leadId) return;
      setRec(getGrant(leadId));
    };
    window.addEventListener('seai-grant-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('seai-grant-changed', update);
      window.removeEventListener('storage', update);
    };
  }, [leadId]);
  return rec;
}

/** Dual-write to the seai_grants table when authed. No-op in the demo, never
 *  blocks the UI (fire-and-forget), matching the ESB paper-trail discipline. */
async function recordGrantRemote(leadId: string, rec: SeaiGrantRecord): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    if (!(await supabase.auth.getSession()).data.session) return; // demo / signed-out
    const { error } = await supabase.from('seai_grants').upsert(
      { lead_id: leadId, status: rec.status, data: rec, updated_at: new Date().toISOString() },
      { onConflict: 'lead_id' },
    );
    if (error) console.warn('[seaiGrant] recordGrantRemote', error.message);
  } catch (e) { console.warn('[seaiGrant] recordGrantRemote threw', e); }
}
