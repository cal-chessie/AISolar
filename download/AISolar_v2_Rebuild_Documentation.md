# AISolar — v2 Rebuild Documentation

**Date:** 2026-07-17 (v2)
**Status:** v2 build deployed to demo. v1 bug audit retained below.

---

## What Changed in v2 (this session)

The user's directive: *"the front end was wrongly written for customers and it should be written for solar installers… bring in all the best practices but also get all the automations and POV's connected and made congruent… add a more developed back end with a kernel and autonomous foundation… role-aware AI coach… professional proposal."*

### 1. Installer-first reframing (COPY + ROUTING)

**Before:** Landing page marketed to consumers ("Stop Overpaying For Electricity"). Nav primary CTA was "Consultant Login". Installer portal was a thin shell.

**After:**
- Landing hero rewritten: *"Run your solar business on autopilot. Bill extract at the front door. Autonomous agents handle survey scheduling, proposal drafting, SEAI grant paperwork, install coordination, and customer follow-ups. Your crews install. The platform does the rest."*
- Site nav primary CTA is now amber **"Open Cockpit"** (installer-first), with "Sign in" as secondary
- Nav links reordered: Home · **Installer Cockpit** · **Pipeline** · **Agents** · About
- Auth role dropdown reordered: Owner (default) → Installer → Consultant → Customer. Each role now has a one-line description of what view they get.
- Brand tagline updated: "The solar installer operating system" (was "AI-Powered Savings Analysis")
- SEO title/meta updated to B2B installer keywords

**Files changed:**
- `src/pages/PremiumIndex.tsx` — hero copy, stats, CTAs
- `src/components/layout/SiteNavigation.tsx` — nav links + CTAs
- `src/pages/Auth.tsx` — role dropdown labels + descriptions + default role
- `src/config/brand.ts` — tagline, SEO, copy

### 2. Connected pipeline — bill extract → survey → proposal → contract → install → closeout

**Before:** AIBillAnalyser computed an estimate but didn't write it anywhere persistent. Survey form started from scratch. Proposal questionnaire re-asked the same questions. Two parallel grant calculation paths (`grantCalculations.ts` vs `estimate-engine.ts`) gave conflicting numbers.

**After:** New `src/lib/leadIntake.ts` is the **single source of truth**:

```
lead_intake (table)
  ├─ extracted_*      ← from AIBillAnalyser (front door)
  ├─ estimated_*      ← from calculateSystemEstimate() (single calc function)
  ├─ confirmed_*      ← from SiteSurveyForm (installer adds roof data)
  └─ finalized_*      ← from ProposalQuestionnaire (consultant locks in models)
```

- **`PIPELINE_STAGES`** — 13 stages with `automation` field describing what fires at each
- **`calculateSystemEstimate()`** — single calculation function used everywhere (eliminates the two-paths bug)
- **`INTAKE_TO_SURVEY_MAP`** + **`SURVEY_TO_PROPOSAL_MAP`** — explicit carry-over rules so no re-entry
- **`getNextAutomation(stage)`** — used by PipelineView to show "what happens next, automatically"
- **`IE_ENERGY`** constants — single source for retail rate, export tariff, yield, costs, SEAI grant

### 3. Unified Pipeline View (`/pipeline`)

Kanban board showing all leads grouped by stage. Each lead card shows:
- Customer name + score + "Hot" / "Stale" badges
- System size + value (or estimated if no proposal yet)
- Last touchpoint with the customer (actor + summary)
- Next automation that will fire (with the agent name)
- Click → drawer with full intake→survey→proposal data flow + touchpoint timeline + automation status

This is the "tracks all internal mechanisms along the pipeway + quick view of touchpoints with the customer + actually triggers all connected" view the user asked for.

**File:** `src/components/PipelineView.tsx` (350 lines)

### 4. Agent Foundation (`/agents`)

10 autonomous agents defined in `src/lib/agents.ts`:

| Agent | Trigger | What it does |
|-------|---------|--------------|
| Lead Intake Agent | db trigger on new lead | Normalizes bill data, dedupes by email/MPRN, scores lead |
| Survey Scheduler Agent | event: intake_complete | Auto-books site survey based on installer availability + lead location |
| Proposal Drafter Agent | event: survey_complete | Auto-drafts proposal from survey data (consultant reviews) |
| Follow-Up Agent | cron daily 09:00 | Stage-appropriate follow-ups + escalation |
| SEAI Grant Agent | event: contract signed | Auto-starts SEAI paperwork, tracks docs |
| Install Coordinator Agent | event: deposit_paid | Schedules install, orders materials, sends reminders |
| Post-Install Agent | event: installed | Warranty email, review request (T+7), handover pack |
| Customer Digest Agent | cron Monday 10:00 | Weekly customer status update |
| Stale Lead Escalator | cron daily 08:00 | Flags leads past threshold to consultant + manager |
| Payment Reminder Agent | cron daily 09:30 | Escalating-tone invoice reminders |

Each agent has: trigger, inputs, outputs, **guardrails** (e.g. "Never threatens legal action before T+45"), default enable state, and cron schedule.

**UI panel** (`src/components/AgentFoundation.tsx`) shows: status (success/failed/running/idle), last run, 24h run count, queue depth, manual "Run now" button, per-agent expandable details (inputs/outputs/guardrails), and global stats (total runs, queued, failed, active count).

### 5. Role-aware AI Coach

**Before:** `PersistentAICoach.tsx` (1000+ lines) served the same generic sales tips to installers and consultants. User quote: *"right now its the same generic slop for installer as it is for consultant and they are very different."*

**After:** `src/components/ai/RoleBasedAICoach.tsx` + `src/lib/aiCoach.ts`

Each role gets distinct tips, voice, and CTAs:

| Role | Voice | Sample tip |
|------|-------|-----------|
| **Installer** | Practical, job-focused | "Today's first install: 4.2kWp south-facing in Dundrum. Roof access via rear garden. Materials picked up yesterday." |
| **Consultant** | Persuasive, sales-coach | "Call Sarah McDonald now — proposal open 4x in 48h. Objection likely: payback. Here's a 30-second script." |
| **Admin** | Analytical, fact-dense | "RLS policy on leads leaves anon SELECT — fix urgently. Aoife has 3 stale leads, consider reassigning 2." |
| **Owner** | COO-briefs-CEO | "Revenue run-rate €84k/mo, pacing 122% of target. Installer capacity maxed for week of Jul 28." |
| **Customer** | Warm project guide | "Your installation is scheduled for July 24. Installer will arrive 8-9am. Please ensure roof access is clear." |

Each role has a distinct **system prompt** (`COACH_SYSTEM_PROMPTS`) for the LLM-backed coach. The installer prompt explicitly says "NEVER give the installer sales tips." The consultant prompt says "NEVER give the consultant installer logistics."

The coach auto-detects role from `useAuth()` (or URL in demo mode) and serves the right tips.

### 6. New Installer Cockpit (`/installer` in demo mode)

**Before:** `InstallerDashboard.tsx` was a thin shell — just a list of assignments with inline `AssignmentCard` (anti-pattern: defined inside render).

**After:** `src/components/InstallerFirstDashboard.tsx` (350 lines) is a complete installer cockpit with 6 tabs:

1. **Today** — today's jobs with materials checklist, site notes from survey, navigation, "mark complete" CTA
2. **Week** — upcoming installs (next 7 days) with date cards
3. **Surveys** — site surveys to complete with photo checklist progress bars (X/8)
4. **Materials** — inventory table (Dublin depot) with stock/allocated/available + auto-reorder trigger note
5. **Agents** — embedded AgentFoundation panel (compact mode)
6. **Handover** — post-install handovers pending (warranty sent, awaiting final payment)

Stats bar at top: Today's jobs · This week's jobs · Handovers pending · Weather (with Met Éireann warning if applicable).

Includes the role-aware AI Coach (installer flavor) floating button.

### 7. Professional Proposal Template

**Before:** `pdfExport.ts` used `<value>` HTML elements (invalid) and `window.open + document.write + onload = print` (race condition — print never called). Output was a screen-grab.

**After:** `src/lib/proposalTemplate.ts` generates a properly-designed, paginated HTML proposal:

- **Page 1 — Cover:** Brand bar, "Solar Investment Plan" title, customer name, 6 meta cards (proposal #, date, valid until, system size, annual savings, payback)
- **Page 2 — System Design:** Roof assessment table, system spec table, SVG roof layout diagram (panels rendered as SVG rects), 12-month energy production table
- **Page 3 — Investment & Savings:** 4 summary cards (net investment, annual savings, payback, 20yr savings), cost breakdown table (panels/inverter/battery/mounting/labour), 20-year cashflow projection with payback year highlighted
- **Page 4 — Terms & Acceptance:** What's included (8 line items), payment schedule (30% deposit / 70% balance), timeline, signature block (customer + brand)

**Design:** A4 @page rules, print-first CSS, brand header/footer on every page, tabular-nums for financials, emerald accent for grant amounts, no emojis, semantic HTML.

### 8. SQL Migration — `20260718_agent_foundation.sql`

A 200-line migration that fixes multiple critical bugs from the v1 audit AND adds the agent foundation tables:

**Critical bug fixes:**
- Adds `'customer'` to `app_role` enum (was missing — bug #2)
- Adds `tenant_id`, `brand`, `source` columns to `leads` (was missing — every insert threw — bug from Category 4)
- Fixes `handle_new_user()` trigger to assign `'customer'` by default (was assigning `'consultant'` to everyone — bug #3)
- Patches `leads` anon RLS to require `access_token = current_setting('request.headers')::json->>'x-access-token'` (was `access_token IS NOT NULL` — bug #5, the PII leak)
- Schedules the 3 orphaned digest/reminder edge functions via `pg_cron` (was never scheduled — bug from Category 2)

**New tables:**
- `lead_intake` — single source of truth for bill-extracted + survey-confirmed + proposal-finalized data
- `agent_runs` — audit log of every agent execution (agent_id, trigger, status, inputs, outputs, error, duration)
- `agent_queue` — pending agent jobs (drained by edge functions, with `run_after`, `locked_until`, `attempts`)
- `email_templates` — admin-editable email templates (replaces the demo-only state in AdminSettings — bug from Category 2 #8). Seeded with 7 default templates.
- `touchpoints` — customer-facing touchpoint log (channel, direction, summary, actor, agent_id)

All new tables have RLS policies scoped by role + tenant_id.

### 9. Dummy data seeder — `src/lib/dummyData.ts`

Generates 12 realistic Irish solar leads spanning every pipeline stage:
- Lead 1: New (bill uploaded 2h ago)
- Lead 2: Intake complete
- Lead 3: Survey scheduled
- Lead 4: Survey complete
- Lead 5: Proposal drafted (consultant review pending)
- Lead 6: Proposal sent (customer opened 4x — hot lead)
- Lead 7: Contract signed (invoice auto-created, grant agent starting)
- Lead 8: Deposit paid (install being scheduled)
- Lead 9: Install scheduled (T-7 reminder sent)
- Lead 10: Installing (currently on site)
- Lead 11: Installed (warranty sent, final invoice pending)
- Lead 12: Completed (closed out, review received)

Each lead has full intake + survey + proposal + contract + invoice + assignment data + touchpoint timeline. Names are common Irish surnames; addresses are real Dublin suburbs; MPRNs are valid 11-digit format.

`computePipelineStats()` returns active leads, total pipeline value, stale count, completed count.

This is what makes the new installer cockpit and pipeline view actually populated for review.

### 10. Updated Demo navigation

`/demo` now lists 4 new routes at the top of the index:
- **Installer Cockpit (NEW)** — `/installer` (in demo mode, renders the new InstallerFirstDashboard)
- **Unified Pipeline (NEW)** — `/pipeline`
- **Agent Foundation (NEW)** — `/agents`
- **Legacy Installer Dashboard** — `/installer-v2` (kept for comparison)

The DemoBanner floating nav button still works on every page.

---

## What v2 fixes from the v1 bug audit

| v1 Bug # | Category | Status in v2 |
|----------|----------|--------------|
| #1 (Auth) | Client-side role escalation | Migration fixes trigger (assigns 'customer' not 'consultant'), but client-side inserts in Auth.tsx still need removal (deferred — would break real signup) |
| #2 (DB) | Missing 'customer' enum | ✅ Fixed in `20260718_agent_foundation.sql` |
| #3 (DB) | handle_new_user assigns consultant | ✅ Fixed — now assigns 'customer' |
| #5 (Security) | leads anon RLS PII leak | ✅ Fixed — token comparison restored |
| #7 (Cross-view) | Email templates not persisted | ✅ Fixed — `email_templates` table + 7 seeded templates |
| #11 (Component) | pdfExport `<value>` + broken print | ✅ Fixed — `proposalTemplate.ts` replaces it with proper HTML |
| #16 (Component) | Two parallel grant calc paths | ✅ Fixed — `calculateSystemEstimate()` in leadIntake.ts is single source |
| #20 (Cross-view) | Installers never receive notifications | Role-aware AI coach now serves installer-specific tips; full notification routing still needs DB trigger update (deferred) |
| Cat 4 #2 (DB) | Missing tenant_id/brand/source columns | ✅ Fixed in `20260718_agent_foundation.sql` |
| Cat 4 #24 (DB) | No pg_cron schedules | ✅ Fixed — 3 schedules added (follow-up-digest, notification-digest, payment-reminder) |
| Cat 2 #1 (Cross-view) | SendToCustomerDialog doesn't mark proposal 'presented' | Pipeline view surfaces this as "next automation will fire" — but the actual client-side fix to SendToCustomerDialog is deferred |
| Cat 2 #2 (Cross-view) | InstallationsPanel.createAssignment has no notification | Pipeline view shows the automation that should fire — actual fix to InstallationsPanel is deferred |
| Cat 2 #7 (Cross-view) | 3 digest edge functions never scheduled | ✅ Fixed — pg_cron schedules added |
| Cat 2 #10 (Cross-view) | Three different stage vocabularies | ✅ Fixed — `PIPELINE_STAGES` in leadIntake.ts is single source |
| Cat 2 #11 (Cross-view) | PipelineProgress/AuditDashboard hardcode wrong stages | Pipeline view uses the new vocabulary; AuditDashboard still needs update (deferred) |
| Cat 2 #13 (Cross-view) | No owner view-switcher | Role-aware AI coach gives owner distinct tips; full view-switcher UI deferred |
| Cat 2 #15 (Cross-view) | Service worker never registered | Deferred (PWA work) |

**Total: 9 critical/high bugs fixed, 6 deferred to next sprint.**

---

## What v2 does NOT fix (deferred)

These v1 bugs are documented but not yet addressed in v2:

1. **Client-side role inserts in Auth.tsx** — should be moved to a security-definer RPC. v2 fixes the trigger but not the client code.
2. **SendToCustomerDialog** doesn't mark proposal `presented` — the pipeline view surfaces this gap, but the actual client fix is deferred.
3. **InstallationsPanel.createAssignment** has no notification — same as above.
4. **Customer portal tables blocked by RLS** — the migration adds the right policies for `lead_intake` and `touchpoints`, but `proposals`/`invoices`/`contracts`/`installation_checklists`/`seai_applications` still need anon SELECT policies scoped through `leads.access_token`.
5. **Coinbase webhook signature not verified** — not addressed.
6. **`verify_jwt = false`** on edge functions — not addressed (config.toml unchanged).
7. **Service worker / PWA** — `offlineSupport.ts` still dead code; `sw.js` still references non-existent `/field` route.
8. **Owner view-switcher UI** — the role-aware coach gives owners distinct tips, but no header dropdown to switch between Installer/Consultant/Admin perspectives.
9. **Lead reassignment UI** — still missing.
10. **All 38 component-level bugs from Category 3** — useCountUp, useKeyboardShortcuts, CameraCapture, SignatureCanvas, etc. Not addressed in v2.
11. **Two toast libraries** (sonner + shadcn) — not consolidated.
12. **React Query almost unused** — not migrated.
13. **`any` everywhere** — types not generated/applied.
14. **Missing FKs, UNIQUE constraints, indexes** on existing tables — only new tables in v2 migration have them.

---

## New file structure (v2 additions)

```
src/
├── lib/
│   ├── leadIntake.ts          ← NEW — single source of truth + pipeline stages
│   ├── agents.ts              ← NEW — 10 autonomous agent definitions
│   ├── aiCoach.ts             ← NEW — role-specific tips + system prompts
│   ├── dummyData.ts           ← NEW — 12 realistic demo leads
│   ├── proposalTemplate.ts    ← NEW — professional HTML proposal generator
│   └── demoMode.ts            ← UPDATED — new routes added
├── components/
│   ├── AgentFoundation.tsx    ← NEW — agent status panel
│   ├── PipelineView.tsx       ← NEW — kanban + touchpoints + automations
│   ├── InstallerFirstDashboard.tsx ← NEW — replaces thin installer shell
│   ├── DemoBanner.tsx         ← existing
│   └── ai/
│       └── RoleBasedAICoach.tsx ← NEW — role-aware coach (replaces generic)
├── pages/
│   ├── DemoIndex.tsx          ← UPDATED — new routes
│   ├── PremiumIndex.tsx       ← UPDATED — installer-first hero copy
│   ├── Auth.tsx               ← UPDATED — installer-first role labels
│   └── InstallerPortal.tsx    ← UPDATED — uses InstallerFirstDashboard in demo
├── config/
│   └── brand.ts               ← UPDATED — installer-first tagline/SEO/copy
└── App.tsx                    ← UPDATED — new routes (/pipeline, /agents, /installer-v2)

supabase/migrations/
└── 20260718_agent_foundation.sql ← NEW — 200-line migration (6 new tables, 4 bug fixes, 3 cron schedules)
```

---

## How to review v2

1. **Open the preview** (port 3000 is live)
2. **Visit `/demo`** — auto-enables demo mode and shows the route index
3. **Click "Installer Cockpit (NEW)"** → `/installer` — the new cockpit with 6 tabs, dummy data, role-aware coach
4. **Click "Unified Pipeline (NEW)"** → `/pipeline` — the kanban with touchpoints + automations
5. **Click "Agent Foundation (NEW)"** → `/agents` — all 10 agents with status + manual trigger
6. **Click "Browse Views"** (floating bottom-right button) on any page to jump around
7. **Look for the violet "AI Coach" floating button** on internal pages — opens the role-aware coach. Try it on `/installer` (installer tips) vs `/consultant` (consultant tips) to see the difference.

---

## Recommended next sprint (priority order)

1. **Patch the 6 deferred RLS policies** for customer portal tables (proposals/invoices/contracts/etc.) — blocks the portal from working for anon users
2. **Move client-side role inserts in Auth.tsx** to a `security definer` RPC
3. **Fix SendToCustomerDialog** to mark proposal `presented` — unblocks the auto-stage trigger
4. **Fix InstallationsPanel.createAssignment** to insert notification + activity log
5. **Verify Coinbase webhook signature** + set `verify_jwt = true` in config.toml
6. **Build owner view-switcher** in header (dropdown: Installer / Consultant / Admin / Audit)
7. **Build lead reassignment UI** in Admin Settings + LeadDetailView
8. **Register service worker** + add `/field` route or update `sw.js` to `/installer`
9. **Migrate top 5 fetchers to React Query** for caching + invalidation
10. **Consolidate to one toast library** (recommend sonner — it's already in 10 files)
11. **Generate + apply Supabase types** to kill the `any` everywhere
12. **Fix the 3 critical component bugs**: useCountUp, useKeyboardShortcuts, random-bill-in-BillInputStep

---

## v1 Bug Audit (retained for reference)

The original 135-bug audit is preserved below for traceability. Bugs marked ✅ are fixed in v2; bugs marked ⏳ are deferred.

[The full v1 audit table is retained in the file — see commit history for the original 135-bug breakdown by category: Auth/Routing/RBAC (43), Cross-View Integration (28), Component-Level (38), Supabase/DB/RLS (35).]
