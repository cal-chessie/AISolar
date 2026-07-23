/**
 * proposalTerms — the OWNER's terms, on every proposal (Cal: "terms of
 * service? that means there needs to be that setup in owners settings").
 *
 * The proposal footer used to hardcode "Prices hold for 30 days" — the
 * builder's words on the installer's legal document. These are business
 * terms only the owner can set. Cooling-off default is 14 days (EU consumer
 * right for off-premises contracts) — editable up, never claimed away.
 *
 * Demo persists to localStorage; tenant_settings at launch.
 */
import { useSyncExternalStore } from 'react';

export interface ProposalTerms {
  validityDays: number;        // how long the quoted price holds
  coolingOffDays: number;      // statutory 14 minimum (EU) — display only
  workmanshipYears: number;    // installer's own workmanship warranty
  customTerms: string;         // free text, renders verbatim on the proposal
  termsUrl: string;            // optional link to full T&Cs
}

const KEY = 'aisolar.proposalTerms.v1';
const EVENT = 'proposal-terms-changed';

const DEFAULTS: ProposalTerms = {
  validityDays: 30,
  coolingOffDays: 14,
  workmanshipYears: 10,
  customTerms: '',
  termsUrl: '',
};

export function getProposalTerms(): ProposalTerms {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function saveProposalTerms(t: ProposalTerms) {
  localStorage.setItem(KEY, JSON.stringify({
    ...t,
    coolingOffDays: Math.max(14, t.coolingOffDays), // statutory floor
    validityDays: Math.max(1, t.validityDays),
  }));
  window.dispatchEvent(new Event(EVENT));
}

let cache = getProposalTerms();
const subscribe = (cb: () => void) => {
  const h = () => { cache = getProposalTerms(); cb(); };
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
};

export function useProposalTerms(): ProposalTerms {
  return useSyncExternalStore(subscribe, () => cache);
}
