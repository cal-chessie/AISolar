# AIGrids — the rails. Any-industry routing intelligence.
### The productised routing capability: the national→regional→county graph, cross-boundary movement, spec-driven per industry. It **decides where things belong**; the [gate_bridge](GATE_BRIDGE.md) **speaks the decision to the kernel**. Design 31 Jul 2026.

> **Naming law:** *AIGrids* is plural → a **capability** (like AITeams, AIFields), not an industry. It is
> **any-industry**: solar today; heat, wind, water, healthcare tomorrow — *same rails, different spec.* A domain
> (AISolar = Domain 001) plugs its **spec** into AIGrids and gets autonomous routing across boundaries, recorded
> clean through its gate_bridge onto the kernel.

## The line (Cal, 31 Jul) — do not blur it
- **gate_bridge** speaks clean with the kernel (`offer · emit · project · verify`). **Pure.** Knows nothing of €500, counties, or solar.
- **AIGrids** connects the rails — routes on the domain's spec, then hands the *decision* to the gate_bridge to record.
- **AIGrids decides; the gate_bridge speaks it.** The routing logic lives here; the constitutional recording lives there.

## The spec is DATA, not code (this is what makes it any-industry)
AIGrids is a routing **engine** parameterised by a per-domain spec. The rails are general; the spec is what varies.
**AISolar's spec:** `commercial_threshold = €500` (bi-monthly) · `national_brand = Renewable Ireland` · the brand graph
(each brand's `kind` ∈ {national, county, independent} + its `boundary`). Another industry hands a different spec; the
rails below **do not change** — that's the moat.

## The routing law — origin-KIND first, then the money (faithful to `kernel.transfer_lead`)
The first fork is **where the lead was born** (`brand.kind`), *not* the bill. The €500 rule lives **only** in branch ③.
1. **Independent-born → never rerouted.** The holder owns it outright. → `LeadRouted / no_op`.
2. **County-born → the operator holds ALL leads in their patch — residential AND commercial.** The €500 rule **never
   touches a county-born lead.** → `LeadRouted / no_op`. · *Unowned* county-born (no franchisee yet) → **up** to
   national (`held_by_current`) — until a franchisee connects, then it stays home.
3. **National-born → the €500 fork:**
   - **commercial** (`segment='commercial'` **OR** `bill > €500`) → **national keeps it, forever, no timer**
     (`LeadHeld`); the **county is kept for VPP** — not cut out of the grid relationship.
   - **residential + owned county operator** → **transfer DOWN** (`LeadTransferred` on national's chain +
     `LeadReceived` on theirs — a two-sided record). **The only place `tenant_id` moves.**
   - **residential + no operator** → **national holds and works it** (the reservoir). **Up, never across** — a lead
     never goes county→county.
Routing **reads** `segment`; it never writes it. Every decision — even a `no_op` — is offered to the
[gate_bridge](GATE_BRIDGE.md) as a precise event: `LeadHeld · LeadRouted · LeadTransferred · LeadReceived`.

## What AIGrids emits — through the gate_bridge, never around it
The routing **decision only**: `LeadRouted { lead_ref, decision, boundary_ref, commercial }` → `gate_bridge.offer(…)` → the
kernel. **Refs + counts, no PII.** AIGrids never asserts a lead is *true* or *won* — only *where it was routed*, attributed.

## Cross-border trade (the side quest, made general)
Tyrone (NI) ↔ Westmeath (RoI): AIGrids connecting rails **across a boundary** — the first cross-border energy trade in
Ireland, recorded clean through the gate_bridge onto the inscribed kernel. The any-industry rails are exactly what make
it more than solar: the same movement is a cross-border trade of *anything a domain routes*. Hardware node in the field →
AIGrids the rail → gate_bridge the record. History in the quiet of a family office.

## The Phase 1 engine (why AIGrids is more important than ever)
Cal sells the SaaS to installers through Renewably (the money-maker); meanwhile his consultants run high-ticket +
unowned-county domestic through AISolar — **earning + dogfooding without Cal as the bottleneck**, each franchisee peeling
a county onto its own boundary. **AIGrids is what makes that autonomous.** Full Phase 1 runs *before* the kernel is
connected — so the rails must stand on their own, then bind through the gate_bridge the day the inscribed kernel is live.

## Status
**BUILT & PROVEN (31 Jul) — re-forged from the record.** First cut wrongly applied the €500 gate to *every* lead (and
a wrong test went green). Re-read `kernel.transfer_lead`, grounded on it, rebuilt. `aigrids` schema live in AISolar-V5
(`20260731_aigrids.sql`): `specs` (spec-as-data) + `route_lead()` (origin-kind rails), recording via `gate_bridge.offer`.
Depends on `public.brands.kind`. **Proven 7/7** across all forks: independent/county `no_op` (county holds commercial
too) · national resi → transfer down (two-sided) · national commercial → held · unowned → reservoir/up. Both chains
`verify ok:true`. **Keep AIGrids industry-agnostic — if a rule is solar-specific it belongs in the spec, not the engine.**
**Open for Cal:** the unowned county-born → up branch (my addition beyond literal `transfer_lead`). **Next:** autonomous
routing (INSERT-time, before intake enqueues) · per-tenant RLS.
