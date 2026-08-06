/**
 * coolingOff — the consumer's statutory 14-day cooling-off window on a distance
 * contract (Irish/EU distance-selling law). Pure date logic over the signed
 * contract; the DB stamps `cooling_off_ends_at` (see migration 20260806_cooling_off).
 *
 * SCOPE: this file is the ENGINE (dates + state + the install-gate predicate). The
 * customer-facing NOTICE wording and the refund/waiver POLICY are legal/business
 * decisions (Cal's yes — LAST_MILE #48) and deliberately live nowhere in here.
 *
 * A waiver (`cooling_off_waived`) means the customer EXPRESSLY asked us to begin
 * during the window — it must be captured from the customer, never inferred.
 */
import type { DummyLead } from './dummyData';

export type CoolingOffState =
  | 'none'       // no signed contract yet — nothing to cool off
  | 'active'     // within the 14 days, not waived → customer can still cancel
  | 'waived'     // customer asked us to start early
  | 'expired'    // window passed → safe to proceed
  | 'cancelled'; // consumer cancelled within the window

export interface CoolingOffStatus {
  state: CoolingOffState;
  endsAt?: Date;
  /** Whole days remaining (ceil) while `active`. */
  daysLeft?: number;
}

const MS_DAY = 86_400_000;

/** Current cooling-off state for a lead's signed contract. */
export function coolingOffStatus(lead: DummyLead): CoolingOffStatus {
  const c = lead.contract;
  if (!c?.signed_date) return { state: 'none' };
  if (c.cancelled_at) return { state: 'cancelled' };

  const endsAt = c.cooling_off_ends_at
    ? new Date(c.cooling_off_ends_at)
    : new Date(new Date(c.signed_date).getTime() + 14 * MS_DAY); // fallback if the DB value hasn't loaded

  if (c.cooling_off_waived) return { state: 'waived', endsAt };

  const now = Date.now();
  if (now >= endsAt.getTime()) return { state: 'expired', endsAt };
  return { state: 'active', endsAt, daysLeft: Math.max(1, Math.ceil((endsAt.getTime() - now) / MS_DAY)) };
}

/**
 * Should the install be held? True only while the window is still `active` (the
 * customer can still cancel and hasn't asked us to start early). The most
 * consumer-protective default — surfaced as a WARNING at the install-start point,
 * not a hard block, since a valid early-start waiver comes from the customer.
 */
export function installBlockedByCoolingOff(lead: DummyLead): boolean {
  return coolingOffStatus(lead).state === 'active';
}

/** Short human label for a status chip/banner. */
export function coolingOffLabel(status: CoolingOffStatus): string {
  switch (status.state) {
    case 'active':
      return `Cooling-off active — ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left`;
    case 'waived':
      return 'Early-start requested by customer';
    case 'cancelled':
      return 'Cancelled within cooling-off';
    case 'expired':
      return 'Cooling-off passed';
    default:
      return '';
  }
}
