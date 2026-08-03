# FINAL SPRINT — the scheduled order to deployment (3 Aug 2026)
### THE one doc for the last mile. Folds in EVERY open item from the weeks of notes — MASTER_TODO · GO_LIVE §1/9/10 · PUNCH_LIST · PAPERWORK_AUDIT · MASTER_AUDIT §4 · SWEEP10 §D/§G · ONBOARDING_SPEC · AI_WORTH_ITS_WEIGHT · DEPLOYMENT_CALS_LAST_GATE §0 — deduped into ONE scheduled order, with the deployment runbook below it. When every box here is ticked, we are live.
### Voice principle (Cal, 3 Aug): every human interaction is PERSONAL — action + reason, a colleague talking, never a robotic one-liner. dealIntel's `action`/`reason` pairs are the standard; hold it everywhere.

---

## ✅ THE FOUNDATION (verified, closed — never re-open)
Spine: bill→survey→design→ONE quote engine (27/27 executed)→sealed NC pack→routing (8/8)→tenant RLS (live-verified).
Cutover built · P0 customer portal proven · cockpit sings · Settings truth-passed · roof true-scale · 10-lead cast ·
family colour across rails/funnel/agents · numbers single-sourced · **AI v1 LANDED (3 Aug): dealIntel (signals · nextMove ·
aiReports) wired into coach briefing + live AI-reports feed + owner NEEDS-YOU · Compliance Vision (verify-artefact edge fn
+ gate cross-check card)** · both globals live · demo toggle · eircode/MPRN capture.

---

## SPRINT 1 — 🤖 AI GOLDEN (finish the v1 editions; Cal: "knock it out of the park")
1. **Compliance Vision, whole gate**: extend the cross-check to the **plate photo** (serial+rating vs typed) and the
   **RECI cert** (number vs Settings) — the fn already takes all three kinds; wire the two buttons. Then the pack
   cover states "AI cross-checked ✓ (n fields agree)" — honest, never claimed without a run.
2. **Coach on every POV**: consultant (done via shared feed) · owner (done) · **installer voice** (gate items + route,
   "you're 2 serials from done") · **customer voice** in the portal ("here's what happens next and why") — the SING.
3. **Call-prep card** (AI#3): open a lead → 3 sentences — where they are, the objection in their words, the number
   that answers it. Lives on LeadFlow header. Deterministic from dealSignals + thread; LLM voice when enabled.
4. **Inbox triage** (AI#4): classify inbound (question·objection·booking·complaint·silence) + drafted reply behind the
   send gate. Rides the unified inbox.
5. **Outside touchpoints — agents STRONGER on email (Cal's question, answered)**: every outbound = personal (name,
   their numbers, their next step) · branded (tenant from-name/reply-to) · signed off by a human gate · logged as a
   touchpoint the intelligence then READS (opens/replies feed dealSignals — the loop closes) · guardrails: never
   invent figures (quote engine only), never claim SMS/WhatsApp, deterministic fallback always.
6. **Survey-photo intelligence** (AI#5) + **voice→field record** (AI#6) — build if sprint time allows, else first
   post-launch build. **Learning loop** (AI#7) = post-cohort (needs real outcomes).

## SPRINT 2 — 🔴 THE BLOCKERS (the launch spine)
7. **ESB paper trail**: ONE doc-id vocabulary → wire `lead_documents` + `esb_submissions` writes (sealed→submitted→REAL
   ref→status) → per-customer pack confirmation gate → gate surfaced at the 3 human touchpoints (+ coach speaks it — done).
8. **A1 auth + tenant onboarding** — signup→tenant→roles→trial, wearing the Flowith flow (ONBOARDING_SPEC). Includes
   the 7-day trial→payment (Stripe subscription, webhook flips status, Customer Portal self-serve).
9. **Estimate §D fork** — pre-survey estimate branches on property_type (commercial/farm never see a domestic-shaped
   first number); cap by designed system when one exists.
10. **The WIDGET (insane) + owner embed-code panel** → **sites wiring**: SIG + RI (+ wideawakesolar) — door helper,
    calculator-first, certificate kept, Cal.com booking (key in `.env.local`). **Designs untouched.**
11. **Notification spine v1** — one `notify(event)` → bell + branded email, portal link always in; wires the 4 gated
    toasts to real sends; branded outbound (tenant from-name on one verified domain).

## SPRINT 3 — 🟠 CONFORMITY + POLISH (the feel)
12. **Shared page-header/shell conformity** — consultant + installer adopt the AppShell header pattern; AgentFoundation's
    residual double-title resolved (banner = SectionBanner everywhere).
13. **AIField mobile-first** — ClientHub/DayRoute/JobViewV2 phone-真 (375px), thumb-first; full logic walk of the
    serials→NC6→sign-off chain on a phone.
14. **Design Studio once-over** — default array snaps to the solar-read roof centroid (off the driveway).
15. **Front-end revamp** — fresh hero snapshots from the CURRENT UI · copy pass · pricing page rebuild · proposal
    "fantastic" pass · replace brand.ts placeholder stats (truth-pass) · per-page meta (Sweep 7 debt).
16. **Per-tab polish** — Clients type-badges · Financials aging · SEAI pack-status chips · demo geography clustered
    per installer (the route reads true).

## SPRINT 4 — 🧹 HARDENING · BUGS · SECURITY (Cal: "final hardening — make it inevitable")
17. **Security pass**: re-run the live RLS census (every table tenant-scoped, no loose policies — the 2 Aug method) ·
    verify-artefact + all fns fail-closed re-check · rate-limit + honeypot on ingest-lead · Stripe idempotency keys ·
    secrets sweep (nothing in bundle/git; SECRETS.md canonical) · GDPR erasure re-run (anonymise_lead covers eircode).
18. **Bug sweep**: tsc gate into build (`tsc --noEmit` pre-commit) · full click-path walk of all three cockpits +
    portal at 375/768/1440 · console-clean rule · the touchpoints/lead_touchpoints redundancy (one survives) ·
    retire AiTeamPage(old) · rename the twin AgentWindows · delete test user aios.smoketest · deprecate
    extracted_premises_type in-schema · ToS rewrite (legal).
19. **Dead-letter alerting** — a failed agent run pings (Slack webhook exists) — silence is the only failure mode left.

## SPRINT 5 — 🎬 THE FINALE (LAST, Cal's order)
20. **Coach sings on all POVs** (Sprint 1 #2 complete = the gate to this).
21. **Demo toggle on the owner sidebar** (left column) — flips the 10-archetype cast in; Browse-Views becomes
    **leads-only**, not a route index.
22. **The guided tour** — instructional walkthrough following the spine: lead→estimate→survey→design→proposal→send→
    contract→deposit→install→NC pack→handover, finale agents→products→settings→analytics. Personal voice throughout.
    Doubles as cohort onboarding + founder walkthrough.

---

## 🔑 DEPLOYMENT (below the line — Cal's hands, I prep everything)
- [ ] `brew install supabase/tap/supabase` + `supabase login`
- [ ] Old-key rotation + git-history purge (coxmtpnq · vythuqax · kernel · Maps) — GATE 0
- [ ] Deploy **18 edge functions** (now incl. `verify-artefact`) + secrets manifest (I prep; you paste values)
- [ ] Postmark token + DNS · Vercel deploy (demo OFF) · **Supabase Auth Site URL = prod domain**
- [ ] Supabase **PITR backups ON** (one switch) · Better Stack uptime ping on app + ingest-lead
- [ ] Doors onto the live brand sites — **the go-live signal**
- [ ] The two ESB policy reads: 5.75/11.04 kW bands · typed e-signature acceptance

## 🤝 TOGETHER (the proof, then live)
- [ ] **The full smoke test**: door → route → survey → proposal → deposit → pack — every human button fires its chain,
      a real email lands, the stored numbers match the screen (the L2 proof), read-flip verified signed-in
- [ ] Client's 3-brands-one-tenant check · per-customer pack confirmation · first cohort onboarding through the new flow

## ⏸ POST-COHORT (parked on purpose)
Learning loop · survey-photo + voice capture (if not reached) · AIGate surface · portal_submitter browser agent ·
per-tenant DKIM · PostHog full · Intercom(~25) · Beehiiv · kernel Phase 2 · THE_OPERATING_STACK §2/§3.
