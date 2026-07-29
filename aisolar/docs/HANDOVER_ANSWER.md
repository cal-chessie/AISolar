# PRE-LAUNCH HANDOVER — THE ANSWER (30 Jul 2026)

> The full, honest answer to `PRE_LAUNCH_HANDOVER.md`, written as the expert
> development institution handing the company to its owner. Labels: **REAL**
> (works + tool-verified) · **FAKED** (toast/local/demo/dummy) · **WRITTEN** (on
> the branch, not deployed) · **NOT BUILT**. Where I can't verify from this seat
> I say so and how to. Branch: `cowork-jul25` @ `965442d`. Nothing here is
> softened. Section 19 contains gaps named in NO other doc.

---

## 1. THE ONE-PAGE TRUTH

The frontend product — four role worlds (Owner, Consultant, AIField, Customer),
the unified inbox, the agent transparency windows, the JobViewV2 install flow —
is **built and browser-verified, but ONLY in demo mode, on dummy data, with the
auth gate bypassed**. The agent runtime deployed in Supabase is REAL
infrastructure (queue, idempotency, cost caps, real Postmark on 5+ email types)
but runs the OLD handlers — the smarter scheduler-v2/product-pick brain is
WRITTEN, not deployed. **No real customer has ever flowed through this system
end-to-end.** Autonomy honestly: the *plumbing* is ~75% real once data exists;
the *decision quality* in the middle is ~50% (two agents stamp dates, scoring is
4 if-statements). **The single thing that blocks launch:** there is no path from
"an installer signs up" to "their real data on their screens" — signup/tenant
provisioning (A1) doesn't exist, the three cockpits read dummy data
unconditionally (no real-data read layer), and SaaS billing doesn't exist. **The
risk that would hurt you most:** launching multi-tenant with RLS unproven and
(later) an unguarded LLM — one cross-tenant leak in a compliance product kills
the trust the whole thesis stands on. Secondary: the statutory commissioning
record currently lives in a phone's localStorage.

## 2. THE PIPELINE, STAGE BY STAGE

| Stage | Status | Evidence / gap |
|---|---|---|
| Bill extract | **REAL (deployed)** | `extract-bill-data`: 21 fields, persists to `lead_intake`, auth (staff JWT or lead token), returns `persisted:boolean`. Per repo CLAUDE.md, deployed. |
| Lead capture (widget/API) | **REAL (deployed)** | `ingest-lead`: x-ingest-key, tenant stamp, 24h dedupe; websites point at it. `CalculatorWidget` posts to it. |
| Lead capture (/start front door) | **FAKED at the end** | The `/start` bill→estimate→book flow renders, but the **booking creates NO lead** (A2). The funnel's mouth is open but not connected to the throat. |
| Lead intake agent | **REAL, shallow** | Deployed; scores + dedupes + advances stage. Scoring = 4 if-statements (`agent-drain`), not intelligence. |
| Survey scheduling | **REAL send, dumb date** | Deployed today: `today+5, 10:00` stamp + real Postmark. scheduler-v2 (next-free-working-day, no double-book) = **WRITTEN** (`9591d56`), not deployed. |
| Survey → proposal handoff | **REAL** | DB trigger copies survey → `lead_intake.confirmed_*` (migration `20260722`); drafter reads confirmed → survey → estimate. |
| Proposal drafter | **REAL, two flaws** | Deployed: drafts with LLM narrative + cost tracking, `status:"draft"` never auto-send. Flaw 1: hardware hardcoded (fix WRITTEN, not deployed). Flaw 2 — **the silent ballpark you asked about**: stored proposals use flat `SELF_CONSUMPTION_PCT = 0.70` (`leadIntake.ts:169`) while every screen recomputes occupancy-driven — stored vs live numbers can disagree. M7/L2 kills it. |
| Grant | **REAL tracker, nothing more** | Creates internal `seai_applications` row. **Nothing is submitted to SEAI** (no public API exists). Copy now says "prepares the pack" — correct. |
| Install coordination | **REAL send, dumb date** | `today+28` stamp + real Postmark; v2 WRITTEN. No materials logic. |
| Install execution (AIField) | **REAL UI, LOCAL data** | JobViewV2 checklist→commissioning→handover verified in browser. But checks, photos ("uploaded" = a boolean, no file), serials, signature persist to **localStorage** (`fieldRecord.ts`, `jobview_v2_<id>`). Lose the phone = lose the statutory record. M1–M3. |
| Compliance (NC6/7/8) | **REAL engine, 70%** | See §7. |
| Customer portal | **REAL structure, demo data** | Token-gated, reads pipeline shape; Ask-AI is deterministic keyword lookup; guardrail L4 not enforced (moot until LLM). |

## 3. THE 10 AGENTS

All 10 run through the **deployed OLD** `agent-drain` (single entry, `FOR UPDATE
SKIP LOCKED`, `agent_runs` audit, idempotency checks, LLM daily cost cap ~$5
default with per-run cost recorded — REAL and genuinely good infrastructure).

| Agent | Decide or stamp? | State |
|---|---|---|
| lead_intake | **Stamps** (4 if-score) | deployed |
| survey_scheduler | **Stamps** today+5 → v2 decides (bookings, weekday, ≤3/day) | v2 WRITTEN |
| proposal_drafter | Half-decides (real draft, hardcoded gear → picked from catalog) | fix WRITTEN |
| follow_up | **Decides** (stage-aware, LLM-personalised, thresholds) — the best one | deployed |
| grant | Stamps a tracking row (honest) | deployed |
| install_coordinator | **Stamps** today+28 → v2 decides (1/day, 10d lead) | v2 WRITTEN |
| post_install | Real (warranty email, review ask) | deployed |
| customer_digest / stale_lead / payment_reminder | Real crons, real emails | deployed |

**The thin middle, complete:** (1) deploy scheduler-v2 + product-pick [WRITTEN —
one command]; (2) real calendar availability (consult actual calendars, not just
booking counts) [NOT BUILT]; (3) customer slot-offer — offer 3 days, customer
picks, `lockedDate` re-solve [NOT BUILT]; (4) geographic clustering — needs
geocoded lat/lng + Distance Matrix (M12/X3) [NOT BUILT]; (5) smarter scoring
[NOT BUILT]; (6) the self-learning loop — "Wrong" buttons are toast-only →
`agent_corrections` → owner-approved prompt revisions (M5/L3) [NOT BUILT];
(7) real LLM behind coach + customer AI (X8) [NOT BUILT — deterministic today].
**Failure handling:** `fail_agent_job` + stuck-sweeper exist; **nobody is
notified** — you'd find out by looking (§11).

## 4. ACCESS & POV — WHO CAN REACH WHAT

- Route gating **EXISTS** (`ProtectedRoute` roles → redirect `/auth` or
  `?reason=forbidden`).
- **Demo mode bypasses it entirely** (`ProtectedRoute.tsx:41` — returns children,
  no check). **Every screen you've been shown all week ran with the locks off.**
- **CONFIRMED ROLE-MATRIX BUG (named in no doc until now):** `App.tsx:143` —
  `/owner` allows roles `['admin','consultant']`. **Any sales guy can open the
  Owner Cockpit** — financials, margins, team management. There is no distinct
  `owner` role at the route level. Must fix before any second employee exists.
- **RLS: NOT PROVEN per-POV.** Policies exist from migrations
  (recursion-safe role management etc.), but nobody has logged in as consultant
  A and tried to read consultant B's — or tenant B's — rows. The kernel/CRM
  projects separately carry ~41 security advisories (GATE 0). AISolar-project
  advisory status: **I don't know** — check Supabase Dashboard → Advisors.
- **Straight answer to "if I flipped to production this second":** with demo off,
  users hit the auth wall (good) — but any consultant who signs in can open
  `/owner`, every cockpit shows **dummy data** rather than their data (§6), and
  I cannot promise DB-level isolation until the per-POV proof runs. **Do not
  flip it.**
- Plan: kill demo in prod (`VITE_ENABLE_DEMO` unset — already the rule) → add an
  `owner` role + fix the matrix → scripted RLS proof (4 test users, assert
  cross-reads fail) → then production.

## 5. SECURITY & THE AI LEAK SURFACE

- **Today the "AI" cannot leak — because it isn't an LLM.** `generateAIResponse`
  + `coachBrain` are deterministic keyword functions over data already on the
  client. There is nothing to jailbreak *yet*. The danger arrives the day X8
  wires a real LLM — which is why the SWEEP9 §9.0 guardrails (least-privilege
  server-side context, scope allow-list, content-as-data, red-team CI) must land
  **with** X8, not after. **Red-team suite: NOT BUILT.**
- **GATE 0: OPEN.** Three historically-leaked Supabase keys (kernel, CRM,
  AISolar) — rotation reportedly done 24 Jul (session notes) but **I cannot
  verify from this seat** (check Supabase dashboard API settings vs git
  history). **Git history NOT purged** — the old keys are still readable in
  history. Maps key: shipped client-side as `VITE_GOOGLE_MAPS_KEY` (normal for
  Maps, but **referrer-lock unverified** — check Google Cloud Console).
- Secrets in repo today: none found in working tree; history is the problem.
- eIDAS signature: never machine-signed (enforced in `pdfFill.ts` — the appendix
  states it). Kernel: refs-only contract written (`kernelVocabulary.ts`), emits
  not wired, so nothing to leak there yet.

## 6. DATA

- **The finding that reframes "remove dummy data": all three cockpits read the
  dummy generator UNCONDITIONALLY** — `ConsultantCockpitV5.tsx:108`,
  `InstallerPortalV5.tsx:60`, `OwnerCockpit.tsx:102`:
  `useState(() => generateDummyLeads())`, no demo check, no Supabase query.
  **A10 is not a cleanup — it is BUILDING the real-data read layer for the three
  main screens.** (18 files total reference the generator; `AgentFoundation`
  is the good exception — it queries real `agent_runs` when demo is off.)
- GDPR: `anonymise_lead` REAL + a real leak fixed (`20260724` — eircode/notes
  left behind on erasure). Cookie consent: banner exists, consent stored in
  **localStorage only** — no server-side consent record (A6).
- Kernel payloads: refs-only by contract; not yet emitting.
- Statutory field data (serials, signature, photos-as-booleans): **localStorage**
  (§2). M1–M3 are what make it real.

## 7. THE COMPLIANCE MOAT — NC6/NC7/NC8

17 data points, 5 sources (`pdfFill.ts collect()`):
- **A. Identity/site (6)** — name, address, eircode, MPRN, phone, email → bill
  extract + lead. **REAL.**
- **B. Supply/system (4)** — 1PH/3PH, panels, DC kWp, battery → survey +
  proposal. **REAL.**
- **C. Fitted/commissioning (5)** — fitted model, serial, AC rating, export
  limit, mismatch flag → the AIField gate. **REAL in-app** (the "waiting on
  AIField" 30% now flows) — **but localStorage-persisted** (M1). Honest
  placeholders until crew confirm; never a designed value in a statutory box.
- **D. Installer/RECI (2)** — company from tenant brand; **RECI number is a
  literal placeholder** — `pdfFill.ts:148` falls back to
  `"( Settings - RECI number )"`. **A form with that string is not filable.** (A4)
- **E. Pages 3–6 — NOT MAPPED.** The calibrated overlay covers pages 1–2 only
  (`OVERLAY_MAPS.NC6` = 12 coordinates). Protection settings, ELS/earthing, test
  values, declarations aren't wired to boxes. The typed data appendix carries
  the record meanwhile.
- Mismatch → substitution flag + note: REAL. NC6↔NC7 flip on fitted AC rating
  (`esbFormForAcKw`): REAL, warned at commissioning. NC7 bundles its 4-PDF
  family: REAL. **NC8: routes correctly but overlay is empty** (appendix-only).
  NC5: true AcroForm fill, REAL.
- Rates: domestic SEAI **verified** (€700/kWp first 2, €200 after, cap €1,800).
  **NDMG commercial: mirrored in code but NOT verified against the SEAI PDF**
  (fetch was 403). **ACA: not implemented, not verified.** Verify both before a
  commercial quote goes out.
- eIDAS position: documented in code comments; **not reviewed by a solicitor.**
- **The real last 30% = D + E** (RECI persistence + pages 3–6 mapping + full
  coverage calibration). C is done. ~1–2 focused days.

## 8. THE FUNNEL — BOTH ENDS

- **A1 — can you onboard a paying installer today? NO.** `/auth` logs a user in;
  `grant_role` RPC exists; the first-admin bootstrap SQL must be run manually
  (AUTH_RUNBOOK — skip it and you're locked out as a customer). There is **no
  signup → tenant-provisioning flow**, and — the deeper issue in §19 — no
  decided **multi-tenant architecture** to provision *into*.
- **A2 — does a bill on the tenant's site birth a lead? HALF.** Widget/API path:
  **REAL** (CalculatorWidget → `ingest-lead`, deployed, deduped). The richer
  `/start` bill-upload → book flow: renders, **creates no lead** — the booking
  goes nowhere.
- Identity forks confirmed: app user (owner/sales) chooses at signup [NOT BUILT
  — part of A1]; lead (home/business) chooses on the capture surface [NOT BUILT
  — the ask-first question isn't in the widget yet; engine already branches
  NDMG/VAT off `premises_type`].

## 9. MONEY

- **SaaS billing (trial → card → recurring): NOT BUILT.** `create-checkout` /
  `stripe-webhook` / `coinbase-webhook` exist for **customer deposits** only —
  zero `subscription`/`trial` code (verified by grep). **You cannot charge an
  installer today.** Stripe Billing + a 7-day trial is its own build, tied to A1.
- Customer deposits: code REAL; end-to-end money movement **unverified from this
  seat** (needs a Stripe test-mode run; deployed-state of those fns unverified).
- **Financing: NOT BUILT.** The "€89/mo vs €127/mo" line exists only inside a
  coach script. No lender, no finance line in the estimate. Your biggest
  conversion lever is absent.
- **Entitlements (plan/tier gating): NOT BUILT** (A11/M9).
- Pricing accuracy: domestic VAT 0% + grant REAL in `computeQuote`; commercial
  VAT + NDMG implemented but **NDMG unverified**; ACA absent (§7).

## 10. DEPLOYMENT & INFRASTRUCTURE

- **Deployed (Supabase, per repo CLAUDE.md):** `ingest-lead`, `agent-drain`
  (OLD handlers), `extract-bill-data`, + secrets. **I cannot re-verify deploy
  state from this seat** — `supabase functions list` proves it.
- **WRITTEN, not deployed:** scheduler-v2 + product-pick (`D1` — one command:
  `supabase functions deploy agent-drain`; no migration; 6-check verify list in
  SWEEP8).
- **Branch reality:** ~2 weeks of work lives on `cowork-jul25`. What Vercel
  serves, and from which branch, **I don't know** — check the Vercel dashboard.
  `vercel.json` exists; demo must be OFF in prod.
- Rollback: Vercel one-click (frontend), redeploy-previous (edge — manual,
  minutes). **Feature flags: NOT BUILT** (PostHog not integrated) — rollout
  granularity is all-or-nothing today.
- Gates: **GATE 0 OPEN** (history purge, Maps lock, rotation verify), **GATE B
  OPEN** (no prod migration until OA/GRIDS/COMH align — M1–M14 are all queued
  behind your alignment).
- Staging: **there is no staging environment** — one Supabase project, prod-or-
  nothing. Backups/PITR: **I don't know** — check project tier.

## 11. OBSERVABILITY & RELIABILITY

- **Sentry: NOT wired** (the only "sentry" match is a word in `gdpr.tsx`).
- **/health: NOT BUILT.** No uptime check.
- ErrorBoundary: EXISTS (`ui/ErrorBoundary.tsx`, used in App) — but it
  **swallows silently** (no report anywhere).
- Agent failure: recorded in `agent_runs`, surfaced as a badge in AgentFoundation
  — **only if someone is looking at that screen.** No alert, no email, no Slack.
  LLM cost-cap trip = runs fail quietly the same way.
- Self-heal/report/improve: **SPEC ONLY** (the 4-layer design in SWEEP8).
- **Blunt truth: in production today, if the system breaks at 2am you find out
  from an angry customer, not from the system.**

## 12. THE KERNEL / OA

- Status: **v1 draft, pre-inscription.** The **F1 hole is open** (relationships/
  policies mutable outside the chain — a real integrity gap, identified in the
  kernel review). GATE B governs the migration.
- Emit points: contract WRITTEN (`kernelVocabulary.ts`), emit fn NOT BUILT (D2),
  nothing chain-recorded yet. Kernel-side brakes (budget cap, outbound approval
  gate, loop ceiling) are REAL in the kernel DB.
- **Launch dependency? NO. Trust upgrade? YES.** Launch on the principles
  (add-only, attestation, draft-never-send — all genuinely enforced in the app).
- What you can claim today without lying: *"built on an append-only,
  human-attested audit model, with a constitutional event layer in development."*
  What you cannot claim yet: "Bitcoin-anchored / tamper-proof guarantees."

## 13. UI/UX & DESIGN

- DONE + browser-verified (demo): the 7.1 list — 4-tab AIField IA, ClientHub,
  shared inbox, installer coach, Schedule roster/queue, JobViewV2 full-bleed +
  phase rail + family Overview, agent Inside windows, scheduling transparency +
  approve gate.
- Rough: JobViewV2 inner phase cards; flat "0" empty states; **dark mode
  unverified on all the new components**; a11y partial (labels yes, no audit);
  the Owner→Agents deep-scroll quirk.
- **The 8 baseline tsc errors** (pre-existing, all real type mismatches, none
  crash-level): docTemplates `needsG10` · PaperworkWindow NC8-in-union ·
  ConsultantCockpitV5 kanban stage-string · CustomerProposal brand compare ·
  ProfessionalProducts `.name` · ProductSnapshot missing diverter/charger ·
  ProposalView `confirmed_roof_orientation` · dummyData `extracted_provider`.
  Institutional standard says zero; ~half a day.

## 14. MARKETING & GTM

- Truth-pass state: the worst lies already killed (fake stats deleted, "email +
  SMS" toast removed, grant copy honest). But public copy **pre-dates the
  current product** in places, snapshots are **stale**, and the per-page
  meta/content layer (Sweep 7 part 2) never happened.
- Deck / one-pagers / Domain-001 case study / demo video: **NOT BUILT** (9.5).
- **Founder walkthrough (9.6): NOT BUILT** — today you cannot hand a prospect a
  guided path; you'd drive it live yourself.
- **Watch-it item found in config:** `brand.ts` still ships "RECI Certified" +
  "Fully Insured" badges as DEFAULTS. True for your first tenant? Prove per
  tenant or remove — same class of risk as the deleted fake stats.

## 15. LEGAL & REGULATORY

- Verified: domestic SEAI rates; GDPR erasure path; attestation-by-named-human.
- **Not verified / not done:** NDMG + ACA figures (before ANY commercial quote);
  eIDAS solicitor review; **tenant legal pack — T&Cs for the SaaS, a Data
  Processing Agreement (you become a PROCESSOR of your tenants' customers' PII
  the day tenant #1 signs — GDPR requires the DPA), per-tenant privacy policy**
  — NOT BUILT, named in no doc until now; marketing-email opt-out for the
  follow-up sequences (ePrivacy — transactional vs marketing line);
  insurance/liability for the business itself (talk to a broker).
- Could you get fined/struck-off today? The exposure is the DPA gap +
  unverified commercial figures + the certification badges — all fixable
  pre-launch, none fixable after a complaint.

## 16. THE PLAN & THE GATES

7.1 (app) DONE → **8 = migrate + deploy** (M1–M14, D1–D6, X1–X9, L1–L7, G1–G3,
A1–A11, gates — the named ~56-item list in SWEEP8) → **9 = smooth + harden** to
the five-team bar (teams written in SWEEP9_TEAMS). Gates: 0 (keys/history) and
B (kernel alignment) both OPEN. Launch-critical shortlist: A1 · A2(/start) ·
A9(+the /owner bug) · A10(real-data layer) · GATE 0 · D1 · billing.

## 17. STRATEGY DECISIONS ONLY YOU CAN MAKE

1. **Multi-tenant architecture** ← THE one (see §19.1). Project-per-tenant
   (isolated, manual, ~€25/tenant/mo, scales by hand) vs shared-with-tenant_id
   (SaaS-scalable, needs the RLS work to be perfect). **My recommendation:
   shared + tenant_id + rigorous RLS** — it's the only shape that scales to your
   32-county model; project-per-tenant dies at ~10.
2. **Single product:** launch start→grant as the beachhead, NC6 compliance as
   the fast-follow barb. (Recommended; already argued.)
3. **Capture pages:** host tenant-branded pages (faster for installers without
   sites — more build) vs widget/API-only (leaner — they need a site). Rec:
   widget-first, hosted pages as an upsell later.
4. **Billing:** price + trial length (7 days is short for a B2B tool an
   installer must run a real job through — consider 14) + card-upfront or not.
5. **Financing partner** (which lender, when).
6. **What to cut to launch sooner** — my cut list: AITeam surfaces, the owner
   analytics depth, geographic clustering, the learning loop. My do-not-cut:
   RLS proof, billing, NC6 D+E, the /owner fix.

## 18. RISKS & WHAT KEEPS ME UP

- **At 10 tenants:** manual provisioning collapses (A1); localStorage field
  records start losing statutory data on real phones; support has no tooling
  (no Steward console); agent email volume hits Postmark limits/deliverability
  (SPF/DKIM per tenant NOT set up); the shared OpenRouter free-tier cap
  (already 429s your crons) throttles production LLM — needs a paid provider.
- **At 100:** per-minute pg_cron drain becomes a queue bottleneck; single
  Supabase project limits; the overlay-calibrated NC forms break silently the
  day ESB revises a PDF (coordinates are pinned to the bundled PDFs — add a
  checksum guard, recalibrate on change); key-person risk is total (you + me).
- **Regulatory:** SEAI rates change (annually-ish) — they're in code, not
  config; a rate change requires a deploy (move to tenant/config in Sweep 8).
- **One week to launch, forced:** I'd fix — the /owner role bug, demo-off +
  real-data reads, RLS proof, RECI persistence, billing. I'd consciously leave
  broken — clustering, learning loop, dark-mode polish, NC pages 3–6 (appendix
  covers the record honestly meanwhile), the deck.

## 19. THE UNKNOWN UNKNOWNS — named in NO doc until now

1. **The multi-tenant architecture is undecided.** The codebase stamps ONE
   `AISOLAR_TENANT_ID` from env — the current shape is *one Supabase project =
   one tenant's workbench*. Nobody has decided how tenant #2 exists. This is
   the biggest unnamed gap in the company: A1 cannot be built until you decide
   §17.1.
2. **`/owner` is open to consultants** (`App.tsx:143`) — sales can see
   financials. Role model needs a real `owner` role.
3. **Statutory data in localStorage** — serials, signature, photo booleans
   (there are no actual photo FILES — "uploaded" is a checkbox, no storage
   upload exists anywhere in AIField). A dropped phone = a lost compliance
   record. M1–M3 are not nice-to-haves.
4. **The cockpits have NO real-data mode** — dummy is unconditional in all
   three. "Remove dummy data" = build the read layer.
5. **Zero automated tests.** No unit, no e2e, no CI gate — every verification
   this whole build has ever had was manual/browser. Institutional gap #1.
6. **No staging environment.** First place a migration runs is production.
7. **Tenant legal pack missing** (DPA/processor terms — §15).
8. **White-label is skin-deep:** 4 hardcoded "The AISOLAR team" signatures in
   agent emails; Postmark sends from your domain, not the tenant's (no per-
   tenant SPF/DKIM design).
9. **ESB PDF brittleness** — overlay coordinates break silently on form
   revision; no checksum guard.
10. **Timezone edge:** the new scheduler computes in UTC; Irish summer time is
    UTC+1 — "10:00" slots may render an hour off in emails. Small, real,
    unreviewed.
11. **cal.com is referenced, not integrated** — booking buttons open cal.com;
    no API, no keys, no booking-created webhook.
12. **Backups/PITR/tier limits unknown** — nobody has checked what the Supabase
    plan actually guarantees you.
13. **What am I not asking that I should?** — "Who supports tenant #1 on day
    2?" There is no support channel, no docs site for users, no onboarding
    email sequence for the SaaS itself.

## 20. STRAIGHT CLOSE

1. **GO / NO-GO: NO-GO today** — not because the product is weak (the app and
   the moat are genuinely strong) but because the *company around it* isn't
   built: no way to sign up, charge, or isolate a real tenant, and the main
   screens don't read real data. That's 3–5 focused weeks, not months.
2. **The ONE thing first:** decide the multi-tenant architecture (§17.1) — every
   launch-critical item stacks on it.
3. **The ordered path (10 steps):** ① decide tenancy model → ② fix the role
   matrix (+`owner` role) → ③ A1: signup→tenant→bootstrap + Stripe Billing
   trial → ④ real-data read layer in the 3 cockpits (demo-off truth) → ⑤ RLS
   per-POV proof + advisors clean → ⑥ GATE 0 close (purge, locks, verify) →
   ⑦ D1 deploy scheduler-v2 + verify → ⑧ M1–M4 (equipment/evidence/signature/
   notifications — statutory data off localStorage) → ⑨ NC6 D+E (RECI + pages
   3–6) → ⑩ pilot tenant, supervised, 2 weeks — then charge the card.
4. **From YOU:** the six §17 decisions; run GATE 0's purge (or authorise me);
   the OA/GRIDS/COMH alignment call that opens GATE B; a solicitor hour (eIDAS
   + DPA); the SEAI NDMG PDF.
5. **If it were my money:** I'd also want — a signed pilot agreement with
   tenant #1 *before* building billing (revenue proof beats features), an
   accountant's letter on the ACA claim before any commercial pitch uses it,
   business insurance quoted, and PITR backups confirmed ON before the first
   real MPRN enters the database.

**What I didn't tell you until this file:** items 1–13 of §19 — above all that
the tenancy model is undecided, sales can open your owner cockpit, your
compliance record lives in a phone's cache, there are no tests, and there's no
staging. Now it's all on the table. That's the handover.
