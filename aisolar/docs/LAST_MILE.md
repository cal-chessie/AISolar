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
4. **2C · installer photos → storage** — a Supabase bucket + `install_evidence` rows. The one 2C leftover.
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

## 📓 LIVING LOG — I maintain this every session (Cal: bugs · bottlenecks · thin code · founder training)

### 🐞 Bugs (found + fixed this session)
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
