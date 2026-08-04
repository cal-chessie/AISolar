# Post-cohort notes — deferred until after the first cohort is live

Parked here on purpose (Cal, 4 Aug): valuable, not launch-blocking. Pick up after
the cohort ships.

## SEAI grant — automations (spine is live; these ride on it)
The lifecycle spine, owner tracker, customer card, auto-advance-on-install, and
the DoW + data-sheet artifact are DONE (see docs/SEAI_GRANT_WORKFLOW.md). Deferred:

1. **Nudge cadence** — needs the notification wiring (Postmark/stageNotifications).
   - **8-month offer clock**: as the offer nears expiry (e.g. 30 / 14 / 3 days) with
     the claim not yet `dow_submitted`, nudge the owner AND the customer. Losing a
     grant to the clock is the single biggest risk — this closes it.
   - **BER-overdue chase**: after `docs_shared`, if the customer hasn't reached
     `ber_published` within N days, auto-chase ("book your BER to release your €X").
     The BER is the usual bottleneck.
   - **Payment-overdue**: after `dow_submitted`, if not `paid` within SEAI's typical
     window (~4–6 wks), prompt the owner to check the SEAI portal / confirm with the
     customer.
   - Hook point: `src/lib/seaiGrant.ts` (`offerClock` already computes days-left);
     fire through the existing notify spine on stage/day thresholds.

2. **Owner "grants at risk" radar** — one portfolio view across all jobs: offers
   expiring soon, BERs overdue, claims unsubmitted, payments outstanding. The
   owner's money-radar. Reads every lead's `seai_grants` record; surfaces on the
   owner cockpit. Sort by urgency (days-left on the clock).
