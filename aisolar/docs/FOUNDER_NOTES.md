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

---

## The launch-critical shortlist (what actually blocks go-live)
1. **A1 — auth + tenant signup** (you can't onboard a paying installer yet).
2. **A2 — lead creation** on the tenant's capture surface → `ingest-lead` (the funnel's
   front end; everything downstream is wired and waiting on a lead to exist).
3. **GATE 0** — rotate keys + purge history.
4. **D1 — deploy scheduler-v2** (turns the middle agents from "stamp" to "decide").
Everything else is polish or post-launch. Your middle is strong; the funnel's two ends
are the real blockers.

---
*Living doc — I add an attribute here each time we go deeper into the infrastructure.*
