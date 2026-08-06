# THE LAST MILE — the ONE source of truth (6 Aug 2026)

_Cal's rule: ALL running notes + ALL open work stream into THIS doc (or POST_COHORT
/ CAL_GROWTH), never new note files. **This doc SUPERSEDES `FINAL_SPRINT.md`** (6
Aug) — everything not-done was scraped in here ("📋 ALL REMAINING WORK" below).
FINAL_SPRINT keeps only its ✅ build record. The deploy command detail stays in
`DEPLOYMENT_GATE.md`; the Founder Operating Playbook + the security evidence live here._

**Where we are:** the product is BUILT and browser-verified on the cast — the whole
spine (lead → survey/NC6-NC7 → proposal → deposit → installer-routing gate → install
→ grant pack → handover), the AI brain across every POV, the widget, the demo toggle,
the guided tour. **2C · 2D · 2E · Sprint 5 = ✅.** **GATE 0 is redundant** (we moved to
a fresh Supabase project — V5 `ywizcsulurxoqjdgnkvc`; the old leaked keys were on dead
projects, nothing to purge). **We are very nearly deployed.** The gap is: deploy it,
prove it, and a short ranked list.

---

## 📋 ALL REMAINING WORK — **THIS DOC NOW SUPERSEDES FINAL_SPRINT.md** (6 Aug)
_Scraped everything not-done out of FINAL_SPRINT into here, so there's ONE source
of truth. FINAL_SPRINT is retired (its ✅ history stays as the record; the OPEN
items are all below). Grouped by what it is + who owns it._

### 🔴 A. Launch-blocking (must close before a real customer sees it)
- **A1 · Stripe billing** — 7-day trial → per-seat subscription checkout + webhook. The auth/tenant foundation is live; this is the money layer. *(Fresh session — A1_BUILD_PLAN.md.)*
- **⚠️ TRUTH-PASS VIOLATION — `brand.ts` placeholder stats** are on customer-facing pages TODAY (invented numbers). Replace with real or remove. Non-negotiable before live.
- **L5 · white-label sweep** — every customer-facing "AISOLAR" → the tenant brand (the demo bubbles are done; sweep the marketing/proposal/email surfaces).
- **NC8 decision** (statutory-adjacent) — >50kW jobs get the data appendix only; calibrate the overlay OR say "appendix-only for NC8" honestly. **Cal decides.**

### ⚖️ B. STATUTORY FLAGS — **Cal's explicit yes required; never a quiet edit**
1. **ESB micro-gen bands** — code says 6/11 kW; rule is 25 A/phase = 5.75 kVA single-phase / 11.04 kVA three-phase. We under-file at 5.75–6.0 kW single-phase. Policy read + sign-off.
2. **Typed e-signature on NC6 vs wet ink** — until ESB confirms typed is accepted, the pack says "print, sign & date by hand."
3. **NDMG + ACA figures** — verified vs the SEAI PDF before they show on a commercial proposal.

### 🚦 C. Deploy — Cal's hands (I prep every line; runbook = DEPLOYMENT_GATE.md)
- The gate: `supabase login` → deploy the edge fns → set Postmark + Stripe secrets → Auth Site URL = prod domain → demo env OFF → PITR backups ON.
- **Sites wiring** — the brand-site doors (SolarIrelandGroup · RenewableIreland · wideawakesolar) point at `ingest-lead`. The public go-live moment.
- **Maps key referrer-lock** — 2 min in your Google console (before the sites go public).
- **The joint prod smoke** — one real job door→handover, every send real, read-flip verified signed-in.

### 🟡 D. Security remaining (the two deep sweeps closed the criticals — these are the tail)
- **`solar-roof` rate-limit** — it's public by design; cap it so no one runs up the Google bill.
- ✅ **Legacy global tables** (installers/solar_products/agent_prompts/follow_up_settings/survey_photos, no tenant_id) — **DECIDED 6 Aug (Cal): platform-owned for cohort 1.** They hold **settings, not customer data**, so there's no cross-tenant break-in risk — and a single curated product catalogue + installer list actually **FITS the wholesaler-fed launch** (the wholesaler stocks the shelf everyone draws from). **Revisit — platform-curated vs per-installer — before scaling past the first few installers.** Not a launch blocker.
- **Error-honesty audit on the money paths** — checkout · sends · pack seal: every catch surfaces or logs, no silent swallow.
- **Mobile bug sweep** — a fresh click-through of all 3 cockpits at 375px + `ProposalView:424` blank-onClick re-verify + console-clean on every route.

### 🟢 E. Polish (Sprint 3 — the feel of one product; NOT blocking)
- **Shell conformity** ✅ done (both cockpits on AppShell).
- **AIField mobile-first** — the full phone logic-walk: serials gate → NC6 fields → sign-off.
- **Design Studio** — the default array snaps to the roof centroid (drops on the driveway today).
- **Sweep-8 codes:** M6 designs persistence (kills stored-vs-live kWp drift) · M7 proposal_versions (contract rests on a version) · M3 signature_hash on the DoW/NC · M11 touchpoints.sender + Realtime · M12 staff home-address + depots · M13 agent_route_runs · X2 Cal.com real booking · X3 distance-matrix (kills naive today+5/+28 dates) · X9 e-sign contract path · A3 leadflow real sends · A6 consent honoured server-side.
- **Front-end shine:** hero snapshots reshot from current UI · copy pass every page · pricing-page depth (what you lose down-tier · FAQ · € not just %) · the AIOS page becomes a real AIOS-blue page · proposal "fantastic" pass · blog + per-page meta (deferred Sweep-7 content).
- **Per-tab polish:** Clients type-badges · Financials aging · SEAI pack-status chips · Schedule roster + unscheduled queue.
- **Redundancy + cleanups:** `touchpoints` vs `lead_touchpoints` (one survives) · retire old `AiTeamPage` · rename the two `AgentWindow`s · delete `aios.smoketest` user · deprecate `extracted_premises_type` · ToS rewrite · CSV bulk import · doc-ref hygiene (~20 docs cite dead `coxmtpnq`/`vythuqax`) · fix stale `leadWrites.ts` RLS comment.

### 🧠 F. AI depth (Sprint 1 — nice-to-have)
- Coach goes **conversational** (prompts at every gate, not just stage lines) · owner/consultant coach voices deepen.

### ⏸ G. Post-cohort — **parked on purpose → POST_COHORT.md** (build on revenue, don't pull forward)
Learning loop (agent_corrections → owner report → approve → version bump) · agent-training UI · AIGate national gate-call cockpit · browser `portal_submitter` · referrals + tier_entitlements · plan gating · installer_vault · inventory/depot · Realtime everywhere · Sentry · `/health`+uptime · review→Google Business · SMS/WhatsApp (Twilio first, claimed only then) · per-tenant DKIM · dunning · kernel Phase 2. _(Full list in POST_COHORT.md.)_

## 🏁 SENIOR-TEAM PRE-DEPLOYMENT CHECKLIST (6 Aug — "what a Tesla-grade team checks", called out one by one)
_Grounded in THIS app, not generic. ✅ = done · ⚠️ = real gap · 🔴 = fix before live._

**✅ Already covered (this session's work):**
1. **Security headers** — HSTS · X-Frame DENY · CSP · nosniff · referrer-policy · permissions-policy (vercel.json). ✅
2. **Tenant isolation** — proven live (reads + writes); escalation/AI-key-leak/storage/secdef holes fixed. ✅
3. **Prod build + code-split** green · **secrets not in bundle** · **all edge fns gated** · **rollback plan**. ✅
4. **GDPR** — consent · erasure (`anonymise_lead`) · privacy/terms · EU-hosted · `<html lang>`. ✅

**🔴 Fix before live:**
5. **CSP was blocking Google Maps** — it allowed Mapbox (unused) and omitted `maps.googleapis.com`, so satellite + geocoding would 've been dead in prod. **FIXED 6 Aug** (added to script-src + connect-src, Mapbox removed).
6. **`brand.ts` placeholder stats** on customer pages — invented numbers, a truth-pass violation shipping today. Replace/remove. *(In "ALL REMAINING WORK" A.)*

**⚠️ Real gaps a top team closes before/at launch (ranked by risk):**
7. ✅ **Error reporting — floor DONE 6 Aug (dependency-free crash sink).** New `client_errors` table (RLS: insert-from-anywhere incl. the anon portal, read only for platform admins, payload size-bounded — *proven live*). `errorReporting.ts` captures **render crashes** (wired into `ErrorBoundary.componentDidCatch`), `window.onerror`, and `unhandledrejection` → `client_errors`. Demo-guarded, deduped (10s), and **token-masked** (`/customer/<token>` never logged — ties to #60). *tsc clean; mask + no-regression browser-verified.* **Upgrade later (Cal's DSN):** Sentry for stack grouping + source maps + alerting; this is the floor that works day one.
8. **No automated tests** — zero unit/integration/e2e; every change is hand-verified. At 40 tenants a regression ships silently. At least smoke-test the money + pack paths.
9. **No CI/CD + staging gate** — deploys are manual; nothing runs build+tsc on push. A green-build gate + a staging env before prod.
10. **Payment robustness** — the Stripe webhook isn't idempotent on `event.id` (Stripe retries → possible double-processing of side-effects); and failed-payment / refund / dispute / double-pay paths are unhandled. Money code needs belt + braces.
11. **Load / concurrency** — never load-tested for 40 tenants + their customers; verify Supabase connection pooling + the agent-drain under concurrency.
12. **Accessibility (WCAG)** — unaudited beyond `lang`: keyboard nav, focus order, contrast, ARIA, screen-reader labels. Customer-facing + a legal exposure.
13. **Performance / Core Web Vitals** — main chunk still ~1MB (split helped); no Lighthouse run; mobile time-to-interactive unmeasured (your customers are on phones).
14. **Empty / first-run states** — the demo cast masks the real new-tenant experience (zero leads). Walk every screen as a brand-new tenant before a real one does.
15. ✅ **Email deliverability (code) DONE 6 Aug** — bounce/complaint → suppression pipeline + `List-Unsubscribe` built (see #69). DMARC/SPF/DKIM DNS = the joint Postmark session (DEPLOYMENT_GATE).
16. **Auth hardening** — verify password policy, email confirmation, **login rate-limit** (brute-force), session expiry; offer MFA; run the **first-admin bootstrap** (AUTH_RUNBOOK) so Cal isn't locked out as a customer.
17. **Rate-limit the public doors** — `solar-roof` (Google bill) + the auth endpoints.
18. **Backups — and a TESTED restore** — enable PITR (deploy) AND do one restore drill. A backup you've never restored isn't a backup.
19. **Feature kill-switches** — AI has one (`enable_llm_calls` ✓); add a pause for `agent-drain` so a misbehaving agent can be stopped without a redeploy.
20. **DR runbook** — rollback ✓; add the "Supabase/Stripe/Postmark is down" playbook.
21. **Product analytics** — none yet (PostHog is post-cohort); you won't see where customers drop in the funnel.
22. **Audit trail** — `activity_logs` exists; confirm it's WRITTEN on the money + compliance actions (dispute defence).
23. **Stored-XSS pass** — confirm a lead name / note containing `<script>` is never rendered raw (React escapes by default, but check any `innerHTML`/markdown paths).
24. **Browser/device matrix** — swept the in-app browser; verify real Safari + iOS Safari + Android Chrome (mobile Safari has quirks).
25. **Sub-processor / DPA list** — GDPR needs a named list (Supabase · Stripe · Postmark · OpenRouter) + a data-retention policy.

## 🏁🏁 PRE-DEPLOYMENT — ROUND 2 (the deeper cuts a top team runs; "there's defo more than that")
_Every discipline, grounded in this REGULATED, payment-handling, field-ops SaaS._

### 🗄️ Database & data durability
26. ✅ **FIXED — 2 missing RLS-hot indexes** (`user_roles(user_id,tenant_id)` — hit on EVERY tenant query — + `notifications.lead_id`). *(20260806_perf_indexes)*
27. ✅ **DONE 6 Aug — field record now mirrors to the DB.** Was: serials, the commissioning gate, artefact verdicts, handover all lived only in browser localStorage → a cache-clear lost the gate mid-job. Now: new `field_records` table (jsonb mirror; tenant_id stamped server-side by trigger, staff-only RLS via `own_lead`) — every mutation best-effort upserts, opening a job hydrates from it (last-write-wins). localStorage stays the offline-first cache; the DB is the durable backup. **Two bugs fixed in the same pass:** (a) `getFieldRecord` never returned `verdicts` → the AI-mismatch pack-block was reading `undefined` (dead); (b) the eIDAS handover signoff and JobViewV2's handover checklist both wrote `data.handover` — a checklist tick wiped the SEAI Declaration-of-Works signature — now deconflicted to `handoverSignoff`. *Migration `20260806_field_records` applied + trigger/RLS proven live; tsc clean; both surfaces render.* Heavy cert files stay in the project-documents bucket (row stays small). `installed_equipment` remains the Sweep-8 normalized target.
28. **Tenant-delete cascade is inconsistent** (user_roles CASCADE vs notifications SET NULL) — decide + unify; and prefer **soft-delete** for tenants (never hard-delete a paying customer's data).
29. ✅ **DB constraints — non-negativity floor DONE 6 Aug.** `invoices` amounts already `>= 0` (invoice_integrity). Added `proposals_nonneg`, `site_surveys_nonneg`, `leads_nonneg`, `lead_intake_nonneg` — non-negativity on every physical quantity, raw cost, consumption, and rate (counts/kWp/kWh/area/kVA/€/rates). *Proven live: valid accepted, `-1` rejected.* **Deliberately skipped:** derived figures (savings/payback/net_cost — a strict CHECK could reject a valid pathological ROI) and a `workflow_stage` enum CHECK (the stage set is still evolving; a too-strict enum would break valid writes — revisit once the stage vocabulary is frozen).
30. **No down-migrations** + set a **`statement_timeout`** for the anon/authenticated roles (a runaway query can't hog the DB).
31. **Supabase plan headroom** — DB size · egress · edge-fn invocation limits vs 40 tenants + customers.

### 💻 Frontend (deeper)
32. 🟡 **Offline for field crews — durability DONE 6 Aug; cold-start = CAL'S SW CALL.** What's built (safe, no service worker): the field record already writes to localStorage offline; now `pushFieldRecord` **queues on failure** and a browser `online` listener **flushes the queue on reconnect** (`flushPendingFieldRecords`), so the commissioning gate lands in the DB the moment signal returns. Plus an app-level **`OfflineIndicator`** — a thin "you're offline, work is saved, will sync" strip (browser-verified: shows offline, clears + flushes on reconnect). Photos/notify already degrade cleanly offline. **⚠️ NOT done — deliberately:** cold-start-while-offline (opening the app with ZERO signal) needs a **service worker**, and this app ships a SW **kill-switch** on purpose (`public/sw.js` — a cache-first SW once served stale JS bundles and crashed the app *daily*). Re-adding a caching SW is an architecture decision with real regression risk → **Cal's call**, not a silent re-add. Safe interim: crews open the app with signal (depot/van) and it keeps running on the roof.
33. **Image optimisation** — customer home photos upload raw (no resize/WebP); no `width/height` → layout shift (CLS).
34. **Double-submit guards** on money buttons (pay · send) + **unsaved-changes** warning on the survey/proposal forms.
35. **Memory-leak sweep** — every `window.addEventListener` (I added several: demo-mode, field-record, tour) has a cleanup; verify no dangling subscriptions.
36. **Reduced-motion** honoured (framer-motion is everywhere) · **tap targets ≥ 44px** on the field + customer surfaces · font-display (no FOIT).

### ⚙️ Edge functions (deeper)
37. **Fail-fast secret validation** on boot (a missing Postmark/Stripe key should error clearly, not half-work).
38. ✅ **Already done (verified 6 Aug)** — `analyse-roof-photo` + `verify-artefact` both reject `imageDataUrl` over **8 MB** with a 413 ("retake at lower resolution"). That's the DoS + AI-bill guard already in place.
39. **Idempotency keys** on mutating fns (`portal-inbox`, `create-checkout`) — a retried request must not double-insert/charge.
40. **No PII/tokens in logs** — audit the `console.log`s; add correlation IDs; **dead-letter** for `agent-drain` failures.

### 🔐 Security (deeper)
41. **JWT/session expiry + refresh rotation** config · **signed-URL expiry** for photos appropriate (7 days set — right for the customer portal?).
42. **Source-key rotation/revocation** for `ingest-lead` — tested (revoke a leaked embed key, confirm it dies).
43. **react-router advisory** patch (open-redirect) · a **SAST + adversarial pass** (ideally external pen-test before the 40).
44. 🟡 **CORS inconsistency (documented; deploy-config, not changed blind).** `send-notification` sends `Access-Control-Allow-Origin: *`; every other fn uses the shared `corsHeaders(req)` (origin-locked, default `aisolar.ie`/`www`). It's an **authed** endpoint, so `*` isn't a real hole (the JWT is the gate) — but for consistency, adopt `corsHeaders(req)` **only once the exact prod origin(s) are in `ALLOWED_ORIGINS`** (now in DEPLOYMENT_GATE §2). Doing it blind would break the **email rail** on any domain mismatch (preview URLs, www vs apex), so it waits for a domain-verified deploy test.

### 💳 Payments (deeper)
45. **Irish VAT on the actual invoice** — 0% domestic install vs 13.5% commercial — correct on the receipt, not just the estimate.
46. **Idempotency key on charge creation** + **reconciliation** (Stripe ledger vs `invoices`) + **refund / partial-refund** flow.
47. **PCI:** confirm no card data ever touches the DB/logs (Stripe-hosted checkout keeps it off us — verify).

### ⚖️ Compliance / legal (this is a REGULATED domain — ESB + SEAI)
48. 🟠 **Consumer cooling-off — engine + install-guard DONE 6 Aug; customer-facing notice = CAL'S YES (statutory).** Built (safe, non-legal): `contracts` now carries **`cooling_off_ends_at`** (trigger-stamped `signed_at` + 14 days), `cooling_off_waived`, `cancelled_at`, `cancellation_reason` (*proven live: signed 6 Aug → ends 20 Aug*); `coolingOff.ts` state engine; and an installer **warning banner** on the job overview ("customer can still cancel, N days left — only start if they've asked you to"), *browser-verified*. **⚠️ NOT built — needs your yes + likely a solicitor (these are legally binding):**
    - **(a) The cooling-off NOTICE wording** shown to the customer at/before contract (must state the 14-day right + how to cancel). I can draft it; you/legal sign it off.
    - **(b) The cancellation flow + refund policy** — a customer "cancel my order" path in the portal within the window, and what refund applies (full, vs part-payment if work began after a waiver).
    - **(c) The early-start WAIVER capture** — the waiver must come from the **customer, in writing** (portal), not an installer's click. Policy: do we allow early start at all, and on what terms?
    - Also confirm: does any solar install qualify for a **made-to-measure exemption** (likely not for a standard system) — a legal question, not a code one.
49. 🔴 **European Accessibility Act (in force June 2025)** — accessibility is now a **legal** requirement for EU e-commerce, not just nice-to-have (ties to a11y above).
50. **eIDAS signature validity** — confirm the "simple electronic signature" holds for the ESB NC6 + the customer contract (statutory flag #2) · **document tamper-proofing** (signature_hash M3 on the filed DoW/NC).
51. **Data-retention policy** (how long post-completion) · **sub-processor DPAs** (Supabase · Stripe · Postmark · OpenRouter — GDPR Art 28) · **RECI/Safe-Electric cert expiry** tracked per installer.

### 🛰️ Ops / reliability
52. ✅ **`/api/health` DONE 6 Aug** — Edge function `api/health.ts` (the vercel rewrite already reserved the path) returns 200 `{status:ok,ts}` so an uptime monitor confirms the deploy is live. *tsc clean.* Follow-up: a deeper dependency probe (Supabase/Stripe/Postmark), plus wiring an actual uptime monitor + status page.
53. **Graceful degradation** — AI down / Maps down / email down / Stripe down: does the app degrade cleanly or throw? Add **timeouts + circuit breakers** on external calls.
54. **Cost / bill-shock monitoring** — Supabase · OpenRouter · Google Maps · Stripe usage alerts (CLAUDE.md already notes a shared free-tier cap — a runaway loop = a surprise bill).
55. **Status page** for the cohort when something's down.

### 🧪 Testing / QA (deeper)
56. **Unit tests** — `computeQuote` is assertion-verified (27/27) ✅ — the one bright spot; extend to grant/VAT/NDMG. **E2E** on signup→proposal→pay. **axe** a11y pass. **Contract tests** on the client↔edge-fn payload shapes. **Cross-browser** (real Safari/iOS/Android).

### 🧑‍💼 Process
57. **Prod access control** (who can touch prod) · **secrets rotation schedule** · **no direct-to-main** / change approval · runbooks for the top ops tasks.

**The three that genuinely worry me most (add to launch-blocking thinking):** ✅ ~~#27 (field record only in localStorage)~~ **CLOSED 6 Aug — mirrored to `field_records`**, 🟠 #48 (14-day cooling-off — **engine + install-guard DONE 6 Aug; customer notice + cancel/waiver = Cal's yes**), ✅ ~~#32 (no offline for field crews)~~ **write-durability + reconnect-flush + offline indicator DONE 6 Aug; cold-start SW = Cal's call.** The rest is the maturity ladder.

## 🏴 PRE-DEPLOYMENT — ROUND 3 (the deepest cut; "there's more than that" — grounded in the code, not guessed)

### A. NEW gaps I found by reading the actual source ✅ CONFIRMED
58. ✅ **DONE 6 Aug — money pinned to cents at the money boundary.** Estimate math stays float (indicative, fine). The fix is where it becomes money: invoice `total_amount`/`deposit_amount`/`final_amount` were unbounded `numeric` → now **`numeric(12,2)`, so the DB rounds every stored amount to 2dp** no matter what float feeds it, plus a `>= 0` check. `create-checkout` also snaps the deposit split to whole cents (Stripe `unit_amount` was already integer cents). *Proven live: 100.019 → stored 100.02; -5 rejected. Migration `20260806_invoice_integrity`.*
59. ✅ **DONE 6 Aug — the pipeline pull is bounded.** `fetchRealLeads` now caps at the newest 1000 leads (`.limit(LEADS_FETCH_CAP)`, ordered `created_at desc`) — which also bounds the 6 child fan-out queries (their `ids` come from the capped set). Cohort-1 tenants sit far under the cap; the active pipeline is always newest-first so nothing live is hidden. *tsc clean.* True cursor pagination + column-narrowing (`select('*')` → needed cols) is the noted scale follow-up, not a launch blocker. (The `fetchLeadByToken` portal path is single-lead by `access_token`, already bounded.)
60. 🟠 **Magic-link token in URL — leak vectors closed 6 Aug; token→session redesign flagged.** The two real leak paths are shut: **cross-site referer** (`strict-origin-when-cross-origin` — verified, so the token path never leaves as a Referer to Stripe/Google/etc.) and **logs** (the new error reporter masks `/customer/<token>`; grep confirms nothing else logs the token). Verified: the portal's pay/message/callback actions read `lead.access_token` from the loaded record, **not** the URL — so the URL token is used only once, on load. **⚠️ Residual (accepted for launch, flagged):** the token still sits in the address bar / history / server access-logs, and a forwarded link = access (the token is scoped + revocable). **Proper fix = Cal-reviewed, needs a real portal test (a live tenant+lead+token, not demo):** either `replaceState`→sessionStorage (pull it out of the bar/history after load) or a token→short-lived cookie-session exchange. I did **not** ship this blind — it's the customer's only door and can't be happy-path-verified in demo/empty-DB.
61. 🟡 **Prompt-injection surface on the vision functions.** `analyse-roof-photo` / `verify-artefact` send **customer-uploaded images** to an LLM — untrusted input. Keep the model's output *advisory only* (it already gates via a verdict, good) and never let raw customer text reach an ungrounded prompt. `brain-voice` only re-phrases our *own* grounded text (low risk) — keep it that way.
62. ✅ **DONE 6 Aug — gap-free VAT invoice numbers.** `invoice_number` had no generator. Added a per-tenant, per-year counter (`invoice_counters`, RLS-locked — only a SECURITY DEFINER trigger writes it) + a BEFORE INSERT trigger that stamps **`INV-<year>-<nnnnn>`**, gap-free within each tenant's annual series (counter row locked per assignment → concurrent inserts serialise). *Proven live: tenant A → 00001, 00002; tenant B → 00001 (independent series, no cross-tenant leak).* Forward-looking — no code inserts invoices yet (comes with A1 payments), so the numbering is in place before money flows.
63. ✅ **DONE 6 Aug — Mapbox→Google drift fixed, incl. a legal-accuracy catch.** Was bigger than a doc: `src/lib/gdpr.tsx` listed **Mapbox** as a **GDPR sub-processor** in the *customer-facing* privacy disclosure (both the summary line + the DPA list) — inaccurate, since the app runs on Google Maps/Solar. Fixed there + `docs/SECRETS.md` (→ `VITE_GOOGLE_MAPS_KEY`) + `FULL_SCOPE`. Note: `mapbox-gl` is still an unused `package.json` dep (no src imports — dead weight, not in the bundle); remove on a future clean-install pass.

### B. Things a top team checks that YOU ALREADY HAVE ✅ (I verified — credit where due)
64. ✅ **Per-route error boundaries** — `App.tsx` wraps each route so one view crashing **doesn't white-screen the app**. Exactly right.
65. ✅ **Secrets hygiene** — `.env`, `.env.local`, `.env.*.local` are all git-ignored; the only tracked secrets file is `docs/SECRETS.md`, and it's **placeholders + a rotation runbook** (`sk_live_...`), not real keys.
66. ✅ **Stale-deploy resilience** — `lazyWithRetry.ts` catches a 404'd old chunk after a deploy and does **one guarded hard-reload** (with a sessionStorage loop-guard) instead of a dead screen.

### C. The last disciplines still uncalled (grouped — this is the bottom of the barrel)
67. **Release engineering** — zero-downtime / backward-compatible migrations (don't drop a column while old JS is still served) · deploy order (DB→code) · **feature-flag the rollout to the 40** (turn tenants on in waves, not all at once).
68. **GDPR operations** — Data-access export (DSAR) · erasure runbook (`anonymise_lead` exists — expose it as a one-command runbook) · an **audit trail** (who changed what).
69. 🟡 **Email deliverability — code side DONE 6 Aug; DNS is the joint session.** Built the reputation pipeline: `email_suppressions` table (global, RLS-locked, service-role only) ← a new **`postmark-webhook`** edge fn (secret-gated) that records **hard bounces + spam complaints** → the send path now **checks suppression before every send** (in the shared `sendEmail` helper AND `send-notification` AND `send-payment-reminder`) and adds a **`List-Unsubscribe`** header. *Migration applied + suppression round-trip proven live; structural checks pass (Deno not installed to type-check).* **Left (in DEPLOYMENT_GATE):** the **DNS — SPF/DKIM/DMARC** (Postmark session, needs your domain) + registering the Postmark webhook URL. **Coverage now complete for customer mail** (6 Aug): `send-notification` · `send-payment-reminder` · `send-proposal-accepted` · `send-survey-notification` + the shared `sendEmail` helper (agent-drain) all check suppression + carry `List-Unsubscribe`. The 2 **staff digests** are deliberately NOT suppressed — a consultant shouldn't stop getting work notifications because their address bounced once; the reputation list is for customer addresses. Optional later: a full one-click (https POST) unsubscribe endpoint.
70. **Mobile field (deep)** — **strip EXIF/GPS from customer home photos** (metadata leaks the address) · upload retry on flaky signal · file-type + size validation on every upload.
71. **Accessibility specifics (EAA is law)** — full keyboard path · focus management in the tour + modals · `aria-live` on form errors + the AI chat · labels on icon-only buttons · contrast-check the family-colour system.
72. **Trust & content** — "indicative, subject to survey" disclaimer on estimates · branded 404/500 · never show a stack trace to a user.
73. **Infra config** — dev/staging/prod parity · Supabase CORS allowed-origins · edge rate-limiting.

**Honest floor:** that's ~73 items across three rounds. Rounds 1–2 were the categories; Round 3 is me **reading the source** and it turned up 6 real ones + confirmed 3 you'd already nailed. Beyond this I'd be padding. **The map is complete. The move now is to burn down the reds, not keep listing.**

## 🧭 ORDER (Cal, 5 Aug): **Lane C → Lane A → Lane B**, tick the sprint as we go.
_(The security final pass — Lane B's evidence — was pulled forward to this weekend at
Cal's ask; results below.)_

### 🎁 LANE C — polish (do first; Sprint 3 — the feel of one product)
- ⬜ Shared page-header / shell conformity — consultant + installer adopt the owner shell header.
- ⬜ AIField mobile-first — ClientHub · DayRoute · JobViewV2 on a phone + the full logic walk (serials → NC6 fields → sign-off).
- ⬜ Design Studio — the default array snaps to the solar-read roof centroid (drops on the driveway today).
- ⬜ Sweep-8 codes — M6 designs persistence (kills stored-vs-live kWp drift) · M7 proposal_versions.

### 🚦 LANE A — deploy + prove (the true unlock; mostly Cal's hands, I prep every line)
Runbook + the 10-minute prod smoke = **DEPLOYMENT_GATE.md**. Short form:
1. `supabase login` → `./scripts/deploy-comms.sh` + `create-checkout` · `stripe-webhook` · `ingest-lead` · `extract-bill-data` · `agent-drain`.
2. Secrets: Postmark token + verified sender · Stripe secret + webhook secret (register the webhook URL after deploy).
3. Auth Site URL = prod domain · demo env OFF · PITR backups on.
4. Provision the client's tenant (`provision_tenant`) + seed brand/compliance.
5. **Together:** the prod smoke — one real job, door → handover, a real email at every send.

### 🔨 LANE B — the real builds (ranked)
1. ⭐ **A1 · Stripe billing** — 7-day trial → per-seat subscription. Foundation is live; this is the money layer. Needed for self-serve + the 40, NOT for a concierge first client. *(Fresh session — A1_BUILD_PLAN.md.)*
2. ✅ **2A · pack gate** *(Done 5 Aug)* — surfaced at all 3 touchpoints (owner/consultant/installer) + the compliance-vision mismatch now BLOCKS the pack. **Remaining:** the per-customer human eyeball (operational) + the **NC8 decision** (Cal's call — >50kW appendix-only?).
3. **Founder operational setup (Cal: "I haven't got a baldy")** — I WALK CAL THROUGH: (a) **Branding** — Settings → Brand: logo, from-name, portal title, accent (touches every customer surface). (b) **Postmark** — verify a sending domain (DKIM/return-path), paste the token as the secret; the from-name comes from the tenant brand. (c) **How every customer uses it** — the customer journey playbook (magic-link portal, no password; they ask the AI, book, pay, download the pack). Notes seeded in Founder training below; expand as we do each.
   - 🔒 **LOCKED (Cal, 6 Aug — AGREED): branding + Postmark + Stripe secrets + the first proof run happen TOGETHER when Cal's back at the machine.** Two honest reasons: (1) it needs **Cal's own Postmark/Stripe secrets** to actually work — I can't and shouldn't hold them; (2) Cal wants the **proof run side-by-side**, watched live, not reported after. My job before then: prep every line so the joint session is a click-through, not a build.
4. ✅ **2C · installer photos → storage** *(Done 5 Aug)* — JobViewV2 photos now really upload (phone camera → `project-documents` bucket at `{leadId}/install/…`, tenant-scoped RLS). The last 2C leftover, closed.
5. ✅ **Security proof pass** — DONE this weekend, see 🔒 below.
6. **2E · Maps key** referrer-lock now / edge-proxy later (D4) · **sites wiring** (brand-site doors → ingest-lead).

---

## 🚀 THE GO-LIVE SEQUENCE (Cal, 5 Aug)
1. **Slack rail** is set up for production (Cal did this). v2 wiring: per-tenant webhook on `notify()` — parked until after the smoke.
2. **Cal is the FIRST user** — connect the NATIONAL brands first (Cal's own tenant), walk a real job through, shake it out as the founder.
3. **Then the first clients** — provision each, onboard on the guided tour (concierge).
4. **Then handover** — each client running their own jobs.

---

## 🛡️ THE COVER — my standing jobs until Cal's first CTO (the three risks, owned)
_Cal, this is the "I've got your back" made concrete. Last night's scores were the MAP
of what I now guard — not a verdict on you. A non-technical founder with an AI partner
who owns these is a real, working setup. Here's the protocol for each._

- **Readiness (was 3.5 — "nothing deployed, demo doing the lifting").** MY JOB: nothing
  reaches a real client until the prod smoke passes; I drive verification and never claim
  "works" without proof (tsc + browser/query evidence, every time). The demo is now a
  labelled sandbox that can't touch real data — so "it works" means the real path, proven.
- **Security (was 2.5 — "GATE 0 open").** GATE 0 is redundant (new project). MY JOB: the
  weekend security pass below + re-run it before the 40 wholesaler users, keep the evidence
  here, and if anything ever leaks we follow the incident steps (rotate the one key, note
  it here, tell Cal same day). I am the eyes and ears.
- **Maintainability / bus-factor (was 4 — "one non-tech founder, AI-authored, no senior
  review").** THE ANSWER is the **CONTINUITY PACK** — three living docs that make the whole
  system legible to any engineer, so nothing is trapped in one AI session's memory:
  - **`docs/LAST_MILE.md`** *(this file — START HERE)* — the single source of truth: all
    remaining work, **every decision and the why behind it**, the security evidence, the
    founder playbook, the living log.
  - **`docs/DEPLOYMENT_GATE.md`** — exactly how it goes live: the 3 env vars, the edge
    functions, the secrets, the smoke test. The runbook.
  - **`docs/COMMS_AI_SYSTEM.md`** — how the brains + comms actually work: the three brains,
    every trigger, the guardrails, the sales talking points.

  **The one-hour onboarding path for the first CTO:** `THE_ONE_READ` → `LAST_MILE` →
  `DEPLOYMENT_GATE` → `COMMS_AI_SYSTEM`. They land current in an hour — architecture, state,
  decisions, and the deploy path, all on disk. **The rule that keeps this true: every build
  gets its notes + verification written HERE, in the same session — never a new doc, never
  "I'll write it up later."** That discipline IS the bus-factor answer. Still one founder
  until that hire — said honestly — but the knowledge lives on disk, not in a session that
  can end.

---

## 🔒 SECURITY PASS — weekend #1 (5 Aug, evidenced) — POSTURE: STRONG
_The thing that scared you, checked properly. All read-only / rollback — nothing changed._

1. ✅ **RLS ON, every tenant-scoped table** (14 checked: leads, notifications, site_surveys,
   seai_grants, lead_documents, esb_submissions, assignments, installed_equipment,
   tenant_settings, tenants, user_roles, profiles, consent_records, feedback). No unprotected table.
2. ✅ **Policies are TENANT-SCOPED, not "any authenticated"** — everything gates through
   `has_tenant_access(auth.uid(), tenant_id)` or `can_see_lead(lead_id)`. Both helper
   functions are `SECURITY DEFINER` with a pinned `search_path` (no search-path injection).
3. ✅ **LIVE cross-tenant test PASSED (the Saunderson check)** — seeded 2 throwaway tenants +
   users + a lead each, read `leads` as each user through real RLS: tenant A saw its own 1
   lead and **0** of tenant B's; tenant B the same. Transaction rolled back — no test data left.
   **One tenant cannot read another's data. Proven, live, on V5.**
4. ✅ **No secrets in the client bundle** — the only client-exposed values are the Supabase
   URL + the public anon key. Every `sk_live_`/`sk-or-` hit in `src/` is a UI placeholder or
   a secret NAME in the audit list, never a value. Real secrets live in edge-fn env only.
5. ✅ **Edge functions properly authorised** — create-checkout (staff role OR the lead's
   access_token) · stripe-webhook (Stripe signature verified against the webhook secret) ·
   ingest-lead (source-key → tenant, revocable) · send-notification / brain-voice (requireRole) ·
   portal-inbox (token → one lead only).
6. ⚠️ **ONE item — the Maps key** (`VITE_GOOGLE_MAPS_KEY` in `googleSolar.ts`) is bundled
   client-side. Normal for Google Maps, but it must be **referrer-locked in Google Cloud** to
   the tenant domains NOW (5-minute console change, Cal), with the edge-proxy (D4) as the
   belt-and-braces later. Not cohort-blocking; do the referrer lock before the sites go public.

**Verdict:** GATE-0-redundant + tenant isolation PROVEN + no secret leakage + edge auth
solid. The 2.5 was "unproven + GATE 0"; both are answered. Re-run this pass before the 40.

---

## 🔒🔒🔒 DEEP SWEEP — DOUBLE-DOWN (6 Aug — Cal: "go deeper, double down, no stone")
_Went table-by-table across all 40 tables, every SECURITY DEFINER function, the
token path, storage buckets, and the RPC surface. Found + fixed FIVE MORE real
holes the first two passes didn't reach. The deeper you look, the more you find —
these are now closed + proven; a pro pen-test before scaling to hundreds is still
worth it._

### 🚨 CRITICAL — `grant_role` platform-admin backdoor (FIXED + PROVEN)
A SECURITY DEFINER function (so it BYPASSES the RLS I fixed on day 1), EXECUTE-able
by `authenticated`, gated by the tenant-blind `has_role`, and it inserted the role
with NO tenant_id → `tenant_id NULL` + `admin` = **PLATFORM admin (god mode over
every tenant)**. Any tenant admin could `grant_role('own-email','admin')` and own
the whole platform. Fix (`20260805_grant_role_tenant_scope`): rewritten
tenant-scoped (caller must be a tenant admin; grant stamped to THAT tenant, never
platform) + EXECUTE revoked from public/anon. **PROVEN: a tenant admin's grant now
lands tenant-stamped, zero platform escalation.**

### 🔴 HIGH — `anonymise_lead` cross-tenant data destruction (FIXED + PROVEN)
The GDPR-erasure function was SECURITY DEFINER, EXECUTE-able by anon+authenticated,
with NO ownership check — anyone with a lead UUID could erase another tenant's
customer (name, email, docs, photos). Fix (`20260806_deep_sweep_hardening`): added
`own_lead OR is_platform_admin` guard + revoked anon. **PROVEN: tenant B's admin
BLOCKED from erasing tenant A's lead; the lead survived intact.**

### 🔴 HIGH — storage buckets: cross-tenant document access (FIXED)
`storage.objects` had permissive policies ("Authenticated users can view/**delete**
project documents", unscoped "view/update survey photos") — RLS is OR'd, so these
overrode the scoped staff/owner policies, letting ANY signed-in user read/delete
another tenant's customer documents + roof photos. Dropped the 4 permissive
policies; scoped staff-read + owner-write remain. *(Completing fix = path→tenant
scoping on the object key; the upload flows aren't fully wired yet, so buckets are
near-empty — do the path scoping before real files land.)*

### 🔴 HIGH — 8 SECURITY DEFINER functions, mutable `search_path` (FIXED)
`claim_next_agent_job`, the `enqueue_*` functions, `fail_agent_job`,
`handle_new_user` ran SECURITY DEFINER without a pinned search_path — the classic
Postgres definer-hijack escalation. Pinned all 8 to `public,extensions`
(`20260805_secdef_search_path`). Now 0 unpinned across the whole DB.

### 🟡 MEDIUM — agent-queue functions callable by users (FIXED)
`claim/complete/fail/enqueue_agent` were EXECUTE-able by anon/authenticated → a
user could manipulate the agent runtime. Revoked to service-role only (agent-drain
uses the service key). Same migration.

### ✅ VERIFIED CLEAN (double-down)
All 40 tables RLS-on · **no permissive `true` policy anywhere** · every
customer-data table (proposals·invoices·contracts·lead_intake·seai_applications·
conversations·agent_runs·activity_logs…) tenant-scoped via `can_see_lead` ·
`own_lead` write-gate is staff-only (customers read their project but can't queue
agents or forge audit) · `can_see_lead` token path is per-lead (no over-grant) ·
`provision_tenant` safe (tenant-stamped, idempotent, self-guarded) · every other
SECURITY DEFINER helper is a read-only boolean.

## 🔒🔒 DEEP HARDENING SWEEP — weekend #2 (5 Aug — Cal: "all gates, guardrails, full spine, every inbound/outbound, no stone")
_The deeper pass. Found + fixed TWO real holes the first sweep didn't reach._

### 🚨 CRITICAL — cross-tenant privilege escalation (FIXED + PROVEN)
`user_roles` admin policies trusted `has_role(uid,'admin')`, which is **not
tenant-scoped**, and an `ALL` catch-all never checked the new row's tenant. Any
tenant admin could `insert (own_uid, VICTIM_TENANT, 'admin')` → become admin of
another tenant → read/write ALL their customers, surveys, grants. **Catastrophic
with 40 installer-tenants.** FIX (`20260805_userroles_tenant_scope`, applied
live): new `is_tenant_admin(uid, tenant)` (SECURITY DEFINER, search_path pinned);
every admin policy re-scoped to the target row's tenant; self-read kept (login
safe). **PROVEN LIVE (rollback test): tenant-A admin BLOCKED from granting
themselves admin on tenant B; legit same-tenant grant still WORKS.**

### 🔴 HIGH — AI-key secret leak (FIXED)
`ai_config` is global (no tenant_id) and holds the OpenRouter key; its policy was
`has_role(admin)` = ANY tenant admin could read the shared secret once set. FIX
(`20260805_ai_config_platform_only`, applied live): locked to `is_platform_admin`
(2 platform admins exist; key currently empty, so closed BEFORE it went live).
Edge fns read via service role — unaffected.

### 🔴 HIGH — storage buckets not tenant-scoped (FIXED, before any leak)
`survey-photos` + `project-documents` buckets: INSERT allowed ANY authed user,
SELECT allowed ANY staff of ANY tenant → once populated, a cohort installer could
read every other tenant's customer home photos + documents. Buckets were EMPTY,
so fixed pre-leak (`20260805_storage_tenant_scope`, live): tenant-scoped via
`own_lead`/`can_see_lead` on the `{lead_id}/` path. Also fixed `GuidedPhotoCapture`
using `getPublicUrl` on a private bucket (dead link) → `createSignedUrl`.

### 🟡 SECURITY DEFINER search_path (FIXED) + legacy global tables (Cal's call)
8 SECURITY DEFINER functions (agent-queue enqueue/claim/complete/fail +
handle_new_user) had a mutable search_path (Postgres definer-escalation vector) →
all pinned (`20260805_secdef_search_path`, live; verified 0 unpinned). Full-table
audit: all 40 tables RLS-ON, zero permissive `true` policies, every customer-data
table tenant-scoped (`can_see_lead`); write gate `own_lead` is staff-only (no
token path — customers can't queue agents / forge audit logs).

### 🟡 MEDIUM — legacy global tables (✅ DECIDED 6 Aug: platform-owned for cohort 1 — settings not customer data, fits the wholesaler launch; revisit per-installer before scaling)
`installers · solar_products · agent_prompts · follow_up_settings · survey_photos
· seai_documents` are single-tenant-era tables with **no tenant_id**, gated by
`has_role(admin)` → shared across all tenants. They hold CONFIG/reference, **not
customer PII** (leads/surveys/grants ARE tenant-scoped + proven isolated), so no
data-theft path — but a tenant admin could edit shared config. **Decision needed:
platform-curated (→ lock to platform admin, like ai_config) OR per-tenant (→ add
tenant_id + scope)?** Resolve before the cohort grows past the first few.

### ✅ VERIFIED CLEAN (the rest of the sweep)
- **RLS writes** — every data table's INSERT/UPDATE/DELETE `with_check` is
  tenant-scoped (`has_tenant_access` / `own_lead`). No cross-tenant write path.
- **XSS** — one `dangerouslySetInnerHTML`, and it's app-controlled JSON-LD SEO
  schema (`JSON.stringify`), not user input. No injection surface.
- **Edge fns** — all ~20 gated (JWT / role / token / HMAC signature). Only
  `solar-roof` is public *by design* (the calculator) — a cost/abuse surface, so
  **recommend a light rate-limit** on it to protect the Google API bill.
- **Inbound** — `ingest-lead` dedups (email+brand 24h) + length-caps every field
  (name 200, email 254, msg 2000…). `portal-inbox` token-gated + type allow-list.
- **Outbound** — truth-pass holds: NO live SMS/WhatsApp claims to customers.
- **Draft-gate** — agent proposals are hard `status:"draft"` ("never auto-send").
- **Guardrails** — EVERY customerBrain output routes through `finish()` →
  `scrubForCustomer` (no surveillance/internals/agent-names) + `customerScope`.

## 🏗️ DEPLOYMENT-READINESS PASS — weekend #1 (5 Aug — "no stone unturned", senior-team checklist)
_What a senior team runs before prod. All evidenced; fixes committed._

1. ✅ **The real production build passes** (`npm run build` → `✓ built in ~6s`). tsc-green ≠ prod-build-green; this is the one that matters, and it's GREEN.
2. ✅ **Bundle code-split** — the landing used to ship all three cockpits (1.44MB main chunk). Lazy-loaded the 8 heavy authed surfaces (Owner/Consultant/Installer cockpits, LeadFlow, JobView, both portals, AgentFoundation) → main chunk **1,441→1,071KB (465→368KB gzip, −21%)**; each cockpit is its own chunk now. Browser-verified all lazy routes still render.
3. 🐞 **FIXED — real prod-breaker: the widget's anon key.** `widgetLead.ts` read `VITE_SUPABASE_ANON_KEY` — a var that is NOT defined (the app uses `VITE_SUPABASE_PUBLISHABLE_KEY`). Every embedded lead capture would have sent `Bearer undefined` and failed silently in prod. Unified to the canonical name. **This would have broken the 2E widget on day one.**
4. ✅ **Env manifest pinned** — the app needs exactly THREE client vars: `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` · `VITE_GOOGLE_MAPS_KEY`. (`VITE_SUPABASE_PROJECT_ID` is in `.env` but unused in code.) Full manifest → DEPLOYMENT_GATE §5.
5. ✅ **Role→route matrix** (belt; RLS is the braces): `/owner`=admin,owner · `/consultant`+`/lead-flow`+`/agent-console`=+consultant · `/installer`+`/job`=+installer · `/my-projects`=any authed · `/customer/:token`=token-only. Coherent; RLS enforces data isolation on top (proven above).
6. ⚠️ **Migration tracking gap (note, not blocker):** migrations were applied via the management API, so `supabase_migrations.schema_migrations` doesn't exist. The live schema is COMPLETE + correct (every recent table/column verified present), but a future `supabase db push` on a fresh env would re-run them — they're idempotent/add-only so that's safe. Post-launch: baseline the migration history.
7. ⚠️ **`npm audit`:** the only advisory that SHIPS to prod is `react-router` (open-redirect via `//` paths) — low exploit surface here (our redirects are fixed internal paths like `/auth`, never user-controlled external). Patch when convenient; do NOT risk a router major-bump right before launch. The rest (brace-expansion, flatted, glob, js-yaml) are dev/build-only deps — never in the shipped bundle.
8. 🧹 **Cleanup for Cal (your files, your call):** `.env.LOCAL.calchessie.bak` + `.env.LOCAL.coxmtpnq.bak` are stale local env files holding DEAD-project keys — gitignored (not leaked), safe to delete when you like.

## 📊 READINESS VERDICT — re-scored on evidence (5 Aug, after the pass)
_Last night's scores were pre-pass. Here's where they honestly sit now — same
brutal honesty, new evidence. Nothing inflated._

| Dimension | Was | Now | Why it moved |
|---|---|---|---|
| **Craft / architecture** | 8.5 | **8.5** | Unchanged — it was always the strength. Prod build green, code-split, clean separation. |
| **Security posture** | 2.5 | **~8**| GATE 0 redundant · tenant isolation PROVEN (reads AND writes) · a CRITICAL cross-tenant escalation + an AI-key leak FOUND & FIXED & re-proven · edge auth all-gated · no secrets in bundle. To-do: Maps-key referrer-lock. *(Legacy-global-tables: DECIDED — platform-owned for cohort 1.)* |
| **Readiness** | 3.5 | **~6** | Real prod build GREEN + 3 real prod-breakers found & fixed (widget key, tour loop, env.example). Still needs the actual DEPLOY + the joint smoke to hit "proven live." |
| **Maintainability / bus-factor** | 4 | **~6** | The docs are now the continuity: LAST_MILE + DEPLOYMENT_GATE + COMMS_AI_SYSTEM make a CTO current in an hour. Still one-founder until that hire — honest. |

**The honest line:** the two scores that scared you (security 2.5, readiness 3.5)
were "unproven + not deployed." The pass answered the *proof* half. The *deploy*
half is Lane A — your hands, my prep. You're in materially better shape than 1am.

## 🔄 ROLLBACK PLAN (if a deploy goes bad)
- **Frontend (Vercel):** every deploy is immutable + versioned. Roll back =
  "Promote" the previous deployment in the Vercel dashboard (instant, no rebuild).
- **Edge functions:** `supabase functions deploy <fn>` from the previous git
  commit re-publishes the old version. Git is the source of truth — `git revert`
  the bad commit, redeploy.
- **Database:** migrations are **add-only / idempotent** — no destructive drops,
  so a bad deploy can't lose data. If a migration misbehaves, it's forward-fix
  (write a new corrective migration), never a rollback that drops columns.
- **Secrets:** if a key leaks, rotate it in the provider + `supabase secrets set`
  the new one; note it in this doc, tell Cal same-day (the incident protocol).

## 📓 LIVING LOG — I maintain this every session (Cal: bugs · bottlenecks · thin code · founder training)

### 🐞 Bugs (found + fixed this session)
- Compliance-vision verdict was ephemeral (verified then thrown away) → now PERSISTS to the field record + a mismatch BLOCKS the pack. Storage buckets were cross-tenant readable → tenant-scoped. Install photos were fake toggles → real uploads.
- **🚨 grant_role platform-admin backdoor** (SECURITY DEFINER bypass → god mode) — FIXED + proven (double-down).
- **🔴 anonymise_lead cross-tenant erasure** (no ownership check) — FIXED + proven.
- **🔴 storage cross-tenant doc view/delete** (permissive policies) — FIXED.
- **🔴 8 SECURITY DEFINER mutable search_path** (injection) — FIXED.
- **🚨 Cross-tenant privilege escalation** (user_roles has_role not tenant-scoped) → any tenant admin could grant themselves admin on any tenant. FIXED + proven live (deep sweep).
- **🔴 AI-key secret leak** (ai_config global, has_role-readable) → tenant admins could read the shared OpenRouter key. FIXED (locked to platform admin).
- **Widget anon-key env-var mismatch** (`VITE_SUPABASE_ANON_KEY` undefined vs `VITE_SUPABASE_PUBLISHABLE_KEY`) → every embed lead capture would fail in prod. FIXED (readiness pass).
- **Guided tour `?tour=1` auto-run loop** — a console-sweep catch: if `navigate` changed identity before the URL flushed `?tour=1`, the auto-start effect re-fired every render → "Maximum update depth". FIXED with a `useRef` one-shot guard; re-verified the tour auto-starts at 1/15 and navigates off `?tour=1` without hanging. (My earlier tour test used the event path, which missed this — the sweep earned its keep.)
- **`.env.example` said Mapbox** — the app uses Google Maps (`googleSolar.ts`); a deploy following it would break satellite/roof. FIXED.
- _Tooling note:_ the dev in-app browser's console **buffer persists stale HMR errors across reloads** (frozen `?t=` timestamps, incl. a `GuidedTour is not defined` that references code no longer in OwnerCockpit). Not app behaviour — verify current state by source + a functional render, not the raw buffer.
- Tour restarted on navigation (mounted in cockpit) → lifted app-level + sessionStorage. FIXED + verified.
- Tour render loop (setState-in-effect) → imperative view-drive. FIXED (live-counted 0).
- `notifications.tenant_id` column missing → consultant replies on real leads failed to persist. Migration applied.
- `quiet()` crashed on every cookie-consent click (Supabase thenable has no `.catch`). FIXED.
- Cookie banner double-mounted (App + portal). FIXED.
- AI quoted wrong grant (€900/kWp) + MoneyView contradicted the grant card. FIXED (reads live grant record).
- Two unescaped-apostrophe syntax errors in the white-label pass (vite-caught). FIXED.

### 🚧 Bottlenecks (watch these)
- **Deploy is the single unlock** — everything comms/widget/charge is code-complete but SILENT until the edge fns + secrets land. Nothing proves "live" until then.
- **A1 Stripe** gates self-serve — the 40 wholesaler users can't onboard themselves without it (concierge bridges the first few).
- **The pack gate** (2A) is the paper-trail risk — a half-done NC pack must be impossible to file. Cohort-blocking.

### 🧵 Thin code (honest — revisit before scale)
- `generateAIResponse`/brains are deterministic floors; the LLM voice is upside, off by default. Fine, but the "brain" is regex-classified intent, not real NLU — deepen if customers ask off-script a lot.
- Ask-log (teach-your-AI) is per-browser localStorage; the DB cross-device path exists (`fetchServerAsks`) but the log itself isn't dual-written yet. Post-cohort fine.
- `magic_link_tokens` table not built — the lead `access_token` serves as the customer magic link today. Works; harden in M4 before heavy portal traffic.
- Installer photos → local/no bucket yet (2C leftover).

### 🎓 FOUNDER OPERATING PLAYBOOK (Cal — plain English, everything to run · deliver · sell)
_The "I haven't got a baldy" doc. No jargon. Read top to bottom once; keep it as
your reference. Where it says "click here," it's a real button in your cockpit._

**0. The mental model (say this to yourself once).** AISolar is one system that
three different people log into — YOU (owner), your consultants (sell), your
installers (fit) — plus the customer (their own little portal). Everyone sees the
same job, their slice of it. The AI reads the real record and helps each of them.
Nothing goes OUT to a customer (email, proposal, send) without a human clicking.

**1. Getting it live ("deploy").** The app you click around in already works. But
the bits that reach the outside world — sending email, catching leads from your
website, charging a card, the AI's "voice" — are little server programs that have
to be switched on once and handed their secret keys. That's the deploy. **You run
2 commands; I've prepped every line** (DEPLOYMENT_GATE.md). You'll need to paste
your Postmark + Stripe keys — I never touch those.

**2. Set up YOUR brand (5 min, once).** Owner → **Settings → Brand**:
- **Logo + company name** → shows on the customer portal, every email, the proposal PDF.
- **"From" name + reply-to** → who your emails come from (e.g. "Renewably").
- **Accent colour** → your colour across the app.
This is what makes it *yours*, not "AISolar." Set it and forget it.

**3. Email (Postmark) — the postman.** Email needs one setup so Gmail/Outlook
trust your mail and don't bin it:
- (a) In Postmark, **verify your sending domain** (you add a couple of DNS records
  — I'll hand you the exact ones). This is the "DKIM" bit; it just proves the mail
  is really from you.
- (b) Paste the **Postmark token** as a secret at deploy (one line).
- Then every branded email + magic link goes out as YOU. If the token's missing,
  the app simply doesn't send — no scary error to the customer, it just waits.

**4. Teach your AI (the moat, 10 min).** Owner → **Settings → Teach your AI**:
- **Your story** (a line or two — who you are). **Your edge** (why you over the
  next quote — this is what the AI says when a customer's weighing it up). **Your
  offer** (any current hook).
- Whatever a customer asks that the AI can't answer lands in a **teach queue**
  right here — you type the answer once, and from then on the AI gives it
  instantly, in your words. It learns from real demand.

**5. How every customer experiences it (so you can describe it in your sleep).**
Enquiry → they get a **magic link** (no password — one tap opens their portal) →
the portal IS their project: a chat where they ask the AI (it answers off THEIR
numbers — their savings, their grant, their dates), pick a survey time, pay the
deposit by card, and download their grant pack. Your team sees every message on
their side and replies as your business. **The grant is theirs** — they apply,
SEAI pays them; you prepare + track it. (Never say "we submit your grant.")

**6. Your day as the owner (the daily flow).** Open your cockpit → **"Needs you"**
at the top tells you the few things that need a human right now (a hot lead, a
deposit to route to a crew, a pack that's not filable yet). Work those. The
**bell** rings when a customer messages or asks for a call. When a deposit lands,
you **pick which installer** gets the job (it can't progress until you do — that's
the gate). That's it — the app surfaces what matters; you decide.

**7. Add your team.** Owner → Settings → Installers (add crews) / the team invite
(add consultants). Each teammate is a seat. They log in and see their own slice —
the consultant their pipeline, the installer their jobs. Their work flows straight
back to your board.

**8. Show it off (demo + tour).** Flick **"Sample data"** in your sidebar → 5
example leads appear across the CRM (never touches your real ones — safe in front
of anyone). Hit **"Take the tour"** → it walks you (or a prospect) around the
whole product, every stop saying what the screen is for. Flick it off → your real
pipeline's back.

**9. When something looks wrong.** Message me (this session, or a fresh one — the
docs carry the context). If it's a real bug I fix it; if it's a live incident (a
key leaks, a send fails), we follow the protocol in "The Cover" above — rotate,
note it here, sort it same day. You're not alone on it.

**10. How to SELL it (the 20-second moat).** Open the customer portal beside your
consultant inbox. Type "this feels expensive" as the customer → the AI answers
with THEIR own payback number, no pressure — and the consultant's bell rings with
that objection word-for-word plus a drafted reply waiting. One motion, both ends.
**The line:** "Your customers get an answer in seconds that's actually about their
project — and your team never misses the moment it matters." (More in COMMS_AI_SYSTEM.md.)

---

## ⏸ Parked on purpose → POST_COHORT.md (build on revenue). Growth ideas → CAL_GROWTH_PLAYBOOK.md.
