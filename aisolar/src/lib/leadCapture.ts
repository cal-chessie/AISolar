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
 * ── SECURITY NOTE (needs a decision before launch) ───────────────────────────
 * `ingest-lead` authenticates callers with a shared secret (`x-ingest-key`).
 * That model is right for SERVER-to-server callers — Cal's other websites
 * posting from their backend. It is NOT usable from the browser: anything we
 * ship to the client is public, so we cannot put INGEST_API_KEY in this file.
 *
 * So this uses `supabase.functions.invoke`, which sends the project's anon key.
 * For that to work, ingest-lead needs ONE of:
 *   (a) an anon-callable path for first-party captures (verify the JWT is our
 *       own anon key, keep the shared-secret path for external sites), or
 *   (b) a thin public sibling function that rate-limits by IP and forwards
 *       server-side with the secret.
 * (b) is the safer default. Either way it's a backend decision, not something
 * to paper over from the client.
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

const BRAND = 'aisolar';

export async function captureLead(input: LeadCapture): Promise<LeadResult> {
  // Mirror the function's own rule so we fail fast with a useful message.
  if (!input.name.trim() || (!input.email?.trim() && !input.phone?.trim())) {
    return { ok: false, error: 'We need your name and either an email or a phone number.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('ingest-lead', {
      body: {
        brand: BRAND,
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
