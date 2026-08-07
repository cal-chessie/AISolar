/**
 * embedBrand — resolves the embed widget's branding from the ?src= source key
 * (via the resolve_widget_brand RPC): the brand's name, logo, accent colour, and
 * dark mode. Falls back to the local tenant brand (owner preview) or the AISolar
 * default when there's no source key. Applies the accent + dark theme to the
 * document so the whole widget wears the site's brand, not AISolar's.
 */
import { useEffect, useState } from 'react';
import { useTenantBrand } from './tenantBrand';
import { widgetSourceKey } from './widgetLead';

export interface EmbedBrand {
  name: string;
  logoUrl: string | null;
  subtitle: string;
}

interface RemoteTheme {
  primary?: string;
  primaryForeground?: string;
  dark?: boolean;
  logoUrl?: string | null;
  calcSubtitle?: string;
}

export function useEmbedBrand(): EmbedBrand {
  const tenant = useTenantBrand(); // fallback: owner preview / AISolar default
  const [remote, setRemote] = useState<{ name: string; theme: RemoteTheme } | null>(null);

  useEffect(() => {
    const src = widgetSourceKey();
    if (!src) return; // no source key → keep the fallback brand
    let alive = true;
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.rpc('resolve_widget_brand', { p_source_key: src });
        const row = Array.isArray(data) ? data[0] : data;
        if (!alive || !row) return;
        const theme: RemoteTheme = (row.theme ?? {}) as RemoteTheme;
        setRemote({ name: row.name, theme });
        // Dress the whole widget in the brand's accent + dark mode.
        const root = document.documentElement;
        if (theme.dark) root.classList.add('dark');
        if (theme.primary) root.style.setProperty('--primary', theme.primary);
        if (theme.primaryForeground) root.style.setProperty('--primary-foreground', theme.primaryForeground);
      } catch {
        /* network/RPC miss — the fallback brand stays; the widget still works */
      }
    })();
    return () => { alive = false; };
  }, []);

  return {
    name: remote?.name ?? tenant.name,
    logoUrl: remote?.theme?.logoUrl ?? tenant.logoDataUrl,
    subtitle: remote?.theme?.calcSubtitle ?? 'Solar savings calculator',
  };
}
