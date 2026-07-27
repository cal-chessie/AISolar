# THE FINAL PUSH — the one spine (27 Jul 2026, post-wholesaler)

> Cal's deal, in his order. This is the accountability record — tick each line
> as it lands, like `SWEEP8_DB_WIRING.md`. It consolidates NOTES.md,
> READINESS_AND_MOAT.md, SWEEP_AUDIT_ROUND4.md, AUTH_RUNBOOK.md, the vault
> (GATE 0 Unblock Plan, The Last List) and a full code gap-hunt (the "loop").
> **GATE 0 sits ABOVE all of this — it's the deploy gate, not a build step.**

## The sequence Cal set
1. Finish **Sweep 7** (content/marketing layer)
2. Cut **7.1** — the consolidation doc from the notes (this file seeds it)
3. Set up **guardrails** (AI safety + the things a non-dev can't see)
4. **Authentication plan → execute** (owner full · installer his · consultant his)
5. Read Cal's **2 exhausted documents** (grounding)
6. → **Sweep 8** (the real backend)

---

## STAGE 1 — Finish Sweep 7 (content/marketing)
Technical layer DONE (llms.txt, sitemap, robots, JSON-LD, per-page meta, /faq,
/blog ×4). Remaining, all "asked for and skipped" per SWEEP_AUDIT_ROUND4:
- [ ] **Hero snapshots refreshed** — heroes still show the OLD bill card; none
  show the studio, AI Coach, engagement signal or compliance pack.
- [ ] **Agents marketing page** — ⚠️ LOOP FINDING: the audit says "never built"
  but `src/pages/AgentsPage.tsx` EXISTS (and has tsc errors). Doc-vs-code drift —
  verify what's actually there and finish or fix it.
- [ ] **Placeholder marketing stats** (`src/config/brand.ts:72`, self-flagged
  TODO) — invented numbers on customer-facing pages. **Live truth-pass violation,
  shipping right now.** Kill or replace with defensible figures. (P0-ish for trust.)
- [ ] Blog depth (4 articles = launch, not category rank) — post-launch.
- [ ] **NEW angle from the wholesaler meeting**: the market pulled toward the
  SOLO SALES REP. Sharpen an AISales angle around "paperwork costs €300-400/job,
  this is cheaper than that per month." Feeds the installer marketing material
  the wholesaler will forward to his 30-40.

## STAGE 2 — The 7.1 consolidation doc
- [ ] Once Sweep 7 lands, cut `docs/SWEEP_7.1_FINAL.md` — the single sweep-1→7
  record + this final-push spine, so the whole build history is one read.

## STAGE 3 — Guardrails (AI safety + the unseen)
The things AI + a non-dev can't see without help. Ordered by blast radius:
- [ ] **Ask-AI hard guardrail** — customer `generateAIResponse` must REFUSE
  anything outside their own project (margins, pipeline, other customers,
  internals). Not enforced today; a leak is trust-death. (Also a moat item.)
- [ ] **Demo-mode guard** — `VITE_ENABLE_DEMO` bypasses auth. Prove the prod
  build cannot enable it; assert at boot; keep out of Vercel prod env.
- [ ] **Agent output guardrails** — agents draft, never auto-send (proposals stay
  `status:"draft"`; sends need a human click). Verify no path violates it.
- [ ] **Money-path guardrails** — quote/grant/deposit math gets unit tests before
  a cent moves (Stage 6 territory, but the guardrail is defined here).
- [ ] **Observability** — Sentry + structured logging so a broken render stops
  failing silently behind ErrorBoundary. (Today: silent.)
- [ ] **API cost/quota guardrails** — Google Solar/Static Maps proxy + cache +
  budget alerts so scale can't run up a bill or get rate-limited mid-demo.

## STAGE 4 — Authentication plan → execute
The MODEL already exists and is code-verified in `AUTH_RUNBOOK.md`:
Supabase Auth (identity) → `user_roles` (admin/consultant/installer/customer) →
two enforcement points: **RLS = real security**, **ProtectedRoute = UX only**.
Role→landing: customer→/my-projects, installer→/installer, consultant/owner→
/consultant (+ owner /owner). Homeowner token access via `leads.access_token`.

Execution checklist (before ANY real signup):
- [ ] **Owner sees ALL**, installer sees **his** jobs, consultant sees **his**
  pipeline — verify ProtectedRoute routing + that RLS actually scopes rows per
  user (not just hides screens). This is Cal's explicit ask.
- [ ] **Day-one bootstrap** — the first staff account needs the one-time SQL
  (AUTH_RUNBOOK) or Cal is locked out as a customer. Script it + a checklist so
  it can't be forgotten.
- [ ] **RLS line-by-line audit** — one installer seeing another tenant's leads
  is fatal. Every table verified for multi-tenant isolation. (P0.)
- [ ] Supabase dashboard pre-launch settings: confirm-email ON, URL allow-list =
  prod domain, Postmark SMTP wired, leaked-password protection ON.
- [ ] `grant_role` RPC path works in-app (admin-only, server-guarded).

## STAGE 5 — Read Cal's 2 documents
- [ ] Cal shares them; read fully. "You'll understand something profound." Get
  grounded in them before Sweep 8. (Held for Cal.)

## STAGE 6 — Sweep 8 (the real backend)
Full inventory: `SWEEP8_DB_WIRING.md` (kept current; owner-cockpit + AIField
runner inventories appended). Highest-risk first:
- [ ] **Numbers through the spine** — ProposalDraftAgent stores
  `selfConsumptionFromOccupancy()` + `annualProduction()` (kills the 0.70 drift);
  studio design persists so stored kWp = designed kWp.
- [ ] **Payments bulletproof** — create-checkout/deposit idempotency keys,
  webhook signature verification, reconciliation.
- [ ] **The learning loop** (highest moat) — "Wrong" corrections persist → train →
  owner report. Today toast-only.
- [ ] **Kernel events emitted** — ProposalAccepted, DepositPaid, append-only
  proposal versions.
- [ ] **Notifications both ends** — email + magic link (email ONLY, no SMS/WA),
  Postmark bounce handling + retries.
- [ ] **Field offline tolerance** — AIField runner already localStorage-backed;
  Sweep 8 syncs the queue (photos/serials/signature) on reconnect.
- [ ] Everything else in SWEEP8_DB_WIRING.md.

---

## GATE 0 — the deploy gate over EVERYTHING (from the vault plan)
Not a build step. Nothing goes live with real users until:
- [ ] Rotate the 3 leaked Supabase keys (kernel `vythuqax`, CRM `grkqdzz`,
  AISolar `coxmtpnq`) + the Maps key.
- [ ] Purge git history of the leaked secrets.
- [ ] Maps key ships in the bundle (Static Maps + JS API) → HTTP-referrer + API
  restrict it, or proxy through an edge function.

## LOOP FINDINGS — what the second pass caught the doc-map missed
1. **Live truth-pass violation shipping now** — placeholder marketing stats at
   `brand.ts:72` (invented numbers on customer pages). Highest-priority Sweep 7 item.
2. **Doc-vs-code drift** — `AgentsPage.tsx` exists but the Sweep 7 audit says the
   Agents page was "never built." One of them is wrong; verify.
3. **~42 faked/not-enforced/stub markers + 4 TODOs** live in `src/` — the backend
   really is mostly toast/local (Cal's "no back end yet" joke was literally true).
4. **Maps key now ships in the client bundle** — GATE 0 grew a fourth item since
   the Static Maps → JS API move; referrer-lock it before prod.
5. **Day-one auth lockout** is a real footgun — the bootstrap SQL MUST run right
   after Cal's first signup or he lands as a customer with no way up. Script it.
