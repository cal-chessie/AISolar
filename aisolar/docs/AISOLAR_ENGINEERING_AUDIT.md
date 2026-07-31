# AISolar — Engineering Audit (great · broken · guardrailed)
### Full-team review, walked from auth through the whole system. For humans AND for the agents we connect. Started 31 Jul 2026.

> **Why this exists** (Cal): the app went **V1 → V5 in a month, detached**, so the code, the DB, and the docs
> evolved on *different tracks*. This doc is the reconciliation: what's genuinely **great** and should be
> protected, what's **broken** and needs fixing, and what's **guardrailed** — the rails an AI agent must respect
> before it's allowed to touch anything. `main` = V1; `cowork-jul25` = V5 (current). Live app DB: calchessie
> (`vythuqaxvlfjyyyhmiqt`). Companion: [`CALCHESSIE_WIRING_LOG.md`](CALCHESSIE_WIRING_LOG.md).

---

## 🟢 GREAT — the spine that survived the sprint (protect this)
- **One architecture across every layer** (Cal's point): the *cutover pattern* repeats everywhere —
  localStorage offline-first → `serverStore.ts` dual-writes to Postgres → flip to DB-first after deploy verify.
  Same shape for every store. Learn it once, you know them all.
- **The field-record attestation** (`src/lib/fieldRecord.ts`): a genuine idea, cleanly held. Everything the crew
  records is **ATTESTED by a named installer at the gate — never "machine-verified."** The reason a substituted
  inverter can't produce an NC6 describing kit that isn't on the roof.
- **The triple-check** (`CommissioningSerials` in JobViewV2): every NC6 §5 field off the rating plate, cross-checked
  against the proposal, a mismatch **requires** the note that rides with the record, and an AC-rating change that
  crosses an ESB band **flips the form NC6→NC7 with a STOP warning**. This is the moat.
- **Truth-pass discipline, coded in**: `esb_reference` stays NULL until a *real* portal submission (never fabricated);
  the grant agent **tracks, never submits** (no SEAI API); no SMS/WhatsApp/roof-detection claims anywhere.
- **`has_role()` RLS** — recursion-safe, role-scoped, deny-by-default. The migrations even self-flag that per-tenant
  isolation is the known-open floor (honest, not faked).
- **Institutional migrations**: add-only, idempotent, richly commented, GDPR-aware (`anonymise_lead` extended for
  every new PII-bearing table). Whoever wrote these knew what they were doing.
- **The read adapter** (`src/lib/realLeads.ts`, this session): feeds real calchessie data through the existing UI
  unchanged — 13 workbench components on real data, tsc-clean.

## 🔴 BROKEN — ranked, with owner
1. **calchessie is a V1/V2-era DB — the V5 schema was never built on it.** *[THE big one]* Not "8 migrations
   behind": **19 of 19 V5 tables are MISSING**, including the *entire agent runtime* (`agent_queue`, `agent_runs`,
   `ai_config`, `agent_prompts`) and **`lead_intake`** (created in `20260718_agent_foundation`, absent here, not
   even in `types.ts`). Old-version tables (`cookie_consent_records`, `whatsapp_lead_sources`) still present.
   History is non-linear (`has_role` from 20260723 present, but 20260718's agent foundation isn't). **Effect:**
   the agents have no tables to run on; the intake/bill-extraction pipeline, `serverStore`, the ESB/attested-record
   layer, the network foundation, and the unified inbox all fail silently. **Fix:** build the full V5 schema onto
   it — (A) apply the ~15 V5 migrations (`20260718`→`20260802`) idempotently in place, or (B) a fresh V5 DB +
   migrate calchessie's real assets (tenants/routing/users). Leads are all test data → nothing real at risk.
   *(decision pending Cal — A or B)*
2. **`serverStore` dual-write is dead** until #1 lands — every `push*` no-ops silently (by design, but nothing persists).
3. **`leads` RLS = `auth.role()='authenticated'`** — not tenant-scoped; any signed-in user sees every tenant's leads.
   Must tenant-scope before Saunderson/live. *(RLS task #6)*
4. **Parallel-bridge drift** (this session): my `realLeads`/`leadWrites` was built cold, unaware of `serverStore`;
   collides on touchpoints (`notifications` vs `lead_touchpoints`). Reconciling to serverStore. *(logged B5)*
5. Demo-mode fallbacks are gated behind `isDemoMode()` (dev only) — correct, but must never leak to prod (A9/A10).

## 🛡️ GUARDRAILED — the rails an agent MUST respect (read before wiring any agent)
- **Agents run ONLY through `agent-drain`** (queue + pg_cron drain) — never write the DB directly, never call other
  agents inline. The queue is the one door.
- **Proposals are `status:'draft'` — NEVER auto-send.** A message row is not a send; a draft is not a decision.
  Human approval (or the customer) closes every irreversible step. (`slack-approve` is the human gate.)
- **Attested, never verified.** An agent may record what a *named human attested*; it may never assert an external
  fact happened. Occurrence stays on the far bank.
- **Grant agent TRACKS, never submits** (no SEAI API). **`esb_reference` NULL until a real submission** (no fabricated refs).
- **Truth-pass / DO-NOT-CLAIM**: no SMS/WhatsApp/roof-detection capability may be claimed in any copy or toast.
- **`has_role()` RLS is the floor** — an agent's writes are still subject to RLS; service-role bypasses it, so
  service-role agents must self-enforce tenant scoping (the open floor, #3 above).
- **ESB safety gates** (installer): `first_connection = 'no'` → do-not-connect until ESB confirms; NC6→NC7 form-flip
  → STOP and get pre-approval. An agent must surface these, never auto-clear them.
- **Kernel emit law** (when the bridge connects): refs + hashes + counts only, no PII, pre-registered event types,
  64 KiB cap, commands draft → humans approve → only outcomes become events.

---

## 🧭 THE WALK — auth → capture → consultant → installer → customer → agents → edge
*Populated as each layer is examined. Legend: 🟢 great · 🔴 broken · 🛡️ guardrail · 📝 note.*

### 0 · Auth & onboarding — *(in progress)*
_TBD — AuthPage, ProtectedRoute, OnboardingMode, AUTH_RUNBOOK (first-admin bootstrap)._

---
*Next: reconcile the calchessie schema to V5 target, then continue the walk from auth.*
