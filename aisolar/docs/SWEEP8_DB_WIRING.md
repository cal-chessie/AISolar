# Sweep 8 — Supabase / DB wiring checklist

> Purpose (Cal, 25 Jul): a living inventory of every frontend action that currently
> FAKES the backend (toast / local state / setTimeout) and needs REAL Supabase
> wiring — tables, edge functions, triggers, notifications, magic links, payments,
> kernel events. Built as we go so Sweep 8 (the DB full-send across the whole SaaS)
> is a checklist, not a memory test. **Append to this as the installer + final build
> land.** House rules still apply: agents run ONLY through `agent-drain`; proposals
> stay `status: "draft"` (never auto-send); migrations idempotent + add-only.

## Already wired (baseline — from CLAUDE.md, don't rebuild)
- Edge fns: `ingest-lead` (public door, `x-ingest-key`, stamps AISOLAR_TENANT_ID, 24h dedupe), `agent-drain` (queue + pg_cron, 10 agents, lead_intake→intake_complete cascade), `extract-bill-data` (21-field bill extract, PERSISTS to lead_intake, auth via staff JWT or lead access_token, returns `persisted:boolean`), `create-checkout` (payment).
- Migrations: website_ingest, survey_handoff (survey→lead_intake confirmed_* copy), role_management (grant_role RPC, recursion-safe RLS), bill_extract_complete (+ GDPR fix in anonymise_lead).
- Postmark: `survey_scheduler` + `install_coordinator` send REAL email (channel/emailSent recorded). Dates still naive (today+5 / today+28) — calendar-aware scheduling OPEN.
- Grant agent TRACKS, never submits — keep phrased that way everywhere.

## Cross-cutting infra Sweep 8 must stand up
- **Notifications on BOTH ends** _(Cal 25 Jul)_ — every customer interaction/chat/callback/doc-action/stage-change notifies customer AND consultant. Email + **magic link** to open the thread is fine for launch (truth-pass: email only, NOT SMS/WhatsApp). Consultant side already has `NotificationsBell`; build the customer email+magic-link path + a `notifications` table.
- **All numbers through the spine** _(Cal 25 Jul)_ — **BUILT 26 Jul: `computeQuote()` exists in `leadIntake.ts`** and DesignStudio, ProposalView, CustomerProposal and the CustomerPortalV2 header all call it (bill-aware day/night rates, supplier CEG export, roof derate, occupancy sc, commercial VAT+NDMG, add-ons, dual payback). REMAINING for Sweep 8: the ProposalDraftAgent must call the same `computeQuote()` when STORING a proposal, and the studio design must persist so stored system_size_kw = designed kWp (the last source of stored-vs-live delta).
  - **ROOT CAUSE (Hermes-verified, disk-proofed):** the drift is the drafter storing `IE_ENERGY.SELF_CONSUMPTION_PCT = 0.70` (`leadIntake.ts:169`) while every render recomputes occupancy-driven via `selfConsumptionFromOccupancy()`. **Fix: the drafter (ProposalDraftAgent / stored proposal) must call `selfConsumptionFromOccupancy()` and store THAT**, killing 0.70 for any lead with occupancy data. Until then the survey's hero occupancy answer is cosmetic. Full spec: `docs/SURVEY_REWRITE_BRIEF.md`.
  - **Gear = one source of truth (studio, not survey): DONE.** Removed `recommended_system_size/panel_count/panel_model/inverter_model/battery_model` z-fields from `SiteSurveyForm.tsx` + onSubmit + logActivity, and dropped the gear requirement from `surveyValidation` (now requires OCCUPANCY instead). Survey feeds roof+occupancy+wants to the studio; the studio owns gear.
- **AI learning loop** _(Cal 25 Jul)_ — the "Wrong" buttons (`AgentWindow.onCorrect`) currently toast-only. Persist correction (agent, action, wrong, fix) → training signal → self-improve → OWNER report.
- **Ask-AI hard guardrail** _(Cal 25 Jul)_ — customer `generateAIResponse` must refuse anything outside THEIR project (no pipeline/margins/other-customers/internals). NOT enforced yet.
- **White-label** _(Cal 25 Jul)_ — every "AISOLAR" the customer sees swaps to tenant brand via `useTenantBrand`; needs tenant brand records.
- **LLM at launch** — `coachBrain` (consultant coach) + `generateAIResponse` (customer) are deterministic front-runs; wire real LLM (OpenRouter) behind them, `COACH_SYSTEM_PROMPTS` give voice.
- **Kernel events** (separate Supabase, immutable/hash-chained, refs only, no PII): `ProposalAccepted`, `DepositPaid`, + proposal-version appends. Wire the emit points.
- **RLS** — line-by-line audit before prod. **GATE 0** — rotate 3 leaked Supabase keys + Maps key + purge git history before cohort/prod deploy (deploy gate, not build gate).

## Per-surface trigger inventory (frontend fakes → needs real wiring)

### Consultant cockpit — `ConsultantCockpitV5.tsx`
- `handleSendReply` — inserts touchpoint LOCALLY + fakes a customer reply via setTimeout → real `touchpoints` insert + Postmark send + Supabase Realtime for inbound + **notify both ends**.
- `handleSummarize` — setTimeout fake summary → real LLM summarise call.
- `advanceLeadStage` — local + toast → update `leads.workflow_stage` (fires agent-drain cascade).
- `saveLeadForm` (add/edit lead) — local → insert/update `leads`.
- Chat triggers: "Book survey" (→ survey record + booking), "Request photos" (toast → photo-request email + magic link to customer), "Send/Re-send proposal" (→ proposal status + email, draft-first), "Send deposit link" (toast → `create-checkout` deposit link + email).

### Proposal (consultant) — `ProposalView.tsx`
- **GateCheck "Send / Re-send to {first}"** — toast → set proposal status (draft→sent), send proposal email + magic link, **notify both ends**. This click IS the human approval (never auto-send).
- **"Revise (new version)"** — local `versions` state + toast → insert append-only proposal version row (never delete old); this maps to a kernel append.
- Compliance rows (SEAI grant / NC6 export / RECI sign-off) — statuses derived from `workflow_stage` → real tracking records per body; pre-populated fields come from survey + install checklist.
- `DocumentActions` (Notify customer / Intelligence / Open in LeadFlow) — verify each; "Notify customer" needs the notification path.

### Estimate (consultant) — `EstimateView.tsx`
- Satellite iframe uses Google Maps embed (needs `VITE_GOOGLE_MAPS_KEY`, present in env.local). `DocumentActions` as above.

### Customer proposal — `CustomerProposal.tsx` (public `/p/:leadId`)
- `onAccept` → workflow_stage update + kernel `ProposalAccepted`. `onPayDeposit` → `create-checkout` payment + kernel `DepositPaid`. `onQuestion` → message + notify consultant. Roof aerial (Maps), product snapshots (`getProduct`), money story (computeQuote).

### Customer portal — `CustomerPortalV2.tsx` (`/my-projects`)
- `handleSend` (Ask AI) — setTimeout + deterministic `generateAIResponse` → real guardrailed LLM + persist customer message + **notify consultant**.
- `requestCallback` (Call me back) — local messages + toast → create callback-request record + **notify consultant (email/magic link)** + confirm to customer.
- Documents sheet: View/Download (toast) → real signed doc URLs; **Pay** (toast "link sent") → `create-checkout` + email; **Sign** (contract) → e-sign flow.
- `PreSurveySnaps` (4 photos) → storage upload; `SurveyBooking` (cal.com) → survey/booking record + create lead so agents pick it up (blocked on coxmtpnq access).
- GDPR: `DataSubjectRightsPanel` → `anonymise_lead`; `CookieConsentBanner`.
- `buildConversation(lead,{audience:'customer'})` — audience filter hides "opened proposal 4×" from customer (engagement pings stay consultant-only). Real touchpoints feed this at launch.

### Calendar — `RealCalendar.tsx`
- Events generated from dummy leads → real events from leads/surveys/installs/deadlines/payments. "Add" opens cal.com → booking creates event. Calendar-aware scheduling (replace naive today+5/+28).

### Products — `ProfessionalProducts.tsx`
- Product images in `localStorage` (`aisolar_product_images`) → product table + storage. **Warranty as a first-class field** on the product input _(Cal 25 Jul)_. "Add to proposal" (toast hint) → real add to proposal editor with live pricing. Unify the two catalogues (SAMPLE_PRODUCTS owner vs `@/config/productCatalog` customer).

### Agents / AI Coach
- `AgentWindow` "Wrong" corrections (toast) → learning loop (above). `RoleBasedAICoach`/`coachBrain` deterministic → LLM at launch.

### Booking (cross-cutting) _(Cal 25 Jul, earlier)_
- Replace ad-hoc booking everywhere with cal.com real booking (embed/API), white-labelled, front + back (agent scheduler flows). Book-a-call is a CALLBACK, in-chat (done in UI); survey booking in-chat via `SurveyBooking`.

## To append as we build
- [ ] Installer (AIField) trigger inventory — start-job notify, photo checklist → storage, serials capture, fitted-vs-proposal check, offline-tolerant sign-off, RECI/NC6 submission fields.
- [ ] Growth loops — AIChat referral link (money-off + tracked fee), testimonial→GBP link on completion, social share of installer's completion photo.
- [x] Owner cockpit trigger inventory → section below (audited 27 Jul, every view click-tested in browser).
- [ ] The design studio (survey→design→proposal→send) — Google Solar buildingInsights persistence, drawn-array geometry carry-through.

### Design Studio — `DesignStudio.tsx` (Survey→Design step) [25 Jul]
Frontend holds `designData` in LeadFlow state only. Sweep 8 must persist + carry it:
- **Persist the design** to the lead / a `designs` record: `panelCount`, `panelModel`, `inverterModel`, `batteryModel`, `includeBattery`, and the array geometry `arrayX / arrayY / arrayRot / arrayCols`, plus `strings`. This IS the proposal input — the design the consultant lands on must survive to the proposal and be re-editable (append-only new versions, same as ProposalView revisions).
- **Numbers through the spine (make-or-break):** the studio now derates production by the real roof via `annualYieldFactor()` / `annualProduction()` in `leadIntake.ts` (orientation / pitch / shading). The **ProposalDraftAgent MUST call the same functions** so the proposal's production/savings match the studio exactly. Cross-links to the existing 0.70 self-consumption root-cause: the drafter must use `selfConsumptionFromOccupancy()` AND `annualProduction()`, never the flat constants.
- **Roof imagery**: production ships Google Static Maps (needs Maps Static API + a referrer-locked key, or proxy via edge fn so the key never ships). `buildingInsights` (Google Solar panel-fit) must move server-side (edge function) — browser CORS blocks it. `src/lib/roofImagery.ts` (OSM Nominatim geocode) is the keyless fallback for coordinates.
- **Tomorrow's multi-array/strings** turns `designData` into `arrays[]` — the persistence shape above should anticipate an array-of-arrays, each with geometry + a string, feeding per-string MPPT/inverter validation.
- **Catalog**: panels now carry `widthM / heightM / watts` (real footprint + kWp). When the product table lands (Sweep 8, `ProfessionalProducts` warranty note), include physical dimensions + wattage as first-class columns so the studio's accurate sizing reads from the DB, not a hard-coded catalog.

### Owner cockpit — trigger inventory (audited 27 Jul, click-tested in browser)
Verified WORKING now (demo-honest, no backend lie): client kanban card → CustomerIntelligenceProfile (+ Back), Estimates list → Open → estimate detail, Estimates/Financials/Analytics CSV exports (real file downloads), Calendar Add → cal.com new tab, Products Add/Edit product (localStorage), Products Datasheet (opens PDF when on file, honest toast when not — wired 27 Jul), Agent Run now / Save prompt / Test (demo-labelled dry runs), Settings Terms/Brand saves (localStorage), Help us improve (localStorage), VAT toggle + Save setup + bank Edit (FinanceWindow).

Needs REAL wiring for Sweep 8 (currently local/toast-only):
- **FinanceWindow "Send deposit link"** (`owner/FinanceWindow.tsx:112`) — toast-only. → `create-checkout` deposit link + Postmark email + touchpoint record. Same wiring as the consultant chat trigger (ConsultantCockpitV5:556); build once, call from both.
- **Consultant/Installer "Add … invite"** (`OwnerCockpit.tsx` onAdd) — local list + honest "queued" toast (27 Jul: was claiming "Invite sent"). → auth invite (Supabase auth admin invite or magic link), `grant_role` RPC on accept, pending-invite record.
- **PaperworkWindow "Release handover pack"** (`compliance/PaperworkWindow.tsx:269`) — toast-only. → mark docs released in DB, appear in customer portal documents, notify both ends.
- **Help us improve** — localStorage → `feedback` table (tenant, user, text, created_at) + optional owner digest.
- **Products catalogue** — localStorage edits → product table + storage for images/datasheets (warranty + dimensions + wattage first-class; unify with `@/config/productCatalog`, already listed above).
- **Recent activity (Analytics overview)** — hardcoded 6-row demo feed → real touchpoints/agent-runs query, same audience filter as `buildConversation`.
- **Agent impact numbers** (`AnalyticsDashboard.agentImpact`) — simulated constants → aggregate from agent run log (runs, emails via Postmark records, drafts, hours-saved formula documented).
- **Analytics time-range buttons** (7d/30d/90d/all) — state exists but demo dataset ignores range; wire `created_at` filters when real queries land.
- **CeoWindow "Download report" / KPI exports** — works on demo data; point at the same real queries when wired.

## LANE AUDIT — 28 Jul pre-migration pass (Claude, full run-through, code-verified)

**Verified GREEN in code (don't re-litigate):**
- `status: "draft" // CRITICAL: never auto-send` — real, in agent-drain (proposal path).
- Idempotency on every agent (existing-side-effect checks before acting).
- **LLM daily cost cap real**: `_shared/llm.ts` pre-flight daily-spend check
  (default $5/day, `daily_cost_cap_usd` in ai_config), per-run cost recorded
  on agent_runs. Budget guardrail ✓.
- Kernel-side brakes live (separate DB): llm_budget_cap / outbound_approval_gate
  / loop_ceiling policies + ApprovalRequested/Resolved event types registered.
- 24h dedupe at ingest-lead; extract-bill-data auth + `persisted:boolean` honesty.

**FIXED this pass (truth-pass violations that were shipping):**
- `agents.ts` grant agent said "submits when complete" → now "prepares the
  pack — submission stays with a human (SEAI has no public API)" + explicit
  guardrail line. (This description feeds the PUBLIC /agents page.)
- OwnerCockpit "Invite sent" badges ×2 → "Invite queued" (nothing sends yet).
- InstallerPortalV5 "Started — customer notified" → "Job started" (the
  auto-notify does not exist yet — it is the Part A flywheel wire below).

**FILED (wire in Sweep 8, don't cosmetically patch):**
- [ ] Start-job → REAL customer notify (email+magic link) — then the honest
      copy earns back "customer notified".
- [ ] SystemSettingsV2 Twilio/WhatsApp integration cards: acceptable as config
      placeholders ONLY if they render an explicit "Not connected" state at
      launch; verify before cohort (truth-pass: no SMS/WA claims while dark).
- [ ] `kernelVocabulary.ts` (NEW, src/lib) is the naming contract — Sweep 8's
      emit edge fn consumes it verbatim; payload shapes for the AIField moments
      (InstallStepCompleted / InverterConnected / SignOffCaptured) are defined
      there refs-only (signature/note → hash, artifact stays app-side).

**SELF-HEAL · REPORT · LOG · IMPROVE — the layer spec (Cal, 28 Jul):**
Principle (constitutional): *self-healing ACTS, self-reporting LOGS,
self-improvement PROPOSES — humans approve.* Draft-first applies to the system
improving itself exactly as to outbound email.
1. **Agent layer** — corrections ("Wrong" buttons) → `agent_corrections` table
   (agent, run_ref, context, fix) → weekly OWNER report ("what the agents
   learned / where they're corrected most") → proposed prompt/rule revisions
   ride AgentTraining's EXISTING versioned prompts as DRAFTS → owner approves
   → version bump. Cross-tenant aggregation via kernel refs-only (the moat).
2. **Runtime layer** — agent_runs failure classification + bounded auto-retry
   (idempotent by design), stuck-sweeper (exists) reports weekly instead of
   silently sweeping; Sentry on edge fns; `EscalationRaised` (registered) when
   self-heal gives up — nothing fails silently, ever.
3. **App layer** — ErrorBoundary → structured error report (component, route,
   tenant) instead of today's silent catch; /health endpoint for uptime cron
   → #monitoring (SLACK_OPS).
4. **Kernel layer (post-Gate B)** — prompt-version activations emit
   ApprovalRequested/Resolved; the improvement history becomes chain-recorded.

### AIField install runner — `installer/InstallRunner.tsx` (built 27 Jul, screens 3–6)
Staged gated checklist (pre-install→roof→electrical→commissioning→handover),
photo-slot evidence pack, serial capture + TRIPLE CHECK (fitted vs proposal,
NC6→NC7 warning, office flag), field signature canvas. ALL local
(localStorage `aifield_run_<leadId>`, offline-tolerant by design). Sweep 8:
- photos → storage bucket + `install_evidence` rows (job, stage, slot, taken_at)
- checks/stage completion → `install_checklist` rows; stage-complete emits
  notification + advances workflow (installing→installed on handover)
- serial + fitted model → `installed_equipment` (feeds NC6 §5 + protection
  table via product type-test profile + warranty pack); mismatch flag →
  notification to office BEFORE NC6 generation (hard gate)
- signature dataURL → storage + hash on the NC6/DoW record (kernel append)
- "camera assist reads the plate" = OCR at launch (edge fn); manual entry
  stays as the fallback
