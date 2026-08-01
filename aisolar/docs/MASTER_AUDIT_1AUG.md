# MASTER AUDIT — AISolar estate (1 Aug 2026)
### Cal: "full audit, professionals. Check what I did + missed · last-night files vs truth · all docs for gaps · only facts, mark doubts · interlink everything so you can loop through it."

> **Legend** — `✅ FACT` verified this pass (live V5 DB read-only query, or code/git read) · `⭐ SUPERSEDED` built, don't
> re-open · `⚠️ GAP/BUG/RISK` real, needs work · `❓ DOUBT` needs a named check before trusting · `📄 CATALOGED` role known,
> **not** line-verified this pass (do not treat as audited).
> **Basis:** read-only SQL against live V5 `ywizcsulurxoqjdgnkvc`, plus repo grep/read + git on branch `cowork-jul31`.
> **Rule I held:** only asserted what I verified; everything else is marked. Where I was wrong earlier, I say so.

---

## 0 · THE MAP — where everything is

**Active database — ✅ FACT:** V5 **`ywizcsulurxoqjdgnkvc`** (`.env`, `.env.local`). RLS enabled on `leads` +
`tenant_settings` (verified). ⚠️ **NOT `coxmtpnq`** — that ref is stale (see §3).
**Branch:** `cowork-jul31`. Head today = 5 commits past `e7e5a84` (last night). None pushed.
**Edge functions (17):** `agent-drain` (the 10-agent runtime) · `_shared/quote.ts` (single quote engine) ·
`extract-bill-data` (21-field) · `ingest-lead` (keyed front door) · `create-checkout`/`stripe-webhook`/`coinbase-*` ·
`solar-roof` · `expert-chat` · the `send-*` notifiers · `slack-approve`.
**Migrations (43, → 20260802):** security floor = [`20260731_tenant_rls_floor.sql`] · routing = [`20260731_aigrids.sql`]
+ [`20260731_gate_bridge.sql`] · doors = [`20260731_lead_doors.sql`] · paperwork = [`20260727_paperwork_engine.sql`] +
[`20260730_esb_submission_pack.sql`] · stores = [`20260801_undocumented_stores.sql`] · gdpr = `20260802_gdpr_erasure_extension.sql`.

### Canonical "current truth" docs (read these first)
| Doc | Role | Status |
|---|---|---|
| [THE_ONE_READ.md](docs/THE_ONE_READ.md) | START-HERE estate map | 📄 canonical — ⚠️ carries stale DB refs (§3) |
| [DEPLOYMENT_CALS_LAST_GATE.md](docs/DEPLOYMENT_CALS_LAST_GATE.md) | §0 present-truth deploy checklist | 📄 canonical |
| [PAPERWORK_AUDIT.md](docs/PAPERWORK_AUDIT.md) | paperwork current state (mine, 1 Aug) | ✅ verified this pass |
| [CALS_GROWTH_DEV.md](docs/CALS_GROWTH_DEV.md) | growth backlog + eyes-&-ears findings | ✅ updated 1 Aug |
| [SWEEP10_NOTES.md](docs/SWEEP10_NOTES.md) | final-polish + type/persistence debt | ✅ updated 1 Aug |
| [V5_BUILD_LOG.md](docs/V5_BUILD_LOG.md) | last-night V5 rebuild record | 📄 |
| [SCHEMA_MAP.md](docs/SCHEMA_MAP.md) | schema map | 📄 |

### The rest of the doc estate (50 total) — grouped, cataloged
- **Design / arch:** [GATE_BRIDGE](docs/GATE_BRIDGE.md) · [AIGRIDS](docs/AIGRIDS.md) · [THE_NETWORK_RULING](docs/THE_NETWORK_RULING.md) · [FULL_SCOPE_AND_ARCHITECTURE](docs/FULL_SCOPE_AND_ARCHITECTURE.md) · [AISOLAR_MASTER_PLAN](docs/AISOLAR_MASTER_PLAN.md) · [AISOLAR_SAAS_MAP](docs/AISOLAR_SAAS_MAP.md) · [COMPLIANCE_CHAIN_DESIGN](docs/COMPLIANCE_CHAIN_DESIGN.md) · [COMPLIANCE_DATA_CAPTURE](docs/COMPLIANCE_DATA_CAPTURE.md) — 📄 role known, not line-verified.
- **Point-in-time audits (predate today's fixes — reconcile against §1/§4):** [FULL_AUDIT_30JUL](docs/FULL_AUDIT_30JUL.md) · [FULL_SWEEP_AUDIT](docs/FULL_SWEEP_AUDIT.md) · [SWEEP_AUDIT_ROUND4](docs/SWEEP_AUDIT_ROUND4.md) · [AISOLAR_CONSTITUTIONAL_AUDIT](docs/AISOLAR_CONSTITUTIONAL_AUDIT.md) · [AISOLAR_ENGINEERING_AUDIT](docs/AISOLAR_ENGINEERING_AUDIT.md) · [AIFIELD_AUDIT](docs/AIFIELD_AUDIT.md) · [PIPELINE_AUTONOMY_AUDIT](docs/PIPELINE_AUTONOMY_AUDIT.md) — 📄 ❓ may assert pre-fix state.
- **Plans / briefs / sweeps:** [PAPERWORK_PRODUCT_BRIEF](docs/PAPERWORK_PRODUCT_BRIEF.md) (⭐ superseded→audit) · [AIFIELD_BUILD_PLAN](docs/AIFIELD_BUILD_PLAN.md) · [AIFIELD_IA](docs/AIFIELD_IA.md) · [AIFIELD_PART_A_GUIDE](docs/AIFIELD_PART_A_GUIDE.md) · [AISALES_AIFIELD_REDESIGN](docs/AISALES_AIFIELD_REDESIGN.md) · [AISALES_AIFIELD_BUILD_MAP](docs/AISALES_AIFIELD_BUILD_MAP.md) · [SURVEY_REWRITE_BRIEF](docs/SURVEY_REWRITE_BRIEF.md) · [SWEEP_7.1](docs/SWEEP_7.1.md) · [SWEEP8_DB_WIRING](docs/SWEEP8_DB_WIRING.md) · [SWEEP9_NOTES](docs/SWEEP9_NOTES.md) · [SWEEP9_TEAMS](docs/SWEEP9_TEAMS.md) · [FINAL_PUSH](docs/FINAL_PUSH.md) — 📄.
- **Runbooks / ops / handovers:** [AUTH_RUNBOOK](docs/AUTH_RUNBOOK.md) · [SECRETS](docs/SECRETS.md) (✅ runbook, no live values) · [SLACK_OPS](docs/SLACK_OPS.md) · [STEWARD_CONSOLE](docs/STEWARD_CONSOLE.md) · [SETUP_COUNTY](docs/SETUP_COUNTY.md) · [SETUP_STANDALONE_TENANT](docs/SETUP_STANDALONE_TENANT.md) · [WEBSITE_INTEGRATION](docs/WEBSITE_INTEGRATION.md) · [CALCHESSIE_WIRING_LOG](docs/CALCHESSIE_WIRING_LOG.md) · [THE_MIGRATION](docs/THE_MIGRATION.md) · [LAUNCH_HANDOVER](docs/LAUNCH_HANDOVER.md) · [PRE_LAUNCH_HANDOVER](docs/PRE_LAUNCH_HANDOVER.md) · [HANDOVER_ANSWER](docs/HANDOVER_ANSWER.md) · [FOUNDER_NOTES](docs/FOUNDER_NOTES.md) · [NOTES](docs/NOTES.md) · [OPENSOLAR_INTEL](docs/OPENSOLAR_INTEL.md) · [READINESS_AND_MOAT](docs/READINESS_AND_MOAT.md) — 📄.

---

## 1 · MY SESSION (1 Aug) — what I did + what I MISSED
**Commits (branch `cowork-jul31`, not pushed):** `c62b39a` quote+classification+pricing · `6c4a0ef` 21-field LeadIntake type · `e6bbe58` paperwork audit.
- ✅ **Classification unified** on `property_type` (drafter + frontend read one field; stored==shown). Verified: dead `extracted_premises_type` has 0 code reads; tsc 0. → [PAPERWORK_AUDIT §A], `complianceDecision.ts:78`.
- ✅ **Quote drift fix** — drafter computes via `_shared/quote.ts` (`computeQuote`); propertyType input now live.
- ✅ **`LeadIntake` typed to 21 fields** (was v1/5). tsc 0.
- ✅ **Pricing dial** in Settings → Pricing & Terms — frontend verified in-browser.
- ⚠️ **WHAT I MISSED (caught this pass, corrected):**
  1. I wrote "`company_compliance` is rejected by the tenant_settings CHECK." **WRONG** — `20260730` added it; live has 4 keys. I'd only read `20260727`. **Only `pricing` is rejected.** Corrected [PAPERWORK_AUDIT §1] + [CALS_GROWTH_DEV].
  2. I framed A1 as "the JWT tenant claim." The **real** nuance: RLS's `has_tenant_access` reads tenant from **`user_roles`** (works today), while `pushTenantSetting` reads the **JWT** — a **split**. Aligning `pushTenantSetting` to `user_roles` fixes the owner-settings write **without** a JWT hook. Corrected in both docs.
  3. My "pricing set properly" answer hid a real blocker: `'pricing'` genuinely rejected by the live CHECK → the dial never persists server-side until a one-line migration lands.

## 2 · LAST NIGHT's captures vs TRUTH (verified this pass)
- ✅ **leads RLS is tenant-scoped on live V5** — exactly 4 policies (`leads_sel/ins/upd/del`), all `has_tenant_access(auth.uid(), tenant_id)`; RLS enabled; **no surviving loose `authenticated` policy.** The floor ([`20260731_tenant_rls_floor.sql`]) is applied and correct.
- ⚠️ **BUT `leadWrites.ts` header says the opposite** — *"leads RLS is `authenticated` — any signed-in user can read/write any lead."* **STALE / FALSE** (describes a hole that's closed). The memory note "leads RLS not tenant-scoped" is stale too. **Fix the comment** so nobody acts on a phantom hole (or a phantom safety).
- ✅ `realLeads.ts` (live read layer → maps DB rows into the `DummyLead` UI shape) + `leadWrites.ts` (write path → route-lead trigger) present, last night.
- ✅ `20260731` migrations (`gate_bridge`/`aigrids`/`tenant_rls_floor`/`lead_doors`/`fk_integrity`/`network_foundation`) present; headers consistent with [GATE_BRIDGE.md], [AIGRIDS.md], [THE_NETWORK_RULING.md].

## 3 · DOC GAPS / CONTRADICTIONS / DRIFT
- ⚠️ **`CLAUDE.md` header is STALE** — says "Supabase `coxmtpnq…`" + "blocked on coxmtpnq access." The app points at **`ywizcsulurxoqjdgnkvc`** (V5). Update the repo `CLAUDE.md` header + the "State (2026-07-18)" block.
- ⚠️ **`leadWrites.ts` stale security comment** — see §2. Highest-value doc-vs-truth drift found.
- ⚠️ **~20 docs reference old DB refs** (`coxmtpnq`/`vythuqax`): THE_ONE_READ, AUTH_RUNBOOK, SCHEMA_MAP, DEPLOYMENT_CALS_LAST_GATE, THE_MIGRATION, V5_BUILD_LOG, CALCHESSIE_WIRING_LOG, NOTES, FULL_SCOPE_AND_ARCHITECTURE, LAUNCH_HANDOVER, WEBSITE_INTEGRATION, FINAL_PUSH, FULL_AUDIT_30JUL, FULL_SWEEP_AUDIT, AISOLAR_MASTER_PLAN, AISOLAR_CONSTITUTIONAL/ENGINEERING_AUDIT, AISALES_AIFIELD_BUILD_MAP, schema_map.html. ❓ Some are HISTORY (fine); some may present a stale ref as *current* — spot-check each for "current DB = coxmtpnq"-type claims.
- ❓ **Point-in-time audits predate today's fixes** — FULL_AUDIT_30JUL / SWEEP_AUDIT_ROUND4 / the constitutional+engineering audits may assert issues already fixed (classification, quote drift). Reconcile against this doc's §1/§4; add SUPERSEDED where fixed.
- 📄 **45 of 50 docs not line-verified this pass** — cataloged only. A complete doc-gap sweep (claim-by-claim vs code) is the next audit unit if you want it; flagged honestly rather than rubber-stamped.

## 4 · OPEN BUG / RISK REGISTER (verified this pass — facts)
1. ⚠️ **Pricing never persists server-side** — `'pricing'` absent from the live `tenant_settings` CHECK **and** `pushTenantSetting` resolves tenant from the JWT not `user_roles`. Two fixes: add `'pricing'` to the CHECK (1-line migration, pattern of `20260730`) + align tenant resolution. → [PAPERWORK_AUDIT §1], [CALS_GROWTH_DEV] admin-pricing.
2. ⚠️ **Paperwork persistence not wired** — `lead_documents` table/bucket exist, **0 rows ever inserted**; the pack is client-side download only; `doc_type` id vocabularies don't reconcile (short vs long vs cert keys). → [PAPERWORK_AUDIT §2,§3].
3. ⚠️ **NC8 overlay empty**; ESB VERIFY-BEFORE-LIVE (6/11 kW bands under-file at 5.75–6.0; typed e-signature acceptance). → [PAPERWORK_AUDIT §A,§B]. ❓ needs ESB policy read + your yes.
4. ⚠️ **Doc drift** — `CLAUDE.md` stale DB ref; `leadWrites.ts` stale RLS comment (§3).
5. ❓ **`docs/SECRETS.md`** — a rotation runbook (no live values seen); 3 JWT-format strings matched — spot-check they're anon/example, not service_role. Low risk.
6. ❓ **Demo mode** — DEV-gated + `VITE_ENABLE_DEMO` opt-in (✅ guard exists). Confirm prod build never sets `VITE_ENABLE_DEMO=true` (A10).

## 5 · HOW TO LOOP THIS AUDIT (the re-run)
1. Live truth: re-run the read-only V5 checks (leads policies · `tenant_settings` CHECK · `has_tenant_access` def).
2. Code-vs-doc: `leadWrites.ts` comment · `CLAUDE.md` header · the ~20 stale-ref docs.
3. Paperwork: [PAPERWORK_AUDIT.md] register (persistence, doc_type, NC8, ESB flags).
4. Reconcile the point-in-time audits → mark SUPERSEDED where §1/§4 closed them.
5. The 45 cataloged docs → claim-by-claim sweep (next unit).

> **Nothing in this doc is asserted that I didn't verify against the live DB, the code, or git.** Every remaining
> unknown is a `❓` with the exact check to run. No shortcuts.
