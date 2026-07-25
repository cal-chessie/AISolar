# Readiness & Moat — senior-dev assessment (25 Jul 2026)

> Cal asked for the honest engineering read on (a) what makes AISolar defensible,
> and (b) what stands between "great demo" and "safe to put in front of real
> installers + homeowners + money." Written as his eyes/ears. Pair this with
> `SWEEP8_DB_WIRING.md` (the faked-backend inventory) and `NOTES.md`.

## The moat — what's actually defensible
UI gets copied. These compound or are hard/dull to replicate:

1. **The learning flywheel (highest leverage).** Every consultant correction,
   accepted/rejected proposal and install outcome should train the system —
   aggregated across tenants through the kernel (refs only, no PII) so it gets
   better at sizing, pricing and CLOSING the more the network uses it. Today the
   "Wrong" buttons (`AgentWindow.onCorrect`) are toast-only. Wiring this loop is
   the single biggest moat move: a data advantage no competitor can buy.
2. **Compliance autopilot.** NC5/6/7 auto-fill, grant-ready packs, RECI sign-off
   — the paperwork Irish installers hate most. Deep, local, dull; exactly why a
   global tool (OpenSolar) won't come here. Own it end to end.
3. **Verifiable numbers.** Every figure traceable to the bill read and
   hash-chained in the kernel. "Ask the other quote to prove their number."
   Trust as a wedge, and already half the story (day/night split from the bill).
4. **Closed loop to the homeowner.** Customer portal + AI chat carrying the SAME
   verified numbers, estimate → grant. Point-tool rivals can't match end-to-end.
5. **County-franchise network + kernel.** Each franchise runs the OS; the kernel
   aggregates intelligence across all of them. Network effects on top of the
   unrevealed semantic-primitive layer.

Moat items to build (tomorrow+): the learning loop, compliance autopilot as a
first-class product, the traceable-number chain surfaced on the proposal, and
the cross-tenant aggregate intelligence (owner-level) through the kernel.

## Deployment readiness — prioritised

### P0 — blockers before ANY real user
- **GATE 0**: rotate the 3 leaked Supabase keys + the Maps key, purge git
  history. The Maps key now SHIPS IN THE BUNDLE (Static Maps) — it must be
  HTTP-referrer + API restricted, or proxied through an edge function.
- **RLS line-by-line audit** — one installer seeing another tenant's leads is
  fatal. Multi-tenant isolation verified per table before prod.
- **Demo-mode guard** — never ship `VITE_ENABLE_DEMO` in prod (auth is bypassed
  in demo). Confirm the prod build cannot enable it.
- **Ask-AI guardrail** — the customer `generateAIResponse` must refuse anything
  outside their own project (margins/pipeline/other customers/internals). Not
  enforced yet; a leak is trust-death.

### P1 — the backend is faked (Sweep 8)
The whole app is toast / setTimeout / local state; nothing persists. Full
inventory in `SWEEP8_DB_WIRING.md`. Highest-risk inside it:
- **Numbers through the spine** — the ProposalDraftAgent must call
  `selfConsumptionFromOccupancy()` + `annualProduction()` + a property-type-aware
  grant, so studio = proposal = customer view. Kills figure drift.
- **Payments** — `create-checkout` / deposit: idempotency keys, webhook
  signature verification, and reconciliation. Money must be bulletproof.
- **Kernel events actually emitted** — ProposalAccepted, DepositPaid,
  append-only proposal versions. The immutable ledger has to record.
- **Notifications both ends** — email + magic link (truth-pass: email only, no
  SMS/WhatsApp), with Postmark bounce handling + retries.

### P2 — reliability / operability
- **Field app offline tolerance** — installers on roofs with no signal. Queue
  photo uploads + serials + sign-off; retry on reconnect. Most reliability-
  critical surface; a fitter can't lose a day's work to a dropped connection.
- **Observability** — Sentry + structured logging. Today a broken render for one
  lead fails silently behind ErrorBoundary.
- **API cost/quota guardrails** — Google Solar / Static Maps cost + rate limits
  at scale. Proxy + cache geocode/imagery/insights + budget alerts.
- **Tests on money paths** — quote math, grant calc, payment. Non-negotiable for
  a system handling grants + deposits.
- **Performance** — code-split per route (the studio pulls Maps + framer);
  mind the Vite build-green-but-dev-blank duplicate-import gotcha.
- **Graceful degradation** — rural (no Google Solar), commercial (NDMG grant),
  no-bill lead, > 12 kWp cap. Each must degrade, never blank.

### P3 — trust / polish
- Truth-pass sweep: no SMS/WhatsApp/roof-detection claims anywhere.
- Accessibility pass (field app in sunlight/gloves; customer portal).
- GDPR completeness (`anonymise_lead`, data-subject rights, consent).
- Supabase backup / DR; migrations idempotent + add-only.

## Remaining surfaces — the readiness angle for each
- **Proposal** — spine-consistent money, append-only versions, property-type
  grant, datasheets, draft-first send gate (the human approval; never auto-send).
- **Send** — magic-link + email delivery, deposit payment, the customer's live
  view, notify both ends.
- **Field (AIField)** — the reliability one: offline, photo queue, serials,
  fitted-vs-proposal check, NC6/RECI submission fields, offline-tolerant sign-off.
- **Owner** — aggregate intelligence + the learning-loop reports + margin/pipeline
  oversight, with hard guardrails on what data surfaces.
