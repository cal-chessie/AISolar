/**
 * leadCapture — the front door's only route into the pipeline.
 *
 * Every public capture point (the /start estimate, the callback request, the
 * embeddable widget) goes through here, so there is ONE place that knows how a
 * lead is created and one place to change when the backend lands.
 *
 * ── HONEST STATE ─────────────────────────────────────────────────────────────
 * This calls the deployed `ingest-lead` edge function. Until that function is
 * deployed (coxmtpnq / GATE 0) the call FAILS, and it is designed to fail
 * LOUDLY — the caller shows a real error and offers the phone number instead.
 * It must never pretend to have captured a lead it didn't; a customer who
 * thinks they're on a list and isn't is worse than an honest failure.
 *
 * ── SECURITY (decided 31 Jul — per-door source keys) ─────────────────────────
 * The shared secret (`x-ingest-key`) is server-only; it can't ship to the browser.
 * RESOLVED: each brand has a per-door `source_key` in `public.sources`
 * (`20260731_lead_doors.sql`). It is SAFE in the client embed — a leaked door key
 * can only INJECT leads into its own brand, never read, never cross a tenant, and
 * it's revocable (`sources.active=false`). The embed carries `?k=<source_key>`; we
 * send it as `x-source-key`; `ingest-lead` resolves brand + tenant off the key and
 * stamps `origin_brand_id`. No secret in the client, and no lead misfiled.
 */
import { supabase } from '@/integrations/supabase/client';

export type LeadSource =
  | 'website_estimate'   // finished the /start estimate
  | 'website_callback'   // asked a consultant to call
  | 'website_contact';   // generic

export interface LeadCapture {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  /** Free text shown to the consultant — what the customer was looking at. */
  message?: string;
  /** The estimate + roof, so the consultant opens with their numbers. */
  meta?: Record<string, unknown>;
}

export interface LeadResult {
  ok: boolean;
  /** Present when ok — the pipeline's id for this lead. */
  leadId?: string;
  /** Present when !ok — safe to show the customer. */
  error?: string;
}

/**
 * The door key that scopes this capture to a brand + tenant. Read from the embed
 * URL (`?k=` / `?key=` / `?source_key=`) — the tenant pastes it into their embed.
 * A caller may also pass one explicitly. Null → the capture fails loud (no
 * anon-safe auth), which is correct: an honest error beats a lost lead.
 */
function currentSourceKey(): string | null {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('k') || p.get('key') || p.get('source_key') || null;
  } catch {
    return null;
  }
}

export async function captureLead(
  input: LeadCapture & { sourceKey?: string },
): Promise<LeadResult> {
  // Mirror the function's own rule so we fail fast with a useful message.
  if (!input.name.trim() || (!input.email?.trim() && !input.phone?.trim())) {
    return { ok: false, error: 'We need your name and either an email or a phone number.' };
  }

  const sourceKey = input.sourceKey ?? currentSourceKey();

  try {
    const { data, error } = await supabase.functions.invoke('ingest-lead', {
      // x-source-key resolves brand + tenant + origin_brand_id server-side.
      ...(sourceKey ? { headers: { 'x-source-key': sourceKey } } : {}),
      body: {
        source: input.source,
        name: input.name.trim(),
        email: input.email?.trim() ?? '',
        phone: input.phone?.trim() ?? '',
        message: input.message ?? '',
        meta: input.meta ?? null,
      },
    });

    if (error) {
      // Deployment/auth failures land here. Say so plainly — never swallow it.
      console.error('[leadCapture] ingest-lead failed', error);
      return { ok: false, error: "We couldn't save your details just now." };
    }

    return { ok: true, leadId: (data as { leadId?: string } | null)?.leadId };
  } catch (e) {
    console.error('[leadCapture] ingest-lead threw', e);
    return { ok: false, error: "We couldn't reach our system just now." };
  }
}
