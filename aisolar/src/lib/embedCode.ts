/**
 * embedCode — the owner's "put this on your site" helper (2E ⭐, 5 Aug).
 *
 * The other half of the widget: the tenant copies one snippet onto their own
 * website and their branded calculator→lead door is live. The snippet carries
 * the tenant's SOURCE KEY (from the `sources` table), so every lead the widget
 * captures lands in THAT tenant's pipeline — no config, no per-site build.
 *
 * The key is a write-scoped injection token (ingest-lead only), safe to sit in
 * public page HTML: it can birth a lead into its own tenant and nothing else.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveTenantId } from '@/lib/serverStore';

export interface EmbedInfo { sourceKey: string | null; label: string | null; }

/** The tenant's website source row — the key the embed snippet needs. Signed-in
 *  only; returns null quietly in demo (the panel then shows the placeholder). */
export async function fetchEmbedInfo(): Promise<EmbedInfo> {
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return { sourceKey: null, label: null };
    const tenantId = await resolveTenantId();
    if (!tenantId) return { sourceKey: null, label: null };
    const { data } = await supabase
      .from('sources')
      .select('source_key, label, kind, active')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at', { ascending: true });
    // Prefer a website-kind door; fall back to the first active source.
    const row = (data ?? []).find(s => s.kind === 'website') ?? (data ?? [])[0];
    return { sourceKey: (row?.source_key as string) ?? null, label: (row?.label as string) ?? null };
  } catch { return { sourceKey: null, label: null }; }
}

/** The iframe snippet the owner pastes. Origin is the app's own host, so the
 *  widget always loads from where it's deployed. */
export function embedSnippet(sourceKey: string | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.aisolar.ie';
  const key = sourceKey ?? 'src_YOUR_KEY';
  return `<iframe
  src="${origin}/embed?src=${key}"
  title="Solar savings calculator"
  style="width:100%;min-height:720px;border:0;border-radius:16px"
  loading="lazy">
</iframe>`;
}
