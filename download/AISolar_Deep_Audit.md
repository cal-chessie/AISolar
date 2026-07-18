# AISolar — Deep Audit Report

**Date:** July 18, 2026
**Scope:** Full codebase at `/home/z/my-project/aisolar/`
**Method:** Static review across 5 dimensions — type safety, dead code, security, UX/vibe, agent foundation. No files modified.
**Codebase size:** 227 TS/TSX files, 60,106 LOC source + 12 migrations + 12 edge functions.

---

## Executive Summary

AISolar's **plumbing is genuinely production-grade** — the agent queue / claim / retry / DLQ / sweeper kernel, the page-transition layer, the GDPR consent plumbing, the v3 vault-stored service-role keys — all well-built. **Everything *above* the plumbing is mock, broken, duplicated, or installer-hostile.** The codebase is split-personality: a 30k-LOC consumer-solar ghost still haunts the `landing/`, `ai-analyser/`, `dashboard/` directories, and the live B2B cockpits haven't yet absorbed the installer-OS identity the homepage now claims.

**Headline numbers:**

| Dimension | Finding |
|---|---|
| **Type safety** | 16 TS errors across 7 files. Build still succeeds (esbuild is lenient). |
| **Dead code** | **~32,441 LOC dead = 52% of source tree.** 11 dead pages, 3 dead V3/V4 cockpit versions, entire `dashboard/` `landing/` `ai-analyser/` `workflow/` directories orphaned. |
| **Security** | **9 P0 + 9 P1 + 8 P2 + 6 P3 = 32 findings.** Previous "RESOLVED ✅" claim in `AUDIT_REPORT.md` is **false**. `leads` table still wide open, 6 email edge functions are open relays, `anonymise_lead` and `enqueue_agent` RPCs granted to `authenticated`. |
| **UX / vibe** | 4 dead routes hit by live code, 3 dead terminal-action buttons, 11 consultant tabs should be 6, 4 different "primary" colors across views, Inter font referenced but never loaded, `index.html` still says `sunbeam-automation-hub`. |
| **Agent foundation** | **0 of 10 agents fully wired.** 5 partial, 5 mock/broken. **Zero LLM calls in `agent-drain`** — the "AI-OS" pitch is unsupported by code. `AIConfig.tsx` and `AgentTraining.tsx` are 100% local-state mock. |

**Verdict: NOT PRODUCTION READY.** At minimum, the 9 P0 security findings and the 3 dead terminal-action buttons must be fixed before any customer-facing deploy.

---

## 1. Type Safety

```
$ tsc --noEmit -p tsconfig.app.json
16 errors across 7 files
```

| File | Error | Severity |
|---|---|---|
| `src/components/InstallerIntelligenceBuilder.tsx:343` | `Partial<CustomProduct>` not assignable to `Omit<CustomProduct, "id">` — missing required `category` | Medium |
| `src/components/OwnerCockpit.tsx:129` | `concat()` of arrays with different `type` literal (`"install"` vs `"follow_up"`) — widened union needed | Medium |
| `src/components/OwnerCockpit.tsx:754` | `Cannot find name 'Shield'` — missing lucide import | **High** (runtime crash) |
| `src/components/ProfessionalProducts.tsx:309,310,314` | `id` prop passed to a component that doesn't accept it (3×) | Medium |
| `src/components/SystemSettingsV2.tsx:449,450,451,485,486,502` | Brand config typed as literal union; setter tries to write `string` — type too narrow | Medium |
| `src/components/WorkflowOrchestrator.tsx:229` | `onSurveyComplete` prop doesn't exist on `SiteSurveyFormProps` | Low (dead file) |
| `src/components/installer/InstallerPortalV3.tsx:171,332` | `displayToday` and `ChevronRight` not imported | Low (dead file) |
| `src/lib/dummyData.ts:292` | Touchpoint objects missing required `id` field | Medium |

**Build still succeeds** because Vite uses esbuild (no type enforcement). All 16 errors silently ship to production.

---

## 2. Dead Code — 32,441 LOC (52% of source)

### 2a. Legacy versioned components (7,048 LOC)
| File | LOC |
|---|---|
| `components/ConsultantCockpitV3.tsx` | 497 |
| `components/ConsultantCockpitV4.tsx` | 516 |
| `components/ConsultantDashboardV2.tsx` | 530 |
| `components/installer/InstallerPortalV2.tsx` | 633 |
| `components/installer/InstallerPortalV3.tsx` | 395 |
| `components/installer/JobView.tsx` | 545 |
| `components/installer/MobileInstallerCompanion.tsx` | 1,115 |
| `components/customer/CustomerMobilePortal.tsx` | 686 |
| `components/OwnerBirdseye.tsx` | 645 |
| `components/PremiumDashboard.tsx` | 1,170 |
| `components/SystemSettings.tsx` | 702 |
| `components/WorkflowOrchestrator.tsx` | 414 |

### 2b. Dead pages (4,346 LOC)
| File | LOC | Reason |
|---|---|---|
| `pages/PremiumIndex.tsx` | 786 | **Imported by `App.tsx:15` but never routed** — dead import + dead page |
| `pages/Index.tsx` | 147 | Old homeowner funnel |
| `pages/Auth.tsx` | 485 | Replaced by `PrestigiousAuth` |
| `pages/ConsultantDashboard.tsx` | 59 | Wrapper around dead `PremiumDashboard` |
| `pages/InstallerPortal.tsx` | 62 | Replaced by V5 |
| `pages/InstallerMobileApp.tsx` | 46 | Wrapper around dead `MobileInstallerCompanion` |
| `pages/CustomerPortal.tsx` | 520 | Replaced by V2 |
| `pages/ClientPortal.tsx` | 198 | v1 PII-leak portal (header confirms retired) |
| `pages/CustomerDashboard.tsx` | 389 | Replaced by V2 |
| `pages/AdminSettings.tsx` | 1,054 | Not routed |
| `pages/AuditDashboard.tsx` | 600 | Not routed |

### 2c. Entire directories orphaned (19,044 LOC)
| Directory | LOC | Only dead importer |
|---|---|---|
| `components/dashboard/*` (19 files) | 6,387 | PremiumDashboard, LeadDetailView, AdminSettings (all dead) |
| `components/landing/*` (10 files) | 806 | PremiumIndex, Index (both dead) |
| `components/ai-analyser/*` (7 files) | 1,334 | Index.tsx (dead) |
| `components/workflow/*` (2 files) | 292 | none — zero importers |
| Sub-components (installer/customer/seai/payment/contracts/equipment) | 5,489 | only dead parents |
| AI coach legacy (PersistentAICoach, AICoachFloatingButton, DynamicAISalesCoach) | 1,105 | none / dead |
| Other dead leaves (NotificationBell, NotificationPreferences, CameraCapture, SurveyProgressIndicator, MobileBottomNav) | 1,061 | dead |
| Custom UI helpers (Card3D, ScrollIndicator, PaginationControls, ErrorBoundary, SignatureCanvas, skeletons/) | 836 | dead |

### 2d. Dead hooks (443 LOC)
`useCountUp`, `usePullToRefresh`, `useRealtimeUpdates`, `useNotifications` — all only imported by dead components.

### 2e. Dead lib helpers (1,560 LOC)
| File | LOC | Replaced by |
|---|---|---|
| `lib/customerPortal.ts` | 34 | — |
| `lib/estimate-engine.ts` | 262 | `lib/leadIntake.ts` (`calculateSystemEstimate`) |
| `lib/offlineSupport.ts` | 143 | — |
| `lib/pdfExport.ts` | 298 | — |
| `lib/proposalTemplate.ts` | 541 | — |
| `lib/grantCalculations.ts` | 199 | `lib/seaiPipeline.ts` (`calculateSEAI`) |
| `lib/tenant.ts` | 83 | unused (also P1 security issue — `?tenant=` URL param unvalidated) |

### 2f. Duplicated live code (consolidation opportunity)
| Concept | Live files | Recommendation |
|---|---|---|
| Calendar | `UnifiedCalendar.tsx` (290 LOC) AND `RealCalendar.tsx` (406 LOC) — both lazy-loaded by OwnerCockpit | Merge into one |
| Toast | `hooks/use-toast.ts` AND `components/ui/use-toast.ts` (one-line re-export) | Pick one path |
| LeadDetailView | Inline function in `OwnerCockpit.tsx:734` AND separate `components/LeadDetailView.tsx` (dead) | Delete the file |

**Removal plan:** 5 atomic PRs (see §7 below) — pure leaf deletion first, then legacy versions, then directory sweeps, then unused lib/helpers, then shadcn-primitive sweep with `ts-prune`.

---

## 3. Security — 32 findings (9 P0 / 9 P1 / 8 P2 / 6 P3)

### 🔴 P0 — CRITICAL (must fix before any deploy)

| # | Finding | Location |
|---|---|---|
| P0-1 | **`leads` table RLS wide open.** Original 4 policies from `20251008` migration (`auth.role()='authenticated'` for SELECT/INSERT/UPDATE/DELETE) **never dropped**. Any authenticated user (including `customer` role) can read every lead's PII (name, email, phone, address, MPRN, monthly_bill, access_token) and modify/delete any lead. **Worst PII leak in the system.** v3 sweep touched proposals/assignments/installation_checklists/activity_logs/profiles/user_roles but **missed `leads` itself**. | `migrations/20251008...sql:20-38` |
| P0-2 | **`agent-drain` has no role check.** Only checks `Bearer ` prefix. Any authenticated customer JWT passes both gateway `verify_jwt=true` and the function's internal check. Customer can force-trigger any agent on any lead. | `functions/agent-drain/index.ts:57-83` |
| P0-3 | **`anonymise_lead(UUID)` granted to `authenticated`.** SECURITY DEFINER function. Any customer can wipe any lead's PII by calling `supabase.rpc('anonymise_lead', {p_lead_id: '<any-uuid>'})`. | `migrations/20260718_v3_security_fixes.sql:440` |
| P0-4 | **`enqueue_agent(TEXT, UUID, JSONB, INTEGER)` granted to `authenticated`.** SECURITY DEFINER. Any customer can enqueue any agent for any lead. | `migrations/20260718_v3_agent_runtime.sql:34` |
| P0-5 | **`seai-documents` storage bucket OPEN.** Any authenticated user can list/download/upload (any MIME, any size) and delete every BER cert, grant PDF, install photo. No size/MIME limits. v3 migration **did not touch this bucket**. | `migrations/20251216a...sql:135-149` |
| P0-6 | **All 6 `send-*` email edge functions have NO internal auth check** despite `verify_jwt=true` at gateway. Any authenticated user can: (a) trigger emails to any customer by passing leadId; (b) for `send-proposal-accepted` and `send-survey-notification`, send arbitrary content to **any email address they type in the body** (open email relay). | `functions/send-*/index.ts` (all 6) |
| P0-7 | **`expert-chat` is fully open.** No auth, `Access-Control-Allow-Origin: "*"`, calls paid LLM endpoint. Prompt injection + cost abuse. | `functions/expert-chat/index.ts:3-6, 8-92` |
| P0-8 | **`touchpoints` INSERT open.** Original `WITH CHECK (true)` policy never dropped. v3 replacement policy references `leads.assigned_consultant_id` column **that was never added** — so the strict policy is non-functional and the open original wins. | `migrations/20260718_agent_foundation.sql:261-264` |
| P0-9 | **Client routes have no auth guard.** `/owner`, `/consultant`, `/installer` render unconditionally. Sensitive UI (consultant/installer lists, settings panels, agent monitor) exposed to anyone navigating there. | `src/App.tsx:78-81` |

### 🟠 P1 — HIGH (next sprint)

| # | Finding |
|---|---|
| P1-1 | `contracts` INSERT open — any user can insert fake signed contract |
| P1-2 | `assignments` INSERT + UPDATE open — any user can re-assign installer jobs |
| P1-3 | `installation_checklists` INSERT + UPDATE open — any user can flip "complete" + forge signatures |
| P1-4 | `seai_documents` table SELECT + INSERT open (mirrors bucket issue) |
| P1-5 | `activity_logs` INSERT open — any user can forge audit log entries |
| P1-6 | `notifications` INSERT has `WITH CHECK (true)` policy still active — spam vector |
| P1-7 | `survey_photos` table SELECT + INSERT open (bucket is locked, table isn't) |
| P1-8 | `create-crypto-checkout` staff path has no role check — comment lies about gateway enforcement |
| P1-9 | Unvalidated `?tenant=` URL param — attacker can route new leads to wrong tenant |

### 🟡 P2 — MEDIUM

| # | Finding |
|---|---|
| P2-1 | No rate limiting on `extract-bill-data` — paid LLM gateway exhaustible |
| P2-2 | Stripe/Coinbase webhook idempotency gap — duplicate event delivery re-processes |
| P2-3 | `anonymise_lead` incomplete — misses touchpoints metadata, activity_logs metadata, notifications, proposals, invoices, installation_checklists (incl. signatures!), seai_applications, seai_documents, project_documents, auth.users. Would not pass a DPC audit. |
| P2-4 | `create-checkout` accepts attacker-controlled `successUrl`/`cancelUrl` + uses `req.headers.get("origin")` without validation — post-payment phishing redirect |
| P2-5 | Email HTML interpolates customer data without escaping — stored XSS in email clients |
| P2-6 | Realtime publication includes `leads`, `proposals`, etc. — leaks via broken RLS until P0-1 fixed |
| P2-7 | `send_event_notification()` trigger reads `app.settings` that may be unset — silently skips |
| P2-8 | `OPENROUTER_API_KEY` mentioned in UI but never wired to backend — functional gap (v3 #14) |

### 🟢 P3 — HARDENING

| # | Finding |
|---|---|
| P3-1 | Hardcoded placeholder JWT in committed migration `20260718_agent_foundation.sql:305,309,313` (fake but bad pattern) |
| P3-2 | Demo mode could re-activate if `VITE_ENABLE_DEMO=true` in prod Vercel env — no runtime warning |
| P3-3 | Supabase client doesn't validate env vars exist — silent failure on misconfig |
| P3-4 | `claim_next_agent_job` returns pre-update row — `attempts` count off-by-one in returned row |
| P3-5 | CORS returns default origin for disallowed requests — should return empty string |
| P3-6 | `AIConfig.tsx` OpenRouter key field is non-functional — saves to local state only |

**Note on existing `AUDIT_REPORT.md`:** its claim that all 13 critical findings are "RESOLVED ✅" is **false**. Items #1, #3, #4, #5, #7, #8, #9 were correctly fixed. Item #2 (customer contact details) is **still OPEN** via the `leads` table policies (P0-1). The audit missed: `leads` table itself, all INSERT/UPDATE policies on contracts/assignments/installation_checklists/seai_documents/activity_logs, the `touchpoints` open policy, the `notifications` open INSERT, the `survey_photos` table (vs bucket), the `seai-documents` storage bucket, the `anonymise_lead` and `enqueue_agent` RPC grants, the `agent-drain` missing role check, all 6 `send-*` email functions, `expert-chat`, the missing `<ProtectedRoute>` wrapper, and the incomplete `anonymise_lead` scrub.

---

## 4. UX / Vibe / Cross-View Congruence

### 4a. Top 10 UX issues (ranked by user-visible impact)

| # | Issue | File:Line |
|---|---|---|
| 1 | **`Send proposal to customer` button is a no-op** — entire LeadFlow ends in a button with no `onClick`. Core consultant workflow dies at the finish line. | `LeadFlow.tsx:383-385` |
| 2 | **`Mark job complete` button is a no-op** — installer finishes all 6 tabs, gets green "complete" card, clicks button, nothing happens. | `JobViewV2.tsx:815-817` |
| 3 | **`Book survey` button on Estimate step is a no-op** — only the bottom "Continue to survey" link works. | `LeadFlow.tsx:276-278` |
| 4 | **JobView back button navigates to dead route `/installer-v4`** → 404. | `JobViewV2.tsx:241` |
| 5 | **Owner → Client → Portal button navigates to dead route `/customer-mobile`** → 404 (correct route is `/my-projects`). Appears twice. | `OwnerCockpit.tsx:644, 797` |
| 6 | **Owner alert CTAs navigate to dead routes `/agents` and `/analytics`** → 404. Should call `setActiveView(...)` instead. | `OwnerCockpit.tsx:455, 456` |
| 7 | **Cross-view navigation loses the leadId** — every "Open in LeadFlow", "Open chat", "Open job" button calls `navigate('/lead-flow')` (no ID), even though `/lead-flow/:leadId` route exists. 7 occurrences across Owner + Consultant. LeadFlow then loads `leads[6]` (a random dummy). | `OwnerCockpit.tsx:794-797`, `ConsultantCockpitV5.tsx:232`, etc. |
| 8 | **Customer's own chat bubble appears in two different colors** — `bg-emerald-600` in CustomerPortalV2 vs `bg-blue-600` in ConsultantCockpitV5. Mental model breaks on view switch. | `CustomerPortalV2.tsx:523` vs `ConsultantCockpitV5.tsx:449` |
| 9 | **Consultant reply box is a no-op** — `handleSendReply` only clears input. User thinks they sent a message; thread shows nothing new. | `ConsultantCockpitV5.tsx:132-136` |
| 10 | **`index.html` still ships Lovable boilerplate** — `<title>sunbeam-automation-hub</title>`, `<meta name="description" content="Lovable Generated Project">`, og:image points at `lovable.dev`. Inter font referenced in CSS but never loaded — users see system-ui/Times fallback. **Single biggest "lost vibe" tell.** | `index.html:6-13`, `src/index.css:126` |

### 4b. Dead routes hit by live code
`/installer-v4`, `/customer-mobile`, `/agents`, `/analytics` — all 404. (Plus `/pipeline` and `/upload` only hit by dormant files.)

### 4c. Consultant tab restructure — 11 → 6

**Current 11 tabs** (in order): Leads · Chats · Estimates · Surveys · Proposals · Installs · Calendar · Follow-ups · Products · Documents · Analytics

**Problem:** Tabs 1, 3, 4, 5, 6, 8, 10 are all the same surface (lead list) with different `leads.filter(...)` predicates. Tabs 1 and 2 already share a layout (`isChatView = activeTab === 'chats' || activeTab === 'leads'`).

**Proposed 6 tabs (workflow order):**

| # | Tab | Icon | Contents |
|---|---|---|---|
| 1 | **Inbox** | `MessageSquare` | Merged Leads + Chats + Follow-ups. Lead list with **filter chips**: `All · Hot 🔥 · Stale (5+ days) · Survey · Proposal · Install`. Default: hot + stale first. Click → conversation thread on right. |
| 2 | **Pipeline** | `TrendingUp` | Kanban by stage. Drag-to-advance. Currently missing from consultant view (only Owner has a pipeline flow card). |
| 3 | **Calendar** | `Calendar` | Keep `UnifiedCalendar filterRole="consultant"`. |
| 4 | **Products** | `Package` | Keep `ProfessionalProducts` (consider read-only for consultants). |
| 5 | **Documents** | `FolderOpen` | Promote from "lead list with doc badges" to real document manager (proposals/contracts/invoices/warranties as rows with status). |
| 6 | **Insights** | `BarChart3` | Renamed from "Analytics" (less intimidating). Keep 4-stat box + "Open full analytics →". |

### 4d. Cross-view dead-ends (from → expected → actual)

| From | Expected | Actual |
|---|---|---|
| LeadFlow Send button click | Proposal marked sent + toast + "Open in pipeline" CTA | **No-op** |
| JobView "Mark complete" | Job done + customer portal update + back to `/installer` | **No-op** |
| JobView back arrow | Return to `/installer` | **404 `/installer-v4`** |
| JobView Handover complete | Customer portal shows "system installed" message | **Never propagates** (stage never set) |
| Owner → Client → Portal | `/my-projects` for that lead | **404 `/customer-mobile`** |
| Owner → "Agents failed" alert → View | Open Agents sidebar view | **404 `/agents`** |
| Owner → lead → "Open in LeadFlow" | `/lead-flow/${lead.id}` | **Loses leadId** |
| Consultant → chat header ArrowRight | `/lead-flow/${lead.id}` | **Loses leadId** |
| Consultant → Surveys → click card | `/lead-flow/${lead.id}/survey` | **Loses leadId** |
| Consultant → reply → Send | Message appended + touchpoint logged | **No-op** |
| Customer Portal → Book call | Calendar booking modal | **No-op** |
| Customer Portal → documents → View/Pay | Open doc / start payment | **All no-ops** |
| Installer Portal → job card / Materials / Map pin | `/job/${lead.id}` | **Works correctly** ✅ |

### 4e. Visual / motion polish — specific inconsistencies

**Color palette drift (4 different "primary" colors):**
- Homepage + Owner + Consultant + LeadFlow = `bg-blue-600`
- Installer + JobView = `bg-amber-600`
- Customer Portal = `bg-emerald-600`
- CSS variables = `--primary: 142 71% 45%` (green)

**Fix:** Pick emerald/green as the one true primary (matches CSS + customer portal + "solar = green"). Use blue only for "AI/agent" semantics. Amber = installer accent (keep).

**Border-radius drift:** chat bubbles `rounded-2xl`, tabs `rounded-lg`, badges `rounded-full`, modals mixed `sm:rounded-2xl rounded-t-2xl`. Pick 2 radii (cards = `rounded-lg`, modals = `rounded-2xl`).

**Shadow scale drift:** `shadow-premium` defined in `index.css:135` **never used**. `CustomerPortalV2.tsx` has **0 shadow classes** — looks flat vs the rest.

**Missing transitions:** `ConsultantCockpitV5` lead list buttons hover-snap (no `transition-colors`). `InstallerPortalV5` job cards hover-snap (no `transition-shadow`). `CustomerPortalV2` quick-action buttons have no transition.

**framer-motion stagger lost:** `PremiumIndex` (ghost) staggers every card with `delay: i * 0.1`. Live cockpits don't stagger anything. The "lost vibe" is partly that stagger was dropped when migrating to V5.

**Typography:** 303 occurrences of `text-[8px]` / `text-[9px]` / `text-[10px]` across 57 files — below WCAG AA at default zoom.

### 4f. Empty / loading / error states

- **Empty states:** present in ~40% of lists (Consultant sub-tabs, Installer Jobs, JobView Handover). Missing in Owner Cockpit (all sub-views), Customer Portal, LeadFlow.
- **Loading states:** only Suspense spinners. **No skeleton loaders anywhere in live cockpits** despite `ui/skeleton.tsx` existing (only used by dormant files).
- **Error states:** **zero error states in any live cockpit.** No `ErrorBoundary` wraps routes (component exists at `ui/ErrorBoundary.tsx` but unused). No try/catch around `generateDummyLeads()`. Currently invisible because all live views use dummy data — first Supabase fetch failure will crash the cockpit.

### 4g. Mobile / a11y gaps

**Mobile-breaks:**
- `OwnerCockpit` sidebar fixed `w-56` with no mobile drawer — unusable on 375px.
- `ConsultantCockpitV5` lead list fixed `w-72 lg:w-80` — leaves 87px for chat thread on 375px.
- `InstallerLanding` nav overflows on mobile — no hamburger.
- `useIsMobile` hook exists but **zero live cockpits use it**.
- `MobileBottomNav` component exists but only wired into dormant PremiumIndex.

**Accessibility top 5:**
1. Icon-only buttons (Phone, Mail, ArrowRight, X) have **0 `aria-label`s** across all live cockpits.
2. 303 occurrences of sub-12px text.
3. Focus rings missing on tab buttons and icon buttons.
4. Color contrast: `text-muted-foreground` on `bg-muted/50` for system-message pills is below AA.
5. Modals/sheets don't close on Escape (CustomerPortalV2 documents sheet, ConsultantCockpitV5 slide-out).

---

## 5. Agent Foundation — 0 of 10 agents fully wired

### 5a. Agent Reality Matrix

| # | Agent | Trigger Real? | Drain Real? | Handler Real? | Output Written? | User-Visible? | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | lead_intake | ✅ trigger on `leads INSERT` | ✅ | ⚠️ Ignores AI-extracted data, re-derives with hardcoded arithmetic, hardcodes `extraction_confidence: "medium"` | ✅ `lead_intake` + touchpoints + activity_logs + leads.score | ✅ | **PARTIAL** |
| 2 | survey_scheduler | ✅ trigger on `intake_complete` | ✅ | ⚠️ Picks first available installer (no skills/route/blackout), books today+5d @ 10am for everyone | ✅ `site_surveys` + touchpoint + stage bump | ✅ | **PARTIAL** |
| 3 | proposal_drafter | ✅ trigger on `survey_complete` | ✅ | ⚠️ Hardcoded `panel_model: "Longi Hi-MO 6 435W"`, `inverter_model: "SolarEdge SE5K"`; grant formula `min(1800, min(kW,2)*900)` is wrong vs SEAI schedule | ✅ proposals(draft) + lead_intake.finalized_* + consultant notification + touchpoint | ✅ | **PARTIAL** |
| 4 | follow_up | ⚠️ Single fire on `proposal_sent`; daily sweep **never runs** (cron calls separate edge fn) | ✅ drain / ❌ cron | ❌ **Broken** — reads `threshold.days_threshold` but column is `threshold_days`. Produces NaN cutoff → no leads ever matched | Touchpoint row (manual only) | ❌ | **MOCK** (broken) |
| 5 | grant_submitter | ✅ trigger on `approved` | ✅ | ⚠️ Creates `seai_applications` row but no document checklist, no SEAI deadline tracking, no submission API | ✅ seai_applications + touchpoint | ⚠️ No missing-docs notification | **PARTIAL** |
| 6 | install_coordinator | ✅ trigger on `invoices.deposit_paid` | ✅ | ⚠️ Picks first available installer, books today+28d @ 08:00 for everyone. No stock check, no PO, no T-7/T-1 reminders, no weather check | ✅ assignments + stage bump + touchpoint | ✅ | **PARTIAL** |
| 7 | post_install | ✅ trigger on `installed` | ✅ | ❌ **Mock** — no email sent, no warranty PDF, no review request. Writes touchpoint claiming "sent warranty docs" (a lie) | Touchpoint row (false) | ❌ | **MOCK** |
| 8 | customer_digest | ❌ **No trigger, no cron** — `agents.ts` claims "Monday 10:00" but no schedule enqueues it. Monday cron calls `send-notification-digest` (different code, internal-staff digest) | ✅ (manual only) | ⚠️ Writes touchpoints but sends no email | Touchpoint row only | ❌ | **MOCK** |
| 9 | stale_lead_escalator | ❌ **No trigger, no cron** — `agents.ts` claims "Daily 08:00" but no schedule enqueues it | ✅ (manual only) | ❌ **Broken** — same `days_threshold` vs `threshold_days` bug | Notification row (manual only) | ❌ | **MOCK** (broken) |
| 10 | payment_reminder | ❌ **No trigger, no cron for this agent** — `agents.ts` claims "Daily 09:30" but 09:30 cron calls `send-payment-reminder` (separate edge fn) | ✅ (manual only) | ⚠️ `agent-drain` handler writes touchpoint summaries but sends no email. Parallel `send-payment-reminder` edge fn sends Postmark email but doesn't write `touchpoints` or `agent_runs` | Two divergent code paths | ⚠️ Email sent (from edge fn) but unaudited | **MOCK** (handler) / **PARTIAL** (edge fn) |

**Summary:** 0 fully wired, 5 partial, 5 mock/broken.

### 5b. Runtime plumbing — genuinely production-grade

| Capability | Rating | Evidence |
|---|---|---|
| Queue population | ✅ Real | `enqueue_agent()` called by 3 triggers |
| Claim mechanism | ✅ Excellent | `FOR UPDATE SKIP LOCKED`, parameterized lock duration |
| Idempotency | ⚠️ Partial | DB UNIQUE indexes on proposals/seai_applications/site_surveys, but `touchpoints` has no UNIQUE constraint |
| DLQ | ✅ Real | Exponential backoff `2^attempts * 1min`, notification to admins on max_attempts |
| Stuck-job sweeper | ✅ Real | Every minute, releases locks older than 10 minutes |
| Concurrency | ⚠️ Weak | Single drain instance, sequential loop, 5 jobs × 10 agents = 50/min max |
| Retention | ✅ Real | `agent_runs` > 30 days deleted; failed queue rows > 7 days deleted |

### 5c. `agent-drain` function assessment

| Concern | Finding |
|---|---|
| LLM calls | **ZERO.** `rg "openrouter\|anthropic\|fetch\(.*chat/completions" supabase/functions/agent-drain` → no matches. All 10 handlers are deterministic JS. The "AI" in "AI-OS" is absent from the agent runtime. |
| Auth | Requires `Bearer ` prefix only — no role check (P0-2) |
| Cost tracking | **None.** No `cost_usd`/`model`/`tokens` columns on `agent_runs` |
| Timeout | **None.** If LLM call (when added) hangs, 300s lock expires → sweeper requeues → duplicate run |
| Parallelism | None — sequential `for` loops |
| `complete_agent_job`'s `p_outputs` parameter | Dead — accepted but discarded |

### 5d. Agent UI assessment

| Component | Verdict |
|---|---|
| `AgentFoundation.tsx` | **REAL DASHBOARD** — queries `agent_runs`/`agent_queue`, "Run now" button actually invokes `agent-drain` with JWT, shows last run/status/queue depth/outputs. Caveat: the `enabled` switch is **local state only** — no `agent_enabled` column on backend. |
| `AgentTraining.tsx` | **MOCK** — `DEFAULT_LEARNING` is hardcoded strings (`"Leads with MPRN convert 35% better"`). `handleSavePrompt` updates local state only. `handleTest` is `setTimeout(1200)`. No `agent_prompts` table exists. |
| `AIConfig.tsx` | **MOCK** — All state is `useState`. `handleSave` flips a boolean for 2s. `handleTest` is `setTimeout(1500)` + `apiKey.length > 10`. OpenRouter key writes to local state, nowhere else. "Stored encrypted in Supabase Vault" claim is false — no vault write occurs. |

### 5e. LLM integration — does not exist in agent layer

- LLM calls happen in **only 2 edge functions**: `extract-bill-data` (bill OCR) and `expert-chat` (landing-page chatbot). Both call `https://ai.gateway.lovable.dev/v1/chat/completions` (Lovable AI Gateway, **not OpenRouter**).
- Models hardcoded `google/gemini-2.5-flash`. No per-agent model selection.
- `rg "openrouter" supabase/functions/` → **0 matches**.
- No fallback, no retry, no cost tracking, no daily cap, no prompt versioning, no A/B testing.

### 5f. Top 10 agent issues to fix (ranked)

1. **No LLM in the agent layer.** Add an `llm.ts` shared module, wire OpenRouter, call from `handleProposalDrafter` and `handleFollowUp` at minimum.
2. **`AIConfig.tsx` and `AgentTraining.tsx` are 100% local-state mock.** Create `ai_config` table + vault for key, wire `handleSave` to real upsert, wire `handleTest` to `fetch('https://openrouter.ai/api/v1/models')`.
3. **`follow_up` and `stale_lead_escalator` broken by field-name mismatch.** `agent-drain/index.ts:351,377,500` reads `threshold.days_threshold` but column is `threshold_days`. Produces NaN cutoff → zero leads matched → agents appear to "succeed" but do nothing.
4. **Three cron-triggered agents never run.** `customer_digest`, `stale_lead_escalator`, `payment_reminder` have handlers but no cron schedule enqueues them. The 3 cron jobs call *separate* edge functions that do different things and don't write to `agent_runs`/`touchpoints`.
5. **`handlePostInstall` lies.** Writes touchpoint claiming "sent warranty docs" but sends nothing. Wire Postmark (already working in `send-payment-reminder` — extract to `_shared/email.ts`).
6. No authz on `agent-drain` (see P0-2).
7. No cost tracking or daily cap. Add `cost_usd`/`model`/`tokens` to `agent_runs`, create `agent_llm_costs` daily aggregate, pre-flight check in drain.
8. No `touchpoints` UNIQUE constraint. Add `CREATE UNIQUE INDEX touchpoints_one_per_agent_per_lead_per_day ON touchpoints(lead_id, agent_id, date_trunc('day', created_at))`.
9. Concurrency capped at 50 jobs/min, single-threaded. Add `Promise.all` parallelism or multiple drain instances.
10. `handleLeadIntake` ignores AI extraction. Re-derives `annualKwh = monthlyBill*12/0.35` and hardcodes `extraction_confidence: "medium"` instead of using the `extract-bill-data` result.

---

## 6. Bundle / Performance

**Build output (production):** 2335 modules transformed in 11.46s.

| Chunk | Size | gzip |
|---|---|---|
| `index-D24zVfra.js` (main) | 470 KB | 127 KB |
| `react-vendor` | 162 KB | 53 KB |
| `supabase` | 148 KB | 39 KB |
| `framer-motion` | 117 KB | 39 KB |
| `radix` | 95 KB | 33 KB |
| `lucide` | 41 KB | 8 KB |
| `SiteSurveyForm` (lazy) | 70 KB | 21 KB |
| `SystemSettingsV2` (lazy) | 27 KB | 6 KB |
| Other lazy chunks (14) | ~150 KB combined | ~45 KB |
| **Total** | **~1.5 MB** | **~430 KB** |

**Observations:**
- Code splitting is working (14 lazy chunks).
- Main bundle is 470 KB / 127 KB gzip — within reason for a Supabase + framer-motion + radix app.
- `SiteSurveyForm` is 70 KB — large for a single form. Could split the 7 steps.
- Removing 32k LOC of dead code will shrink `lucide` (icon imports from dead files) and may unlock additional tree-shaking.
- No image optimization pipeline. No `vite-plugin-imagemin` or similar.

---

## 7. Recommended Fix Plan — 6 Phases

### Phase 1 — Production blockers (1–2 days)
**Goal:** ship a deploy that doesn't leak PII or 404 on core flows.

1. **Security P0s:** new migration `20260719_rls_lockdown.sql` that drops and recreates policies for `leads` (all 4), `contracts` (INSERT), `assignments` (INSERT/UPDATE), `installation_checklists` (INSERT/UPDATE), `seai_documents` (SELECT/INSERT), `activity_logs` (INSERT), `notifications` (drop `WITH CHECK (true)`), `survey_photos` (SELECT/INSERT), `touchpoints` (drop open + add `assigned_consultant_id` column to leads).
2. `REVOKE EXECUTE ON FUNCTION anonymise_lead, enqueue_agent FROM authenticated`.
3. Add `requireRole(req, ['admin'])` to `agent-drain` manual-trigger path.
4. Lock down `seai-documents` storage bucket (mirror `survey-photos`).
5. Add `requireRole` to all 6 `send-*` email functions.
6. Add auth + rate limit to `expert-chat`.
7. Add `<ProtectedRoute roles={[...]}>` wrapper to `/owner`, `/consultant`, `/installer`, `/my-projects`.
8. **Fix the 3 dead terminal buttons:** `Send proposal`, `Mark job complete`, `Book survey`.
9. **Fix the 4 dead routes:** `/installer-v4` → `/installer`, `/customer-mobile` → `/my-projects`, `/agents` & `/analytics` → `setActiveView(...)`.
10. **Pass leadId on every cross-view navigation** (7 occurrences).
11. **Fix `index.html`** — title, description, og:image, load Inter font.

### Phase 2 — Vibe recovery (2–3 days)
**Goal:** make it feel like one product again.

1. Unify color palette — emerald as primary everywhere, blue only for AI, amber for installer.
2. Unify chat bubble color (customer = emerald on both sides).
3. Make `handleSendReply` optimistic (append to local touchpoints).
4. Add `transition-colors` / `transition-shadow` to interactive elements.
5. Add framer-motion stagger to list items in cockpits.
6. Add `ErrorBoundary` wrapper to all routes.
7. Add `EmptyState` to Owner Cockpit, Customer Portal, LeadFlow.
8. Add `Skeleton` loaders (component exists).
9. Unify border-radius (cards = `rounded-lg`, modals = `rounded-2xl`).
10. Add `shadow-sm` to Customer Portal cards.

### Phase 3 — Consultant restructure + conversation-first (3–4 days)
**Goal:** bring back the real chat; collapse 11 tabs to 6.

1. Build shared `src/lib/conversation.ts` with `buildConversation(lead)` extracted from CustomerPortalV2.
2. Port to `ConsultantCockpitV5.leadToMessages` — consultant sees the same rich thread as customer.
3. Add `actionLabel`/`actionIcon`/`actionData` to consultant `Message` interface; render inline action cards.
4. Add typing indicator on consultant side.
5. Add "Ask AI to summarize" button.
6. Render agent actions as rich cards (proposal thumbnail + cost + "View proposal →").
7. Collapse 11 consultant tabs → 6 (Inbox, Pipeline, Calendar, Products, Documents, Insights).
8. Build the missing Kanban Pipeline view.

### Phase 4 — Agent layer reality (3–5 days)
**Goal:** make the "AI-OS" pitch true.

1. Add `llm.ts` shared module in `supabase/functions/_shared/`.
2. Wire OpenRouter (read key from vault).
3. Add `cost_usd`, `model`, `prompt_tokens`, `completion_tokens` columns to `agent_runs`.
4. Create `agent_llm_costs` daily aggregate + pre-flight cap check.
5. Call LLM from `handleProposalDrafter` (draft narrative, finance options) and `handleFollowUp` (draft follow-up email).
6. Fix `days_threshold` vs `threshold_days` bug (2 handlers).
7. Replace 3 standalone digest edge functions with `agent-drain` invocations (so `customer_digest`, `stale_lead_escalator`, `payment_reminder` actually run on schedule).
8. Wire `handlePostInstall` to actually send Postmark email (extract `_shared/email.ts`).
9. Create `agent_prompts` table + version history. Wire `AgentTraining.tsx` to it.
10. Wire `AIConfig.tsx` to vault + `ai_config` table.

### Phase 5 — Dead code purge (1 day)
**Goal:** remove 32k LOC of dead weight.

5 atomic PRs (in order — see §2):
1. Pure dead-leaf deletion (zero-importer files: `PipelineView`, `CommunicationHub`, `PremiumBillUpload`, `InstallerIntelligenceBuilder`, `ProposalResults`, `PersistentAICoach`, `workflow/*`, `survey/CameraCapture`, `installer/InstallerBOM`, `lib/proposalTemplate.ts`, `hooks/useCountUp.ts`).
2. Legacy versioned components + dead pages.
3. Entire `dashboard/`, `landing/`, `ai-analyser/`, `workflow/` directories.
4. Remove dead `App.tsx` import of `PremiumIndex` (line 15); delete `PremiumIndex.tsx` + its exclusive deps.
5. Unused lib helpers (`customerPortal`, `estimate-engine`, `offlineSupport`, `pdfExport`, `proposalTemplate`, `grantCalculations`, `tenant`).
6. Run `bunx ts-prune` to catch unused shadcn primitives (~2,400 LOC more).

### Phase 6 — Mobile + a11y pass (2–3 days)
1. Add `useIsMobile` to all 4 cockpits.
2. Add mobile drawer/bottom-sheet for OwnerCockpit sidebar + ConsultantCockpitV5 lead list.
3. Add hamburger menu to `InstallerLanding` nav.
4. Add `aria-label` to every icon-only button.
5. Replace 303 occurrences of `text-[8px]`/`text-[9px]`/`text-[10px]` with `text-xs` minimum.
6. Add `focus-visible:ring-2` to every interactive element.
7. Add Escape key handler to all modals/sheets (or migrate to shadcn `<Dialog>`/`<Sheet>`).
8. Replace native `<select>` and `<input type="checkbox">` with shadcn equivalents.
9. Darken `--muted-foreground` for AA contrast on small text.

---

## 7. What's actually working well (credit where due)

- **Agent runtime kernel** — `claim_next_agent_job`, `fail_agent_job`, stuck-job sweeper, retention cron. Genuinely well-built.
- **v3 vault migration** — service-role keys removed from committed code, pg_cron now reads from vault.
- **Stripe/Coinbase webhook signatures** — mandatory verification, no JSON fallback.
- **CustomerPortalV2 conversation model** — `buildConversation(lead)` with 5 message types, typing indicator, suggested questions, action cards. This is the "real chat" the user wants — it just needs to be ported to the consultant side.
- **Code splitting** — 14 lazy chunks, main bundle 127 KB gzip.
- **LeadFlow 5-step pipeline** — visually polished, real `SiteSurveyForm` integration.
- **JobViewV2 tabbed checklist** — Overview/Pre-install/Roof/Electrical/Commissioning/Handover with toggles, named photos, signature pad. Solid installer UX.
- **GDPR consent banner** — properly implemented, cookie consent captured.
- **`seaiPipeline.ts`** — accurate SEAI grant calc + all Irish incentives (just not wired to the proposal_drafter agent).
- **`leadIntake.ts`** — single source of truth for pipeline stages, carry-over maps, calculateSystemEstimate. Clean.

---

## 8. Files referenced in this audit

**Typecheck errors:**
`src/components/{InstallerIntelligenceBuilder,OwnerCockpit,ProfessionalProducts,SystemSettingsV2,WorkflowOrchestrator}.tsx`, `src/components/installer/InstallerPortalV3.tsx`, `src/lib/dummyData.ts`

**Dead code (top offenders by LOC):**
`pages/AdminSettings.tsx` (1,054), `components/installer/MobileInstallerCompanion.tsx` (1,115), `components/PremiumDashboard.tsx` (1,170), `dashboard/ConsultantCalendar.tsx` (1,180), `components/installer/InstallationChecklist.tsx` (1,131), `pages/PremiumIndex.tsx` (786), `components/installer/JobView.tsx` (545), `components/OwnerBirdseye.tsx` (645), `components/installer/InstallerBOM.tsx` (686), `components/customer/CustomerMobilePortal.tsx` (686)

**Security (critical files):**
`supabase/migrations/20251008...sql` (leads RLS), `20260718_v3_security_fixes.sql` (anonymise_lead grant), `20260718_v3_agent_runtime.sql` (enqueue_agent grant), `20260718_agent_foundation.sql` (touchpoints open policy), `20251216a...sql` (seai-documents bucket), `supabase/functions/agent-drain/index.ts`, `supabase/functions/send-*/index.ts`, `supabase/functions/expert-chat/index.ts`, `src/App.tsx` (no ProtectedRoute)

**UX dead buttons:**
`src/components/LeadFlow.tsx:276,383`, `src/components/installer/JobViewV2.tsx:241,815`, `src/components/OwnerCockpit.tsx:455,456,644,794,797`, `src/components/ConsultantCockpitV5.tsx:132,232`, `src/components/customer/CustomerPortalV2.tsx:381,454`, `index.html:6-13`

**Agent foundation:**
`src/lib/agents.ts`, `src/components/{AgentFoundation,AgentTraining,AIConfig}.tsx`, `supabase/functions/agent-drain/index.ts`, `supabase/migrations/20260718_v3_agent_runtime.sql`, `supabase/migrations/20260718_v3_security_fixes.sql`

---

*End of deep audit. No files modified during this review.*
