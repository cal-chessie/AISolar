# MASTER TODO — everything to be done, one view (3 Aug 2026)
### Cal: "the complete audit and todo across all docs." This is THE consolidation — every open item from GO_LIVE, CALS_GROWTH_DEV, PUNCH_LIST, MASTER_AUDIT §4, PAPERWORK_AUDIT, SWEEP10, deploy doc, deduped + ordered. Detail lives in those docs; this is the map + the order.

> **Legend:** 🔴 launch-blocker · 🟠 launch-polish (should) · 🔑 Cal's hands (deploy) · ⏸ post-cohort · ✅ done.
> **Order of build:** blockers → polish → deploy(Cal) → together(smoke) → cohort. Post-cohort is parked ON PURPOSE.

---

## ✅ DONE (this session + prior — the closed ledger, don't re-open)
**Spine + maths:** quote engine unified (computeQuote, 27/27 executed) · classification on `property_type` · 21-field
LeadIntake type · gate_bridge + AIGrids routing (8/8) · tenant-RLS floor + the 5-table bleed fix (**applied live**) ·
pricing-key migration (**applied live**).
**Cutover:** one tenant resolver (user_roles) + settings read-flip on sign-in.
**Customer:** P0 `/customer/:token` magic-link portal (paying-customer 404 killed, proven live) · copy-portal-link.
**Owner cockpit:** NEEDS-YOU-first overview · one lead surface (LeadDetailView deleted) · **Add client** button · dead
imports out.
**Settings:** Brand-first order · fake "connected" chips → honest deploy-command rows · connection theatre deleted ·
fabricated audit deleted · Channels merged into Integrations · 2-col desktop grids · Pricing & Terms side-by-side.
**Design:** RoofDesigner **true-scale rebuild** (oversized panels dead — Esri + roofGeo mppAt, one scale everywhere) ·
stage-aware deep links.
**Demo:** 10-lead cast, 5 archetypes, invariant-true · `?demo=1/0` toggle.
**Global login:** `calchessie@gmail.com` = platform admin (+ `cal@renewably.ie`).
**3 Aug PM:** persistent **Demo toggle** (pill off → Browse-Views on) · **add-lead Eircode + MPRN** (leads.eircode
applied live, end-to-end) · RoofDesigner **Clear-all-panels**.

---

## 🎬 THE FINALE — guided demo tour (Cal, 3 Aug: "we do this LAST")
**Order of operations: everything else on this list → then make the AI COACH SING on all POVs → then this.**
- **Browse Views becomes LEADS-only** — not a route index. The toggle moves to the **owner sidebar (left column)**,
  and flipping it populates the **10 lead archetypes** so the user is clicking real work, not a menu.
- **Then the guided tour**: prompts the user through the whole product, following the SPINE in logical order —
  lead in → estimate → survey → design → proposal → send → contract → deposit → install → NC6/SEAI pack → handover —
  **finale: agents → product catalog → settings → analytics.**
- Instructional, not decorative: each stop says what this screen is FOR, what to click, what just happened behind it.
  Doubles as cohort onboarding + the founder teaching walkthrough (SWEEP10 §E).

## 🔴 LAUNCH BLOCKERS (before the cohort touches it)
### A · The cutover, finished
- **Verify the read-flip end-to-end** signed in as a real tenant (settings load from DB, save round-trips). *(code done; needs a live authed walk = part of the smoke test)*
- **A1 · Auth + tenant onboarding** — signup → create tenant + role + first-admin bootstrap. The Flowith flow IS its face. *(ONBOARDING_SPEC; the 7-day activation checklist is the spec)*

### B · The ESB paper trail (Cal: "worst thing is a mistake in the paper trail")
- **ONE doc-id vocabulary** — reconcile `decideCompliance` short ids vs `lead_documents` CHECK long ids vs `fieldRecord` cert keys.
- **Wire the writes** — `lead_documents` + `esb_submissions` (sealed → portal-submitted → REAL ref → status). Nothing writes them today.
- **Per-customer pack confirmation gate** — every cohort customer's NC pack passes `nc6Completeness` + a human eyeball before launch.
- **Surface the gate** — missing-items shown at the 3 human touchpoints (job card · consultant lead view · owner badge) + Coach speaks them.
- ⚠️ **VERIFY-BEFORE-LIVE (Cal's ESB reads):** the 5.75/11.04 kW bands (under-file risk) · typed e-signature acceptance.

### C · Data capture gaps (found 3 Aug — real leads lose data)
- **Estimate still domestic-shaped for every lead** (Sweep-10 §D fork) — a commercial/farm lead's first estimate is wrong-shaped; branch on `property_type`, cap by designed system when one exists.

### D · The front door (the go-live signal itself)
- **The WIDGET** — the per-tenant embeddable calculator→lead door + the owner "copy your embed code" panel.
- **Sites wiring** — SolarIrelandGroup + RenewableIreland (+ wideawakesolar): door helper + calculator-first + certificate kept + Cal.com booking. **Designs untouched.**

---

## 🟠 LAUNCH POLISH (should — the "everything feels broken" list)
### UI conformity (Cal, 3 Aug: "sizing and family not aligning between views")
- **⭐ NEXT OPENER — shared page-header / shell conformity** — every cockpit tab + agent surface uses ONE header (title size, spacing, family accent). Today `AgentFoundation` mixes CardTitle/h2/h3; consultant uses a different AgentWindow → they drift.
- **AIField mobile-first** — ClientHub (1 breakpoint), DayRoute (desktop-only), JobViewV2 (fixed 288px rail). Installer's on a phone.
- **AIField full logic walk** — serials gate → NC6 fields → sign-off chain on a phone.
- **Design Studio once-over** — default array snaps to roof centroid (drops on driveway today); **let the user remove ALL panels** (clear-to-zero, no forced redraw).
- **Front-end revamp** — fresh hero snapshots from CURRENT UI · copy pass every page · **pricing page rebuild** · proposal "fantastic" pass · replace `brand.ts` placeholder stats (truth-pass).
- **Per-tab polish** — Clients type-badges · Financials aging · SEAI pack-status chips.

### Behaviour / truth
- **⭐ Coach v1.5 — MUST SING on all POVs before the demo tour (Cal's sequencing)** — per-POV voice + real signals (deal value, days-in-stage, the NC6 gate). Today it's ~13 hard-coded stage lines. See `AI_WORTH_ITS_WEIGHT.md` #2.
- **Notification spine v1** — one `notify(event)` → bell + brand-themed email, portal link always in. Wires the 4 draft-gated "queued — goes out with approval" toasts to real sends.
- **Branded outbound** — every email from the tenant's brand (from-name + reply-to on one verified domain at launch).
- **7-day trial → payment** — Stripe subscription (trial_period_days 7), webhook flips tenant status, Customer Portal for self-serve.
- **Training walkthrough** — founder teaching walk + guided `/demo` on the 10-lead cast (doubles as cohort onboarding).
- **Redundancy kills** — `touchpoints` vs `lead_touchpoints` (one survives) · retire `AiTeamPage` (old) · resolve the two `AgentWindow`s (rename, not merge — verified different).
- **Cleanups** — delete test user `aios.smoketest@gmail.com` · deprecate `extracted_premises_type` column (in-schema, non-destructive) · **`CLAUDE.md` header** now correct (V5) · Terms of Service rewrite (legal) · CSV bulk import.
- **Demo geography** — cluster each installer's cast jobs so the day-route reads true (routing algo is sound; geography spans Ireland).

---

## 🧾 SWEEP-8 RECONCILIATION (added 3 Aug — Cal: "I don't trust you if you're forgetting items")
**The gap, honestly:** MASTER_TODO was consolidated from GO_LIVE · PUNCH_LIST · the audits — but I never mined
`SWEEP8_DB_WIRING.md`'s **45 coded items** (M/D/X/L/G/A series, 71 open markers). Below is that list, each **verified
against the code today** — not copied blind. Several were already done since 30 Jul; the rest are now owned here.

**✅ VERIFIED DONE since Sweep 8 was written (don't re-open):**
A2 front-door lead creation (`/start` posts through the door) · A4 settings-persist (6 stores dual-write) ·
M1 `installed_equipment` (write fn live + table) · A5 ai-config (saves to `ai_config`) · X8 LLM behind the drafter ·
truth-guard (Settings now says "not configured", 3 Aug) · M8 products (table live) · A6 consent (`pushConsent` exists).

**🔴 STILL OPEN + launch-critical (now on the list):**
- **A10 · dummy-data purge** — `generateDummyLeads` still reachable in **6 files** (was 18). Prod must have NO dummy
  path. Pairs with the demo-toggle work.
- **A9 · POV/role gating proof** — routes gate, but **demo bypasses auth**; needs demo-off in prod + a tested
  role→route matrix + per-POV RLS proof.
- **X1 · Postmark sends** — every UI-fake send wired for real (proposal · deposit · photo-request · reschedule ·
  handover pack · referral · team invite). This IS the notification spine.
- **L1 · both-ends notify** — every interaction notifies customer AND consultant (email + magic link; no SMS/WA).
- **D4 · maps-static-proxy** — ⚠️ SECURITY: the Maps key must never ship to the client; proxy it. (D3 buildingInsights
  server-side rides with it.)

**🟠 OPEN, launch-polish:**
M3 signature_hash (sha256 on the DoW/NC record) · M4 notifications + magic_link_tokens · M6 designs persistence
(kills stored-vs-live kWp delta) · M7 proposal_versions (append-only) · M11 `touchpoints.sender` + **Realtime
(verified NOT wired)** · M12 staff home address + depots (scheduler inputs) · M13 agent_route_runs (owner
transparency: chosen order + km/min/€ saved) · X2 cal.com real booking · X3 distance-matrix drive-time ·
X9 e-sign contract flow · L4 ask-AI guardrail (customer AI refuses anything outside THEIR project) ·
L5 white-label sweep completion (10 files use tenantBrand; finish the rest).

**⏸ POST-COHORT (correctly parked):** M5/L3 learning loop · M9 feedback+referrals+tier_entitlements · A11 entitlements ·
M10 installer_vault · M14 inventory/depot shelf · D6 plate-OCR *(largely superseded by Compliance Vision, 3 Aug)* ·
X5 Realtime · X6 Sentry · X7 uptime *(Better Stack — tooling verdict)* · G1 referral link · G2 review→Google Business ·
HK1 vault commit.

## 🔑 CAL'S HANDS (deploy — I prep, you run)
- `brew install supabase/tap/supabase` + `supabase login` (needed for edge deploys).
- Old-key rotation + git-history purge (coxmtpnq · vythuqax · kernel · Maps).
- Deploy 17 edge functions + set secrets (I prep the manifest).
- Postmark token + DNS · Vercel deploy (demo OFF in prod env) · **Supabase Auth Site URL = prod domain** (fixes the localhost-in-email that bit the global login).
- Doors onto the live brand sites (the go-live moment).
- Flip ON Supabase PITR backups (one switch).
- Paste any remaining keys to a file/RAW (Cal.com is in `.env.local` ✓).

## 🤝 TOGETHER
The full smoke test (door → route → survey → proposal → deposit → pack; every human button + a real email lands) ·
read-flip verification · the client's 3-brands-one-tenant check · per-customer pack confirmation · first cohort onboarding.

---

## ⏸ POST-COHORT (parked on purpose — build on revenue)
Sweep-9 hardening (tier entitlements · code-split) · AIGate human surface (national gate-call cockpit) · browser
`portal_submitter` agent (auto-keys the NC into the ESB portal) · per-tenant DKIM domains · PostHog full · Better Stack
status page · Intercom (~25 clients) · Beehiiv newsletter · dunning automation · knowledge-graph / kernel Phase 2
(bind gate_bridge → inscribed kernel) · the full THE_OPERATING_STACK §2/§3.
**Tooling verdicts (3 Aug):** keep Postmark · PostHog light at launch · Better Stack uptime-only · SKIP Upstash/Trigger.dev · NO Next rewrite of the app.

---

## 🤖 AI OPPORTUNITY (new doc, 3 Aug)
`AI_WORTH_ITS_WEIGHT.md` — honest verdict: the SPINE is what's special; the AI is currently a typist, not an expert.
Top two moves that change that: **compliance vision** (model reads the type-test cert / serial plate / RECI cert and
catches mismatches before the NC6 is filed — the one nobody can copy) and **the coach that actually knows the deal**.
Both ride the existing runtime + gates.

## SOURCE DOCS (where the detail lives)
[GO_LIVE.md](GO_LIVE.md) (the gate) · [CALS_GROWTH_DEV.md](CALS_GROWTH_DEV.md) (register + growth) ·
[PUNCH_LIST.md](PUNCH_LIST.md) (the "nothing works" walk) · [MASTER_AUDIT_1AUG.md](MASTER_AUDIT_1AUG.md) (estate, live-verified) ·
[PAPERWORK_AUDIT.md](PAPERWORK_AUDIT.md) (NC6/7) · [SWEEP10_NOTES.md](SWEEP10_NOTES.md) (§D fork · §G type debt) ·
[ONBOARDING_SPEC.md](ONBOARDING_SPEC.md) (Flowith flow + activation) · [OWNER_REVAMP_BRIEF.md](OWNER_REVAMP_BRIEF.md) ·
[DEPLOYMENT_CALS_LAST_GATE.md](DEPLOYMENT_CALS_LAST_GATE.md) §0.
