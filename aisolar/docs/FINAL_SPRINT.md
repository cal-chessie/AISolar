# FINAL SPRINT — the whole last mile, one doc (v2 · 3 Aug 2026)

> **What this is.** The single ordered runway from HERE to LIVE. Written after a full-estate sweep of every
> note, audit and sweep doc (source ledger at the bottom). It **supersedes the ORDERING** of every other
> doc — their detail stands, this is the map and the sequence. When every box is ticked and the smoke test
> passes, the cohort comes in. Nothing on this list is unowned; nothing open lives anywhere else.
>
> **How to read it.** Five build sprints in strict order → Cal's deployment gate → the joint smoke test →
> live. Each sprint has a **goal** (one sentence), its **items** (each with the why), and a **done-means**
> line — how we prove it, never "it should work". ⭐ marks the load-bearing item of each sprint.

---

## ⚖️ THE WORKING AGREEMENT (how every item gets built — the best-practice floor)

1. **Ground → build → verify → prove.** Read the real code/DB first; build; verify in the browser or by
   query; state the proof in the commit. Never claim state without tool-proof (pushed = `ls-remote`).
2. **Truth-pass is law.** Nothing fabricated in-app, ever: no fake statuses, no invented numbers, no
   claimed channels (SMS/WhatsApp/roof-detection stay unclaimed until real). The AI **flags, drafts and
   prepares**; a human sends, signs and files. The grant agent TRACKS, never submits.
3. **One of everything.** One quote engine (`computeQuote`) · one scale (`mppAt`) · one money vocabulary
   (`computeOwnerStats`) · one lead surface (LeadFlow) · one tenant resolver · one intelligence
   (`dealIntel`) feeding coach + gates — so no two surfaces can ever disagree.
4. **Personal voice.** Every human-facing line is action + reason, a colleague talking — dealIntel's
   `action`/`reason` pairs are the bar. No robotic one-liners.
5. **Anchored navigation.** Any card that names a problem lands on the EXACT screen that fixes it
   (`?step=` / `?tab=`, built 3 Aug). Every new surface honours the same contract.
6. **Migrations idempotent + add-only. Never `--force`. Never `rm`** (dead files → `_TRASH`). Push only on
   Cal's word. Secrets never in the browser, never in git, never in chat.
7. **Definition of DONE:** grounded + built + `tsc` 0 + browser-verified (or query-verified) + committed
   with the why + ticked HERE. A thing missing any of those is NOT done and stays open.

---

## ✅ THE FOUNDATION (verified closed — never re-open, never re-derive)
Quote engine unified (27/27) · property-type classification · 21-field LeadIntake · gate_bridge + AIGrids
routing (8/8) · tenant-RLS floor + 5-table bleed fix (**applied live**) · pricing-key migration (**applied
live**) · one tenant resolver + settings read-flip · `/customer/:token` portal (proven live) · owner
cockpit NEEDS-YOU-first + one lead surface · Settings truth-passed (honest chips, no connection theatre,
no fabricated audit) · RoofDesigner true-scale rebuild + clear-all · stage-aware + **anchored** deep links ·
demo cast (10 leads, 5 archetypes) · global logins (calchessie + cal@renewably.ie = platform-admin) ·
add-lead Eircode+MPRN end-to-end (**leads.eircode applied live**) · family colour on all three rails +
funnel + agent tiles · analytics reordered (Charts→Leads→Agents, strip shown once) · Clients pipeline
full-depth on white · financials/overview money mismatch killed · agent-trio SectionBanner symmetry ·
AI Config honest 1-2-3 + Emergency-stop card · **dealIntel** (signals → nextMove → aiReports) live on owner
gates + coach briefing + AI-reports feed · **Compliance Vision v1** (`verify-artefact` edge fn + type-test
cross-check card at the gate) · A9 auth-bypass split (a PROD build can never skip login) · A10 coach
fabrication gated (no invented customers, ever) · Sweep-8 codes verified done: A1-scaffold · A2 · A4 · A5 ·
M1 · M8 · X8 · CLAUDE.md header corrected to V5.

---

## SPRINT 1 — 🤖 AI GOLDEN
**Goal: the AI is the compliance officer and the closer's edge — "worth its weight in gold", provable on screen.**

- ✅ ⭐ **Compliance Vision, whole gate.** *(Done 3 Aug — verified live.)* Reusable `ArtefactCheckCard` now
  runs three cross-checks on the commissioning gate: the **plate photo** (serial + AC rating + model vs
  typed), the **type-test cert** (the NC6→NC7 band-error killer), and the **RECI cert** (number vs
  Settings). Each captures its own photo, flags-not-blocks, and stays honest (no_ai / unreadable never read
  as a pass). *(Still open: print "AI cross-checked ✓ (n agree)" on the pack cover — rides Sprint 2's pack writes.)*
- ⭐ **Coach sings on every POV** *(Cal's sequencing: MUST land before the finale tour).*
  - ✅ **Installer voice** *(Done 3 Aug)* — the briefing now leads with the top `dealIntel` move (the
    blocking NC6 item: "close out X's gate — serial is still open"), then the day's load.
  - ✅ **Customer voice** *(Done 3 Aug)* — a real stage-aware briefing: where their project is, what
    happens next, and what (if anything) we need from them — warm, never over-promising.
  - ✅ **`consultantIntelligence.leadIntel()` onto dealIntel** *(Done 3 Aug)* — where dealIntel has a
    ranked move, leadIntel now speaks it (action + reason), so the consultant's per-lead read, the coach and
    the owner gates can't tell different stories. All 3 leadIntel consumers unchanged (stable interface).
  - ⬜ Owner/consultant deepen further · ⬜ the coach goes **conversational** (prompts at every gate, not
    only when asked) — deferred: proactive interruption is a UX call, needs Cal's eye.
- ✅ **Call-prep card.** *(Done 3 Aug — verified live: "Proposal Sent · €134,350 on the table · 3 days here
  · opened 3× / Price vs payback — is it worth it? / 6.9-yr payback · €19,526/yr saved".)* `dealIntel.callPrep`
  → a collapsible three-line strip on the LeadFlow header: where they are · their words (or the likely
  concern) · the number that answers it. Deterministic; LLM polish when enabled.
- ✅ **Inbox triage.** *(Done 3 Aug — verified live.)* `inboxTriage` classifies the customer's last real
  message (question · objection · booking · complaint · silence — system events like opens/signs/payments
  read as silence, never a false message) and drafts a first reply. Surfaced in BOTH inboxes (consultant
  cockpit + shared installer inbox): a colour tag per conversation + a "Suggested reply" that only FILLS the
  box — the human edits and sends. The objection draft pulls the deal's real numbers (verified on Corrib:
  "6.9-yr payback · €19,526/yr saved"). Two genuine customer messages added to the demo cast so it's visible.
- **Outside touchpoints — agents STRONGER on email (Cal's question, answered in code):** every outbound is
  personal (their name, their numbers, their next step) · branded (tenant from-name/reply-to) · human-gated
  · and **logged as a touchpoint the intelligence then READS** — opens/replies feed dealSignals, so the
  loop closes and every send makes the next one smarter. Guardrails: never invent figures (quote engine
  only) · never claim SMS/WhatsApp · deterministic fallback always.
- ✅ **Survey-photo intelligence.** *(Done 4 Aug — card verified rendering.)* New `analyse-roof-photo` edge
  fn (vision, mirrors verify-artefact's honest pattern) + `roofRead` + a `RoofPhotoRead` card at the top of
  the survey's Roof step: the surveyor snaps the roof, the model reads orientation, pitch, shading and
  obstructions, and "Use these" fills the form fields (they confirm + adjust). no_ai / unreadable never fill
  a confident wrong value. Vision itself verifies at deploy with the AI key (like Compliance Vision).
- ❌ **Voice → field record.** *(CUT 4 Aug — Cal: "not needed".)* Installer voice-to-note was an on-site
  nicety, not a launch multiplier. Dropped; revisit post-cohort only if the field team asks.
- ➡️ **Proposal personalisation → moved to SPRINT 2.** *(Cal 4 Aug: "move it into sprint 2 for when we do
  get to test it".)* It lives in the deployed `agent-drain` edge function (the drafter's LLM call carries
  dealSignals — "you're out all day, so the battery is what makes this work" — numbers stay computeQuote's),
  so it's built + tested with the AI key at deploy, alongside 2D's outbound. See Sprint 2D.
- ✅ **Customer's own money view.** *(Done 4 Aug — verified live.)* A pinned "Your money" card in the portal:
  total cost → SEAI grant (honest status: included / we'll file after install / with SEAI) → your price →
  paid so far → still to pay → one plain "what's next" line. Reads the real proposal + invoice + stage, so it
  never disagrees with the header. Verified: €7,200 − €1,800 grant = €5,400, €0 paid, €5,400 due.
- ✅ **INBOX TRUTH-PASS FIX (4 Aug — Cal: "the messages are not accurate, nothing makes sense").** Three
  real defects fixed in `buildConversation`: (1) a hard-coded *"When will my installation happen?"* was
  injected into every proposal-stage thread — a message the customer never sent — **removed**; (2) the
  Welcome/intro was pinned to `touchpoints[0]`, so for mid-journey leads it sorted *below* the proposal —
  now re-stamped just before the earliest real message so it always opens the thread; (3) a genuine customer
  message on the email channel silently vanished from the thread (only `portal` rendered) and system events
  were mis-styled — now customer messages render as their own bubble on any channel, events stay quiet
  system lines. Also reverted a same-session leadIntel change that let dealIntel's staleness rule override
  per-stage guidance ("chase them" when the ball was with the surveyor).
- ✅ **Feed honesty guard.** *(Done 4 Aug.)* The AI-reports feed now always renders with its live count and
  shows a calm all-clear ("Nothing needs you right now — I'm watching the book") when there's nothing to
  flag, instead of vanishing. Never invents a report (A10 already gates the read to []). Verified live.

**Done-means:** each surface demo'd in the browser on the cast · verify-artefact smoke-tested at deploy
with a real cert photo · no AI claim anywhere the deterministic floor can't back.

---

## SPRINT 2 — 🔴 THE BLOCKERS (the launch spine — nothing below matters if these don't close)

### 2A · The paper trail (Cal: "worst thing is a mistake in the paper trail")
- ✅ ⭐ **ONE doc-id vocabulary** *(Done 4 Aug)* — `docVocab.ts` reconciles `decideCompliance` short ids ↔
  `lead_documents` CHECK long ids ↔ `fieldRecord` cert keys. One name everywhere.
- ✅ ⭐ **Wire the writes** *(Done 4 Aug)* — `paperTrail.ts` writes `lead_documents` + `esb_submissions`
  (sealed; `esb_reference`/submitted stay NULL until a REAL portal submission — truth-pass). Demo-safe (no
  session = no-op). Migration `20260804_doc_vocab_reconcile.sql` applied live + verified.
- ✅ **NC6 §3 correspondence** *(Done 4 Aug)* — company landline + email wired into the §3 form block.
- ✅ **BEYOND 2A (4 Aug) — the full NC7 + NC7-01 forms** (all pages: §4/§5 incl. MIC/MEC + the 3 assessment
  questions, §6/§7 owner signatory, the confirmation cert's header + protection column + sign-off + owner
  declarations, Vector-Shift truth-pass), **the Installers roster** (Safe Electric Cert Number), **and the
  ENTIRE SEAI grant workflow** (eligibility gate · lifecycle spine + `seai_grants` table live · owner tracker
  · customer card · auto-advance off the gate · DoW + data-sheet PDF artifact + both-party eIDAS signatures +
  bundled equipment datasheets). See docs/SEAI_GRANT_WORKFLOW.md.
- ⬜ **Per-customer pack gate** — every cohort customer's NC pack passes `nc6Completeness` + a human eyeball.
- ⬜ **Surface the gate** — missing items at the 3 human touchpoints (job card · consultant lead view · owner
  badge); the Coach speaks them *(dealIntel already carries packBlockers — finish the surfacing)*.
- ⬜ **NC8 decision** — the overlay is EMPTY (>50kW jobs get the data appendix only). Calibrate it, or state
  "appendix-only for NC8" honestly at launch. Decide, don't drift.

### 2B · The front door + the fork
- ⭐ **A1 · Auth + tenant onboarding** — signup → tenant + role + first-admin bootstrap; the Flowith flow is
  its face (ONBOARDING_SPEC). **Dependency: Cal's own auth/onboarding TS functions — flagged in the spec,
  never received. Cal: drop them in RAW, or say "build without".**
- ✅ **Ask home-or-business at the door + the §D estimate fork** *(Done 4 Aug — verified live)*. The door
  ASKS now (was inferred). `calculateSystemEstimate` forks on `propertyType`: domestic = €-saving + payback
  + SEAI grant (unchanged); commercial = ex-VAT + VAT reclaim + NDMG + ACA (100% first-yr allowance × 12.5%)
  + ROI + IRR (25-yr). Door toggle + preview + estimate step all fork; SolarCalculator numbers are
  commercial-correct (NDMG). *(Open: the full ROI/ACA/IRR re-skin of the SolarCalculator/widget rides with
  2E's widget.)*
- **L2 · Numbers-through-spine** — the proposal drafter STORES `computeQuote()` +
  `selfConsumptionFromOccupancy()` output; kill the flat `0.70`. *(CALS_GROWTH_DEV quote-drift findings
  ride here.)*
- **Read-flip completion** — finish `realLeads` across the workbench; align `serverStore` dual-writes to V5
  tables. Verify signed in: the cockpit shows DB rows and settings round-trip.
- **National merge** — RI + SI = one national account, two brands; Cal's owner login sees both.

### 2C · Per-surface wiring — ✅ **LANDED 5 Aug** (except installer photos→storage, parked)
- ✅ **Consultant:** `handleSendReply` → `addTouchpoint` (DB) + `notify('reply')` emails the customer their
  reply + magic link *(Done 5 Aug)*. `advanceLeadStage` → `workflow_stage` + `notify('stage_change')`
  both-ends *(Done 5 Aug)*. *(kernel `StageTransitioned` = post-cohort.)*
- ✅ **Installer:** serials → `installed_equipment` (JobViewV2 wired, verified) *(Done)*. ⬜ **photos →
  storage + `install_evidence`** — the ONE 2C leftover; needs a storage bucket *(parked in DEPLOYMENT_GATE)*.
- ✅ ⭐ **Deposit → installer routing (multi-installer).** *(Done 5 Aug — verified in-browser: job surfaced →
  routed to a crew → gate cleared.)* `InstallerGate` on the owner's Financials surfaces every deposit-paid
  job with no crew; roster picker → `assignInstaller()` writes the `assignments` row (migration
  `20260805_assignments_roster_ref` applied live: `installer_ref`/`installer_name`, `installer_id` nullable)
  + bells the team. *(Post-cohort: geo-route by area + distance — POST_COHORT.md.)*
- ✅ **Owner:** FinanceWindow deposit link → `notify('deposit_link')` (branded email + magic link) *(Done
  5 Aug)*. The CHARGE itself rides `create-checkout` (deploy-gated — DEPLOYMENT_GATE).
- ✅ **Customer:** Ask-AI → **guardrailed** brain (customerBrain + brainGuardrails L4: refuses anything
  outside THEIR project) + persists + notifies consultant · callback → `notify('callback_request')`. Token
  customers write via the `portal-inbox` edge fn (M4). *(Done 5 Aug — verified live.)*

### 2D · Outbound that's real — ✅ **LANDED 5 Aug** (email rail is code-complete; deploy flips it on)
- ✅ ⭐ **`notify(event)` spine** *(Done 5 Aug)* — one call → bell (`notifications` table, RLS-scoped,
  realtime) + branded email with the portal magic link always in. Every send wired: proposal · deposit link ·
  photo request · reschedule · survey options · handover pack · referral · team invite · stage change ·
  callback · customer message. The bell rail is LIVE end-to-end; `send-notification` extended for the generic
  branded email (deploy + Postmark secret to switch on).
- ✅ **Both-ends law (L1)** — every interaction notifies customer AND consultant. Email + magic link only.
- ✅ **Branded outbound** — tenant from-name via `getTenantBrand()`. *(Verified-domain reply-to = deploy.)*
- ✅ **M4** — `notifications` (tenant_id + user-addressed RLS) + `portal-inbox` fn for token customers. The
  dedicated `magic_link_tokens` table = M4 hardening, parked (the lead `access_token` serves today).
- ✅ **Proposal personalisation** — `agent-drain` drafter already carries occupancy/dealSignals; the LLM
  voice layer (`brain-voice`, BYO key) rephrases without touching the numbers. Seam ready; deploy + AI key on.

### 2E · The go-live signal — ✅ **WIDGET LANDED 5 Aug** (sites wiring + Maps-key security still open)
- ✅ ⭐ **The WIDGET** *(Done 5 Aug — verified: /embed bill → estimate → capture → "thank you")*. The
  calculator now CAPTURES: after the estimate, the visitor's details POST to `ingest-lead` with the embed's
  `x-source-key` → `resolve_lead_door` → the lead lands in THAT tenant's pipeline. `SolarCalculator` gains
  `onGetProposal` (embed fork). Owner Settings → "Put your calculator on your website" shows the one iframe
  snippet + copy + live preview. Demo-safe (no key → walkable, no write). *(Needs `ingest-lead` deployed.)*
- ⬜ **Sites wiring** — SolarIrelandGroup · RenewableIreland · wideawakesolar: door helper + calculator-first
  + Cal.com booking. **Designs untouched.** *(Go-live moment — DEPLOYMENT_GATE §6.)*
- ⬜ **🔐 D4 + D3** — the Maps key OUT of the client bundle (edge proxy) · Google Solar server-side.
  Security; **widget-blocking, not cohort-blocking** *(flagged in DEPLOYMENT_GATE)*.

**Done-means:** a stranger signs up, becomes a tenant, and takes a lead door → proposal → deposit → pack
with every send real and every document row written — verified as a real signed-in tenant, not in demo.

---

## SPRINT 3 — 🟠 CONFORMITY + POLISH (the feel of one product)

- ⭐ **Shared page-header / shell conformity** — consultant + installer adopt the owner's shell header;
  no stacked titles anywhere *(banner symmetry shipped 3 Aug — this is the page-level half)*.
- **AIField mobile-first** — ClientHub · DayRoute · JobViewV2 (fixed 288px rail) on a phone, then the
  **full logic walk**: serials gate → NC6 fields → sign-off chain. *(ROUND4 "AIField is thin" rides here.)*
- **Design Studio** — the default array snaps to the solar-read roof centroid (it drops on the driveway
  today).
- **Sweep-8 polish codes:** M6 designs persistence (kills stored-vs-live kWp drift) · M7 proposal_versions
  (the contract rests on a version, not a moving row) · M3 signature_hash (sha256 onto the DoW/NC record) ·
  M11 touchpoints.sender + Realtime (the field team's voice in the one thread) · M12 staff home-address +
  depots (the scheduler's real inputs) · M13 agent_route_runs (the owner sees WHY the route was picked) ·
  X2 Cal.com real booking (key in `.env.local`) · X3 distance-matrix (real drive-time; calendar-aware dates
  kill the naive today+5/today+28) · X9 e-sign contract path · L5 white-label sweep (every customer-facing
  "AISOLAR" → tenant brand) · A3 leadflow real sends · A6 consent honoured server-side (close the loop with
  `anonymise_lead`).
- **Front-end truth + shine:** `brand.ts` placeholder stats **replaced or removed — a truth-pass violation
  is shipping on customer pages today** · hero snapshots reshot from the CURRENT UI · copy pass every page ·
  pricing page depth (what you LOSE down-tier · FAQ · € not just % · custom-tier qualifier) · the AIOS page
  becomes an actual AIOS-blue page (the ten agents + proof) · proposal "fantastic" pass · blog + per-page
  meta (the deferred Sweep-7 content layer).
- **Per-tab polish:** Clients type-badges · Financials aging · SEAI pack-status chips · Schedule roster +
  unscheduled queue + `PlannableJob.lockedDate` (Sweep-7.1).
- **Demo cast geography** — cluster each installer's jobs so the day-route reads true.
- **Redundancy kills:** `touchpoints` vs `lead_touchpoints` (one survives) · retire the old `AiTeamPage` ·
  rename the two `AgentWindow`s (verified different — name collision only).
- **Cleanups:** delete the `aios.smoketest` user · deprecate `extracted_premises_type` (in-schema note) ·
  ToS rewrite · CSV bulk import · **doc-ref hygiene:** ~20 docs still cite dead DB refs
  (`coxmtpnq`/`vythuqax`) — one corrective banner pass; fix the stale `leadWrites.ts` security comment
  (RLS IS tenant-scoped on V5 — verified live 1 Aug).

**Done-means:** a phone-walk of all three cockpits reads as ONE product · every polish code verified with
its own line · zero invented numbers anywhere customer-facing.

---

## SPRINT 4 — 🧹 HARDENING · BUGS · SECURITY (make it boring; make it inevitable)

- ⭐ **Role→route matrix, tested** — every route × every role (owner / consultant / installer / customer /
  anonymous), asserted: who gets in, who bounces where. The A9 fix proved the front door; this proves every
  corridor.
- ⭐ **RLS proof pass** — per-table, per-role queries against V5. The Saunderson check: the client's
  3-brands-one-tenant sees ONE book; a second tenant sees NOTHING.
- **Security checklist:** no secret in the built bundle (grep the build output) · no service key
  client-side · every edge fn rejects anon where it must (verify-artefact ✓ · extract-bill-data ✓ — sweep
  the other 16) · consent + GDPR erasure end-to-end (`anonymise_lead` leaves nothing behind) · demo env OFF
  in prod, verified · rate limits on the public doors (`ingest-lead` dedupe ✓).
- **Error honesty:** every catch either surfaces to the user or logs with context — no silent swallows on
  the money paths (checkout · sends · pack seal).
- **Bug sweep:** the PUNCH_LIST leftovers + a fresh click-through of every cockpit at desktop AND 375px ·
  re-verify the `ProposalView:424` blank-onClick (retracted once — prove it dead) · console clean on every
  route.
- **⚠️ STATUTORY FLAGS — Cal's yes required; never a quiet edit:**
  1. **ESB micro-gen bands** — the code shorthands 6/11 kW; the rule is 25 A/phase = **5.75 kVA
     single-phase / 11.04 kVA three-phase**. We under-file at exactly 5.75–6.0 kW single-phase. Policy
     read + sign-off before live.
  2. **Typed e-signature** on the NC6 vs wet ink — until ESB confirms, the pack says "print, sign & date by
     hand".
  3. **NDMG + ACA figures** — verified against the SEAI PDF before either appears on a commercial proposal.

**Done-means:** the matrix + RLS proofs pasted into this doc as evidence · each statutory flag carries
Cal's explicit yes/no · a cold adversarial pass finds nothing the checklist missed.

---

## SPRINT 5 — 🎬 THE FINALE — ✅ **LANDED 5 Aug** (built to Cal's exact spec)

- ✅ **Owner sidebar demo toggle** *(Done 5 Aug — verified)*. A real toggle (not a button); ON ⇒ the
  **5-lead cast** (one per variant, each NC6/NC7 filled) REPLACES the pipeline across the CRM, OFF ⇒ real
  leads. Deliberate-only (the sticky `?demo=1` footgun is gone); sandbox write-guard = no real DB writes
  while on. "Browse Views" route-index + `/demo` page RIPPED OUT; DemoBanner now a thin "Sample data" strip.
- ✅ ⭐ **The guided tour** *(Done 5 Aug — verified: 15 stops, cross-surface, no loop, survives navigation)*.
  App-level + route-driven, so it survives clicking around (the restart bug is fixed). Walks the spine and
  **ducks into the consultant's survey + the installer's field job as sub-steps**, doubles back on the SEAI
  pack (download it, see for yourself), finishes in Settings. Every stop makes the human-gate point.
  Auto-runs once (first cockpit visit / `?tour=1`), relaunch from the sidebar "Take the tour."
- ✅ **Doubles as** new-tenant onboarding + cohort training + the founder teaching walk.

**Done-means:** ✅ someone who has never seen AISolar completes the tour unaided. *(The "then adds a real
lead + sends a real proposal" half is the deploy smoke test — DEPLOYMENT_GATE §6.)*

---

## 🔑 DEPLOYMENT — CAL'S GATE (I prep every artefact; you run; every line has a verify)
_The full, current, one-command-per-line runbook is **`docs/DEPLOYMENT_GATE.md`** (compiled 5 Aug)._
1. `brew install supabase/tap/supabase` + `supabase login`.
2. ✅ **GATE 0 REDUNDANT** (Cal, 5 Aug): we moved to a FRESH Supabase project (V5
   `ywizcsulurxoqjdgnkvc`). The leaked keys were on the OLD dead projects (coxmtpnq · vythuqax ·
   kernel) — nothing to purge on the live one. Not a blocker. *(The Maps key referrer-lock is the
   one live security to-do — LAST_MILE 🔒.)*
3. Deploy **18 edge functions** (the 17 + `verify-artefact`) + set secrets — I prep the manifest with a
   per-fn verify line. verify-artefact's smoke: one real cert photo → a planted mismatch caught.
4. Postmark server token + DNS (DKIM/return-path) → one real email lands in a real inbox.
5. Vercel deploy — demo env vars OFF · **Supabase Auth Site URL = prod domain** (kills localhost-in-email —
   it already bit the global-login signup).
6. Doors onto the live brand sites (the go-live moment) — designs untouched.
7. Supabase **PITR backups ON** (one switch).
8. Any remaining keys → `.env.local`/RAW, never chat (Cal.com ✓ already there).
9. **Drop your auth/onboarding TS functions** for A1 — or say "build without". *(Sprint 2 dependency.)*

## 🤝 TOGETHER — THE PROOF, THEN LIVE
The full smoke test on prod: door → route → survey → proposal (open tracked) → deposit (real charge) →
install → pack sealed → rows in `lead_documents` + `esb_submissions` → handover. Every human button pressed
once; a real email lands at every send; read-flip verified signed-in; the 3-brands-one-tenant check;
per-customer pack confirmations; first cohort onboarded on the tour.

---

## ⏸ POST-COHORT (parked ON PURPOSE — build on revenue; named so nothing is re-derived)
M5/L3 learning loop (agent_corrections → owner report → prompt revision → approve → version bump — the
"Wrong" buttons already record) · owner agent-training UI (watch it learn) · agent enrichment as real leads
reveal thin spots · AIGate human surface (the national gate-call cockpit) · browser `portal_submitter`
(auto-keys the NC into the ESB portal — the human gate stays) · M9 referrals + tier_entitlements · A11 plan
gating · M10 installer_vault · M14 inventory / depot shelf (`computeBOM` aggregation + reorder) · X5
Realtime everywhere · X6 Sentry · X7 `/health` + uptime (Better Stack, uptime-only) · G1 referral money-off
link · G2 review → Google Business on completion · G3 growth set · L7 self-heal/report/improve
(draft-first) · SMS/WhatsApp as a REAL channel (Twilio wired first, claimed only then) · HK1 vault repo
commit · Sweep-9 tier entitlements + code-split · per-tenant DKIM · PostHog full · Intercom (~25 clients) ·
Beehiiv · dunning · kernel Phase 2 (bind gate_bridge → the inscribed kernel) · knowledge-graph · D6
plate-OCR (superseded by Compliance Vision) · calendar-aware scheduling v2 beyond X3.
**Tooling verdicts (3 Aug, standing):** keep Postmark · PostHog light · Better Stack uptime-only · SKIP
Upstash + Trigger.dev · NO Next rewrite of the app · Cloudflare DNS-only.

---

## 📜 SOURCE LEDGER (what fed this doc — the detail lives there; the ORDER lives here)
MASTER_TODO (3 Aug consolidation) · GO_LIVE · PUNCH_LIST (13 items + verdicts) · MASTER_AUDIT_1AUG (§4 +
the drift ledger) · DEPLOYMENT_READINESS_2AUG (the squad pass) · DEPLOYMENT_CALS_LAST_GATE (L2 · read-flip
· national merge) · PAPERWORK_AUDIT (doc-ids · lead_documents · NC8 · the statutory flags) ·
SWEEP8_DB_WIRING (45 codes — all placed) · SWEEP9_NOTES (§9.1 ask-at-the-door) · SWEEP10_NOTES (§D fork ·
§E training · brand.ts) · SWEEP_7.1 (schedule roster · lockedDate · unexecuted Deno note) ·
SWEEP_AUDIT_ROUND4 (AIField thin · placeholder stats) · AISOLAR_SAAS_MAP (the per-surface ⬜ list) ·
COMPLIANCE_DATA_CAPTURE (NC6 §3) · THE_OPERATING_STACK (coach depth · notifications half-wired) ·
CALS_GROWTH_DEV (the register · quote-drift · conversational coach) · NOTES + FOUNDER_NOTES (learning loop
· RECI-persist verify) · ONBOARDING_SPEC (Cal's TS-functions dependency) · AI_WORTH_ITS_WEIGHT (the AI
ranking) · HANDOVER_ANSWER · THE_ONE_READ.

**Changelog:** v1 (3 Aug AM) — five sprints. +Sweep-8 codes. +remaining-docs mine. **v2 (3 Aug PM) — full
rewrite: working agreement · done-means per sprint · final-sweep stragglers folded in (L2
numbers-through-spine · national merge · NC8 decision · Cal's-TS-functions dependency · quote-drift ·
conversational coach · doc-ref hygiene · outside-touchpoints answer). The complete estate, one order.**
