/**
 * widgetLead — the embed widget's lead door (2E ⭐, 5 Aug).
 *
 * The estimate is the hook; THIS is the door. A visitor on a tenant's own site
 * finishes their estimate and leaves their details — and the lead lands in THAT
 * tenant's pipeline, stamped by the source key baked into the embed code.
 *
 * The path: /embed?src=<source_key> → this posts to the `ingest-lead` edge fn
 * with `x-source-key`, which resolves the key → brand + tenant (resolve_lead_door)
 * and births the lead scoped to that tenant. A leaked key can only inject into
 * its own tenant — never read, never cross (same guarantee as the sites).
 *
 * Demo-safe: no source key (the /embed demo, or a preview) → no post, a friendly
 * success so the flow is still walkable. Never throws into the visitor's face.
 */
export interface WidgetLeadInput {
  name: string;
  email: string;
  phone?: string;
  eircode?: string;
  /** The estimate the visitor just saw — carried so the consultant opens to it. */
  estimate?: {
    monthlyBill?: number;
    systemSizeKw?: number;
    annualSavings?: number;
    seaiGrant?: number;
    netCost?: number;
    paybackYears?: number;
    propertyType?: 'domestic' | 'commercial';
    orientation?: string;
    battery?: boolean;
    roofKwp?: number;
    roofAddress?: string;
  };
}

export interface WidgetLeadResult { ok: boolean; reason?: 'demo' | 'error'; }

/** The source key baked into the embed URL (?src=…). Absent = demo/preview. */
export function widgetSourceKey(): string | null {
  try {
    const k = new URLSearchParams(window.location.search).get('src');
    return k && k.startsWith('src_') ? k : null;
  } catch { return null; }
}

/** Post the lead to ingest-lead, stamped to the tenant by its source key. */
export async function captureWidgetLead(input: WidgetLeadInput): Promise<WidgetLeadResult> {
  const sourceKey = widgetSourceKey();
  if (!sourceKey) return { ok: true, reason: 'demo' }; // preview / demo — walkable, no write

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-lead`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-source-key': sourceKey,
        // The anon key is the public function gate; the source key is the tenant scope.
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        source: 'website_survey',
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        eircode: input.eircode ?? null,
        // The estimate rides in the metadata the consultant opens to.
        metadata: { widget: true, estimate: input.estimate ?? null },
      }),
    });
    // The fn already exists; on V5 it's undeployed until launch, so a network/
    // 404 is expected pre-deploy — treat as a soft miss, never crash the visitor.
    if (!res.ok) { console.warn('[widgetLead] ingest-lead', res.status); return { ok: false, reason: 'error' }; }
    return { ok: true };
  } catch (err) {
    console.warn('[widgetLead] threw', err);
    return { ok: false, reason: 'error' };
  }
}
