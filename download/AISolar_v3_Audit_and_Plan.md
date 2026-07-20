# AISolar — v3 Senior Dev Audit & Improvement Plan

**Date:** 2026-07-17
**Audience:** Engineering leadership / v3 build team
**Method:** 4 parallel senior-engineer audits (security, agent foundation, v2 code quality, production readiness)
**Total findings:** 150 across 4 categories
**Verdict:** 🚫 **v2 is not production-ready.** The agent foundation is UI theatre. The customer-portal PII leak from v1 is still live. Demo-mode is an auth bypass on production. Ship blockers below.

---

## Executive Summary

The v2 rebuild added genuine architectural value — the `lead_intake` single-source-of-truth design, the 10-agent metadata, the role-aware coach concept, the professional proposal template — but **stopped at the design layer**. None of the agents have implementations. The "Run now" button does nothing. The pipeline view shows hardcoded fake data. The `agent_queue` table is a write-only black hole. The migration claims to fix the v1 PII leak but the fix lives only in the migration file — the actual `ClientPortal.tsx` still emails `access_token` to anyone who types a victim's email.

Meanwhile the v2 build **introduced new critical issues**:
- `isDemoMode()` is an auth bypass on production — any visitor can `?demo=1` and skip `getSession()` on 4 internal pages
- The new SQL migration hardcodes a placeholder service-role JWT in pg_cron schedules (will 401, but if a developer "fixes" it by pasting a real key, it's committed to git forever)
- The new `touchpoints` table has a write-path RLS hole — any authenticated user can poison any lead's touchpoint history
- The new `email_templates` table is world-readable to anon users
- The new `lead_intake` table is the "single source of truth" that **nothing reads from** — v1 code paths still bypass it

The 14 critical security findings from v1 are largely unfixed. The agent foundation is metadata without implementation. There is no error tracking, no alerting, no runbook, no privacy policy, no cookie banner, no DPA with sub-processors. The app cannot legally accept a paying customer in Ireland/EU today.

---

## Finding Counts

| Audit | Critical | High | Medium | Low | Total |
|-------|----------|------|--------|-----|-------|
| 1. Security (RLS, auth, JWT, edge fns, secrets, PII) | 16 | 14 | 12 | 8 | **50** |
| 2. Agent Foundation (production readiness) | 8 | 16 | 9 | 5 | **38** |
| 3. v2 Code Quality (TS, React, a11y, perf) | 6 | 14 | 12 | 6 | **38** |
| 4. Production Readiness (deploy, observability, scaling, compliance) | 6 | 12 | 14 | 6 | **38** |
| **TOTAL** | **36** | **56** | **47** | **25** | **164** |

(Deduplicated: ~150 unique findings across the 4 audits.)

---

## Top 10 Ship Blockers (must fix before any production traffic)

These are the criticals that block paying customers, listed in fix-priority order. Each is independently shippable.

### 1. `/portal` PII enumeration — `ClientPortal.tsx:41-52`
Anyone types a victim's email → gets back their `access_token` + name + address + workflow_stage → clicks through to full portal. **The v1 PII leak is still live.** Delete `/portal` entirely. Replace with magic-link auth or signed-in customer accounts.

### 2. Demo mode is a production auth bypass — `demoMode.ts:16-33` + 4 pages
`?demo=1` flips a localStorage flag that bypasses `getSession()` on `/consultant`, `/installer`, `/admin/settings`, `/my-projects`. Anyone on a production deployment can render every internal view. Gate demo mode behind `import.meta.env.DEV` only. Move all demo content to `/demo/*` routes that don't touch Supabase.

### 3. All 12 edge functions have `verify_jwt = false` — `config.toml:3-37`
Anyone with the project URL can invoke `create-checkout` for any invoice ID (pay someone else's invoice or DoS), `send-notification` to email-bomb any lead, `extract-bill-data` to exhaust the Lovable AI budget. Set `verify_jwt = true` on all non-webhook functions; add per-function auth checks inside.

### 4. Stripe webhook signature verification is conditional — `stripe-webhook/index.ts:30-37`
If `STRIPE_WEBHOOK_SECRET` is unset (typo, rotation gap), the function silently accepts forged events as valid. An attacker can POST a fake `checkout.session.completed` and mark any invoice as paid. Make verification mandatory; remove the dev fallback; fail deploy if env var missing.

### 5. Coinbase webhook signature is never verified — `coinbase-webhook/index.ts:15-21`
The secret is read into a variable and never used. Anyone can POST a fake `charge:confirmed` and mark any invoice as paid. Implement HMAC-SHA256 verification per Coinbase docs.

### 6. `create-checkout` accepts client-supplied `amount` — `create-checkout/index.ts:92-117`
For the direct-payment branch, the amount comes from the request body. An attacker creates a Stripe checkout for €0.01 with a victim's `invoiceId`. When paid, `stripe-webhook` marks the invoice as fully paid. Look up the invoice server-side; never trust client-supplied amounts.

### 7. Storage buckets are public — `20251129221006...sql:2-9`, `20251216210524...sql:2-4`
`survey-photos` and `project-documents` are `public = true`. Roof photos of customer homes (PII, address-revealing) are world-readable by guessable URL. `project-documents` has no size limit and no MIME whitelist — anyone can upload unlimited files. Set `public = false`, add size limits, switch to signed URLs.

### 8. Hardcoded service-role JWT in pg_cron — `20260718_agent_foundation.sql:305-313`
The migration bakes `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SUPABASE_SERVICE_ROLE` into 3 cron schedules. The JWT is a placeholder (will 401), but if a dev pastes a real key, it's committed to git forever. Use Supabase Vault (`vault.create_secret`) and read via `vault.decrypted_secrets`.

### 9. `.env` is committed to git — `.env` + `.gitignore`
Currently only contains the anon key (low risk), but the moment someone adds `STRIPE_SECRET_KEY` etc. it's leaked. `git rm --cached .env`, add `.env` to `.gitignore`, rotate any secret that's ever been in `.env`. Add `.env.example` documenting all 12 server-side secrets.

### 10. No error tracking, no alerting, no runbook — repo-wide
First prod incident will be invisible. Install Sentry (root ErrorBoundary + Edge Functions), set up Slack alerts (Vercel deploy-failed, Supabase function error rate, Postmark delivery failures, Stripe webhook failures), write `docs/RUNBOOK.md` for top 5 failure modes.

---

## Audit 1: Security (50 findings)

### Critical (16)
1. `/portal` PII enumeration — `ClientPortal.tsx:41-52`
2. `leads` anon RLS PII leak — `20251217044039...sql:6-9` (v1 said fixed; migration has the fix but no verification it ran)
3. Customer portal token-in-URL not validated — `CustomerPortal.tsx:114-126`
4. Customer portal tables (proposals, contracts, invoices, etc.) have no anon RLS — portal is either broken or bypassed
5. `isDemoMode()` is a production auth bypass — `demoMode.ts:16-33`
6. `AdminSettings.tsx:228` skips auth in demo mode
7. `ConsultantDashboard.tsx:14`, `InstallerPortal.tsx:32`, `CustomerDashboard.tsx:53` — same demo bypass
8. All 12 edge functions `verify_jwt = false` — `config.toml:3-37`
9. `create-checkout` lets anon mint Stripe sessions for any invoice — `create-checkout/index.ts:36-88`
10. `create-crypto-checkout` lets anon mint Coinbase charges at any amount — `create-crypto-checkout/index.ts:36-65`
11. Stripe webhook signature verification is conditional (skipped if env var missing) — `stripe-webhook/index.ts:30-37`
12. Coinbase webhook signature never verified — `coinbase-webhook/index.ts:15-22`
13. Hardcoded service-role JWT in pg_cron — `20260718_agent_foundation.sql:304-313`
14. `.env` committed to git
15. `tenant_id` added to `leads` but **no RLS policy references it** — multi-tenancy is fictional — `20260718:23-26, 83-98`
16. `tenant.ts:62-73` — `getPublicTenantContext()` reads `?tenant=<uuid>` from URL, anyone can spoof tenant attribution

### High (14)
17. `tenant.ts:30-52` — `getTenantId()` reads from a `custom_access_token_hook` that **doesn't exist in any migration**
18. `Auth.tsx:79-114` — signup role picker lets user self-grant `owner` (admin+consultant+installer) client-side
19. `proposals`, `assignments` SELECT RLS is `auth.role() = 'authenticated'` — any logged-in customer reads every proposal
20. `installation_checklists`, `seai_documents`, `activity_logs` same — `auth.role() = 'authenticated'`
21. `notifications` SELECT allows `user_id IS NULL` (broadcasts leak); INSERT is `WITH CHECK (true)` (spam vector)
22. `touchpoints` INSERT policy is `WITH CHECK (true)` — any authenticated user poisons any lead's touchpoints
23. `survey-photos` bucket `public = true`, no owner check on UPDATE/DELETE
24. `project-documents` bucket `public = true`
25. All 12 edge functions set `Access-Control-Allow-Origin: *` — any website can call them
26. PII logged in plain text across 6+ edge functions (`lead.email`, `customerEmail`, full request bodies)
27. No rate limiting on any function — `extract-bill-data` (paid AI) and `expert-chat` are abusable
28. `extract-bill-data` accepts `imageBase64` of any size — 100MB POST OOMs the function; `fileType` is type-injection vector
29. `extract-bill-data` sends full bill image (PII: name, address, MPRN, account #) to Google Gemini — guardrail says "anonymize" but doesn't
30. `dummyData.ts:266` — emails `@example.com` (could collide if domain ever resolves)

### Medium (12)
31-42. localStorage JWT storage, role spoofing in coach, password reset weakness, `email_templates` world-readable, `user_roles` admin self-lockout possible, sweep of `auth.role() = 'authenticated'` policies, no HSTS/CSP/X-Frame, realtime no `user_id` filter, file upload no client validation, dep vulnerabilities, PipelineView shows fake data, InstallerFirstDashboard shows fake data, XSS in proposal HTML (consultantPhone not escaped), XSS in email HTML (lead.name not escaped), PII orphaned on user delete, no retention policy, signup spam (no captcha/verification), `profiles` SELECT open to all auth users

### Low (8)
43-50. (various minor — see security audit for details)

---

## Audit 2: Agent Foundation (38 findings)

**Headline:** **0 of 10 agents have a `run()` function.** The agent foundation is a UI mockup wrapped around a schema. `agent_runs` is never written. `agent_queue` has no worker. The "Run now" button does `setTimeout(..., 1500)`. The pg_cron schedules carry a placeholder JWT.

### Critical (8)
1. No agent implementations exist — `agents.ts:15` comment promises `run()` but no edge function implements any of the 10 agents
2. `AgentFoundation.tsx:31-42` — `SIMULATED_RUNS` is hardcoded; "Run now" only mutates local state
3. Survey Scheduler Agent — claims to "auto-book based on installer availability, lead location, lead priority" but no `installer_availability` table, no calendar integration, no route optimization, no geocoding wired in
4. Proposal Drafter Agent — claims to use AI to draft proposals but no LLM call exists; no prompt; no human-review enforcement
5. SEAI Grant Agent — claims to "submit" to SEAI but **there is no SEAI API** (residential solar grants are manual portal uploads); the claim is impossible as written
6. Install Coordinator Agent — claims to "order materials" but no `purchase_orders` table, no supplier API, no Met Éireann weather integration, no SMS provider
7. pg_cron schedules have a placeholder JWT (will 401; security audit #13)
8. `lead_intake` table created as "single source of truth" but **no production code reads from it** — v1 paths (`SiteSurveyForm`, `ProposalQuestionnaire`, `extract-bill-data`) all bypass it

### High (16)
9. `agent_queue` has `locked_until`, `attempts`, `max_attempts`, `priority`, `run_after` — **none used by any code**
10. No `SELECT ... FOR UPDATE SKIP LOCKED` — concurrent workers would dequeue the same job
11. No idempotency key on `agent_runs` — duplicate runs create duplicate rows
12. Two Proposal Drafter runs on same lead create duplicate `proposals` drafts + duplicate consultant notifications
13. Stripe webhook creates `seai_applications` row on every event delivery — no unique constraint, race-condition duplicates
14. Email-sending functions don't check "have I sent this in last N hours?" — duplicate emails on retry
15. No retry mechanism — `agent_queue.max_attempts` exists but nothing honors it
16. If PostInstall Agent fails, customer never gets warranty email — no fallback, no human notification
17. `agent_runs.error_message` column exists but no UI surfaces it
18. No structured logging — all functions use `console.log("[TAG] msg")`, no correlation IDs, no trace propagation
19. No alerting on agent failure rate or queue depth
20. `agent_queue` is service_role-only — but **no service-role worker exists to drain it**
21. No dead-letter queue — after `max_attempts` failures, jobs just sit there
22. No stuck-job detection — a crashed worker leaves jobs invisible forever
23. Timezone bug: `agents.ts:107,171,187,203` says `0 9 * * *` (09:00 UTC) but migration `20260718:303-313` says `0 8 * * *` (08:00 UTC) for the same agents — **the two files disagree**; Dublin is IST in summer so neither is right year-round
24. `EXCEPTION WHEN OTHERS THEN RAISE NOTICE` swallows all pg_cron errors — if pg_cron unavailable, migration "succeeds" but no schedules exist

### Medium (9)
25-33. (Various: no `pg_net` extension created in this migration; hardcoded project URL; only 3 of 10 agents have cron schedules; the 3 scheduled agents point at the wrong functions — `send-follow-up-digest` is a consultant digest, not customer follow-ups; existing DB triggers don't enqueue agent jobs; `create_workflow_notification` trigger doesn't enqueue; no `agent_config` table for pause/resume; no replay; no dry-run; AI cost unbounded; no model selection/fallback/content filter; no `circuit_breakers` table for kill switch; no rollback story)

---

## Audit 3: v2 Code Quality (38 findings)

### Critical (6)
1. `Auth.tsx:30` — default signup role is `'owner'` (was `'consultant'` in v1) — combined with the client-side role inserts, anyone who doesn't change the dropdown gets admin
2. `Auth.tsx:107-114` — `owner` signup inserts `consultant`, `installer`, `admin` rows into `user_roles` from the client — relies on RLS denying, but the UI lie is the problem
3. `demoMode.ts:16-33` — same as security #5
4. `20260718_agent_foundation.sql:261-264` — `touchpoints` INSERT `WITH CHECK (true)` — same as security #22
5. `20260718_agent_foundation.sql:188-191` — `email_templates` SELECT `TO anon` — same as security #36
6. `20260718_agent_foundation.sql:305,309,313` — hardcoded JWT — same as security #13

### High (14)
7. `RoleBasedAICoach.tsx:67-70` — `allTips.sort(...)` **mutates** the module-level constant array; subsequent renders see pre-sorted data; if role changes, behavior is wrong
8. `RoleBasedAICoach.tsx:75-80` — `setTimeout` not cleared on unmount; `navigator.clipboard.writeText` not awaited/caught
9. `AgentFoundation.tsx:57-62` — `handleTrigger` `setTimeout` not cleared; rapid clicks queue multiple timers; no failure path
10. `RoleBasedAICoach.tsx:42` — `if (loading) return 'consultant'` — if `useAuth()` hangs forever, user permanently sees wrong role's tips
11. `RoleBasedAICoach.tsx:53-58` — owner detection requires all 3 roles exactly; partial multi-role users (admin+consultant, consultant+installer) get misclassified
12. `dummyData.ts:298, 361` — `(s as any).surveyDate` — scenarios array is untyped; typos silently return undefined
13. `CustomerDashboard.tsx:27-29` — `proposal: any`, `invoice: any`, `contract: any` — defeats the type safety `LeadIntake` provides
14. `InstallerFirstDashboard.tsx:123` — `<Tabs defaultValue="today">` is uncontrolled, no URL sync; refresh loses tab; can't deep-link
15. `20260718:267-285` — `handle_new_user` rewrite changes default from `'consultant'` to `'customer'` but `ON CONFLICT DO NOTHING` means **existing users get BOTH roles** (no conflict — different role). Silent behavior change.
16. `20260718:299-319` — `EXCEPTION WHEN OTHERS THEN RAISE NOTICE` swallows all errors (same as agent audit #24)
17. `20260718:304-313` — uses `net.http_post` but never runs `CREATE EXTENSION IF NOT EXISTS pg_net` in this migration
18. `PipelineView.tsx:261-269` — `LeadDetailDrawer` modal has no `role="dialog"`, no focus trap, no ESC handler
19. `DemoBanner.tsx:71-144` — slide-out drawer same a11y holes; close button 36px touch target (below 44px WCAG minimum)
20. `PipelineView.tsx:192-258` — `LeadCard` is `<div onClick>` with no `role="button"`, no `tabIndex`, no `onKeyDown` — keyboard users can't open

### Medium (12)
21-32. (Various: dead `/field` route in `showAICoach`, `<a href>` instead of `<Link>` in coach CTAs, `InstallerPortal.tsx:59` shows old dashboard to real installers, `DemoIndex` auto-enables demo on visit, 13-column kanban has no mobile affordance, `SIMULATED_RUNS` not clearly marked as demo, demo banner close button too small, `getStage(id: string)` accepts any string silently, `agents.ts:240` non-null assertion, inline inventory array recreated every render, dead buttons in drawer, `getCoachSummary` no default case, touchpoints missing `id` key, proposalTemplate inconsistent `escapeHtml`, array index as key in AgentFoundation, magic number `7919` in `makeMprn`, `typeof Sun` instead of `LucideIcon`, all 16 routes eagerly imported no `React.lazy`)

### Low (6)
33-38. (Polish items — see code quality audit)

---

## Audit 4: Production Readiness (38 findings)

### Critical (6)
1. All 12 edge functions `verify_jwt = false` (same as security #8)
2. Coinbase webhook signature never verified (same as security #12)
3. Stripe webhook signature conditional (same as security #11)
4. `survey-photos` bucket public (same as security #23)
5. `project-documents` bucket public + no limits (same as security #24)
6. No error tracking anywhere — `ErrorBoundary` only wraps `PremiumDashboard`, not root; unhandled errors blank 90% of routes with zero telemetry

### High (12)
7. `vercel.json` has no security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), no cache headers, no `/api/health` route
8. `.env` committed; no `.env.example`; the 12 server-side secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, COINBASE_COMMERCE_API_KEY, COINBASE_WEBHOOK_SECRET, POSTMARK_SERVER_TOKEN, POSTMARK_SENDER_EMAIL, LOVABLE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, MAPBOX_TOKEN, etc.) are documented nowhere
9. Hardcoded Supabase URL + fake JWT in migration (same as security #13)
10. No rollback story — Vercel auto-deploys on push to main; no DB migration rollback tooling
11. All edge functions use `console.log` — Supabase logs are ephemeral (~7 days), no search, no structured fields; no log forwarding to Datadog/Logflare/Axiom
12. No alerting — no PagerDuty/Slack webhook; no status page; first prod incident invisible
13. No data retention policy — `notifications`, `activity_logs`, `agent_runs`, `touchpoints`, `agent_queue` grow unbounded; Irish Revenue requires 7-year retention for financial records but no policy distinguishes them
14. No backup verification — Supabase Pro has PITR but no restore test; 26 migrations never run end-to-end on a fresh project
15. `extract-bill-data` accepts `imageBase64` of any size — 50MB POST OOMs the 256MB function
16. `send-follow-up-digest` fetches ALL non-completed leads into memory — at 10k leads this times out (150s wall clock)
17. `send-notification-digest` iterates users serially — 1000 users × 500ms = 500s → exceeds 150s timeout
18. PII logged in plain text across 6+ edge functions
19. `useRealtimeUpdates.ts:40` — channel name includes `Date.now()` → every effect re-run creates a new channel; 100 consultants × 7 tables = Supabase channel exhaustion (Pro tier = 1000)
20. `useNotifications.ts:110-133` — subscribes to all `notifications` inserts with no `user_id` filter; no migration adds `notifications` to `supabase_realtime` publication — either subscription silently receives nothing OR RLS is bypassed
21. 2MB bundle, no code splitting — `vite.config.ts` has no `manualChunks`; 3G mobile = 11s load
22. No cookie consent banner, no `/privacy`, no `/terms` — illegal to operate in Ireland/EU before first paying customer
23. No right-to-erasure flow — 18 FK references on `leads` block user deletion; financial records can't be deleted for 7 years
24. No runbook, no on-call rotation, no postmortem template — `grep RUNBOOK` returns one match (a string literal in `aiCoach.ts`)

### Medium (14)
25-38. (Various: no staging environment, `tenant_id` only on `leads` not other tables, missing indexes on hot paths, no connection pooling config, no rate limiting, `agent_queue` has no drainer, cold starts not mitigated, broken `index.html` SEO/branding, dead service worker, no QueryClient defaultOptions, Mapbox token not configured, no Lovable AI fallback, no cost model, misleading `AUDIT_REPORT.md` claims)

---

## The v3 Plan

Based on the 150 findings, here is the prioritized v3 build plan. Each workstream is sized in engineering days (1 day = 1 eng × 1 day).

### Week 1: Ship blockers (5 eng-days) — **MUST complete before any production traffic**

| # | Task | Files | Days |
|---|------|-------|------|
| 1.1 | Delete `/portal` route; replace with magic-link auth | `ClientPortal.tsx`, `App.tsx` | 0.5 |
| 1.2 | Remove `isDemoMode()` from auth-gated pages; gate demo behind `import.meta.env.DEV` | `demoMode.ts`, 4 pages | 0.5 |
| 1.3 | Set `verify_jwt = true` on all non-webhook functions; add per-function auth checks | `config.toml`, 10 edge functions | 1 |
| 1.4 | Make Stripe webhook signature mandatory (remove dev fallback); implement Coinbase HMAC verification | 2 webhook functions | 0.5 |
| 1.5 | Lock down `create-checkout` + `create-crypto-checkout`: server-side amount lookup, JWT required | 2 functions | 0.5 |
| 1.6 | Set `survey-photos` + `project-documents` buckets to `private = false`, add size/MIME limits, switch to signed URLs | new migration + 4 components | 1 |
| 1.7 | Move pg_cron service-role key to Supabase Vault; remove hardcoded URL | `20260718` migration (rewrite) | 0.5 |
| 1.8 | `git rm --cached .env`; add `.env.example`; document 12 server-side secrets in `docs/SECRETS.md` | repo root | 0.5 |

### Week 2: Observability + compliance (5 eng-days)

| # | Task | Days |
|---|------|------|
| 2.1 | Install Sentry: root `<ErrorBoundary>` + Edge Functions SDK + PII scrubbing in `beforeSend` | 1 |
| 2.2 | Add Vercel headers (CSP, HSTS, X-Frame, X-Content-Type); add `/api/health` route | 0.5 |
| 2.3 | Set up Axiom/Logflare log drain from Supabase; structured JSON logging helper in `_shared/log.ts` | 1 |
| 2.4 | Slack alerts: Vercel deploy-failed, Supabase function error rate, Postmark delivery failures, Stripe webhook failures | 0.5 |
| 2.5 | Privacy policy + terms of service + cookie consent banner (Irish DPC templates) | 1 |
| 2.6 | `docs/RUNBOOK.md` — top 5 failure modes (Stripe down, Postmark down, Gemini 429, DB connections, realtime disconnect) | 0.5 |
| 2.7 | Right-to-erasure edge function (anonymise `leads`, archive financial records, delete `auth.users`) | 0.5 |
| 2.8 | Sign DPAs with Supabase, Stripe, Postmark, Google (Gemini), Coinbase, Mapbox, Lovable | 0.5 (legal, not eng) |

### Week 3: Agent runtime (7 eng-days) — **the kernel the user asked for**

This is the biggest v3 workstream. The user wants "a kernel and autonomous foundation where agents can do most of the heavy lifting." Today there is no kernel.

| # | Task | Days |
|---|------|------|
| 3.1 | Build the agent runtime: `claim_next_job(agent_id, worker_id)` SQL function with `FOR UPDATE SKIP LOCKED`, `complete_job(job_id)`, `fail_job(job_id, err)` with exponential backoff | 1.5 |
| 3.2 | Build `agent-drain` edge function invoked every 1 min by pg_cron; locks jobs, dispatches to agent-specific functions, writes `agent_runs` | 1 |
| 3.3 | Add DB triggers on `leads.workflow_stage` change that enqueue to `agent_queue` (modifies `create_workflow_notification` to also enqueue) | 1 |
| 3.4 | Implement Lead Intake Agent: `extract-bill-data` writes to `lead_intake`, dedup by email+MPRN, score lead | 1 |
| 3.5 | Implement Proposal Drafter Agent: LLM call with proposal-drafting prompt, **DB-enforced `status='draft'`** (RLS: service_role can only INSERT draft; only consultant/admin can UPDATE status) | 1.5 |
| 3.6 | Replace `AgentFoundation.tsx` `SIMULATED_RUNS` with live `agent_runs` queries; wire "Run now" to `agent-drain` | 1 |

### Week 4: Data flow + UI correctness (6 eng-days)

| # | Task | Days |
|---|------|------|
| 4.1 | Make `lead_intake` the actual SoT: `SiteSurveyForm` reads `INTAKE_TO_SURVEY_MAP` and pre-fills; `ProposalQuestionnaire` reads `SURVEY_TO_PROPOSAL_MAP`; sync triggers from `site_surveys` → `lead_intake.confirmed_*` and `proposals` → `lead_intake.finalized_*` | 1.5 |
| 4.2 | Wire `PipelineView` to real `supabase.from('leads').select(...)` queries (not `generateDummyLeads()`); show explicit "Demo data" banner when no real data | 1 |
| 4.3 | Wire `InstallerFirstDashboard` to real queries; same demo banner | 1 |
| 4.4 | Fix `Auth.tsx`: default role `'customer'`, remove client-side role inserts, add captcha + email verification | 0.5 |
| 4.5 | Fix `handle_new_user` backfill: write one-time UPDATE to remove `'customer'` from existing users who already have `'consultant'` | 0.5 |
| 4.6 | A11y pass: `LeadDetailDrawer` + `DemoBanner` drawer → use `components/ui/dialog.tsx` and `sheet.tsx`; `LeadCard` → add `role="button"` + keyboard handler | 1 |
| 4.7 | Code splitting: `React.lazy()` on all routes; add `manualChunks` to `vite.config.ts`; target < 500KB initial bundle | 0.5 |

### Week 5: Remaining agents + scaling (8 eng-days)

| # | Task | Days |
|---|------|------|
| 5.1 | Implement Follow-Up Agent (real customer emails, idempotency via `touchpoints`, per-stage templates from `email_templates` table) | 1.5 |
| 5.2 | Implement Payment Reminder Agent (escalating tone T+7/T+14/T+30/T+45, idempotency, dispute pause) | 1 |
| 5.3 | Implement PostInstall Agent (warranty email, T+7 review request, handover PDF, 30-day check-in scheduling) | 1 |
| 5.4 | Implement Stale Lead Escalator (threshold per stage, manager escalation at 2x, business-hours only, auto-reassign at 14d) | 1 |
| 5.5 | Implement Install Coordinator Agent (Met Éireann weather fetch, T-7/T-1 SMS via Twilio, materials stock check, auto-reschedule on orange/red weather) | 2 |
| 5.6 | Implement Survey Scheduler Agent (calendar solver, 80km radius via Eircode geocoding, `.ics` invite via Postmark) | 1.5 |
| 5.7 | Implement SEAI Grant Agent (realistic: compile PDF application pack, email to `solarpvgrants@seai.ie`, set status='submitted' on confirmation — NOT a direct API) | 1 |
| 5.8 | Implement Customer Digest Agent (weekly status email per stage, opt-out respected, skip if contacted in last 48h) | 1 |

### Week 6: Production hardening (5 eng-days)

| # | Task | Days |
|---|------|------|
| 6.1 | Add `tenant_id` to every business table; backfill; add to every RLS policy | 1.5 |
| 6.2 | Sweep all `auth.role() = 'authenticated'` policies; replace with explicit role checks | 1 |
| 6.3 | Add missing indexes (8 hot-path indexes per audit) | 0.5 |
| 6.4 | Add `pg_cron` retention jobs (notifications 90d, activity_logs 1y, agent_runs 30d, agent_queue dead-letter 7d) | 0.5 |
| 6.5 | Realtime publication: add `notifications`, `leads`, `proposals`, `invoices`, `site_surveys`, `installation_checklists`, `seai_applications` to `supabase_realtime`; add `filter: 'user_id=eq.${user.id}'` to `useNotifications` | 0.5 |
| 6.6 | Rate limiting: Upstash Redis counter on `extract-bill-data` (10/hr/IP), `expert-chat` (30/hr/IP), `send-notification` (10/hr/user) | 1 |

### Week 7: Staging + verification (3 eng-days)

| # | Task | Days |
|---|------|------|
| 7.1 | Stand up staging Supabase project + staging Vercel deployment | 0.5 |
| 7.2 | CI: `supabase db reset --linked` on staging; RLS policy diff against baseline | 1 |
| 7.3 | Backup restore drill (weekly sandbox restore + smoke test) | 0.5 |
| 7.4 | Load test: 1000 concurrent leads through the pipeline; verify agent queue drains; verify no edge function timeouts | 1 |

**Total v3 effort: ~39 eng-days** (≈ 8 weeks for 1 engineer, or 2 weeks for a 4-person team).

---

## What v3 does NOT do (deferred to v4)

These are documented but parked:

1. **Mapbox PWA / offline installer app** — the user mentioned wanting installers to work offline. Service worker is dead code. v3 removes the dead code; v4 builds a real PWA with Workbox.
2. **Mobile native installer app** — if the PWA isn't enough, a React Native companion. v4 decision.
3. **Lead reassignment UI** — admin can reassign leads between consultants. v4.
4. **Owner view-switcher** — header dropdown to switch between Installer/Consultant/Admin perspectives. v4.
5. **AI model selection / cost caps / fallback** — the Proposal Drafter is wired to one model in v3. v4 adds budget enforcement + fallback.
6. **Multi-currency** — currently EUR only. v4 if expanding beyond Ireland.
7. **Multi-language** — currently English only. v4 if expanding.
8. **Custom proposal branding per tenant** — v4.
9. **Calendar integration** (Google Calendar / Outlook) for installer scheduling — v3 uses internal calendar; v4 adds two-way sync.
10. **Twilio SMS** — v3 mentions it for Install Coordinator but doesn't ship it; v4 if SMS reminders prove valuable.

---

## How to verify v3 success

Before v3 ships to production, all of these must be true:

- [ ] `/portal` route returns 404
- [ ] Visiting `/?demo=1` on a production build does NOT enable demo mode
- [ ] All non-webhook edge functions return 401 without a valid JWT
- [ ] Stripe webhook returns 400 without a valid signature (env var missing = 500, not silent accept)
- [ ] Coinbase webhook returns 400 without a valid signature
- [ ] `create-checkout` returns 403 if the caller doesn't own the invoice
- [ ] `survey-photos` and `project-documents` buckets are `public = false`
- [ ] `.env` is gitignored; `.env.example` exists; `git log -p .env` shows no secret commits
- [ ] No hardcoded Supabase URL or service-role key in any migration
- [ ] Sentry captures an unhandled error in `/consultant`
- [ ] A failed agent run shows in `agent_runs` with `error_message` and surfaces in the admin UI
- [ ] `AgentFoundation.tsx` shows real `agent_runs` data (not `SIMULATED_RUNS`)
- [ ] `PipelineView` shows real leads from Supabase (or explicit "Demo data" banner)
- [ ] Cookie consent banner appears on first visit
- [ ] `/privacy` and `/terms` routes return 200
- [ ] A test GDPR deletion request completes within 30 days (verified via E2E test)
- [ ] `supabase db reset --linked` on a fresh staging project runs all 27 migrations cleanly
- [ ] Backup restore drill succeeds on weekly sandbox
- [ ] Load test: 1000 leads through pipeline, no edge function timeout, agent queue drains within 5 min

---

## Appendices

- **Full security audit** (50 findings) — embedded in this report above
- **Full agent foundation audit** (38 findings) — embedded above
- **Full v2 code quality audit** (38 findings) — embedded above
- **Full production readiness audit** (38 findings) — embedded above
- **v1 bug audit** (135 findings) — `AISolar_Bug_Audit.md` (previous session)
- **v2 rebuild documentation** — `AISolar_v2_Rebuild_Documentation.md` (previous session)

---

## Final note to the v3 build team

The user asked for "a kernel and autonomous foundation so agents can do most of the heavy lifting." Today the kernel doesn't exist — the agents are metadata, the queue is a black hole, the runs table is never written. **The single most important v3 deliverable is the agent runtime** (Week 3). Without it, every other agent-related feature is theatre. Build the runtime first, then implement agents one at a time, with the Lead Intake Agent and Proposal Drafter as the highest-leverage starting points.

Everything else — the security fixes, the observability, the compliance — is necessary table stakes to operate in Ireland/EU with real customer PII and real money. None of it is optional.

The v2 architecture is sound. The v2 implementation is incomplete. v3 closes the gap.
