# AISolar — Founder's Deep-Infrastructure Notes (living)

> For Cal. Your own system, in plain language — so you can HOLD it, EXPLAIN it to a
> prospect/investor/installer, and DECIDE on it without needing the code open. This is
> the founder's brain on the deep infrastructure; I add an attribute here every time we
> go deeper. Truth-pass: nothing in here claims more than the product can back today.
> (The build/wiring detail lives in `SWEEP8_DB_WIRING.md`; the polish/harden in
> `SWEEP9_NOTES.md`; the how-to-demo in `SWEEP9_TEAMS.md` → 9.6. This is the WHY + SHAPE.)

---

## 1. What AISolar IS (the one-liner + the thesis)
**"An Irish solar installer operating system; it reads the day/night split from your
bill."** It carries ONE record for a solar job from bill → survey → proposal → grant →
install → compliance, driven by a runtime of AI agents that humans approve.

**The two-worlds thesis (your moat):** solar *design* tools (OpenSolar/Aurora) stop at
the contract; field-*service* tools know nothing about solar compliance. **AISolar is
the only one that carries a single compliant record the whole way** — including into the
statutory ESB forms (NC6/NC7), auto-filled from the *fitted* equipment, not the proposal.
That gap is defensible; nobody else sits in it.

**Domain 001:** AISolar is the *proof* of your bigger idea (the OA/kernel constitutional
standard). It's the real, regulated business that shows the pattern works end-to-end.

## 2. Who it's for (two identity forks — don't conflate)
- **Fork 1 — the APP users (your customers):** installer **business owners** (the Owner
  role — buys/runs the platform) and their **sales guys** (Consultant/AISales). AISolar
  is B2B **SaaS** for them. They choose their role at signup. *It is NOT a homeowner app.*
- **Fork 2 — the LEADS (their customers):** a homeowner (**domestic**) or a business
  (**commercial**) captured on the **installer's OWN solar site** — via your calculator
  **widget/embed** or the `ingest-lead` API — then flowing into AISolar. You may not run
  a generic public lead door at all; the funnel belongs to each installer's site.
- **Open call for you:** do we also *host* tenant-branded capture pages (for installers
  without a good site), or is it widget/API only (they must have their own site)? That's
  a GTM decision, not a tech one — your call. (Captured in SWEEP9 §9.1.)

## 3. The shape of the system (four moving parts)
1. **The SaaS app** — four "worlds" that read as one: **Owner** cockpit, **Consultant**
   (AISales), **Installer** (AIField), **Customer** portal. Same design system across all.
2. **The lead-capture surfaces** — the tenant's site / widget / API (Fork 2).
3. **The agent runtime** — 10 AI agents on a queue (`agent-drain`), each triggered by an
   event or a schedule, each PROPOSING work a human approves. This is the automation.
4. **The kernel** — a *separate* switchboard (its own database) that records events
   immutably. The SaaS is one tenant's workbench; the kernel is the constitutional spine
   beneath all tenants. (More in §6.)

## 4. The agent runtime (the automation, honestly)
- **10 agents** (lead intake, survey scheduler, proposal drafter, follow-up, grant
  tracker, install coordinator, post-install, digest, stale-lead, payment reminder) run
  ONLY through one worker (`agent-drain`) — never loose. Each checks it hasn't already
  acted (idempotent), and every action is logged.
- **Draft-never-send is the law.** Agents PROPOSE; a human APPROVES. The grant agent
  *tracks*, it never submits (SEAI has no public API). Nothing auto-sends.
- **Transparency = the trust move.** In Owner → Agents, every agent has an **Inside**
  window: how it's programmed, what it's working on right now, and — for the schedulers —
  the plan it proposes + the km/€ it saves. The opposite of a black box. *"Verify, don't
  trust"* is the whole pitch, made visible.
- **Honest state today:** the *nervous system* (queue, audit, cost caps, idempotency) is
  real and rare. The *decision quality* in a couple of middle agents is still thin (the
  scheduler-v2 brain is written, not yet deployed). So today it's "**assisted autonomy**
  with a real spine," not hands-off — and the copy says exactly that.

## 5. The compliance moat (why installers can't leave)
One record carries the roof all the way into **NC6/NC7** (the ESB statutory forms),
auto-filled from the **fitted** equipment the installer commissions on the roof — with
the serial + a triple-check, attested by the **named installer** (never "machine-
verified"). No design tool and no field tool does this. It's the stickiest thing you own.

## 6. The kernel / OA — and how it helps launch (your question, 30 Jul)
Your **OA (Ordinal Archive)** + **CDT (the test/court)** + **kernel** are a constitutional
stack: an append-only, tamper-evident record of meaning and events, anchored so no single
party can rewrite it. **How it helps deployment + launch — as DISCIPLINE and TRUST, not
plumbing:**
- **"I correct, I don't delete"** *is* your migration law (add-only, never destructive).
  The OA trained the exact deployment discipline.
- **Attestation by a named human** *is* draft-never-send — a real safety control.
- **Refs-only, no PII in the kernel** strengthens your GDPR + tenant-isolation story.
- **The immutable audit trail** is a **launch trust multiplier** — exactly what
  regulators + enterprise buyers want to see.
- **GATE B** is the OA *governing* deployment order (no prod migration until OA/GRIDS/COMH
  align) — the constitution protecting you from a premature migration.

**The honest caution:** the OA is **pre-inscription** (v1 draft; the F1 "mutable-outside-
chain" hole is open). So — **don't let it BLOCK the SaaS launch, and don't over-claim it.**
AISolar launches as a B2B SaaS on the OA's *principles* now; the kernel's *live* chain-
recording is gated by GATE B and does NOT need to be live to launch. **Launch the product
on the principles; light the live kernel after Gate B as the trust upgrade — and only
market "anchored constitutional guarantees" once it's inscribed + F1 is closed.**

## 7. The trust model (the through-line)
Everything rhymes: **verify don't trust · correct don't delete · propose then a human
approves · attest by a named person · refs not copies · nothing drifts.** That single
discipline runs from the kernel down to a survey scheduler picking a date. It's why the
system is credible — and it's the thing to protect above features.

## 8. How the work is organised (sweeps + gates)
- **Sweep 7.1** = the app (done + verified — the two worlds unified).
- **Sweep 8** = migrate + deploy — make it real (the DB full-send + the edge deploys).
  Named master list of ~53 items (M/D/X/L/G/A/gates) in `SWEEP8_DB_WIRING.md`.
- **Sweep 9** = smooth + harden — make it sing + bulletproof, to a **five-team bar**
  (Senior Dev · Design · Deployment · Institutional · Security), plus QA + Product/Copy,
  with more teams (DBA, Backend/Agent-Runtime, Compliance, Kernel, SRE, Customer Success)
  mapped pre/post in `SWEEP9_TEAMS.md`.
- **Gates (hard stops):** **GATE 0** — rotate the leaked keys + purge git history before
  any cohort. **GATE B** — no prod migration until your OA/GRIDS/COMH align.

## 9. Security you must never relax (the leak surface)
On a multi-tenant, AI-powered product, an AI that answers beyond its lane **is a breach.**
The control that actually holds is **least-privilege context** — the AI only ever *sees*
data the user is allowed to see, scoped server-side from their identity; a perfect
jailbreak reveals nothing that was never in the context. On top: server-side scope,
"bills/messages are data not instructions," and a red-team suite that must pass before
cohort. Wire this the moment the agents become real LLM calls, not after. (SWEEP9 §9.0.)

## 10. Access & POV — who can reach what (heads-up: demo HIDES this)
Four points-of-view, each locked to its own lane: **Owner** = everything in THEIR
tenant · **Sales/Consultant** = their pipeline · **Installer** = their jobs ·
**Customer** = only their own project. Route-level gating is built (`ProtectedRoute` by
role) — **but everything you've been shown runs in DEMO mode, which BYPASSES the gate**
(that's why you can flip Owner/Consultant/Installer freely). In production (demo off)
the gate applies; the DB-level lock (RLS per role/tenant) is still to be PROVEN. A
separate layer — **plan entitlements** (which features a paying tier unlocks) — isn't
built yet. All three (demo-off, RLS proof, entitlements) are pre-launch. (SWEEP8
A9/A10/A11.) *Why this only surfaced now: I'd been working in demo the whole time, which
turns the gates off. A senior team flags that first — my miss.*

## 11. Product & business-model — open threads (Cal, 30 Jul)
Strategic calls not yet made — YOUR decisions, flagged so they stop being invisible:
- **Single simple product (start → grant)?** Worth seriously weighing. But strip the
  ACCIDENTAL complexity (role sprawl, the second offer, demo cruft) — NOT the essential
  complexity (the compliance moat: one record into NC6/NC7). "Start→grant" *without* the
  install/compliance is a commodity calculator anyone can clone; the defensible wedge is
  the bill-read + grant + **the NC completion**. Simplify the SHAPE, keep the moat.
- **Financing.** Not built. The single biggest conversion lever ("€89/mo finance vs
  €127/mo saving = cashflow-positive from month one") + the commercial ACA case. Needs a
  lender integration + the finance line in the estimate. Real feature, real revenue.
- **SaaS billing — 7-day free trial + card.** Not built. `create-checkout` / Stripe
  exist for CUSTOMER deposits, but the AISolar SUBSCRIPTION (trial → card → recurring) is
  a different Stripe flow (Stripe Billing, trial period). You cannot charge installers
  without it. Ties to A1 (signup/onboarding).
- **Single product (start→grant) — the decision:** NOT as a permanent product that STOPS
  at grant (that's a commodity calculator — the moat is the compliance past it). YES as
  the **launch beachhead**: launch simple on bill→grant (the hook, mostly built), ship
  **NC6 compliance as the fast-follow** (the barb that locks installers in). Kill the
  *shape* complexity (4 role-worlds, the AITeam 2nd offer, demo sprawl); keep the *depth*
  into compliance. One product, one buyer (the installer): "bill to grant," delivered
  through to compliance.

- **NC6 — everything it needs to complete itself (17 data points, 5 sources):**
  - **A. Identity & site (6):** name, address, eircode, MPRN, phone, email → bill/lead. ✅
  - **B. Supply & system (4):** supply type (survey), panels, DC kWp, battery → survey+proposal. ✅
  - **C. Fitted/commissioning (5):** inverter model, serial, AC rating, export limit, mismatch
    flag → AIField commissioning gate. ✅ (the 30% that was blocked; now flows on crew confirm)
  - **D. Installer/RECI (2):** company, **RECI number** → Settings. ⚠️ RECI NOT persisted (A4).
  - **E. Pages 3–6 (protection / ELS / earthing / declarations):** NOT mapped — overlay only
    covers pages 1–2. Signature ✅ (eIDAS drawn). **This is the true "entirety" gap.**
  - **The real last 30% = D (RECI from Settings) + E (map the checklist's protection/ELS/
    earthing fields to NC6 pages 3–6 + full box coverage).** Commissioning + signature: done.

---

## The launch-critical shortlist (what actually blocks go-live)
1. **A1 — auth + tenant signup** (you can't onboard a paying installer yet).
2. **A2 — lead creation** on the tenant's capture surface → `ingest-lead`.
3. **A9 — POV gating enforced** (demo OFF + RLS per role/tenant proven) — nothing ships with auth bypassed.
4. **A10 — remove dummy data** (18 files read the demo generator; prod reads real data).
5. **GATE 0** — rotate keys + purge git history.
6. **D1 — deploy scheduler-v2** (middle agents from "stamp" to "decide").
Your middle is strong; the funnel's two ends **and the access gates** are the real blockers.

---
*Living doc — I add an attribute here each time we go deeper into the infrastructure.*
