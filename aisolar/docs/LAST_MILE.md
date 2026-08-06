# THE LAST MILE — the one hub (5 Aug 2026)

_Cal's rule: ALL running notes stream into THIS doc (or POST_COHORT / CAL_GROWTH),
never new note files. Bugs, bottlenecks, thin code, founder training, the security
pass — they live here. The deploy command detail stays in `DEPLOYMENT_GATE.md`._

**Where we are:** the product is BUILT and browser-verified on the cast — the whole
spine (lead → survey/NC6-NC7 → proposal → deposit → installer-routing gate → install
→ grant pack → handover), the AI brain across every POV, the widget, the demo toggle,
the guided tour. **2C · 2D · 2E · Sprint 5 = ✅.** **GATE 0 is redundant** (we moved to
a fresh Supabase project — V5 `ywizcsulurxoqjdgnkvc`; the old leaked keys were on dead
projects, nothing to purge). **We are very nearly deployed.** The gap is: deploy it,
prove it, and a short ranked list.

---

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
2. **2A · per-customer pack gate** — surface missing NC6/NC7/grant items at the 3 human touchpoints. **Cohort-blocking** (the paper-trail rule). + NC8 decision.
3. **Founder operational setup (Cal: "I haven't got a baldy")** — I WALK CAL THROUGH: (a) **Branding** — Settings → Brand: logo, from-name, portal title, accent (touches every customer surface). (b) **Postmark** — verify a sending domain (DKIM/return-path), paste the token as the secret; the from-name comes from the tenant brand. (c) **How every customer uses it** — the customer journey playbook (magic-link portal, no password; they ask the AI, book, pay, download the pack). Notes seeded in Founder training below; expand as we do each.
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
  review").** THE ANSWER is this doc. Every build gets notes + verification here, so the
  system is NOT trapped in one AI session's memory — the docs ARE the continuity. When the
  CTO lands, they read LAST_MILE + DEPLOYMENT_GATE + COMMS_AI_SYSTEM and they're current in
  an hour. That's how we survive the bus-factor: write it down, always.

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

### 🟡 MEDIUM — legacy global tables (documented; Cal's product call before scaling)
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
| **Security posture** | 2.5 | **~8**| GATE 0 redundant · tenant isolation PROVEN (reads AND writes) · a CRITICAL cross-tenant escalation + an AI-key leak FOUND & FIXED & re-proven · edge auth all-gated · no secrets in bundle. To-do: Maps-key referrer-lock + the legacy-global-tables decision. |
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

### 🎓 Founder training (Cal — plain English, expand as we do each)
- **What "deploy" means:** the app runs in the browser now, but the server-side helpers (email, the widget's lead-catcher, card charges, the AI voice) are separate little programs ("edge functions") that have to be pushed live once + given their secret keys. Until then they're built but switched off. One script does most of it: `./scripts/deploy-comms.sh`.
- **Branding:** Owner → Settings → Brand. Your logo, your "from" name on emails, your portal title, your accent colour — this stamps every customer-facing surface. Set it once per tenant.
- **Postmark (email):** it's the postman. You verify you own a sending domain (so Gmail trusts your mail), paste one secret token at deploy, and every branded email + magic link goes out as YOU. Without the token the app just… doesn't send (no error to the customer).
- **How every customer uses it:** they get a magic link (no password) → a chat-first portal that IS their project. They ask the AI (it answers off their real numbers), pick a survey time, pay the deposit by card, and download their grant pack. Your team sees every message on their side; nothing sends to the customer without a human clicking.
- **The demo toggle:** flick "Sample data" in your sidebar to see 5 example leads and take the tour — it never touches your real leads. Safe to play in front of anyone.

---

## ⏸ Parked on purpose → POST_COHORT.md (build on revenue). Growth ideas → CAL_GROWTH_PLAYBOOK.md.
