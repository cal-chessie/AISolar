# Sweep 8 — Supabase / DB wiring checklist

> Purpose (Cal, 25 Jul): a living inventory of every frontend action that currently
> FAKES the backend (toast / local state / setTimeout) and needs REAL Supabase
> wiring — tables, edge functions, triggers, notifications, magic links, payments,
> kernel events. Built as we go so Sweep 8 (the DB full-send across the whole SaaS)
> is a checklist, not a memory test. **Append to this as the installer + final build
> land.** House rules still apply: agents run ONLY through `agent-drain`; proposals
> stay `status: "draft"` (never auto-send); migrations idempotent + add-only.

## ★ SWEEP 8 — THE NAMED MASTER LIST (30 Jul — the index; detail follows below)
> Every Sweep 8 item, named + handled, in one place. Status: ✅ done · ⏳ partial /
> written-but-deploy-gated · ⬜ to build · ⛔ gate. ~45 items. The sections beneath
> hold the file refs + specifics; this is the checklist.

### Migrations — idempotent, add-only (the numbered queue)
- **M1 installed_equipment** — fitted model/serial/AC/export/mismatch/attestation (fieldRecord contract). ⬜
- **M2 install_evidence + install_checklist** — photo-slot + stage-completion rows. ⬜
- **M3 signature_hash** — signature → storage + sha256 on the DoW/NC record (kernel append). ⬜
- **M4 notifications + magic_link_tokens** — the both-ends notification law's table. ⬜
- **M5 agent_corrections + owner_report_view** — the learning loop. ⬜
- **M6 designs** — persist array geometry/strings (kills stored-vs-live kWp delta). ⬜
- **M7 proposal_versions + 0.70-kill** — append-only versions; drafter stores `selfConsumptionFromOccupancy()`. ⬜
- **M8 products** — warranty/dims/watts/kwh/AC/type-test; unify the two catalogs. ⬜
- **M9 feedback + referrals + tier_entitlements** — the paid lock-off. ⬜
- **M10 installer_vault** — an installer's serials/certs across all their jobs. ⬜
- **M11 touchpoints.sender** — the field team's voice in the one thread (+ Realtime). ⬜
- **M12 staff_profiles.home_address + depots** — the scheduler's real inputs. ⬜
- **M13 agent_route_runs** — chosen order + savings (km/min/€) per run (owner transparency). ⬜
- **M14 inventory** — the depot shelf; `computeBOM()` aggregates load-out + reorder. ⬜

### Edge functions — deploys / new (D)
- **D1 scheduler-v2 (agent-drain redeploy)** — next-free-working-day + product-pick. **WRITTEN, NOT DEPLOYED** — `supabase functions deploy agent-drain`; **NO migration needed** (reads existing cols). ⏳
- **D2 kernel-emit** — emit fn consuming `kernelVocabulary` (ProposalAccepted / DepositPaid / InstallStepCompleted / InverterConnected / SignOffCaptured, refs-only). ⬜
- **D3 buildingInsights-server** — Google Solar panel-fit moved off the browser (CORS). ⬜
- **D4 maps-static-proxy** — referrer-locked Maps key never ships to the client. ⬜
- **D5 system-live-email** — wire the DRAFTED `monitoringHandoff` send + SEAI wording gate. ⬜
- **D6 plate-OCR** — camera-assist serial read (manual entry stays the fallback). ⬜

### External integrations / keys (X)
- **X1 Postmark-sends** — wire every UI-fake send (proposal, deposit, photo-request, reschedule, handover-pack, referral, team-invite, both-ends). ⬜
- **X2 cal.com** — real booking, white-labelled, front + back (agent scheduler flows). ⬜
- **X3 distance-matrix** — Google Distance Matrix for real drive-time (scheduling). ⬜
- **X4 maps-keys** — Maps Static + Solar API, referrer-locked / proxied. ⬜
- **X5 realtime** — Supabase Realtime on `touchpoints` (cross-device conversation). ⬜
- **X6 sentry** — edge fns + app ErrorBoundary → structured reports. ⬜
- **X7 uptime** — `/health` endpoint + cron → #monitoring (SLACK_OPS). ⬜
- **X8 llm** — OpenRouter behind `coachBrain` + `generateAIResponse`. ⬜
- **X9 e-sign** — the contract Sign flow. ⬜

### Cross-cutting laws / infra (L)
- **L1 both-ends-notify** — every interaction notifies customer + consultant (email + magic link; NO SMS/WA). ⬜
- **L2 numbers-through-spine** — drafter STORES `computeQuote()` + `selfConsumptionFromOccupancy()` + `annualProduction()` (the 0.70 kill). ⏳ engine built; drafter-store remains.
- **L3 learning-loop** — Wrong → `agent_corrections` → owner report → draft prompt revisions → approve → version bump. ⬜
- **L4 ask-ai-guardrail** — customer AI refuses anything outside THEIR project. ⬜
- **L5 white-label** — every customer-facing "AISOLAR" → tenant brand (`useTenantBrand`). ⬜
- **L6 kernel-events** — wire the emit points (see D2). ⬜
- **L7 self-heal-report-improve** — the 4-layer spec (agent / runtime / app / kernel), draft-first. ⬜

### Growth loops (G)
- **G1 referral-link** — AIChat money-off + tracked fee. ⬜  · **G2 review→GBP** — testimonial → Google Business on completion. ⬜  · **G3 social-share** — installer's completion photo. ⬜ (all tier-locked)

### Gates & security — MUST pass before cohort/prod
- **GATE 0** — rotate 3 leaked Supabase keys + Maps key + purge git history. ⛔ deploy gate
- **RLS-audit** — `fix_all_41_advisories` + ~43 read-path policies + per-POV isolation proof + new tables ship WITH policies + storage buckets scoped/signed. ⛔
- **GATE B** — no prod migration until Cal aligns OA / GRIDS / COMH. ⛔
- **truth-guard** — SystemSettingsV2 Twilio/WhatsApp render an explicit "Not connected". ⬜

### Per-surface wiring (frontend fakes → real) — full detail in the inventory below
Consultant cockpit · ProposalView · EstimateView · CustomerProposal · CustomerPortalV2 ·
RealCalendar · ProfessionalProducts · Owner cockpit · Design Studio · Owner scheduling
transparency (incl. the **Approve-loop write**) · AIField/JobViewV2 (start-job notify,
photos→storage, serials→M1, offline sign-off, NC submission). ⬜ — see "Per-surface
trigger inventory" + "Owner cockpit" + "AIField install runner" sections.

### Audit-found gaps (A) — 30 Jul full-app audit; detail in "FULL APP AUDIT" section
- **A1 auth + tenant-provisioning** (`/auth`, `/onboarding`) — signup → tenant + role + first-admin bootstrap. ⬜ *launch-critical*
- **A2 front-door lead creation** (`/start`, `/upload`) — bill upload/booking must birth a lead via `ingest-lead`. ⬜ *launch-critical, highest-leverage*
- **A3 leadflow-sends** — `/lead-flow` fake survey/proposal sends → real records + Postmark. ⬜
- **A4 settings-persist** — `SystemSettingsV2` brand/terms/compliance localStorage → tenant tables (+ home-addr M12 UI). ⬜
- **A5 ai-config** — `/agent-console` model + cost-cap UI → `ai_config`. ⬜
- **A6 gdpr-consent** — cookie/consent localStorage → real consent record. ⬜
- **A7 calculator-carry** — `CalculatorWidget` drawn-array persists onto the created lead. ⏳
- **A8 client-state** — recent-searches / nav-theme localStorage. ✅ no action.

### Housekeeping
- **HK1 vault-commit** — commit the Obsidian vault git repo (final sweep). ⬜

---

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

## THE LAUNCH WIRING MAP — every email, RLS point, migration (28 Jul, Cal's ask)
_Marked out NOW so wiring day is execution, not archaeology._

### EMAILS — every send point in the product (state: real / fake / new)
| Email | Trigger | State |
|---|---|---|
| Survey booking confirm | survey_scheduler agent | REAL (Postmark) |
| Install scheduled | install_coordinator | REAL (Postmark) |
| Follow-up sequence | follow_up agent | REAL (Postmark) |
| Payment reminder / digest / stale-lead | crons | REAL (Postmark) |
| Warranty + review ask | post_install | REAL (Postmark) |
| **"Your system is live"** | commissioning complete (serials confirmed) | **DRAFTED (monitoringHandoff.ts) — wire send + SEAI wording gate** |
| Proposal send + magic link | GateCheck human click | UI-fake → wire |
| Deposit link | consultant chat / FinanceWindow | UI-fake → wire (create-checkout exists) |
| Photo request | consultant chat chip | UI-fake → wire |
| Reschedule + reason (weather flow) | AIField exception | UI-fake → wire |
| Handover pack released | final payment confirmed | NEW — build with pack |
| Referral invite / share / review (growth loop) | pack release | NEW — tier-locked |
| Team invite | Owner add person | honest-queued → wire (auth invite + grant_role) |
| Both-ends notification law | EVERY customer interaction | NEW — notifications table + magic links |

### RLS — the isolation proof points (before ANY real signup)
1. `fix_all_41_advisories.sql` on kernel/CRM (GATE 0 item — RLS was OFF on grant tables).
2. The ~43 `coalesce(jwt,default)` read-path policies (kernel side, post-write-path law).
3. Per-POV proof: owner=ALL · consultant=his pipeline · installer=HIS jobs · customer=token-scoped self. Test logged-in-isolation per role.
4. New tables below ship WITH tenant+role policies on day one — never retrofit.
5. Storage buckets (photos, signatures, datasheets, packs): scoped read; signed URLs only.

### MIGRATIONS QUEUE — idempotent, add-only, in dependency order
1. `installed_equipment` (lead_id, fitted_model, serial, ac_rating_kw, export_limit, mismatch, note, attested_by, attested_at) ← fieldRecord contract.
2. `install_evidence` (lead_id, stage, slot, storage_path, taken_at) + `install_checklist`.
3. Signature → storage + sha256 on the DoW/NC record (kernel append per kernelVocabulary).
4. `notifications` (both-ends law) + magic-link tokens.
5. `agent_corrections` (learning loop) + weekly owner report view.
6. `designs` persistence (arrays[], geometry, strings) — kills stored-vs-live kWp delta.
7. Proposal versions append-only + drafter stores `selfConsumptionFromOccupancy()` (the 0.70 kill).
8. `products` table (warranty, dims, watts, kwh, AC kW, type-test cert) — unify catalogs.
9. `feedback`, referral tracking (code, referrer, commission), tier entitlements (the lock-off).
10. Installer vault (their serials/certs across jobs — Cal's note).
11. `touchpoints` gains a **`sender`** column (`consultant | installer | system | agent | customer`) — the one thread now carries the field team's voice; `buildConversation` reads it, `MessageBubble` labels it. Realtime on this table = cross-device centralisation.
12. `staff_profiles.home_address` (+ geocoded lat/lng) and a `depots` table (warehouse / wholesaler addresses, tenant-config) — the inputs `planSchedule()` / `optimiseRoute()` need to run for real.
13. `agent_route_runs` — per scheduler/route run, store the chosen order + **savings (km / min / €)** + inputs, so the OWNER can click an agent and see how it's programmed and what it saves (the agent-transparency note).
14. `inventory` / depot shelf (product, depot, on-hand, reorder point) — the Owner's shelf; `computeBOM()` aggregates the week's load-out against it and flags reorders.

## 29 Jul additions — centralised conversation + scheduling/routing (Claude)
_Emerged building the shared inbox, the installer coach, and the Schedule roster._

### The conversation is now ONE record (needs real persistence)
- `buildConversation(lead)` is the single thread for customer + consultant +
  **installer** (shared `ConversationInbox` + `MessageBubble`). Installer replies
  and the reschedule-reason now write a **touchpoint** on the lead (actor
  `installer` / `system`), same shape the consultant writes — but IN-MEMORY only.
- **Wire:** `touchpoints` insert on every reply (+ the new `sender` column, migration
  #11) → **Supabase Realtime** subscription so a reply on one device/role appears on
  the others (true cross-device centralisation — today it's per-session) → **Postmark**
  send for outbound (no "delivered" is claimed anywhere yet — truth-pass held).
- **RLS:** staff of the tenant read/write their leads' touchpoints; customer is
  token-scoped to their own lead. `sender` never exposes internal-only ops to the
  customer (the `installer` + `inbound` = field-ops filter is already in
  `buildConversation`).

### Scheduling + routing — the LOGIC is built (pure), the RUNTIME is Sweep 8
The time/money/never-revisit logic is CAPTURED in code, not just notes:
- `routeOptimize.ts` — nearest-neighbour **+ 2-opt**, OPEN path, each stop visited
  **once** (never doubling back), haversine ×1.35 detour, ~28 km/h urban; returns
  `savedKm/savedMin` vs booking order. The installer coach + Routing tab both read it.
- `scheduling.ts` — `planSchedule()`: order from HOME via the solver, slice into
  working days by capacity (consultant surveys ≈3/day, installs =1/day); geographic
  coherence means each day AND adjacent days sit together; unplaceable jobs are
  surfaced, never dropped. Owner-optimal first, customer accommodated on top;
  restock woven ~every 2 days (van holds ~2 days' gear); `lockedDate` extension point
  for a customer who can take no offered day.
- **Wire (Sweep 8):** (a) the inputs — staff home + depot addresses (migration #12);
  (b) the **agent runtime** — run `planSchedule` weekly (surveys) / fortnightly
  (installs), propose the plan as a **DRAFT** for the owner to approve
  (draft-never-send), then write `assignment.scheduled_date`; (c) swap the
  gazetteer/haversine estimate for **Google Distance Matrix** (real drive time);
  (d) record each run's savings for owner transparency (migration #13).
- **What "less chance of forgetting" rests on:** `computeBOM()` (now `lib/bom.ts`) is
  the single load-out list with **critical** flags — the van checklist in the hub, the
  coach's "what do I load", and (Sweep 8) the depot aggregate + reorder all read it.

### DEPLOY + VERIFY — scheduler-v2 (30 Jul, `agent-drain`) — NOT YET DEPLOYED
Written 30 Jul (commit `9591d56`), on branch `cowork-jul25`. Deno edge code —
**written + convention-matched but NOT run/deployed** (no Deno/DB access in the
build session). This is the checklist to make it live + prove it. Cal/Hermes lane.

**Changed:** `supabase/functions/agent-drain/index.ts` (survey_scheduler,
install_coordinator, proposal_drafter) + NEW `supabase/functions/_shared/scheduling.ts`.

**Migration needed? NO.** It only READS existing columns — `site_surveys`
(scheduled_date, surveyor_id, status), `assignments` (scheduled_date, installer_id,
status), `solar_products` (product_type, manufacturer, model, power_rating, active,
in_stock). Nothing to migrate; this is a function redeploy only (so GATE B — which
gates prod *migrations* — doesn't block it; the deploy call is still Cal/Hermes's).

**Preconditions to check first:**
- `solar_products` has `active = true AND in_stock = true` rows for `panel` and
  ideally `inverter` (it's seeded — confirm they weren't deactivated).
- `installers` has ≥1 `availability_status = 'available'` row (else the agents
  early-return "No available installers", same as before).

**Deploy (one command — `_shared/scheduling.ts` bundles with the import):**
```
supabase functions deploy agent-drain
```
(Local dry-run instead: `supabase functions serve agent-drain` and hit it with a
test enqueue.)

**Verify (after a lead runs the pipeline, or a manual enqueue):**
1. `site_surveys.scheduled_date` → a **weekday**, ≥3 days out, and NOT a day the
   surveyor already has 3 surveys.
2. `assignments.scheduled_date` → a **weekday**, ≥10 days out, 1 per installer/day.
3. `proposals.panel_model` / `inverter_model` → come from `solar_products` (not the
   "Longi/SolarEdge" fallback), and `panel_count` matches the chosen panel's watts.
4. `lead_intake.finalized_inverter_model` === the proposal's inverter (the bug fix).
5. `touchpoints.metadata.schedulingReason` present on both scheduler touchpoints.
6. `agent_runs` rows = success, no errors.

**Still Sweep 8 (not in this deploy):** the geographic ordering half needs geocoded
lat/lng on leads + Distance Matrix — migration #12 above.

### Owner scheduling transparency (30 Jul, FRONTEND — live in app, data is Sweep 8)
`src/components/owner/SchedulingTransparency.tsx`, mounted in `OwnerCockpit` →
**Agents** view (under AgentFoundation). Cal's 28-Jul .note: "owner clicks the
agent, sees how it's programmed + its savings." View-first (writes nothing): runs
the REAL `scheduling.ts` + `routeOptimize.ts` on the book and shows the proposed
survey/install plans + savings (km / min / €). **Verified in-browser 30 Jul** (real
numbers: 48 km / 103 min / ≈€78; survey ≤3/day clustered, install 1/day weekend-
skipped). It's frontend, so it's LIVE in the app on the branch — no deploy needed
for the UI. What's DEMO and must become REAL in Sweep 8:
- **Home base**: fixed Citywest depot → per-employee `staff_profiles.home_address`
  (Owner Settings, migration #12). Each consultant/installer plans from THEIR home.
- **Drive-time**: haversine×1.35 estimate → **Google Distance Matrix** (real time).
- **Data source**: computes on demo leads → read real `site_surveys` / `assignments`.
- **The € cost model** (€0.55/km + €30/hr) → tenant-configurable in Settings.
- **Close the loop**: today the panel RECOMPUTES the plan; wire it to read what the
  scheduler-v2 agents (survey_scheduler / install_coordinator) actually proposed
  from `agent_route_runs` (migration #13), so the owner sees the agent's real run +
  its logged savings.
- **Approve loop** (added 30 Jul, per-planner): the propose→approve gate now EXISTS
  in the UI — "Approve this plan" → an honest approved state (demo: local only,
  writes nothing, sends nothing, "draft-never-send holds"). Production wiring: on
  approve → write `scheduled_date` to `site_surveys` / `assignments`, then trigger
  the messaging agent to OFFER each customer their day (a draft they can reply to),
  and record the approval + run to `agent_route_runs`. Until wired, it's view+intent
  only — the copy says so.

### Per-agent transparency windows (30 Jul, FRONTEND — live in app)
`src/components/owner/AgentWindow.tsx` — Cal: "each agent needs the same window as
the scheduling agent." Every agent in Owner → Agents has an **Inside** button → a
window with the SAME shape for all 10: **how it's programmed** (logic + trigger +
guardrails from `agents.ts`) → **what it's working on right now** (grounded per-agent
on the book by workflow stage) → **reads / writes**. The two schedulers additionally
embed `SchedulingTransparency` (parameterised `only='survey'|'install'`). Verified
in-browser 30 Jul. Sweep 8 to make it real:
- **"Working on now"** computes from demo leads by stage → read `agent_runs` + the
  real pipeline (each agent's actual queue depth + last run + what it's about to act on).
- **Impact numbers** (savings, counts) → aggregate from `agent_runs` (same wiring as
  the Owner Analytics `agentImpact` item).
- `agents.ts` guardrail/trigger/description text is the "how it's programmed" source —
  keep it in step with the real handler behaviour (it also feeds the PUBLIC /agents page).

### Housekeeping (final Sweep 8)
- [ ] **Commit the vault's own git repo** (`~/Documents/Obsidian Vault`). Claude now
  writes session notes to RAW under the wingman mandate; on the final Sweep 8 pass,
  commit the vault repo (Hermes's sync lane) so the disk-proofed record and git agree
  — Cal's call, 29 Jul: "lets do this on final sweep 8".

## FULL APP AUDIT — 30 Jul (Cal: "harden Sweep 8 with a full app audit")
Walked every route in `App.tsx` against SWEEP8 coverage. Surfaces already inventoried
above aren't repeated; below is the coverage map + the NEW gaps the audit surfaced.

### Coverage matrix (every route)
| Route(s) | Surface | Sweep 8 status |
|---|---|---|
| `/` `/about` `/pricing` `/faq` `/privacy` `/terms` `/docs` `/aios` `/aisolar` `/aiteam` `/blog` | marketing / static | n/a — truth-pass only, no backend |
| `/auth` | AuthPage | ⬜ **A1** signup/login + first-admin bootstrap |
| `/onboarding` | OnboardingMode | ⬜ **A1** tenant provisioning |
| `/start` `/get-started` `/upload` | StartAnalysis (bill front door) | ⬜ **A2** booking must CREATE a lead |
| `/calculator` `/embed` | CalculatorWidget | ⏳ **A7** posts to `ingest-lead` ✓; array carry-through open |
| `/lead-flow` | LeadFlow | ⬜ **A3** fake survey/proposal sends |
| `/consultant` | ConsultantCockpitV5 | ✅ covered (per-surface inventory) |
| `/owner` | OwnerCockpit (+Agents/Finance/Analytics/Settings) | ✅ covered · **A4/A5** settings/AI-config new |
| `/installer` `/job` | AIField / JobViewV2 | ✅ covered (install-runner section) |
| `/my-projects` | CustomerPortalV2 | ✅ covered |
| `/p/:leadId` | CustomerProposal | ✅ covered |
| `/agent-console` | AIConfig / AgentTraining | ⬜ **A5** |
| `/demo` `/agents` | demo index / public agents page | n/a — public |

### New named gaps (A) — added to Sweep 8
- **A1 auth + tenant-provisioning** (`/auth`, `/onboarding`) — signup → create tenant +
  `grant_role` + the first-admin bootstrap SQL (`docs/AUTH_RUNBOOK.md` — MUST run once or
  Cal is locked out as a customer). Foundational: no real users without it. ⬜
- **A2 front-door lead creation** (`/start` StartAnalysis, `/upload`) — the bill upload +
  booking must CREATE the lead (via `ingest-lead`) so agents pick it up. Today the booking
  does NOT create a lead (CLAUDE.md: "blocked on coxmtpnq access"). `CalculatorWidget`
  already posts to `ingest-lead` — mirror it. ⬜ **highest-leverage: everything downstream
  is wired and waiting on a lead to exist.**
- **A3 LeadFlow sends** (`/lead-flow`) — "Survey options sent" / "Site survey booked" /
  "Proposal sent" toasts + `setTimeout` stage jumps → real survey/proposal records +
  Postmark + `workflow_stage` update. Overlaps the consultant-cockpit chat triggers — build
  the send path once, call from both. ⬜
- **A4 settings persistence** (`SystemSettingsV2`) — `saveTenantBrand` / `saveProposalTerms`
  / `saveCompanyCompliance` are localStorage → real per-tenant tables. This screen is ALSO
  the home-address (M12) + depot (M14) input UI and the Twilio/WhatsApp "Not connected"
  truth-guard. ⬜
- **A5 ai-config** (`/agent-console` AIConfig) — per-agent model + cost-cap UI → `ai_config`
  (the server-side daily cap exists; the UI save + per-agent model selection persistence do not). ⬜
- **A6 gdpr-consent** (`lib/gdpr.tsx`, CookieConsentBanner) — consent in localStorage → a real
  consent record (GDPR audit trail) the app honours server-side (ties to `anonymise_lead`). ⬜
- **A7 calculator carry-through** (`CalculatorWidget`) — lead capture via `ingest-lead` works;
  the DRAWN ARRAY / bill-analyser output must persist onto the created lead so survey→proposal
  reuse it (the calculator-widget carry-through intent). ⏳
- **A8 client-state** (`GlobalSearchModal` recent searches, `AppShell` nav/theme) — localStorage,
  fine as pure client state; leave unless multi-device sync is wanted. ✅ no action.

### Audit verdict
The pipeline SPINE (bill→survey→proposal→grant→install→portal) + the owner/agent surfaces are
covered. The audit's material adds are **A1 (auth/tenant)** and **A2 (front-door lead
creation)** — the two ends of the funnel that aren't wired: you can't sign a tenant up, and the
public bill upload doesn't yet birth a lead. Those are the launch-critical gaps; A3–A7 are
cleanup with clear homes. Master list updated with the A-items.
