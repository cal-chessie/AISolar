/**
 * CustomerPortalTokenRoute — the customer's magic-link front door (P0).
 *
 * /customer/:token — the ONLY way a customer reaches their project without an
 * account: the 64-char access_token IS the auth (RLS's can_see_lead admits
 * exactly this lead's rows). This route is also where Stripe/Coinbase send the
 * customer BACK after a deposit (?payment=success|cancelled) — before this
 * route existed, a customer who had just PAID landed on a 404. Never again.
 *
 * Three states, all honest:
 *   loading  → calm branded skeleton (no flash of wrong content)
 *   invalid  → "this link isn't active" + the phone number (never a blank page,
 *              never a fake portal; a revoked/mistyped token reads zero rows)
 *   ready    → the full portal, fed the REAL lead; payment outcome toasted once.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import CustomerPortalV2 from './CustomerPortalV2';
import { fetchLeadByToken } from '@/lib/realLeads';
import type { DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';

export default function CustomerPortalTokenRoute() {
  const { token } = useParams<{ token: string }>();
  const [params, setParams] = useSearchParams();
  const [lead, setLead] = useState<DummyLead | null>(null);
  const [state, setState] = useState<'loading' | 'invalid' | 'ready'>('loading');
  const toasted = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const found = token ? await fetchLeadByToken(token) : null;
      if (!alive) return;
      if (found) { setLead(found); setState('ready'); }
      else setState('invalid');
    })();
    return () => { alive = false; };
  }, [token]);

  // Payment return — thank them ONCE, then clean the URL so refresh stays quiet.
  useEffect(() => {
    if (state !== 'ready' || toasted.current) return;
    const payment = params.get('payment');
    if (!payment) return;
    toasted.current = true;
    if (payment === 'success') {
      toast.success('Payment received — thank you!', {
        description: 'Your project has moved forward. The next steps are below, and a receipt is on its way to your inbox.',
        duration: 8000,
      });
    } else if (payment === 'cancelled') {
      toast('Payment not completed', {
        description: 'No money moved. You can pay whenever you\'re ready — the link below stays live.',
        duration: 8000,
      });
    }
    const next = new URLSearchParams(params);
    next.delete('payment');
    setParams(next, { replace: true });
  }, [state, params, setParams]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Opening your project…</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid' || !lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-panel border border-border bg-card p-8 text-center space-y-4">
          <h1 className="text-lg font-semibold">This link isn't active</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The project link you followed has expired or isn't quite right. The surest fix is the
            latest email we sent you — its button always opens your current project.
          </p>
          <p className="text-sm text-muted-foreground">
            Or just call — we'll sort it in a minute.
          </p>
          <a href={`tel:${brand.contact?.phone ?? ''}`}
             className="inline-flex items-center gap-2 h-10 px-5 rounded-control bg-primary text-primary-foreground text-sm font-semibold">
            <Phone className="h-4 w-4" /> {brand.contact?.phone || 'Call us'}
          </a>
        </div>
      </div>
    );
  }

  return <CustomerPortalV2 lead={lead} />;
}
