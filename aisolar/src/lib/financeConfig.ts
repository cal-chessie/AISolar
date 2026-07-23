/**
 * financeConfig — the tenant's payment setup (Cal: "bank and stripe easy
 * setup and totally secure").
 *
 * SECURITY MODEL (the part that makes it "totally secure"):
 *  - Card data NEVER touches this app: deposits run through Stripe-hosted
 *    Checkout (create-checkout function), so PCI stays Stripe's problem.
 *  - Secret keys (sk_…) are REFUSED client-side, hard. Only the publishable
 *    key (pk_…) lives here; the secret goes into the Supabase function vault
 *    at launch (supabase secrets set STRIPE_SECRET_KEY), server-side only.
 *  - Bank details are display data for invoices (IBAN on an invoice is
 *    normal), masked in the UI after save.
 *  - BYO keys: the tenant's Stripe account, the tenant's money — we never
 *    sit in the money flow. (Pattern check: nextjs/saas-starter's
 *    checkout→webhook shape, minus subscriptions; Hyperswitch reviewed and
 *    parked — multi-PSP orchestration is enterprise overkill for deposits.)
 *
 * Demo mode persists to localStorage; live mode reads tenant_settings.
 */
import { useSyncExternalStore } from 'react';

export interface FinanceConfig {
  stripe: {
    publishableKey: string;   // pk_test_… or pk_live_… ONLY
  };
  bank: {
    accountName: string;
    iban: string;
    bic: string;
  };
  invoicing: {
    depositPct: number;       // default 30
    vatRate: 0 | 13.5 | 23;   // 0% = domestic solar supply+install (IE, since May 2023)
  };
}

const KEY = 'aisolar.finance.v1';
const EVENT = 'finance-config-changed';

const DEFAULTS: FinanceConfig = {
  stripe: { publishableKey: '' },
  bank: { accountName: '', iban: '', bic: '' },
  invoicing: { depositPct: 30, vatRate: 0 },
};

export function getFinanceConfig(): FinanceConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, stripe: { ...DEFAULTS.stripe, ...parsed.stripe }, bank: { ...DEFAULTS.bank, ...parsed.bank }, invoicing: { ...DEFAULTS.invoicing, ...parsed.invoicing } };
  } catch { return DEFAULTS; }
}

/** Throws if anything that looks like a secret is passed — the caller shows
 *  the message. This is the line that keeps sk_ out of the browser. */
export function saveFinanceConfig(cfg: FinanceConfig) {
  const k = cfg.stripe.publishableKey.trim();
  if (/^(sk_|rk_|whsec_)/i.test(k)) {
    throw new Error('That is a SECRET key — it must never be pasted into a browser. Only the publishable key (pk_…) goes here; the secret is set server-side in the vault.');
  }
  if (k && !/^pk_(test|live)_/.test(k)) {
    throw new Error('Stripe publishable keys start with pk_test_ or pk_live_.');
  }
  localStorage.setItem(KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event(EVENT));
}

export const stripeMode = (pk: string): 'live' | 'test' | null =>
  pk.startsWith('pk_live_') ? 'live' : pk.startsWith('pk_test_') ? 'test' : null;

export const maskIban = (iban: string) => {
  const c = iban.replace(/\s+/g, '');
  return c.length > 8 ? `${c.slice(0, 4)} •••• •••• ${c.slice(-4)}` : c;
};

let cache = getFinanceConfig();
const subscribe = (cb: () => void) => {
  const h = () => { cache = getFinanceConfig(); cb(); };
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
};

export function useFinanceConfig(): FinanceConfig {
  return useSyncExternalStore(subscribe, () => cache);
}
