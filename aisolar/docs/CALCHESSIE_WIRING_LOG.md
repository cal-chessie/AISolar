# AISolar → calchessie — the Full-Wiring Log
### Running notes for the "full wiring before live" build (Cal, 31 Jul 2026). Great notes = Sweep-8 discipline.

> **Purpose.** AISolar's workbench was a beautiful front-end running 100% on `generateDummyLeads()`,
> never connected to a DB. Cal chose **full wiring before live** (no demo shortcuts): every surface
> reads and writes **real calchessie data**, so when Saunderson logs in he sees *his* leads, and an
> install produces a real, attested record. This log tracks what's wired, what broke, and what's left.

---

## §1 · Architecture — feed the real data through the existing UI
- **Read**: `src/lib/realLeads.ts` — `useLeads()` / `useLead(id)` fetch a lead + children
  (`site_surveys`, `proposals`, `contracts`, `invoices`, `assignments`, `notifications`→touchpoints),
  RLS-scoped, and **assemble the exact `DummyLead` shape** the UI already consumes. No UI rewrite.
  PostgREST FK-embedding was unavailable (`leads`→`contracts` has no declared FK), so we fetch each
  child table by `lead_id IN (…)` and group in JS. Single-lead views use loader+inner wrappers.
- **Write**: `src/lib/leadWrites.ts` — `createLead`, `updateLead`, `advanceLeadStage`, `addTouchpoint`,
  `getCurrentTenantId`. `leads.tenant_id` is NOT NULL (no default) → stamped from the user's profile.
  An insert is auto-routed by the `route-lead-on-insert` trigger (→ `kernel.transfer_lead`) and
  `kernel_bridge` — the UI just creates the lead. `access_token` = 64-char hex for the customer link.
- **Demo mode** still returns `generateDummyLeads()` (dev + explicit opt-in) for sales demos; prod is real.

## §2 · Read path — DONE (13 staff components) ✅
`ConsultantCockpitV5 · OwnerCockpit · InstallerPortalV5 · JobViewV2 · LeadFlow · AnalyticsDashboard ·
CeoWindow · InsightsView · RealCalendar · FinanceWindow · CustomerIntelligenceProfile · AgentFoundation ·
ComplianceCommand`. All swapped off `generateDummyLeads()`. **tsc 0 · console 0**. Browser-verified:
consultant shows real €22k / 23 leads; installer honestly shows "no install scheduled."
- `SiteSurveyForm` still calls `generateDummyLeads()` but only inside `isDemoMode()` blocks — correct, left as-is.

## §3 · Write path — in progress
- ✅ **Consultant**: add → `createLead` · edit → `updateLead` · drag-to-advance → `advanceLeadStage` ·
  reply → `addTouchpoint`. `createLead` verified end-to-end (23→24→23, tenant stamped, 64-char token,
  auto-routed). Removed the fake "customer types back" simulation (truth-pass).
- ⏳ **Installer completion (JobViewV2)** — serials (triple-check) → `installed_equipment` /
  `installation_checklists`; sign-off → the attested record; photos → storage. *The heart of the proof.*
  Cal: keep the triple-check **apparent**, make it **smooth**.
- ⏳ **LeadFlow**: survey save → `site_surveys`; proposal draft/send → `proposals`.
- ⏳ **Payment**: deposit/checkout → Stripe (needs Cal's Stripe config).

## §4 · Bug & broken-logic ledger (find while wiring; fix-in-place or log)
| # | where | issue | status |
|---|-------|-------|--------|
| B1 | ConsultantCockpitV5 `handleSendReply` | Fake auto customer-reply ("Thanks for getting back to me…") after every send — a truth-pass violation. | **fixed** (removed; real reply comes from the customer) |
| B2 | JobViewV2 / fieldRecord.ts | Installer completion (serials, triple-check, signature, photos) persists to **localStorage only** — device-local, not durable, unverifiable by a stranger. The *attested record* the proof rests on must live in the DB. `fieldRecord.ts` flags this as intended Sweep-8 work. | **fixing** (persist to DB) |
| B3 | schema | `installed_equipment` doesn't exist in calchessie — BUT the migration already exists (`20260730_esb_submission_pack.sql`), just never deployed. Superseded by B5. | **superseded by B5** |
| B4 | (my error) | I created a wrong-shaped `installed_equipment` (no `unit_index`/`attested_by`; `tenant_id` NOT NULL; `record_hash`) that would have broken serverStore's writes. | **reverted** — table dropped, my migration → `_TRASH/`, my `installerWrites.ts` redundant (see B5) |
| B5 | **DRIFT (major)** | A complete Sweep-8 write bridge — `src/lib/serverStore.ts` (30 Jul) — already exists (`pushInstalledEquipment/TenantSetting/Consent/Feedback/Touchpoint`), targeting **4 migrations that were never deployed to calchessie**: `20260730` (ESB pack + `installed_equipment` + `esb_submissions`), `20260731_network_foundation` (brands/sources/boundaries — the ratified NETWORK ruling), `20260801` (products/consent/feedback/conversations/lead_touchpoints), `20260802` (GDPR erasure for the new tables). All park behind **GATE 0 + GATE B** per their headers. serverStore silently no-ops because its tables aren't there. My `realLeads`/`leadWrites` is a *parallel* bridge built cold — collides on **touchpoints** (mine→`notifications`, serverStore→`lead_touchpoints`). | **awaiting Cal** — deploy the 4 migrations + align my code to serverStore (one truth), or hold |

| B6 | `20260718_agent_foundation.sql` | Dollar-quote collision: `DO $$ … cron.schedule(…, $$SELECT…$$) … $$` — inner `$$` closes the outer block early → `syntax error at SELECT`. Also hardcoded the dead **coxmtpnq** URL + a fake service-role JWT. Never cleanly applied. | **fixed** — inner quotes → `$agent$`; URL → fresh project (`ywizcsulurxoqjdgnkvc`); auth → `SERVICE_ROLE_KEY_SET_AT_DEPLOY` (set via Vault at deploy) |

## §8 · THE REBUILD (31 Jul, Cal chose **B — fresh V5 DB**)
Root cause confirmed: **calchessie is a V1/V2-era Lovable DB** — 19/19 V5 tables missing incl. the whole agent
runtime. Not reconcilable in place. Plan: fresh project **AISolar-V5** (`ywizcsulurxoqjdgnkvc`, fresh keys → GATE 0
retired) · apply the full 38-migration set linearly · migrate the preserved keepers (`_migration_extract/`) ·
re-wire on the clean schema · security + sub-agent handoff. calchessie **paused** (resumable reference); keepers
extracted first.

**✅ PHASE 1 DONE — all 38 migrations applied** to AISolar-V5, fixing **8 classes of never-tested migration bugs**:
dollar-quote collisions in pg_cron blocks · `ALTER PUBLICATION … ADD TABLE IF EXISTS` (invalid) · `CREATE POLICY IF
NOT EXISTS` (invalid) · duplicate CREATE POLICY without guards (38 guarded) · missing Lovable-UI columns on `leads`
(assigned_consultant_id/assigned_installer_id/owner_user_id/county/segment/released_at/released_by) and
`agent_queue` (failed_at) · a non-IMMUTABLE `date_trunc` index (→ `utc_day()` helper). **Every fix is committed to
the migration files** — re-appliable for sub-agents. Schema complete + correct; dead V1 tables
(`cookie_consent_records`/`whatsapp_lead_sources`) and unused `grants` correctly absent.

**✅ PHASE 2 (in flight):** 5 brands seeded (Renewable Ireland · Solar Ireland · Solar Roscommon · Solar Tyrone ·
Solar Westmeath — tenant_ids preserved, `boundary_ref` → real kernel boundary at bridge time) · `cal@renewably.ie`
admin created (temp pw in `~/.aios/aisolar-v5-cal-temp-password`). App repointed to V5 (`.env.LOCAL`, backup
`.env.LOCAL.calchessie.bak`) and **verified live**: client→`ywizcsulurxoqjdgnkvc`, leads 0 (fresh, no
contamination), brands RLS-guarded (security floor already on), 0 console errors.

**V5 schema = the bridge, baked in:** no `tenants` table — the ratified four-layer split (boundary→tenant→brand→
source) with `brand.boundary_ref` as the kernel intersection. gate_bridge builds against that.
**Next:** config seed · gate_bridge (kernel primitives) · per-tenant RLS · sub-agent runbook · Saunderson + deploy.

## §7 · Drift reconciliation (needs Cal — the gate call)
The prior session (30 Jul) built the institutional Sweep-8 bridge (serverStore + 4 migrations) but never deployed it (coxmtpnq was dead). I came onto calchessie cold and built a second, simpler bridge. **One truth is required.** Recommendation: **deploy the 4 migrations to calchessie and align realLeads/leadWrites to serverStore's design** (drop the redundant/colliding bits — `installerWrites.saveInstalledEquipment`, and move touchpoints onto `lead_touchpoints`). Blocker: the migrations self-flag GATE 0 + GATE B; calchessie is the *app* DB (not the kernel), so GATE B (kernel/network alignment) arguably doesn't bind it, but the gates are Cal's.

## §5 · Flags & decisions (owner: Cal)
- ⚠️ **`leads` RLS = `auth.role() = 'authenticated'` — NOT tenant-scoped.** Any signed-in user sees/edits
  EVERY tenant's leads. Saunderson would see all counties. **Must tenant-scope before live** (task #6).
- **Payment** needs Stripe keys/config.
- **Leaked keys**: calchessie (`vythuqax`) keys are in git history (GATE 0) — rotate before real customer PII.
- **Throwaway test user to delete**: `aios.smoketest@gmail.com` (uid `d776c69a-265c-4561-b3fc-b211e03876d2`),
  consultant+admin on platform tenant `00000000-0000-0000-0000-000000000001`.

## §6 · Verify
- Type-check: `npx tsc --noEmit` (currently **0 errors**).
- Live read: app's Supabase client `configuredUrl` = `https://vythuqaxvlfjyyyhmiqt.supabase.co`.
- Dev server: `preview_start` name `aisolar` → :8788. Env: `.env.LOCAL` (backup `.env.LOCAL.coxmtpnq.bak`).
