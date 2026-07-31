# The gate_bridge — AISolar ⇄ the AIOS kernel, the reference adapter
### Domain 001's adapter to the constitutional kernel. Built on the kernel's own primitives, so connecting is *congruence, not reconciliation.* Cal: "the best adapter to ever use the kernel." Design 31 Jul 2026.

> The kernel (`v0.1.0-genesis`, `SONSSONS/THE_KERNEL_GENESIS.md`) **records truth**. It never reaches into a
> domain; a domain never reaches into it. Between them sits the **gate_bridge**: a domain **offers**, the kernel
> **adjudicates**, and only an adjudicated offering becomes an Event. AISolar is Domain 001 — this bridge is the
> template every future domain copies, so it must be exemplary.

## The primitives it speaks (never invents)
**Boundary · Identity · Event · Admission · Evaluation · Projection · Verification.** Verbs: `emit · project · verify`.
Vocabulary: `BoundaryRecorded · RoleGranted · DomainAdmitted …` + AISolar's 26 domain events (`src/lib/kernelVocabulary.ts`).

## The mapping — AISolar concept → gate_bridge act → kernel primitive
| AISolar (V5 app) | gate_bridge act | kernel primitive |
|---|---|---|
| a **brand's `boundary_ref`** | records the party | **Boundary** (`BoundaryRecorded`) |
| a person / agent / equipment | admits the *kind* (never a role) | **Identity** |
| a lead born · routed · surveyed · installed | an **offering** presented for recognition | Admission → Evaluation → Verification → **Event** |
| `transfer_lead` (AIGrids routing) | offer the route; the kernel adjudicates it | Admission (recognised?) · Evaluation (permitted?) · **Projection** (the assignment) |
| the pipeline / cockpit view | reads the fold of events | **Projection** |
| the **attested install record** | offered, hash-chained, attributed | **Event** + **Verification** (integrity) |
| a routed lead's outcome | not asserted true — attested by a named party | *the four-irreducibles humility* |

## The one law
A domain **never writes an Event.** It *offers*; the kernel decides whether an Event comes to exist. **History is
earned, not written.** `offer()` is the only door. What crosses the gate: **refs + hashes + counts only — never PII**
(64 KiB cap). Commands draft → humans approve → only outcomes become events.

## NOT the gate_bridge's job — routing is AIGrids
The gate_bridge does **not** decide *where* a lead belongs — the €500 gate, the county routing, cross-boundary
movement. **That is [AIGrids](AIGRIDS.md)** — the productised, any-industry rails. AIGrids routes on the domain's
spec, then hands the *decision* to the gate_bridge, which records it as an Event (`LeadRouted`) and nothing more.
**Clean line: AIGrids decides; the gate_bridge speaks it to the kernel.** Keeping the bridge pure — no business
logic, no thresholds, no industry — is exactly what makes it the reference every domain *and* every rails product
can trust. The mapping-table row above (`transfer_lead`) is therefore AIGrids's logic recorded *through* this gate.

## Boundaries (bound 31 Jul)
- **Cal's national / platform boundary** (`8f545626…`) — Renewable Ireland · Solar Ireland · + every unowned
  county (Solar Tyrone · Solar Westmeath today). All commercial + all unowned-county domestic land here.
- **Franchised county boundary** — Saunderson's (`e9404dc2…`): Solar Roscommon (licensed = ours) + Saunderson +
  Wide Awake Solar (his). Owned-county domestic routes here.
- A boundary carries many brands; a county **peels from the national boundary to its own** the day a franchisee
  connects. Each `boundary_ref` binds to a kernel `BoundaryRecorded` when the kernel is live.

## The Phase 1 engine (why the bridge carries the whole model)
Cal sells the SaaS to installers through Renewably (the money-maker); meanwhile his consultants run high-ticket +
unowned-county domestic through AISolar — **earning + dogfooding without Cal as the bottleneck**, each franchisee
peeling a county onto its own boundary. The gate_bridge is what makes that autonomous. **This is the FULL Phase 1,
*before* the constitutional kernel is connected** — so the bridge must stand right on its own, then bind cleanly the
day the inscribed kernel is live.

## Status
**BUILT & PROVEN (31 Jul).** `gate_bridge` schema live in AISolar-V5 (`20260731_gate_bridge.sql`): `offer · project ·
verify`, hash-chained, refs-only, 64 KiB cap. Self-verified (`ok:true`). Routing lives in [AIGrids](AIGRIDS.md), proven
to record *through* this gate (3/3, chains verify). The kernel is paused / being **inscribed** (trusts + ordinals on
Bitcoin, Cal); every local event carries `bound_to_kernel` so it binds the day the inscribed kernel is live — nothing to
reconcile, only to bind.
