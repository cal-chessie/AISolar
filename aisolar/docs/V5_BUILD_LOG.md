# AISolar V5 — Build Log
### Every move, logged, handoff-ready. Cal: "lets build and log every move." Opened 31 Jul 2026.

> **Mission:** a clean, correct V5 on a fresh DB (**AISolar-V5** `ywizcsulurxoqjdgnkvc`) so AITeam can honestly
> be called autonomous. AISolar = Domain 001; its **gate_bridge** to the AIOS kernel (`v0.1.0-genesis`,
> `qolqqgcb`) is the reference adapter every future domain copies — built on the kernel's own primitives.
> Companions: [engineering audit](AISOLAR_ENGINEERING_AUDIT.md) (great/broken/guardrailed) ·
> [wiring log](CALCHESSIE_WIRING_LOG.md) (bug ledger + the rebuild) · `_migration_extract/` (the preserved keepers).

## The road (Cal, 31 Jul)
1. **Seed config + wire the write path** to the clean schema
2. **The gate_bridge** — the reference adapter, on the kernel's primitives
3. **Security floor** — per-tenant RLS (Saunderson sees only Roscommon)
4. **Sub-agent runbook** — the handoff pack
5. Renewable Ireland + deploy
6. Solar Ireland + deploy
7. Solar Tyrone + deploy
8. Solar Westmeath + deploy
9. **Solar Roscommon / Saunderson + Wide Awake Solar** + deploy — *same owner = ONE boundary, TWO brands*
10. Wholesaler (SolaX distributor)
11. **Unleash** — full training · POV wired · agents · all security

## Foundation already laid
- **Phase 0** — keepers preserved → `_migration_extract/` (6 tenants, 5 users, config, 25 kernel fns).
- **Phase 1** — fresh AISolar-V5 (fresh keys → GATE 0 retired); all 38 migrations applied; **8 bug classes fixed
  in the files**; schema complete + correct.
- **Phase 2 (partial)** — 5 brands in canonical order (RI·SI·Tyrone·Westmeath·Roscommon, `sort_order` 10–50);
  `cal@renewably.ie` admin; app repointed to V5 + verified live (0 leads, RLS on, 0 console errors).
- **The V5 schema IS the bridge:** four-layer split (boundary→tenant→brand→source); `brand.boundary_ref` = the
  kernel intersection. One boundary can carry many brands (Saunderson: Solar Roscommon + Wide Awake Solar).

## Future architecture (Cal, 31 Jul) — build the process to be REPEATABLE
- **First cohort:** one shared V5 DB (multi-tenant via `tenant_id` + RLS), one gate_bridge to the kernel.
- **Post-cohort:** **a DB per boundary.** The Phase-2 migration (extract → clean schema → seed → gate_bridge) is
  the **repeatable playbook** that stands each one up — and standing one up is the moment it **starts the kernel**
  (records its boundary, speaks the constitution). So these notes are a *playbook, not a diary.*
- **In parallel (Cal):** the constitution gets **inscribed** — trusts + ordinals on Bitcoin — so by launch the
  per-boundary gate_bridges bind to a real, inscribed kernel.

## Moves (running — newest at the bottom of each item)
### Item 1 · Config seed + network — ✅ core done
- **Products catalog** seeded (16: 6 panel · 5 inverter · 5 battery); `product_type`→`kind`, extras→`specs` jsonb.
- `service_packages`/`grant_templates` correctly absent in V5 (uses `products`/`seai_applications`); old
  `installers`/`follow_up_settings` are test rows — set up fresh per boundary.
- **The network** — canonical order + boundaries: Renewable Ireland(10) · Solar Ireland(20) · Solar Tyrone(30) ·
  Solar Westmeath(40) · **Solar Roscommon(50) + Saunderson(51) + Wide Awake Solar(52) share ONE boundary**
  (`e9404dc2…`); Roscommon `is_licensed=true` (our franchise), the other two his own.
- **Write path:** `leadWrites` (createLead/updateLead/advanceStage) works on V5's `leads` shape (verified on the
  prior DB). Pending: align touchpoints → `lead_touchpoints` (serverStore's design, not my interim `notifications`).

### Item 2 · The gate_bridge + AIGrids — ✅ BUILT & PROVEN → [`GATE_BRIDGE.md`](GATE_BRIDGE.md) · [`AIGRIDS.md`](AIGRIDS.md)
- **Cal's correction (31 Jul) — two layers, never blur:** **gate_bridge = speaks clean with the kernel** (pure, no
  business logic); **AIGrids = connects the rails** (productised, *any-industry* routing; spec-as-data). *AIGrids
  decides; the gate_bridge speaks it.*
- **`gate_bridge` schema** (`20260731_gate_bridge.sql`) — `events` (hash-chained · refs-only · 64KiB cap ·
  `bound_to_kernel` flag) · `offer()` the ONE door · `project()` reads the fold · `verify()` walks the chain.
  Self-verified: 3 offered events → `verify {ok:true, checked:3}`. **Zero solar knowledge — stands on its own.**
- **`aigrids` schema** (`20260731_aigrids.sql`) — `specs` (spec as DATA: AISolar = €500 threshold + national brand)
  · `route_lead()` the rails: reads spec → applies the 3-way law → records via `gate_bridge.offer`.
- **⚠ Lesson (Cal caught it):** my first `route_lead` applied the €500 gate to *every* lead and a wrong test went
  **green** (`roscommon-commercial €650 → national`). I built from Cal's *spoken* model, not the record. Went and
  **read `kernel.transfer_lead`** (`_migration_extract/routing_kernel_fns.sql:559`) — the real routing forks on the
  lead's **origin KIND first**, and the €500 rule is **national-born only**. Ground on the record, not the summary.
- **Re-forged (faithful to `transfer_lead`):** added `public.brands.kind` (national/county/independent). `route_lead`
  now: ① independent → never rerouted · ② county-born → operator holds ALL in patch (commercial included), unowned
  county-born → up · ③ national-born → the €500 fork (commercial `LeadHeld`, county kept for VPP · residential+owned
  → `LeadTransferred`+`LeadReceived` two-sided · residential+no-op → reservoir, up-never-across). Reads `segment`,
  writes it never; `tenant_id` moves only on transfer.
- **Proven 7/7** — every fork incl. the fixed county-commercial `no_op`; events `LeadHeld/Routed/Transferred/Received`
  precise; national + Saunderson chains `verify ok:true`; test rows cleaned (leads 0).
- **Confirmed on V5:** no `kernel.*` schema/trigger exists → `aigrids.route_lead` is the ONLY router (clean slate).
- **Open for Cal:** unowned county-born → up (my split beyond literal `transfer_lead`).
- **v3 (Cal's call, 31 Jul):** small national leads (≤ €250/mo = €500 bi-monthly) do **NOT** auto-route — the
  **AIGate national gate** raises a **gate call {send_to_county · keep · pool}** and holds for Cal (notify until full
  autonomy). Commercial (> threshold) → VPP hold. Proven 8/8. Threshold lives in `aigrids.specs` (250, monthly basis;
  flip to 500 if `monthly_bill` stores bi-monthly). "Capped + county routing" is a *later* problem — Cal happy with the gates.

### Item 3 · Security floor + access model — ✅ done (`20260731_tenant_rls_floor.sql`)
- **Leak found:** `leads` RLS granted read to any `has_role(consultant|installer)` — role-only, cross-tenant. And there
  was **no user→tenant link** (`profiles`/`user_roles` had no `tenant_id`).
- **The floor:** added `user_roles.tenant_id` (a user holds a role *in* a tenant) + helpers `is_platform_admin` (admin
  & `tenant_id` null = global), `has_tenant_access`, `can_see_lead` (tenant OR customer `access_token`), `own_lead`.
  Clean tenant-scoped policies on **leads + 19 children** (80 policies); admin-global + customer-token preserved.
  Proven: a Roscommon seat sees Roscommon, not national; Cal (platform admin) sees all.
- **Access model (typical SaaS, Cal's words):** the **tenant is the data boundary** — all a user's brands feed one
  view, data in one place. **Role = POV, not a data gate.** Platform-admin (Cal, one global login) · **org owner = all
  views in their org** · consultant = sales · installer = field · customer = own lead via token. Per-seat = each role
  login is a billable seat (Stripe meter = later).
- **App wired:** `AppRole` gains `owner`; `isOwner`/`getDefaultRoute` honor it; route gates tuned — `owner` unlocks all
  views, `/owner` locked to owner+admin, consultant/installer walled. `ProtectedRoute` = UX guard; **RLS is the real
  boundary.** tsc clean.
- **National = a tenant** (RI/SI see national + routed leads); Cal's global login floats above. *(Wrinkle: RI+SI are two
  tenants under the national boundary — a national consultant needs a seat in each; model allows it.)*
- **Cohort model (Cal, 31 Jul):** first cohort = installers on their **own brand**, no franchise (standard
  multi-tenant). Franchise = **hand-picked later** (Cal offers a county → links their own DB + brand). The floor serves both.
- **Backlog:** Sentry / global error monitoring — wire when Cal hires (clean bolt-on, not now).

### Next — get to the cohort (Cal: "id love it working for a tenant")
The path to a live tenant: **deploy the app** (frontend + edge functions + secrets) so a tenant can reach it · create a
real tenant (owner login + brand + scoped cockpit) · onboard. Routing/autonomy refinements are *later*.

### Sweeps + deployment — reconciled with V5 (31 Jul, after reading the sweep notes)
Read: `FULL_SWEEP_AUDIT` (24 Jul) · the 30 Jul session note · `DEPLOYMENT_CALS_LAST_GATE.md`.
- **Sweeps:** 1–6 ✅ · 7 technical/SEO ✅, content+marketing revamp OPEN (per-page meta, surface the
  calculator/widget/coach/agents, replace placeholder stats, blog) · 8 (DB wiring) built (serverStore dual-write +
  migrations) · 9 = post-launch hardening (guardrails, copy, UX, PoV lockouts).
- **THE OLD WALL IS GONE:** the 30 Jul blocker was coxmtpnq unreachable under Lovable. V5 (`ywizcsulurxoqjdgnkvc`) is
  reachable, keys fresh (GATE 0 retired), RLS floor built tonight. The last two sessions' "Deploy AMBER" is clearable.
- **The runbook exists + is excellent** (`DEPLOYMENT_CALS_LAST_GATE.md`, GPT 9.3–9.5): dependency graph · DoD ladder ·
  verification matrix · per-component rollback · 13-step cutover w/ verify lines · full-spine smoke test. **But written
  for coxmtpnq** — the V5 rebuild already did its hardest P0 rungs (all migrations applied · RLS verified per-POV · Cal
  bootstrapped admin). **Needs reconciling to V5 into one clean checklist.**
- **Left for a secure deploy (reconciled):** kill old leaked keys · deploy 16 edge fns + secrets (Cal's keys) ·
  Postmark token+DNS · real-data read-flip (partly done, `realLeads`) · reconcile `serverStore`→V5 · demo OFF · smoke test.

### Post-deploy workstream (Cal, 31 Jul — "note that")
**Make the HERO (lead-capture widget / bill-analyser) bulletproof.** Then, *after deploy*, **tighten the new-lead
onboarding flow end-to-end** — the best experience for ALL parties:
- **first contact logged** — the moment a lead lands;
- **notification to all parties** — customer + consultant + installer + owner, each the right message;
- **email + calendar booking** (survey/call) — smooth for customer and team.
Sequence: **hero bulletproof + deploy → THEN the onboarding-flow polish.**

### Connector fix — ✅ DONE (31 Jul, "catch it fix it note it now") — `20260731_lead_doors.sql`
Two holes caught reading `ingest-lead`, both closed + proven, not deferred:
- **Was:** bound one tenant per deployment (`AISOLAR_TENANT_ID`) + stamped `brand` as a slug + never set
  `origin_brand_id` → couldn't serve a multi-tenant cohort, and routing/attribution wouldn't link.
- **Now:** every brand has a keyed **door** in `sources` (`source_key`); `resolve_lead_door(key)` → brand + tenant;
  `ingest-lead` rewritten — `x-source-key` → tenant + `origin_brand_id` (multi-tenant · secure · attributed). Legacy
  `x-ingest-key` + `AISOLAR_TENANT_ID` path kept (national single-tenant), now also resolves the body brand → `origin_brand_id`.
- **Security:** a leaked door key injects only into its own brand — never reads, never crosses a tenant; revocable via `sources.active`.
- **Proven end-to-end:** national door → national tenant → `gate_call`; county door → county tenant → `no_op`; lead
  `origin_brand_id`/`tenant_id` attributed correctly both times. (Function deploys + smoke-tests at cutover.)
- **Next in hero-bulletproofing:** wire the `/embed` `CalculatorWidget` + `/start` to POST with the tenant's `source_key`.
