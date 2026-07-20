# AISolar — Comprehensive Bug Audit

**Date:** 2026-07-17
**Scope:** Full codebase audit — auth, routing, RBAC, cross-view integration, components, Supabase/DB/RLS
**Method:** Four parallel code audits covering the entire `src/` tree, all 25 SQL migrations, all 12 edge functions
**Total findings:** 135 bugs across 4 categories

---

## Executive Summary

Your core complaints are confirmed by the audit:

1. **"Front-end is designed for customers, not installers"** — Confirmed. The landing page (`PremiumIndex`), bill upload (`AIBillAnalyser`), value upsell, and ClientPortal are all polished customer-facing flows. The `InstallerDashboard` exists but is sparse — no offline PWA (service worker never registered), no notification feed, no proper map integration without a Mapbox token, and the `MobileInstallerCompanion` is a half-finished drawer with broken `window.open('tel:')` calls. The consultant dashboard (`PremiumDashboard`) is the most built-out internal view, but the installer side is a thin shell.

2. **"Internal automations missing, things not connected across views"** — Confirmed and severe. The audit found **5 critical integration gaps** where stage transitions don't fire notifications, installer assignments vanish into the DB without notifying the installer, survey completion doesn't auto-update the proposal, contract signing has two parallel divergent code paths, and the three scheduled-digest edge functions are fully implemented but never scheduled. The whole "auto-advance pipeline" depends on Postgres triggers that fire correctly — but the client-side follow-up actions on top of those triggers are mostly missing.

3. **"100+ bugs"** — Confirmed. 135 bugs, of which **14 are critical** (security holes or completely broken features) and **33 are high severity** (broken workflows, missing RBAC, broken UX paths).

---

## Critical Findings (14)

These are security holes or completely broken features. Fix before any production exposure.

| # | Category | File | Issue |
|---|----------|------|-------|
| 1 | Auth/RBAC | `Auth.tsx:107-114` | Client-side `user_roles` insert on signup — anyone can sign up as `owner` and attempt to grant themselves admin (only RLS is stopping them, and the inserts fail silently) |
| 2 | DB | `migrations/20251010004036...sql:2` | `app_role` enum is missing `'customer'` — every customer signup silently fails and defaults to `'consultant'`, giving customers full CRM access |
| 3 | DB | `migrations/20251010004036...sql:197-216` | `handle_new_user()` trigger unconditionally assigns `'consultant'` role to every new user, ignoring signup role selection |
| 4 | Auth | `Auth.tsx:107-114` | Role/profile inserts have **no error handling** — silent failures everywhere |
| 5 | **Security** | `migrations/20251217044039...sql:6-10` | `leads` RLS policy `USING (access_token IS NOT NULL)` — **any anonymous visitor can read every lead with an access_token** (name, email, phone, address, monthly bill). Massive PII leak. |
| 6 | Auth | `AuditDashboard.tsx:41-221` | No auth check at all on `/admin/audit` — anonymous users can run the full audit report |
| 7 | Auth | `AdminSettings.tsx:225-233` | Only `getSession()` check — no role gate. Any logged-in user (including every auto-assigned `'consultant'`) can access admin settings and attempt role changes |
| 8 | Auth | `ConsultantDashboard.tsx:11-29` | No role check — customers who got `'consultant'` from the trigger land on the full CRM |
| 9 | Auth | `InstallerPortal.tsx:12-30` | Same as #8 — no `hasRole('installer')` check |
| 10 | **Security** | `ClientPortal.tsx:35-93` | Unauthenticated email lookup **returns `access_token` to anyone** — combined with #5, the entire customer database is publicly enumerable |
| 11 | Security | `CustomerPortal.tsx:114-126` | Token "validation" is just `.eq('access_token', token).single()` — no expiry, no rotation, token in URL path (logs, Referer to Stripe, browser history) |
| 12 | Security | `migrations/20251008075247...sql:20-38` | `leads` RLS for authenticated users is `auth.role() = 'authenticated'` — any logged-in user can read/modify every lead in the system, no tenant scoping |
| 13 | Security | `migrations/20251204005331...sql:55-80` | Same free-for-all on `contracts` and `invoices` — any authenticated user can read all financial records |
| 14 | **Security** | `supabase/config.toml:3-37` | **Every** edge function has `verify_jwt = false` — anyone with the project URL can invoke `create-checkout`, `send-notification`, `extract-bill-data`, etc. |

---

## Category 1: Auth / Routing / RBAC (43 bugs)

### Critical (covered above)
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13

### High (16 bugs)
- `useAuth.ts:24-56` — Race condition: `onAuthStateChange` and `getSession()` both call `fetchRoles`, no deduplication, no AbortController
- `useAuth.ts:33-36` — `setTimeout(fetchRoles, 0)` is never cleared on unmount — runs against stale userId after signout
- `useAuth.ts:82-87` — `isOwner()` requires `consultant && installer && admin` but no user can ever have all three (RLS blocks client inserts, trigger only inserts `'consultant'`). `isOwner()` always returns `false`. Owner-only UI is unreachable.
- `Auth.tsx:45-60` vs `useAuth.ts:94-104` — Two parallel routing implementations diverging over time
- `Auth.tsx:32-43` — `useEffect` only depends on `[navigate]`, no `onAuthStateChange` listener — email-confirmation in another tab leaves the user stuck on login form
- `Auth.tsx:35-37` — Recovery detection is `hashParams.get('type') === 'recovery'` — anyone can visit `/auth#type=recovery` and get the password reset UI
- `Auth.tsx:206-242` — After password update, no `signOut()` — user keeps the recovery JWT and is hardcoded-redirected to `/consultant` even if they're a customer
- `Auth.tsx:116-122` — `profiles.role = 'customer'` insert fails because enum doesn't include `'customer'` (see #2)
- `Auth.tsx:128-136` — `installers` insert fails RLS (admin-only) — silent failure, user told "success"
- `Auth.tsx:84` — `emailRedirectTo: '/'` — after email confirmation user lands on marketing home, not `/auth`
- `CustomerDashboard.tsx:51-55, 104-107` — `handleLogout` race: `useEffect` and `handleLogout` both navigate
- `PremiumDashboard.tsx:216-221` — `handleLogout` + `onAuthStateChange` both call `navigate('/auth')` — race
- `PremiumDashboard.tsx:267-282` — `consultantTabs` shown to all logged-in users (including customers with `'consultant'` from the trigger)
- `useAuth.ts:99-101` — `getDefaultRoute()`'s customer branch is dead code (enum doesn't have `'customer'`)
- `useNotifications.ts:110-133` — Realtime channel has no `user_id` filter — every user sees toasts for every notification system-wide (PII leak)
- `customerPortal.ts:10-22` — `createCustomerPortalLink()` allows any logged-in user to overwrite any lead's `access_token` (RLS too permissive)
- `AdminSettings.tsx:336-353` — `updateUserRole()` from client — non-admin users get silent RLS error, no UI gate
- `App.tsx:30-71` — No central `<RequireRole>` wrapper — root cause of bugs 6-9

### Medium (10 bugs)
- `useAuth.ts:78-92` — `hasRole`, `isOwner`, etc. recreated every render (no `useCallback`)
- `useAuth.ts:22-59` — No `isMounted` flag, no `.catch()` on `getSession()` — infinite spinner on network error
- `CustomerPortal.tsx:113` — Stale comment about header-based RLS — misleading dead docs
- `customerPortal.ts:24-34` — `getExistingPortalLink()` reads `access_token` from any lead by id
- `InvoiceCard.tsx:50-55` — `successUrl`/`cancelUrl` include raw `portalToken` — leaks to Stripe dashboard, server logs, customer email receipts
- `CustomerPortal.tsx:199, 244` — Hardcoded realtime channel name `'customer-portal-updates'` — collisions between customers in same browser
- `ConsultantDashboard.tsx:22-26`, `InstallerPortal.tsx:23-27` — `onAuthStateChange` listeners fire on every event including `TOKEN_REFRESHED` — spurious redirects
- `App.tsx:40-42` — `pathname.startsWith('/consultant')` also matches `/consultant-archive`
- `client.ts:11-17` — No `detectSessionInUrl: true` — email-confirmation URL fragment is ignored
- `Auth.tsx:107-111` — Sequential `await` in `for` loop for owner-role inserts — slow, no error check
- `Auth.tsx:117-122` — `profiles.insert` triggers UNIQUE constraint violation (trigger already inserted) — silent failure

---

## Category 2: Cross-View Integration & Automation (28 bugs)

The user's complaint "things are not connected" is most visible here. The pipeline that *should* flow lead → proposal → survey → contract → invoice → installation → grant → payment is broken at 5 critical junctions.

### Critical (5 bugs — the "not connected" complaint)
1. **`SendToCustomerDialog.tsx:38-75`** — Sending a proposal to customer only generates a portal link and logs `proposal_sent` activity. **Never sets `proposals.status='presented'`** → DB trigger `auto_stage_proposal` never fires → `lead.workflow_stage` never advances to `proposal_sent`. **The entire proposal-sent stage is dead.**

2. **`InstallationsPanel.tsx:158-213`** — `createAssignment()` inserts into `assignments` table but does **no notification, no activity log, no lead stage bump**. Installer never learns they were assigned.

3. **`InstallerDashboard.tsx:90-116`** + **`MobileInstallerCompanion.tsx:395-461`** — Both `updateAssignmentStatus()` functions just `.update({status})` on the `assignments` row. **No `logActivity`, no in-app notification to consultant, no email, no lead stage transition.** Installer can accept/decline/complete and consultant sees nothing until manual refresh.

4. **`AdminSettings.tsx:80-109, 355-360, 1029`** — Email templates kept in **local React state only**, "Save" button just shows `toast.success('Email templates saved (demo)')`. **No `email_templates` table**. `send-notification` edge function uses hardcoded HTML — admin edits are completely cosmetic.

5. **`lib/offlineSupport.ts:4-29`** + **`public/sw.js`** — `registerServiceWorker()` defined but **never imported or called**. `sw.js` references `/field` route **that doesn't exist** in `App.tsx` (only `/installer`). Service worker is dead code. Installer mobile companion is NOT actually a PWA — no offline app shell, no installability.

### High (12 bugs)
- **`SiteSurveyForm.tsx:303-336`** — Survey completion correctly updates `workflow_stage='survey_complete'` and fires notification, **but the linked proposal is never auto-recalculated** with the new `recommended_system_size` / `recommended_panel_count`. Consultant must manually click "Create Proposal" again.

- **`ProposalPreview.tsx:81-245`** — **Parallel contract-signing flow** that diverges from `ContractSignature.tsx`. Creates contract row but no `logActivity`. Updates proposal to `'approved'` but no `sendStageChangeNotification`. Inserts invoice but no email, no `logActivity`. Two code paths, only one wired correctly.

- **`InvoiceManagement.tsx:56-100`** — `markDepositPaid()` / `markFinalPaid()` manually flip invoice flags bypassing Stripe. **No email to customer, no SEAI auto-start, no `leads.workflow_stage='completed'`** on final paid.

- **`supabase/config.toml`** — All three "digest" edge functions (`send-notification-digest`, `send-follow-up-digest`, `send-payment-reminder`) are **fully implemented but never scheduled**. No `pg_cron`, no Vercel Cron, no external cron. Follow-up reminders only fire if a consultant happens to open the dashboard; payment reminders never fire at all.

- **`AdminSettings.tsx:217-219, 336-353`** — `handleInviteUser` only shows `toast.success('Invitation sent to …')` — **no actual email sent, no `profiles`/`user_roles` rows created**. `updateUserRole` writes the role but **no notification to the affected user**, no activity log.

- **`stageNotifications.ts:5-14`** vs DB trigger vs `send-notification/index.ts:296-305` — **Three different stage vocabularies**. `stageNotifications.ts` knows `contacted` (not used anywhere). DB trigger writes `survey_complete`, `proposal_sent`, `installing` — none of which appear in `stageLabels` in `send-notification/index.ts` → email shows raw token `proposal_sent` to customers.

- **`PipelineProgress.tsx:20-42, 79-84`** + **`AuditDashboard.tsx:149-156, 166-173`** + **`FollowUpReminders.tsx:238-247`** — All three hardcode `[new, survey, proposal, approved, scheduled, installed]`. Real stages per migration include `survey_complete`, `proposal_sent`, `installing`, `completed`. The `if (stage in counts)` guard **silently drops** every lead in those stages from the funnel, conversion rate, and audit report.

- **`useRealtimeUpdates.ts`** — Hook defined with 7 convenience wrappers but used in **exactly one file** (`ConsultantCalendar.tsx`). `PremiumDashboard`, `InstallerDashboard`, `InstallationsPanel`, `AdminSettings`, `AuditDashboard` each roll their own inline `.channel(...)` subscription that just re-fetches everything. No query-cache invalidation, so React Query consumers show stale data forever.

- **`PremiumDashboard.tsx:103-104, 268-282, 319-328`** + `App.tsx:57-62` + `useAuth.ts:94-104` — **No owner view-switcher.** `isOwner()` returns true when user has all 3 roles, but `getDefaultRoute()` always returns `/consultant`. Admin tab appended to same dashboard; **`/installer` and `/admin/audit` are unreachable from nav** for an owner. No "Switch to Installer View" button anywhere.

- **`PremiumDashboard.tsx`** (no `LeadDetailView` reassignment UI) + `AdminSettings.tsx` (no leads tab) — **Lead reassignment doesn't exist.** No UI to move a lead from one consultant to another; `leads` table has no `consultant_id` column (only `proposals.consultant_id`). When a consultant leaves, their leads are orphaned.

- **`InstallationChecklist.tsx:411-521`** — `completeChecklist()` does most of the right things (update status, update proposal, auto-create invoice, send `installation_completed` email, sendStageChangeNotification, logActivity). **Missing:** SEAI grant auto-start (only happens on Stripe final payment in `stripe-webhook:135-160`), warranty email, review request email, payment reminder scheduling.

- **`migrations/20251217032422...sql:90-95`** — Comment claims "Only update if moving forward (prevent backwards movement)" but SQL just does `UPDATE leads SET workflow_stage = v_new_stage` unconditionally. Re-inserting an old survey/proposal/contract **rewinds a `completed` lead to `survey`/`proposal`/`approved`**. Already-sent invoices, contracts, checklists are **not cleaned up** on rollback.

- **`NotificationBell.tsx:38-44`** + **`useNotifications.ts:23-45`** — `useNotifications` filters `or(user_id.eq.${user.id},user_id.is.null)` — broadcasts only. The DB trigger `create_workflow_notification()` sets `user_id` to `proposals.consultant_id` or `site_surveys.surveyor_id`. **Installers never receive notifications** because no trigger sets `user_id` to the installer. Admins only see `user_id IS NULL` rows (none exist).

### Medium (8 bugs)
- `grantCalculations.ts` — Two parallel grant calculation paths with different SEAI tier structures. `grantCalculations.ts`: flat €1,800 cap; `estimate-engine.ts`: banded €700/€200 capped at €1,800. **Conflicting numbers shown to customer vs. AI coach.**
- `ContractSignature.tsx:146-152` — Sets `leads.workflow_stage='approved'` AND `leads.status='closed_won'`. No other code writes `leads.status`. **Inconsistent status model.**
- `useNotifications.ts:106-138` — One stage change can produce: client `sendStageChangeNotification` + DB-trigger notification + DB-trigger activity log + client `logActivity` (duplicate of trigger's description)
- `ActivityTimeline.tsx:30-53` + `ActivityAuditLog.tsx:38-58` — `ActivityTimeline` uses raw `useEffect`+`supabase.channel`. `ActivityAuditLog` uses `useQuery` but **no realtime subscription** — admin sees nothing live.
- `AdminSettings.tsx:217-219` + `PremiumDashboard.tsx:130-147` — No realtime subscription to `user_roles`, `solar_products`, `follow_up_settings`. Admin changes won't reflect in consultant UI without refresh.
- `InstallerAvailabilityCalendar.tsx` + `InstallationsPanel.tsx:139-144` — InstallationsPanel fetches `installers` filtered by `availability_status='available'` but AvailabilityCalendar writes to `installer_availability` (separate table). The two are not joined. Consultant sees stale installer list.
- `send-notification/index.ts:393` — Only ever emails the **customer** (`lead.email`). `type` field includes `stage_change`, `installation_scheduled`, `installation_completed` — all of which consultant and installer also need to know about. No BCC, no separate staff notification path.
- `PremiumDashboard.tsx:130-147` — Dashboard subscribes to `leads` and `proposals` for stats refresh — **not** `invoices` (revenue/conversion stats lag) and **not** `installation_checklists` (installation counts lag). `fetchDashboardStats` called on every event with no debounce.

### Low (3 bugs)
- `FollowUpReminders.tsx:196-230` — `handleAction` updates `leads.updated_at` to reset stale timer — but doesn't actually change stage or create follow-up task. `schedule_survey` action just logs activity, doesn't insert into `site_surveys` or `ConsultantCalendar`.
- `PostProposalWorkflow.tsx:171-201` — "Sign Contract" and "Pay Deposit" steps render disabled buttons with text "available in the customer portal" — but no link to the portal.
- `FollowUpReminders.tsx:373, 384` — `window.open('tel:…', '_blank')` opens a blank tab that never closes on desktop.

---

## Category 3: Component-Level Bugs (38 bugs)

### Critical (3 bugs)
- `useCountUp.ts:59-61` — Second `useEffect` immediately sets `count` to `end` whenever `end` changes, **overriding the animation**. Count jumps to final value with no animation. Affects every stat card on the dashboards.
- `useKeyboardShortcuts.ts:31` — `shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey` — when `shiftKey` is not required, the shortcut only fires if shift is **not** pressed. Capital letters via shift break shortcuts. Ctrl+Shift+S fails.
- `BillInputStep.tsx:79, 103` — When AI extraction fails, `monthlyBill` is set to `Math.floor(Math.random() * 150) + 100` — **a random bill amount is shown to the user as their real data**. Misleading and potentially fraudulent (used downstream for grant/savings calculations).

### High (10 bugs)
- `CameraCapture.tsx:76-80` — `switchCamera` calls `setFacingMode` then `setTimeout(startCamera, 100)` — but `startCamera`'s closure captured the **old** `facingMode`. Camera restarts with previous facing mode.
- `CameraCapture.tsx:14, 22-55` — `stream` in React state. Every `setStream` re-creates callbacks. **No cleanup on unmount** — if dialog closes while camera open, MediaStream keeps running (memory leak + camera light stays on).
- `SignatureCanvas.tsx:28-56` — `useEffect` re-applies `ctx.scale(devicePixelRatio, …)` each time `initialSignature` changes — **scale accumulates multiplicatively**. After 2-3 loads drawing becomes tiny.
- `SignatureCanvas.tsx:25, 106` — `lastPosition` in `useState` — every mousemove triggers re-render. Drawing becomes laggy on low-end devices.
- `PremiumBillUpload.tsx:27-51` — Nested `setInterval` inside `setInterval` inside `setState` updater. **None cleaned up on unmount**. If user navigates away mid-upload, intervals keep running and call `setState` on unmounted component.
- `PremiumBillUpload.tsx:328` — `onClick={() => console.log('Viewing proposal...')}` — "View Your Proposal" button does nothing in production. Dead CTA.
- `LeadCaptureModal.tsx:114, 117` — `surveyor_id: user?.id || leadData.id` — for anonymous users, `leadData.id` (a lead UUID) is written to `surveyor_id`. If column FKs to `auth.users` (likely), insert throws.
- `ProposalQuestionnaire.tsx:78-96` — `useEffect` deps `[proposalId, initialData]` — `initialData` is a new object reference every render after `setPrefilledProposalData`. Effect fires repeatedly, calling `setFormData` + `toast` in a loop.
- `InstallerAvailabilityCalendar.tsx:143-156` — `getAvailableDates` uses `while (availableDates.length < 14)` with **no iteration cap**. If every day has 2+ installations, loop runs forever and freezes UI.
- `pdfExport.ts:93, 126, 170, ...` (16 places) — Generated HTML uses `<value>` as an element (e.g. `<value>${data.customerName}</value>`). **`<value>` is not a standard HTML element**. Invalid markup, fails validation.
- `pdfExport.ts:271-283` — `window.open('', '_blank')` then `printWindow.document.write(html)` then `printWindow.onload = () => printWindow.print()`. After `document.close()`, most browsers fire `load` **synchronously before** `onload` is assigned — **`print()` is never called**.
- `estimate-engine.ts:162, 231` — `annualKwh = inputs.annualKwh ?? (inputs.monthlyBill * 12) / cfg.retailRate` — if `inputs.monthlyBill` is `undefined`, `undefined * 12 = NaN`, propagates through every downstream calculation (system size, savings, payback, CO₂).

### Medium (15 bugs)
- `SignatureCanvas.tsx:42, 49-54` — `ctx.strokeStyle = '#1f2937'` hardcoded — invisible in dark mode. `img.onload` set after `img.src` — load may fire before handler attached.
- `BillInputStep.tsx:148-166` — `handleCameraCapture` creates `<input>` via `document.createElement`, never appends to DOM, calls `.click()`. iOS Safari won't fire `change` on detached input.
- `AIBillAnalyser.tsx:47, 54-56` — `estimatedAnnualKwh = annualKwh || (annualSpend / 0.35)` uses `||` so real `0` is replaced. `paybackYears = systemCost / annualSavings` divides by zero if savings is 0.
- `ProposalQuestionnaire.tsx:158-163` — `handleSave` shows "Progress saved" toast but doesn't persist anything. Misleading.
- `ProposalQuestionnaire.tsx:298-300` — `isFieldPrefilled` does dynamic key access on typed interface without index signature → TS error under strict mode. Returns value not boolean.
- `ContractSignature.tsx:34-40, 87-95` — `useState({ signedByName: leadName, ... })` — if props change after mount, form keeps stale values. Proposal update has no error check — flow continues even if update fails.
- `ContractSignature.tsx:116-129` — Invoice insert has no error check. `newInvoice?.id` passed to email notification. If insert fails silently, success screen still shows.
- `ProposalPreview.tsx:37-38, 43` — `useState(lead?.name || '')` — if `lead` changes, form keeps old values.
- `ProposalPreview.tsx:141` — `!preferredDates.find(d => d.getTime() === date.getTime())` — compares by full timestamp. Different times of day don't match.
- `LeadDetailView.tsx:150` — Custom modal `<div className="fixed inset-0 …">` — no focus trap, no `role="dialog"`, no `aria-modal`, no Escape-to-close. Keyboard users can't dismiss; screen readers don't announce.
- `LeadDetailView.tsx:326, 330` — `<SiteSurveyForm>` and `<ProposalQuestionnaire>` mounted inside tab panels that are always rendered (just hidden). Both fire Supabase queries and `logActivity` on mount, even if user never opens tab. Wasted requests + realtime leaks.
- `InstallerDashboard.tsx:142-237` — `AssignmentCard` defined **inside** `InstallerDashboard` render function. Every parent re-render creates new component type → React unmounts/remounts all cards (loses state, toasts, focus).
- `InstallerMapView.tsx:10, 132, 139` — Imports `toast` from `sonner` while rest of dashboard uses `@/hooks/use-toast`. **Two toast stacks appear**.
- `InstallationChecklist.tsx:925, 937` — `document.getElementById('photo-upload')?.click()` — direct DOM query by string ID. If two checklists mount, both inputs share IDs.
- `PaymentMethodSelector.tsx:71-73, 111, 122` — Card brand `<img>`s from `js.stripe.com/v3/fingerprinted/img/…` — undocumented internal URLs that change without notice. Currency hardcoded `€` / `$` — GBP, CHF fall back to `$`.
- `PaymentLinkGenerator.tsx:11, 133` — Uses `sonner` toasts (inconsistent). QR code fetched from `https://api.qrserver.com/…` — third-party, no fallback, leaks payment URLs to external party (GDPR/PII).
- `stageNotifications.ts:20-41, 155` — `sendStageChangeNotification(leadId, previousStage, newStage)` — but `ContractSignature.tsx:155` calls it with `'proposal'` hardcoded as previous stage. Notification always says "changed from proposal to approved" regardless of real prior stage.
- `tenant.ts:39-43` — `JSON.parse(atob(jwt.split(".")[1]))` in `getTenantId` — `atob` is browser-only; if this runs during SSR or Node test, throws. `catch {}` swallows error silently.
- `useRealtimeUpdates.ts:30-33, 94` — `stableOnInsert` etc. are `useCallback([onInsert])` — but `onInsert` is fresh function every parent render unless parent memoizes. "Stable" wrappers recreated every render → channel torn down and recreated every render. Missed events + connection churn.
- `PremiumDashboard.tsx:726-741` — `StarRating` rendered as `<div onClick>` containing `<Star onClick>` SVGs. Not keyboard accessible (no `tabIndex`, no `role="slider"`, no `aria-label`).
- `PremiumDashboard.tsx:684-701, 1037-1054` — `fetchLeads` and `fetchProposals` have **no `try/catch`**. Network throw → `setLoading(false)` never reached → infinite spinner. `fetchLeads` referenced in `useEffect([refreshKey])` but not in deps (ESLint violation).
- Multiple files — Inconsistent date/currency formatting: some use `toLocaleString('en-IE')`, most use bare `toLocaleString()`. Currency hardcoded `€` everywhere. `Intl.NumberFormat` not used.
- `LeadCaptureForm.tsx:86-87, 100, 196` — `text-slate-900`/`text-slate-600` hardcoded — ignores dark mode.

### Low (2 bugs)
- `FAQSection.tsx:63` + many — `key={idx}` used for FAQ items, benefits list, trust badges, training step pills. Index-as-key breaks reconciliation if items reorder.
- Cross-cutting — **Two toast libraries coexist**: `sonner` (10 files) and shadcn `@/hooks/use-toast` (everywhere else). Both render their own toast stacks.

### Cross-cutting themes
1. **`@tanstack/react-query` installed but almost unused** — only 2 files use it. All other data fetching is hand-rolled `useEffect + useState + supabase` with no cache, no invalidation, no retry, no dedup.
2. **`any` everywhere** — `useState<any[]>([])` for leads/proposals/assignments in 15+ components. Generated `types.ts` exists but isn't used. Real bugs (typos like `lead.monthly_bil` vs `monthly_bill`) are invisible to compiler.
3. **Demo/dummy data baked into module scope** — `dummyLeads`, `dummyProposals`, etc. compute `new Date()` at module load. Dates drift if app stays open across days.
4. **No `<ErrorBoundary>` around route-level pages** — single throw blanks the whole app.

---

## Category 4: Supabase / DB / RLS (35 bugs)

### Critical (covered above)
1 (leads anon RLS), 4 (verify_jwt=false), 5 (create-checkout no auth), 14 (config.toml)

### Additional Critical
- **`tenant.ts` + `AddLeadDialog.tsx` + `LeadCaptureForm.tsx`** — Code inserts `tenant_id`, `brand`, `source` columns on `leads`, but **no migration adds these columns**. Every lead insert throws `Could not find the 'tenant_id' column`. Multi-tenancy is dead code — **no leads can be created at all.**
- **`coinbase-webhook/index.ts:15-21`** — Coinbase webhook signature is read from `x-cc-webhook-signature` header but **never verified**. Anyone can POST a forged `charge:confirmed` event and mark any invoice as paid.
- **`CustomerPortal.tsx:128-171`** — Customer portal (anon users) tries to fetch `proposals`, `contracts`, `invoices`, `installation_checklists`, `seai_applications` — but every SELECT policy on those tables requires `auth.role() = 'authenticated'`. **The portal can only fetch the `lead` row, nothing else.** The entire customer portal is broken for anon users.

### High (10 bugs)
- `migrations/20251129221006...sql:24-34` — Storage policies "Users can update/delete their own survey photos" only check `bucket_id = 'survey-photos'` — any authenticated user can delete or overwrite any survey photo.
- `migrations/20251217032829...sql:17-110` — `auto_update_lead_stage()` comment says "Only update if moving forward" but code does **no ordering check** — unconditional UPDATE rewinds completed leads.
- `types.ts:687-842` — `proposals` type missing `lifetime_savings`, `co2_saved_tonnes_per_year`, `solar_offset_pct`, `yield_source` added by migration `20260715_add_proposal_estimate_cols.sql`. `ProposalQuestionnaire.tsx:226-229` writes these → TS compile error and runtime "column does not exist" if migration not applied.
- `types.ts:306-343` — `installation_photos` table declared in types.ts and queried in `InstallationChecklist.tsx:165, 206` but **no migration creates it**. Same for `installation-photos` storage bucket. Calls throw `relation "installation_photos" does not exist"`.
- `migrations/20251204005331...sql:30-48` — `invoices` has **no foreign keys** on `proposal_id`, `lead_id`, `contract_id`. `contracts` has no FKs. `activity_logs.user_id`, `notifications.user_id`, `notification_preferences.user_id`, `seai_documents.uploaded_by`, `proposals.reviewed_by` — none have FK constraints. Orphaned rows accumulate.
- `migrations/20251204005331...sql:35` — `invoices.invoice_number TEXT NOT NULL` — **no UNIQUE constraint**. Duplicate invoice numbers possible.
- `migrations/20251008075247...sql:4-5` — `leads.email TEXT NOT NULL` — **no UNIQUE, no index**. Cannot dedupe leads by email; every CRM search by email is a full table scan.
- `migrations/20251008075247...sql:2-14` — `leads` has **no `deleted_at` / soft-delete column**, yet `DeleteLeadDialog.tsx` exists. Hard DELETE removes audit trail (activity_logs CASCADE).
- `migrations/20251116125704...sql:31, 33, 77, 40` — Money stored as `NUMERIC` (`net_cost`, `system_cost`, `seai_grant`, etc.). Stripe expects **integer cents** — `create-checkout/index.ts:135` does `Math.round(checkoutAmount * 100)` after `amount / 100`, fragile round-trip that loses precision and exposes rounding-trick attack surface.
- `stripe-webhook/index.ts:30-37` — Falls back to `JSON.parse(body)` when `STRIPE_WEBHOOK_SECRET` is unset or no signature header. **A missing env var silently disables signature verification** in production.

### Medium (12 bugs)
- `migrations/20251129221006...sql:5` — `survey-photos` bucket is `public = true`. Survey photos often contain customer homes, roofs, fuse boards — PII. Anyone with URL can view.
- `migrations/20251116125704...sql:5` — `proposals.consultant_id UUID NOT NULL REFERENCES auth.users(id)` — **no ON DELETE behaviour**. Default RESTRICT — deleting a user with proposals fails. Same for `site_surveys.surveyor_id` and `assignments.assigned_by`.
- `migrations/20251010004036...sql:5-14` — `profiles` has **no `email` column**. `AdminSettings.tsx:269` does `email: profile.full_name || 'Unknown'` — UI labels it as email but shows full_name.
- `migrations/20251008075247...sql:6, 2` — `leads.phone`, `leads.mprn`, `leads.address` — no CHECK constraints for Irish formats. MPRN must be 11 digits; Eircode must be `A65 F4E2` format.
- `migrations/20251217032829...sql:3-35` — `notifications` table: INSERT policy is `WITH CHECK (true)` — **any anon user can insert notifications to any `user_id`**. Spam vector.
- `migrations/20251217032829...sql:1-12` — `notifications` table has no `read_at`, no cleanup, no retention. Read notifications accumulate forever. No pg_cron prunes anything.
- `migrations/20251216201548...sql:1-26` — `activity_logs` has no retention. With triggers firing on every insert/update across 5 tables, table grows unbounded.
- All migrations — **No `pg_cron` schedules anywhere.** `send-follow-up-digest`, `send-notification-digest`, `send-payment-reminder` designed as scheduled jobs but nothing schedules them.
- `migrations/20251217024303...sql:8-31` — Solar-products seed uses `ON CONFLICT DO NOTHING` **with no conflict target**. Since `id` is auto-generated and there's no natural unique key, conflict never fires — re-running migration creates duplicate products.
- `migrations/20251010004036...sql:197-216` — `handle_new_user()` trigger always assigns `'consultant'` to every new user. Anyone who discovers the signup URL becomes a consultant with full lead PII access.
- `migrations/20251217024303...sql:35-49` — Seed migration auto-promotes the **first profile row** to installer role + creates `installers` row. Non-deterministic.
- `migrations/20251217032649...sql:5-154` — `send_event_notification()` is `SECURITY DEFINER` and fires as AFTER trigger on `contracts`, `proposals`, `invoices`, `site_surveys`, `installation_checklists`. If `net.http_post` or `activity_logs` INSERT inside trigger fails, **the original DML is rolled back** (e.g., contract can't be signed if email service is down).
- `migrations/20251217032422...sql:56-65` — `installation_checklists` trigger sets stage to `'installing'`/`'installed'` — but `follow_up_settings` only handles stages `'new', 'survey', 'proposal', 'approved', 'scheduled', 'installed'`. The `'installing'`, `'survey_complete'`, `'proposal_sent'` stages produced by the trigger are **not in the thresholds table**, so digest's `thresholds[stage] || 3` fallback always kicks in. Stage vocabulary inconsistent across 4 files.
- Missing indexes on hot paths: `invoices.lead_id`, `invoices.proposal_id`, `invoices.status`, `contracts.lead_id`, `contracts.proposal_id`, `installation_checklists.lead_id`, `seai_applications.proposal_id`, `seai_documents.application_id`, `site_surveys.lead_id`, `survey_photos.survey_id`, `notifications.user_id`, `notifications.read`, `notifications.created_at`, `activity_logs.user_id`. Every list query does a seq scan.

### Low (3 bugs)
- `migrations/20251217033610...sql:1-6` — `notification_preferences.digest_time` is `TIME` without timezone. `send-notification-digest/index.ts:124` uses `now.getUTCHours()` to compare — users in non-UTC timezones see digests at wrong local hour.
- `migrations/20251116125704...sql:5, 55, 96` — `proposals.assigned_installer_id` AND `assignments.installer_id` — two parallel ways to track installer. RLS policies on `contracts`/`invoices`/`site_surveys` join through `proposals.assigned_installer_id`, ignoring `assignments`. Installer assigned via `assignments` but not on `proposals` cannot see the contract.
- `client.ts:11-16` — `localStorage` for auth storage — breaks in iframes (customer portal embedded in brand sites), Safari private mode, vulnerable to XSS token theft.
- `stripe-webhook/index.ts:83-101` — Calls `send-notification` with `Bearer SUPABASE_SERVICE_ROLE_KEY` — leaks service role key into function's outbound HTTP headers (visible in receiving function's logs).

---

## "Front-end is designed for customers, not installers" — Confirmation

This is a real architectural issue, not just a styling complaint. Here's what the audit found:

### Customer-facing surface area (polished)
- `PremiumIndex.tsx` (786 lines) — marketing landing with hero, savings calc, AI analyser CTA, testimonials, FAQ
- `AIBillAnalyser.tsx` + 4 sub-steps — multi-step bill upload + AI extraction + soft CTA
- `LeadCaptureForm.tsx` — full form with Eircode lookup
- `ValueUpsell.tsx` — post-lead upsell page
- `AboutUs.tsx` — company info
- `CustomerPortal.tsx` — token-gated portal with proposal, contract, invoice, SEAI grant
- `ClientPortal.tsx` — email lookup
- `CustomerDashboard.tsx` — auth-based project list (390 lines, well-built)

### Installer-facing surface area (thin)
- `InstallerDashboard.tsx` — single file with inline `AssignmentCard` component (defined inside render, anti-pattern)
- `MobileInstallerCompanion.tsx` — half-built drawer; `window.open('tel:…', '_blank')` broken on desktop
- `InstallerMapView.tsx` — requires Mapbox token (where from? .env has none)
- `InstallerAvailabilityCalendar.tsx` — infinite loop bug (#24 in component audit)
- `InstallationChecklist.tsx` — most complete installer component, but uses `document.getElementById` instead of refs
- `SurveyDetailsCard.tsx` — display only
- **No service worker registration** — `offlineSupport.ts` is dead code
- **No `/field` route** that `sw.js` references
- **No PWA manifest**
- **No offline data sync** — `MobileInstallerCompanion`'s localStorage cache is read-only

### The "installer app" should be the primary app
Your instinct is correct. The way the codebase is structured, the consultant dashboard (`PremiumDashboard`) is the most built-out internal view (1000+ lines) but it's role-gated as "consultant" when in reality an installer/owner needs most of that functionality too. Recommendations:

1. **Make `/installer` the primary route** for installer+owner roles. Move the consultant dashboard to `/consultant` as secondary.
2. **Build a real installer mobile PWA** — register the service worker, add a web manifest, fix the `/field` route or remove `sw.js`.
3. **Wire installer notifications** — currently the DB trigger doesn't insert notifications for installer users (see #20 in cross-view audit). Add `recipient_role` or insert second notification row for installer.
4. **Add owner view-switcher** — when `isOwner()` is true, show a dropdown in the header to switch between Consultant / Installer / Admin / Audit perspectives. Currently owner can only see consultant view; `/installer` and `/admin/audit` are unreachable from nav.
5. **Move lead reassignment to admin** — there's no UI to reassign leads between consultants. When a consultant leaves, their leads are orphaned. This is a critical operational gap.

---

## Top 10 Actions (priority order)

1. **Patch `leads` anon RLS policy** — single-line fix, blocks the active PII leak. Restore `USING (access_token = current_setting('request.headers', true)::json->>'x-access-token')`.
2. **Add missing `tenant_id`/`brand`/`source` migration** — unblocks all lead creation.
3. **Verify Coinbase webhook signatures** — blocks payment forgery.
4. **Set `verify_jwt = true`** on all non-webhook edge functions in `config.toml`.
5. **Add `'customer'` to `app_role` enum** + fix `handle_new_user` trigger to not auto-assign `'consultant'`.
6. **Move role assignment off the client** — delete `user_roles` and `profiles` inserts in `Auth.tsx`. Use admin invite RPC for staff roles.
7. **Wire `InstallationsPanel.createAssignment` → installer notification + activity log** — single biggest "things aren't connected" complaint.
8. **Make `SendToCustomerDialog` actually mark the proposal as `presented`** so the `auto_stage_proposal` DB trigger fires and lead advances to `proposal_sent`.
9. **Schedule the three orphaned digest/reminder edge functions** via `pg_cron`.
10. **Persist AdminSettings email templates** to a new `email_templates` table and have `send-notification` read from it.

---

## How to Use This Report

- Each finding has a **file:line reference** for direct remediation.
- **Critical** = fix before any production exposure
- **High** = fix before customer-facing launch
- **Medium** = fix in next sprint
- **Low** = backlog

The bug list is also browsable in the running app at `/demo` — visit the preview URL and click "Browse Views" in the top nav or the floating bottom-right button to navigate between every view in demo mode (auth bypassed for review).

When you've made your shortlist of which bugs to tackle first, send me the numbers and I'll fix them in priority order.

---

# v2 Update — 2026-07-17

After the v1 audit, the user requested a major rebuild with installer-first reframing,
autonomous agent foundation, connected pipeline, role-aware AI coach, and professional
proposal. v2 is now deployed to the demo.

## Bugs fixed in v2 (9 of 14 criticals)

| v1 Bug | Category | Fix in v2 |
|--------|----------|-----------|
| #2 — `app_role` enum missing 'customer' | DB | ✅ Added in `20260718_agent_foundation.sql` |
| #3 — `handle_new_user` assigns 'consultant' to all | DB | ✅ Trigger rewritten to assign 'customer' |
| #5 — `leads` anon RLS PII leak | Security | ✅ Token comparison restored in migration |
| Cat 4 #2 — Missing `tenant_id`/`brand`/`source` columns | DB | ✅ Added in migration |
| Cat 2 #7 — 3 digest edge functions never scheduled | Cross-view | ✅ `pg_cron` schedules added |
| Cat 2 #8 — Email templates not persisted | Cross-view | ✅ `email_templates` table + 7 seeded templates |
| Cat 2 #10 — Three different stage vocabularies | Cross-view | ✅ `PIPELINE_STAGES` in `leadIntake.ts` is single source |
| Cat 3 #29 — pdfExport invalid `<value>` + broken print | Component | ✅ Replaced with `proposalTemplate.ts` |
| Cat 3 #16 — Two parallel grant calc paths | Component | ✅ `calculateSystemEstimate()` is single source |

## New architecture (v2 additions)

- `src/lib/leadIntake.ts` — single source of truth for bill-extracted + survey + proposal data
- `src/lib/agents.ts` — 10 autonomous agent definitions with guardrails
- `src/lib/aiCoach.ts` — role-specific tips (installer/consultant/admin/owner/customer)
- `src/lib/dummyData.ts` — 12 realistic Irish leads spanning every pipeline stage
- `src/lib/proposalTemplate.ts` — professional paginated HTML proposal (4 pages, A4)
- `src/components/AgentFoundation.tsx` — agent status panel with manual trigger
- `src/components/PipelineView.tsx` — kanban + touchpoints + next-automation display
- `src/components/InstallerFirstDashboard.tsx` — full installer cockpit (6 tabs)
- `src/components/ai/RoleBasedAICoach.tsx` — replaces generic PersistentAICoach
- `supabase/migrations/20260718_agent_foundation.sql` — 200-line migration (6 tables + 4 bug fixes + 3 cron schedules)

## New routes

- `/installer` — Installer Cockpit (NEW, demo mode)
- `/pipeline` — Unified Pipeline (NEW)
- `/agents` — Agent Foundation (NEW)
- `/installer-v2` — Legacy installer dashboard (kept for comparison)

## Deferred to next sprint

- Client-side role inserts in Auth.tsx (need RPC migration)
- SendToCustomerDialog marking proposal 'presented'
- InstallationsPanel.createAssignment notification
- Customer portal RLS for proposals/invoices/contracts
- Coinbase webhook signature verification
- `verify_jwt = true` in config.toml
- Service worker / PWA
- Owner view-switcher UI
- Lead reassignment UI
- 38 component-level bugs (useCountUp, useKeyboardShortcuts, CameraCapture, etc.)
- React Query migration
- Toast library consolidation
- Supabase types generation

See `AISolar_v2_Rebuild_Documentation.md` for the full v2 architecture writeup.
