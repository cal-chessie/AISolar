# AISolar v3 — Customer + Installer + BI Build (Complete)

**Date:** 2026-07-17
**Status:** All requested features built. Live on preview.
**Build:** `v3-customer-installer-bi` (live)

---

## What was built this session

You asked for 8 things. All 8 are done and live:

### 1. ✅ Calendar booking after bill upload

When a customer uploads their bill and gets the AI analysis, they now flow **straight into a calendar booking** — no more "we'll be in touch" dead-end.

- `src/components/CalendarBooking.tsx` (350 lines)
- 4-step flow: date → time → consultation type → confirm → done
- Mobile-first with 56px+ touch targets
- Irish timezone (Europe/Dublin) — slots shown in customer's local time
- 09:00–17:00 weekdays, 13:00 lunch break excluded
- Consultation types: video (Google Meet, default), phone, in-person site visit
- Auto-recommends in-person for systems > 6kWp (complex roofs)
- Skips weekends, generates next 14 weekdays
- Sends calendar invite + 24h reminder (when wired to Postmark)
- Customer can skip booking and get the analysis by email instead

**Wired into:** `AIBillAnalyser.tsx` — after lead capture, jumps to booking step before the soft CTA. Updated `LeadCaptureModal` to pass email/name back to the analyser.

### 2. ✅ Customer mobile portal with timeline + AI chat + paperwork

Mobile-first customer experience — what your customer sees on their phone.

- `src/components/customer/CustomerMobilePortal.tsx` (450 lines)
- Three tabs (mobile bottom-nav style, 48px touch targets):
  1. **Timeline** — vertical timeline of all 13 pipeline stages with touchpoints per stage (emails, SMS, portal views, calls). Shows current stage + upcoming stages with their automation.
  2. **Paperwork** — every document in one place: proposal, contract, deposit invoice, final invoice, warranty, SEAI application pack. Each with status badge (pending/ready/signed/paid/submitted) and download button. Pay-now CTAs on pending invoices. Sign-now CTA on pending contracts.
  3. **Ask AI** — chat widget with the customer's AI assistant. Suggested questions (When will my install happen? How much will I save? What's the SEAI grant? What warranty do I get?). Smart responses that pull from the customer's actual lead data. Falls back to "I've noted it, a human will follow up" for unknown questions.
- Hero card: system size, savings, net cost, payback, SEAI grant badge
- "What we need from you" sticky CTA — context-aware per stage (book consultation / review proposal / pay deposit / leave review)
- Progress bar at top showing stage progress %

### 3. ✅ Best-in-class installer portal V2 with Irish OSM map

- `src/components/installer/InstallerPortalV2.tsx` (450 lines)
- 5 tabs (mobile + tablet):
  1. **Today** — today's jobs with route optimisation summary (X stops · Y km · Z drive time), one-click "Open in Google Maps", materials checklist per job, site notes from survey, mark-complete CTA
  2. **Map** — OpenStreetMap embed (free, no token needed — replaced Mapbox which had no token). Shows all job pins with status colours. Job list below with system size + status. Legend. "Open full map" link to OSM.
  3. **Surveys** — site surveys to complete with 8-item photo checklist (roof front/rear, fuse board, meter, inverter loc, battery loc, access, obstructions). Progress bar. "Open survey" + "Directions" + "Call" buttons.
  4. **Stock** — Dublin depot inventory with stock/allocated/available, low-stock alerts (red when <5), auto-reorder badges, InstallCoordinator Agent PO history.
  5. **Handover** — post-install handovers pending (warranty sent, awaiting final payment). 3-column grid showing final invoice / review request timing / SEAI status.
- Weather strip in header — Irish market specific (Met Éireann yellow rain warning shown)
- Role-aware AI Coach (installer flavor) floating button
- All touch targets 48px+ minimum for field use with gloves

### 4. ✅ Survey + proposal UI/UX fixes

The "wonky shapes" you mentioned — addressed via:
- Consistent border-l-4 accent colours per stage group (intake=blue, survey=indigo, proposal=violet, contract=emerald, install=amber, closeout=green)
- Removed inline `AssignmentCard` definitions (React anti-pattern from v1)
- Proper `Badge` sizing with `text-[10px]` and `h-4 px-1` for compactness
- Consistent `Card` padding (`p-3` for compact, `p-4` for default)
- Fixed `<Tabs>` to use proper `defaultValue` + URL sync (InstallerFirstDashboard)
- Mobile-first grids: `grid-cols-2 sm:grid-cols-4` patterns
- All `Button` heights: `h-9` (sm), `h-11` (default), `h-12` (CTA)
- All inputs: `min-h-[44px]` for touch targets
- Removed `key={idx}` patterns, replaced with stable keys

### 5. ✅ SEAI grant end-to-end pipeline

- `src/lib/seaiPipeline.ts` (300 lines)
- Single source of truth for **all Irish solar incentives**:
  - SEAI Solar Electricity Grant (residential): €900/kWp, capped at €1,800
  - SEAI Non-Domestic Microgen Grant (commercial): 5 tiers up to €25,000
  - Microgen Export Plan (ESB Networks): €0.14/kWh export tariff
  - BER uplift: €300 if post-works BER ≥ B3
  - HEUL loan: low-interest 3.9% APR via SBCI, up to €25k
- `calculateSEAI(input)` — single function used by Proposal Drafter Agent, proposal editor, customer portal, SEAI Grant Agent
- `buildSEAIApplicationPack(input, customer, installer, seai)` — compiles the full SEAI submission pack as structured JSON (ready for PDF rendering + email to `solarpvgrants@seai.ie`)
- 7-item paperwork checklist with status tracking: MPRN, BER cert, invoice, install photos, commissioning cert, ESB connection, planning exemption
- Paperwork progress % calculation
- 20-year financial picture including all incentives

### 6. ✅ Professional products section connected to proposal

- `src/components/ProfessionalProducts.tsx` (450 lines)
- 5 categories: panels, inverters, batteries, mounting, accessories
- 12 sample products (real Irish market: Longi, Jinko, Trina, SolarEdge, Huawei, Fronius, Tesla, SolarEdge, Huawei, K2 Systems, Schletter, Citel, Lapp)
- Each product: spec sheet (6+ fields), cost, RRP, computed margin %, Dublin depot stock, rating, SEAI-approval badge
- **Pre-configured bundles** (3 starter bundles):
  - "Family Home 6kWp" — 14 panels + SolarEdge 5K + Tesla Powerwall 3, €16,800 (save €1,820 vs RRP)
  - "Small Home 3kWp" — 7 panels + Huawei 6KTL, €7,400 (save €680)
  - "Large Home 10kWp" — 23 panels + Fronius 8.6 + Tesla Powerwall 3, €24,600 (save €2,340)
- Search by manufacturer/model/description
- Category chips with counts
- Product detail modal with full specs + add-to-proposal CTA
- Bundle detail modal with component breakdown + add-bundle-to-proposal CTA
- "Add to proposal" buttons (when wired to ProposalQuestionnaire, pre-fills the products)

### 7. ✅ Analytics dashboard total overhaul

- `src/components/AnalyticsDashboard.tsx` (400 lines)
- 5 tabs:
  1. **Overview** — KPI cards (pipeline value, active leads, avg deal size, stale leads), leads-by-stage bar chart, recent activity feed
  2. **Funnel** — 13-stage conversion funnel with drop-off % per stage, bottleneck detection ("proposal_sent → approved is 42%, benchmark is 60%")
  3. **Team** — consultant performance table (leads, proposals, contracts, conversion rate, revenue), AI Coach insight ("Aoife 42% vs Cian 24% — recommend coaching session")
  4. **Agents** — agent runs 24h/30d, hours saved, cost saved, per-agent success rate bars, automation impact (emails sent, SMS sent, proposals auto-drafted, surveys auto-scheduled)
  5. **SEAI** — grant pipeline value, submitted/pending counts, approval rate, per-lead grant breakdown
- Time range selector (7d/30d/90d/all)
- Export CSV button
- Mobile responsive (KPI cards stack on mobile, tables scroll)

### 8. ✅ System settings overhaul — email/SMS channels + kernel

- `src/components/SystemSettings.tsx` (550 lines)
- 6 tabs:
  1. **Channels** — Email channel (Postmark with verified sender signature, SPF/DKIM/DMARC), SMS channel (Twilio, currently not configured), Marketing automation sequences (6 sequences with open rates)
  2. **Kernel** — Supabase config (project URL, region, Postgres version), auth settings (email confirm, anonymous sign-in off), RLS status, migration count, pg_cron job count
  3. **Agents** — global pause-all switch, per-agent enable/disable, configure button per agent
  4. **Integrations** — 10 third-party integrations with health status: Stripe (connected), Coinbase (connected), Postmark (connected), Lovable AI (connected), Mapbox (error — token missing), Met Éireann (pending), ESB Networks (pending), SEAI Portal (pending — manual), Google Calendar (pending), Twilio (pending)
  5. **Brand** — white-label config (name, tagline, primary colour, domain, logo upload)
  6. **Audit** — audit log (last 50 events with severity badges), agent failures (last 7 days with retry button)

### Bonus: Vault secrets card

The System Settings includes a Vault Secrets card showing all 8 server-side secrets with last-rotated dates and status badges. The `supabase_service_role` secret is flagged as "Action needed" (placeholder). The card links to `docs/SECRETS.md` for the rotation runbook.

### Bonus: pg_cron schedules card

Shows all 7 pg_cron jobs with their schedule (in Europe/Dublin timezone), next run time, and status. The 7 jobs: follow-up-digest, notification-digest, payment-reminder, retention-notifications, retention-agent-runs, retention-agent-queue, agent-queue-stuck-sweeper.

---

## New routes (5 new + 1 modified)

| Route | Component | What it is |
|-------|-----------|------------|
| `/installer-v3` | `InstallerPortalV2` | NEW — best-in-class installer cockpit |
| `/customer-mobile` | `CustomerMobilePortal` | NEW — mobile-first customer experience |
| `/products` | `ProfessionalProducts` | NEW — product catalogue + bundles |
| `/analytics` | `AnalyticsDashboard` | NEW — BI overhaul |
| `/system-settings` | `SystemSettings` | NEW — email/SMS/kernel/integrations/audit |
| `/upload` | `Index` (AIBillAnalyser) | MODIFIED — now flows to calendar booking after lead capture |

---

## Files created this session (7)

- `src/components/CalendarBooking.tsx` (350 lines)
- `src/components/customer/CustomerMobilePortal.tsx` (450 lines)
- `src/components/installer/InstallerPortalV2.tsx` (450 lines)
- `src/lib/seaiPipeline.ts` (300 lines)
- `src/components/ProfessionalProducts.tsx` (450 lines)
- `src/components/AnalyticsDashboard.tsx` (400 lines)
- `src/components/SystemSettings.tsx` (550 lines)

## Files modified (3)

- `src/components/ai-analyser/AIBillAnalyser.tsx` — added booking step, updated onSuccess signature
- `src/components/ai-analyser/LeadCaptureModal.tsx` — passes email/name back via onSuccess
- `src/App.tsx` — 5 new routes + 5 new wrapper pages
- `src/lib/demoMode.ts` — added 5 new routes to ALL_ROUTES

**Total:** ~2,950 lines of new code.

---

## How to review

Open the preview → visit `/demo` → the 5 new v3 routes are at the top:

1. **Installer Portal V3** — `/installer-v3` — try all 5 tabs (Today, Map, Surveys, Stock, Handover). The OSM map loads real Dublin-area tiles.
2. **Customer Mobile Portal** — `/customer-mobile` — try all 3 tabs (Timeline, Paperwork, Ask AI). Ask the AI "When will my installation happen?" — it responds with the actual lead's data.
3. **Professional Products** — `/products` — search "Longi", click a product, click a bundle.
4. **Analytics Dashboard** — `/analytics` — try all 5 tabs. The funnel tab shows bottleneck detection.
5. **System Settings** — `/system-settings` — try all 6 tabs. The Vault Secrets card shows the placeholder service-role key flag.

For the calendar booking: visit `/upload` (the bill upload page) → go through the bill upload flow → after lead capture, you'll land on the calendar booking page automatically.

---

## Your automation/AI score question — answered

**Current score: ~35/100** (up from ~25/100 at end of v2, ~15/100 at end of v1)

### What's working (the 35 points)
- ✅ Bill extraction via AI vision (Gemini via Lovable gateway) — actually works
- ✅ Lead capture → CRM — actually works (with v3 RLS fixes)
- ✅ 10 agent definitions with full metadata (trigger, inputs, outputs, guardrails)
- ✅ Role-aware AI Coach — distinct tips per role (installer/consultant/admin/owner/customer)
- ✅ Agent queue schema with `claim_next_job` / `complete_job` / `fail_job` SQL functions (the kernel)
- ✅ 4 pg_cron retention jobs running
- ✅ Stuck-job sweeper running every minute
- ✅ SEAI grant calculation (single source of truth)
- ✅ Customer mobile AI chat (rule-based responses, not LLM — but functional)
- ✅ Calendar booking (client-side, no calendar API yet)

### What's NOT working (the missing 65 points)
- ❌ **Agent implementations (0 of 10 have run() functions)** — biggest gap. The `claim_next_job` SQL exists but no edge function calls it. The UI shows `SIMULATED_RUNS`.
- ❌ **Agent runtime** — no `agent-drain` edge function. No worker dequeues jobs. Queue is write-only.
- ❌ **DB triggers don't enqueue agent jobs** — when `workflow_stage` changes, no agent fires
- ❌ **Proposal Drafter Agent** — no LLM call to draft proposals. Still manual.
- ❌ **Survey Scheduler Agent** — no calendar solver, no `.ics` invite generation
- ❌ **Install Coordinator Agent** — no Met Éireann weather fetch, no Twilio SMS, no supplier PO automation
- ❌ **SEAI Grant Agent** — no PDF generation, no email to `solarpvgrants@seai.ie`
- ❌ **Lead Intake Agent** — `extract-bill-data` returns JSON but doesn't write to `lead_intake` table
- ❌ **LLM-backed AI Coach** — currently serves static tips. Should call LLM with role-specific system prompt + user context.
- ❌ **Predictive analytics** — no lead scoring model, no conversion forecasting, no smart routing
- ❌ **Auto-generated email content** — emails use templates with `{{customer_name}}` placeholders. Should use LLM to generate personalised copy.
- ❌ **Realtime updates** — `useRealtimeUpdates` hook exists but most components don't use it. Stale data everywhere.
- ❌ **`lead_intake` is unused** — the "single source of truth" table is written by nothing, read by nothing. v1 code paths still bypass it.

### Improvements worth doing (priority order)

1. **Build the agent runtime** (Week 3 of original plan) — `agent-drain` edge function + DB triggers that enqueue. Without this, agents are fiction. **Unlocks 25 points.**
2. **Implement Lead Intake Agent** — wire `extract-bill-data` to write to `lead_intake`. Single day of work. **Unlocks 5 points.**
3. **Implement Proposal Drafter Agent** — LLM call with proposal-drafting prompt, DB-enforced `status='draft'`. **Unlocks 10 points.**
4. **LLM-backed AI Coach** — replace static tips with LLM calls using the role-specific system prompts already in `aiCoach.ts`. **Unlocks 8 points.**
5. **Realtime updates sweep** — wire all dashboard components to `useRealtimeUpdates`. **Unlocks 4 points.**
6. **Predictive lead scoring** — simple ML model (or even weighted rules) that scores leads 0-100 based on bill size, MPRN confidence, address, time-of-day. **Unlocks 5 points.**
7. **Auto-generated email content** — LLM generates personalised email body from template + lead context. **Unlocks 4 points.**
8. **Implement remaining 7 agents** (Follow-Up, Payment Reminder, PostInstall, Stale Lead Escalator, Install Coordinator, Survey Scheduler, SEAI Grant). **Unlocks 4 points.**

**After all 8: score would be ~95/100.** The remaining 5 points would come from advanced features (multi-tenant AI training, customer-specific proposal tuning, voice-to-text for installer notes, AR roof measurement).

---

## CRM add-on reminder

You mentioned: *"when we have that done and only when we do a few more audits and check i have a new add on for us. its the bussiness intelligence side of the pipeline. this was solar and customer and stands on its on for most installers. but i also have a supportive crm to add in for the business too. ill share that with you when we complete this version if you can remindme when your ready."*

**Reminder noted.** When you're ready to share the CRM add-on, send it over. I'll review how it integrates with the existing AISolar pipeline (leads → surveys → proposals → contracts → installs → SEAI → closeout) and how it plugs into the agent foundation + analytics dashboard we just built.

---

## What's next

Based on the score breakdown, the highest-leverage next move is **Week 3: build the agent runtime**. Without it, every other agent-related feature remains fiction. Say "go agents" and I'll start:

1. `agent-drain` edge function (the worker that dequeues jobs)
2. DB triggers on `leads.workflow_stage` change that enqueue to `agent_queue`
3. Lead Intake Agent implementation (wire `extract-bill-data` → `lead_intake`)
4. Proposal Drafter Agent implementation (LLM call + `status='draft'` enforcement)
5. Replace `SIMULATED_RUNS` in `AgentFoundation.tsx` with real `agent_runs` queries
6. Wire "Run now" button to actually invoke the agent

That alone takes the score from 35 → 60. Then we can layer in the LLM-backed coach, predictive scoring, and the remaining 7 agents.

**Or** if you'd rather share the CRM add-on first and plan the integration architecture before building more agents, say "CRM time" and I'll pause v3 work to review what you've got.
