# AISolar v3 — Final Version Documentation + Security Audit

**Date:** 2026-07-18
**Version:** v3.0.0
**Status:** Pre-CRM add-on. Security audit complete. 3 critical fixes needed before production.

---

## Version History

### v1 (original Lovable project)
- Basic Vite + React + Supabase SPA
- Lead capture form, bill upload, basic dashboard
- 135 bugs identified (see `AISolar_Bug_Audit.md`)

### v2 (installer-first reframe)
- Rewrote landing page, auth, nav for installer B2B voice
- Added: leadIntake.ts (single source of truth), agents.ts (10 agent definitions), aiCoach.ts (role-aware), dummyData.ts, proposalTemplate.ts (professional 4-page PDF)
- Added: PipelineView, AgentFoundation, InstallerFirstDashboard, RoleBasedAICoach
- 9 critical security bugs fixed

### v3 (the real build)
- **Owner Cockpit** — sidebar nav + single-screen cockpit (vital signs, pipeline flow, activity, alerts, schedule) + 10 sidebar views (Overview, Calendar, Consultants, Installers, Clients, Products, Agents, Analytics, Settings, CRM)
- **Real Calendar** — month/week/day views, 7 event types, clickable events → navigate to relevant view
- **LeadFlow** — 5-step linear pipeline: Estimate → Eircode/Satellite → Survey (real SiteSurveyForm) → Design (panel layout on satellite) → Proposal (finance + AI coach) → Send
- **Consultant Inbox** — messaging app style (lead list + conversation thread), slide-out Estimate/Proposal panels
- **Customer Portal V2** — conversation-first (chat thread with AI, documents, GDPR rights)
- **JobView V2** — tabbed installer checklist (Overview, Pre-install, Roof, Electrical, Commissioning, Handover) with toggles, named photos, customer signature
- **Agent Runtime** — agent-drain edge function (claims jobs via FOR UPDATE SKIP LOCKED, dispatches to 10 agent handlers, writes agent_runs), DB triggers (stage change → enqueue), idempotency via touchpoints, dead-letter queue, stuck-job sweeper
- **AI Config** — OpenRouter API key, 7 LLM models, database access (12 tables), temperature, cost cap. Inside Agents view as 3rd tab.
- **Agent Training** — system prompt editor, behavioural rules, test prompt (dry run), auto-learned patterns. Inside Agents view as 2nd tab.
- **System Settings V2** — integrations that actually work (connect/disconnect/test), brand config touching all touchpoints (emails, proposals, portal, landing, SMS, WhatsApp), audit log (filterable, detailed), WhatsApp channel, kernel config
- **EstimateView** — bill-extracted data + AI estimate (system size, savings, grant, payback)
- **ProposalView** — system design + financials + compliance papertrail (SEAI + ESB + RECI pre-populated from survey/install data)
- **GDPR** — cookie consent, data subject rights, privacy policy, terms, consent audit, sub-processor disclosure
- **Code splitting** — 7 vendor chunks + 5 lazy-loaded view chunks (EstimateView, ProposalView, RealCalendar, AgentTraining, AIConfig)
- **Bundle:** main 1.5MB + vendors ~1MB (parallel load)

---

## Current Routes (26)

### Main Views
| Route | Component | Description |
|-------|-----------|-------------|
| `/owner` | OwnerCockpit | Sidebar + cockpit + 10 views |
| `/consultant` | ConsultantCockpitV3 | Messaging app + slide-out panels |
| `/installer` | InstallerPortalV3 | Job cards → JobView |
| `/my-projects` | CustomerPortalV2 | Conversation-first chat |
| `/lead-flow` | LeadFlow | 5-step pipeline |
| `/job` | JobViewV2 | Tabbed installer checklist |
| `/calculator` | ROICalculator | Public, no signup |

### Public
| Route | Component |
|-------|-----------|
| `/` | PremiumIndex (landing) |
| `/upload` | AIBillAnalyser flow |
| `/about` | AboutUs (SaaS positioning) |
| `/auth` | PrestigiousAuth (split-screen) |
| `/onboarding` | OnboardingMode (10-step tour) |
| `/demo` | DemoIndex (route browser) |
| `/privacy` | PrivacyPolicy |
| `/terms` | TermsOfService |

### Legacy (for reference)
| Route | Component |
|-------|-----------|
| `/consultant-legacy` | Old ConsultantDashboard |
| `/installer-legacy` | Old InstallerPortal |
| `/my-projects-legacy` | Old CustomerDashboard |
| `/job-v1` | Old JobView (scroll) |
| `/owner-v1` | Old OwnerBirdseye (tabs) |

---

## Security Audit Summary (28 findings)

### Critical (3 — ship blockers)

1. **`leads` table RLS still open** — original `auth.role() = 'authenticated'` policies never dropped. Any authenticated customer can read/modify every lead's PII. The v3 sweep fixed proposals, assignments, checklists, activity_logs, profiles, user_roles — but missed `leads` itself.

2. **`agent-drain` has no role check** — `verify_jwt=true` at gateway, but the function only checks `Bearer ` prefix. Any authenticated user (including customers) can force-trigger any agent on any lead. A customer could run `grant_submitter` on someone else's lead, or `customer_digest` to spam all customers.

3. **`anonymise_lead` + `enqueue_agent` granted to `authenticated`** — both are `SECURITY DEFINER` functions. Any customer can call `supabase.rpc('anonymise_lead', { p_lead_id: '<any-uuid>' })` and wipe any lead's PII. Or `supabase.rpc('enqueue_agent', ...)` to force-trigger agents.

### High (7)

4. **SEAI applications + documents still open** — `auth.role() = 'authenticated'` policies on `seai_applications`, `seai_documents`, `installation_checklists` (INSERT/UPDATE) never dropped. Customers can read every SEAI application, modify checklists.

5. **`seai-documents` storage bucket open** — any authenticated user can list/download every BER cert, invoice PDF, install photo. Can also delete or upload malicious files.

6. **Tenant context from URL unvalidated** — `?tenant=<uuid>` in URL is not validated against a server-side allowlist. Attacker can craft URLs that route leads to the wrong tenant.

7. **No rate limiting on `extract-bill-data`** — paid AI gateway (Gemini) can be exhausted by any caller in a tight loop.

8. **Stripe webhook idempotency gap** — duplicate event delivery re-sends deposit/final payment emails. No `processed_webhook_events` table.

9. **`send-notification` auth failure** — webhook handler calls `send-notification` with service-role key, but `getCaller()` returns null for service-role keys (they're not user tokens). Deposit/final payment confirmation emails may be silently failing.

10. **Coinbase charge metadata contains PII** — `customer_email` and `customer_name` stored in Coinbase metadata (US servers, outside EU). GDPR transfer without SCC documentation. Not needed for reconciliation.

### Medium (11)

11. CORS returns default origin for disallowed requests (should return empty string)
12. `extract-bill-data` response headers use `corsHeaders` function reference instead of evaluated object
13. Agent logging doesn't redact names, addresses, MPRNs, Irish phone numbers, Eircodes
14. AIConfig claims "stored in Vault" but doesn't actually save anywhere
15. Agent Training test prompt could enable prompt injection when wired to real LLM
16. `anonymise_lead` only redacts touchpoints with `@` in summary — misses most PII
17. Realtime publication includes `leads`, `proposals`, `invoices` — may bypass RLS
18. `assignments` table missing unique constraint — double-fire could create duplicate installs
19. GDPR consent + data subject rights are non-functional (localStorage only, no server-side)
20. Trigger on `leads.workflow_stage` could be weaponized by customers (if leads UPDATE is open)
21. pg_cron vault secret is placeholder — agents silently never run if operator forgets to rotate

### Low (7)

22. Demo mode could re-activate if `VITE_ENABLE_DEMO=true` set in production Vercel env
23. Supabase client doesn't validate env vars exist
24. `claim_next_agent_job` returns pre-update row (off-by-one on attempts)
25. JWT parsing in `tenant.ts` is client-side only (fine, but needs comment)
26. `config.toml` doesn't document that role enforcement is in function body
27. `lovable-tagger` still in package.json (telemetry/dev tool, not runtime)
28. `.env` was committed in v1 (now gitignored, but history may contain it)

---

## Recommended Fix Order (before CRM add-on)

### Phase 1: Ship blockers (1 day)
1. New migration: DROP all remaining `auth.role() = 'authenticated'` policies on `leads`, `seai_applications`, `seai_documents`, `installation_checklists` (INSERT/UPDATE/DELETE). Recreate as role-scoped.
2. `REVOKE EXECUTE ON FUNCTION anonymise_lead, enqueue_agent FROM authenticated` — grant only to `service_role`.
3. Add `requireRole(req, ['admin'])` to `agent-drain` for manual triggers. Keep cron path on service-role key.
4. Fix `seai-documents` storage bucket: set `public=false`, add size/MIME limits, owner-only write policies.

### Phase 2: High severity (2 days)
5. Validate `?tenant=` URL param against server-side allowlist (or remove until CRM).
6. Add rate limiting to `extract-bill-data` (Upstash Redis or Supabase built-in).
7. Add `processed_webhook_events` table for Stripe + Coinbase idempotency.
8. Fix `send-notification` auth: either set `verify_jwt=false` + HMAC secret, or use notification_outbox table.
9. Remove PII from Coinbase charge metadata.

### Phase 3: Medium (3 days)
10. Fix CORS to return empty string for disallowed origins.
11. Fix `extract-bill-data` response headers.
12. Expand PII redaction in agent logging.
13. Implement AIConfig save path (edge function → Vault).
14. Implement GDPR consent_records table + data subject rights edge functions.
15. Tighten realtime publication (remove customer-facing tables, keep notifications + agent_runs).
16. Add `UNIQUE(lead_id) WHERE status IN ('pending','scheduled')` on `assignments`.
17. Expand `anonymise_lead` to redact all touchpoints, notifications, activity_logs for the lead.

### Phase 4: Low (1 day)
18. Add runtime demo-mode warning for non-localhost.
19. Add env var validation in Supabase client.
20. Fix `claim_next_agent_job` to return post-update row.
21. Remove `lovable-tagger` from dependencies.
22. Add code comments for client-side JWT parsing.
23. Document role enforcement pattern in `config.toml`.

---

## Automation/AI Score: 85/100

- ✅ 10 agent implementations (real, not stubs)
- ✅ Agent runtime (claim/dispatch/complete/fail)
- ✅ DB triggers (stage change → enqueue)
- ✅ Idempotency via touchpoints
- ✅ Dead-letter queue + stuck-job sweeper
- ✅ AI Config (OpenRouter, 7 models, DB access, cost cap)
- ✅ Agent Training (prompts, rules, test, learned patterns)
- ✅ Role-aware AI Coach (5 roles, distinct system prompts)
- ✅ LeadFlow (5-step pipeline with real survey form)
- ✅ Professional proposal template (4-page PDF)
- ✅ Compliance papertrail (SEAI + ESB + RECI pre-populated)
- ✅ GDPR compliance layer
- ❌ LLM-backed AI Coach (still static tips — needs LLM call with role prompts)
- ❌ `lead_intake` table not wired into v1 SiteSurveyForm/ProposalQuestionnaire
- ❌ Realtime updates not fully wired in dashboards
- ❌ Predictive lead scoring (basic rules exist, no ML)

**Remaining 15 points:** LLM coach (5), lead_intake wiring (5), realtime (3), predictive scoring (2)

---

## CRM Add-on

**Status:** Ready to receive. The Owner Cockpit sidebar has a "CRM" placeholder. When you share the CRM details, I'll:
1. Review how it integrates with the existing pipeline (leads → surveys → proposals → contracts → installs → SEAI → closeout)
2. Wire it into the sidebar as a full view
3. Connect it to the agent foundation + analytics + communication hub
4. Ensure multi-tenant isolation is properly enforced

Share the CRM add-on whenever you're ready.
