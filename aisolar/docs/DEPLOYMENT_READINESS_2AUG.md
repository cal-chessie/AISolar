# DEPLOYMENT READINESS — 2 Aug 2026 (the final audit, read together)
### The squad pass Cal called: engineering + senior dev, home-stretch check. Maths · spine · cutover · intake security · NC6/NC7 · customer touchpoints · agentic best practice · the 20. **Everything below verified against the LIVE V5 DB or executed code — no memory, doubts marked ❓.**

> Trail: [MASTER_AUDIT_1AUG.md](MASTER_AUDIT_1AUG.md) (estate map) · [PAPERWORK_AUDIT.md](PAPERWORK_AUDIT.md) (NC6/7 engine)
> · [CALS_GROWTH_DEV.md](CALS_GROWTH_DEV.md) (growth register) · [SWEEP10_NOTES.md](SWEEP10_NOTES.md) (final polish) ·
> [DEPLOYMENT_CALS_LAST_GATE.md](DEPLOYMENT_CALS_LAST_GATE.md) §0 (the deploy checklist this doc updates the truth under).

---

## 1 · SQUAD VERDICTS (the home-stretch question, answered per lane)

| Lane | Verdict | Proof |
|---|---|---|
| **MATHS (the money)** | ✅ **SOUND — 27/27 executed assertions pass** | Ran the edge engine live (`tsx`): domestic tiers €700/€200 cap €1,800 exact (1/2/3.5/4/8 kWp) · NDMG piecewise exact incl. €162,600 cap (14/20/75/5000 kWp) · 13% commercial VAT in the maths · tenant pricing dial flows to gross · 0.70 ONLY as fallback · savings + 20-yr identities hold · CEG per-provider mapping right. Frontend↔edge `computeQuote` money lines **identical** (structural diff; residue = interface comments + the known pre-survey domestic-only stub, Sweep 10 §D). |
| **SPINE (routing/kernel-bridge)** | ✅ **LIVE + SOUND** | Schemas `aigrids` + `gate_bridge` exist on V5; `aigrids.route_lead` + `gate_bridge.offer/project/verify` present (proven 8/8 on 31 Jul). Kernel `qolqqgcb` paused = **by design** (Phase 2, post-cohort); gate_bridge is the witness surface that binds to it later. **The kernel plan is sound — nothing rests on it for launch.** |
| **AGENTIC RUNTIME** | ✅ **BEST PRACTICE — genuinely** | `claim_next_agent_job` = `FOR UPDATE SKIP LOCKED` + priority order + lock lease + `attempts < max_attempts` + dead-letter (`failed_at`) + service-role-only. Idempotency short-circuits before every insert (survey/proposal). Draft-only human gates (`status:'draft'`, never auto-send). Honest send-recording (no touchpoint claims an email that didn't go). This is the textbook Postgres queue pattern. **Gap: dead-lettered jobs sit SILENT** → #17 below. |
| **INTAKE SECURITY (door→gate)** | ✅ **SOUND, 1 hardening gap** | Every door walked (§3). Fail-closed everywhere: bad source key → 401, unconfigured → 500 (never tenantless leads), typed+truncated field sanitisation, source whitelist, 24h dedupe, leaked door key = inject-only/own-brand/revocable. `access_token` = double `crypto.randomUUID` ≈ 244 bits (not Math.random). Checkout: staff JWT or exact token match. Stripe webhook: signature-verified, fail-closed. **Gap: no rate-limit/honeypot on the public door** → #5. |
| **CUTOVER (the spine of settings/data)** | ⚠️ **3 blockers, ALL now have ready fixes** | ① `tenant_settings` CHECK still rejects `'pricing'` (live-verified today) → migration **written** (`20260802_tenant_settings_pricing_key.sql`). ② Tenant-resolution split (RLS=`user_roles`, `pushTenantSetting`=JWT) → align serverStore to `user_roles` (#3). ③ Read-flip only after ①+②. Migration-vs-live: **files matched live everywhere checked** (constraint history reconstructs exactly; 38 live tables all accounted for by migrations). |
| **TENANT ISOLATION** | 🔴 **ONE REAL BLEED FOUND — fix written, ready** | The 20260731 floor covered leads+19 children but **missed 5 config/comms tables**. Live-verified: `tenant_settings` = `auth.role()='authenticated'` (ANY signed-in user, ANY tenant, read+write pricing/brand/finance/RECI) · `conversation_messages` (cross-tenant customer PII) · `sources` (cross-tenant DOOR KEYS) · `products` (cross-tenant price overrides) · `feedback`. **`20260802_rls_floor_extension.sql` written** — same floor pattern, policy-only, idempotent. **This is the #1 pre-cohort item.** |
| **PAPERWORK (NC6/NC7 — the proof gates)** | ✅ engine SOUND · ⚠️ persistence + 2 ESB verifies open | Engine superseded-ledger in [PAPERWORK_AUDIT.md]: NC6 35/35 calibrated · NC7 9/9 · sealed pack with SHA-256. Open: `lead_documents` never inserted (track/chase not real yet) · doc-id vocab mismatch · NC8 overlay empty · ❓ ESB 5.75/11.04 kVA band read · ❓ typed e-sig acceptance. Strengthening design → §4. |

**Home stretch? YES — with eyes open:** the maths, spine, agents, and intake are launch-grade. What stands between here and the cohort is: the RLS extension (written), the pricing key (written), the serverStore tenant-align + read-flip, A1 onboarding, the NC6/7 persistence wiring, and Cal's-hands deploy steps. That's a countable list, not a swamp — §7 is the checklist.

---

## 2 · DEAD WEIGHT KILLED TODAY (old bleeds)
- `leadWrites.ts` header — claimed calchessie + "leads NOT tenant-scoped" (a phantom hole; live V5 is scoped). **Corrected.**
- `leadCapture.ts` — stale coxmtpnq/GATE-0 framing. **Corrected.**
- `CLAUDE.md` header — pointed the whole repo at dead `coxmtpnq`. **Corrected → V5 + audit trail; old State section marked HISTORY.**
- Remaining deliberate: `extracted_premises_type` column (0 reads, deprecation comment planned) · demo cast rebuild (Sweep 10) · `agent-drain` history comments (explain the fix, keep).

## 3 · THE CUSTOMER JOURNEY — every touchpoint, and making them the star
**The doors (entry):** ① `/embed` + `/calculator` widget (`?k=source_key`) ② `/start` `/upload` bill analyser ③ website forms → `ingest-lead` ④ phone/manual (consultant creates) ⑤ referral. All → ONE keyed pipe → routed, tagged, agent-picked-up.
**The middle:** auto-acknowledge email → AI analysis/estimate → survey booking + confirmation → survey day (installer on site) → proposal link (`/p/:leadId`) → portal (`/my-projects`, token magic-link).
**The money:** deposit (Stripe/Coinbase hosted) → payment reminder agent → final invoice → receipt.
**The end:** install scheduling + T-7/T-1 → install day → commissioning gate (serials, attestations) → NC6/7 pack → SEAI grant tracking → handover pack + warranty → review + referral ask.

**Star-of-the-show gaps (design → Sweep 10 §H):**
- **The tracker moment** — the portal should open on a live stage tracker ("bill read ✓ → survey booked Thu 10am → proposal → install"), the Domino's-tracker for solar. Data already exists (stages + touchpoints); it's a render, not a build.
- **White-label depth** — `tenantBrand` today = logo + company name + portal title. The star treatment: accent colour + from-name/reply-to on EVERY email, the widget, the proposal PDF, the portal, the tracker — one brand object, every surface. (Emails currently carry platform styling — the county installer's customer should see the INSTALLER, full stop.)
- **One-click money, front-middle-end** — deposit button ON the proposal page (not portal-hunt) · Apple/Google Pay wallets via Stripe (config, not code) · final invoice one-click + instant receipt · milestone email after each payment ("deposit in — your install window is…"). The financial layer is the thinnest customer layer today (hosted checkout works; the EXPERIENCE around it is bare).
- **Human-touchpoint strengthening at the gates** — §4.

## 4 · NC6/NC7 — the last gates, strengthened (the proof the system works)
The engine is built; the strengthening is **informing every human EARLY**:
1. **Surface `nc6Completeness()` at T-minus, not at print time.** The 10 blockers are precise and named (MPRN · RECI · address · email · mobile · named installer · gate serials · Table-1 attest · rated current · type-test ref · first-connection). Show the checklist: on the JOB CARD before the visit (installer sees what the roof must yield) · in the CONSULTANT's lead view (what the office must fill) · in OWNER Settings (company gaps badge — already exists, keep). Same function, three surfaces, zero new data.
2. **The AI Coach speaks the gate.** At each stage the coach names the missing NC6 items in plain words ("no MPRN yet — it's on the bill, top right").
3. **Wire `lead_documents` persistence** (one doc-id vocabulary first) so prepare→sign→sent→received→complete is REAL and chase-able by the agent — that's the "track & chase" promise.
4. **Grant = TRACK not SUBMIT** (truth-pass holds). Tighten grant SUPPORT: SEAI checklist per scheme on the lead + docs pre-bundled from the same field record. "As tight as technically possible" = the pack is perfect and the human files it in minutes.
5. ❓ **Two ESB policy reads before live** (Cal's yes required): 5.75/11.04 kVA micro-gen bands (code under-files at 5.75–6.0 single-phase) · typed e-sig acceptance (wet-ink fallback stated meanwhile).

## 4b · 🔴 P0 FOUND LATER TONIGHT (2 Aug, Cal's eyes-and-ears round — outranks everything below)
**The paid-customer 404:** `create-checkout` success/cancel URLs point at `/customer/<access_token>` — **a route that
does not exist** (and `CustomerPortalV2` reads no token). A customer who just PAID lands on NotFound. Fix = build the
token-keyed `/customer/:token` portal route (= the magic-link front door, task #8) + point checkout there + "copy portal
link" on staff views + the link in every customer email. Full triage of Cal's 2-Aug directive (AIField mobile CONFIRMED
thin · coach depth · notification spine · white-label sing) → **[THE_OPERATING_STACK.md](THE_OPERATING_STACK.md)**.

## 5 · THE 20 IMPROVEMENTS (ranked; ✍ = fix already written today)
**Close before cohort (security/correctness):**
1. ✍ **RLS floor extension** — `20260802_rls_floor_extension.sql` (tenant_settings · conversation_messages · sources · products · feedback). THE bleed.
2. ✍ **`'pricing'` key admitted** — `20260802_tenant_settings_pricing_key.sql`.
3. **Align `pushTenantSetting` tenant-resolution to `user_roles`** (kills the JWT dependency for settings persistence; one function).
4. **The read-flip** (DB-first settings + real data) — after 1–3; ONE cutover.
5. **Rate-limit + honeypot on `ingest-lead`** (public door hardening; a hidden field + per-IP window).
6. **A1 tenant onboarding** (signup → tenant + role + first-admin bootstrap) — launch-critical, already on §0.
**The proof gates:**
7. **`lead_documents` wiring + ONE doc-id vocabulary** — track/chase becomes real.
8. **`nc6Completeness` surfaced at 3 human touchpoints** (job card · lead view · settings badge).
9. **Coach speaks the gates** (stage-aware missing-items prompts).
10. ❓ **ESB verifies ×2** (bands + e-sig) — policy reads, Cal's yes.
11. **NC8: calibrate or state appendix-only** (one >50kW commercial away from mattering).
**The star customer:**
12. **Portal stage tracker** (the Domino's moment — render existing data).
13. **White-label depth** — tenantBrand accent + from-name across emails/widget/proposal/portal.
14. **One-click deposit ON the proposal** + wallets (Apple/Google Pay toggle).
15. **Milestone money emails** (deposit → "install window"; final → receipt + warranty + BER next-steps).
16. **Magic-link re-entry** (customer self-serve resend; token rotate-on-request).
**The autonomous machine:**
17. **Dead-letter alerting** — failed agent job → Slack/notification (the queue is silent today).
18. **Stripe idempotency keys** on checkout creation (double-click = one session).
19. **`tsc --noEmit` in the build gate** (it's 0 today — LOCK it) + form-integrity check in CI (ESB PDF revision tripwire).
20. **Demo cast rebuild on the 5 archetypes** (property_type-true; the cohort demo + onboarding tool — Sweep 10, designed).

## 6 · AUTONOMY-READINESS (Cal: "as full autonomous and agent ready as possible")
Already true: relay of single-responsibility agents · atomic claim · idempotent handlers · draft-gated risk · honest recording · deterministic fallback · prompts-as-config (`agent_prompts`). To be agent-OPERABLE end-to-end add: #17 alerting (self-reporting failures) · #7 doc-pack persistence (agents can chase paperwork state) · the AIGate human surface when national goes live (already noted post-launch) · owner agent-training UI (noted, post-launch). **Verdict: the runtime is agent-ready; the visibility layer is the missing 10%.**

## 7 · THE READINESS CHECKLIST (current position — read together, tick together)
**🔨 Mine (build, in order):** ① serverStore tenant-align (#3) → ② read-flip (#4) → ③ doc-vocab + lead_documents (#7) → ④ gate surfacing (#8/#9) → ⑤ tracker + white-label + one-click money (#12–15) → ⑥ ingest hardening (#5) → ⑦ alerting (#17) → ⑧ demo cast (#20).
**🔑 Yours (hands/decisions):** `supabase db push` the two ✍ migrations (1-2) · the two ESB policy reads (#10) · old-key rotation · edge-fn deploy + secrets · Postmark token + DNS (I prep, you paste) · Vercel domain · doors on the live brand sites · **push the branch** (4→now-more commits sit local).
**🤝 Together:** the smoke test (every human button fires its full chain + a real email lands) · the read-flip verification · first cohort tenant onboarding.

*Everything in §1 marked ✅ is verified, not vibes. Everything ⚠️/🔴 has a written fix or a named owner. Nothing else found hiding — and I looked.*
