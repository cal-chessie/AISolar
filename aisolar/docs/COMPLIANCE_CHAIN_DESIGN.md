# The compliance chain, thought out

_25 Jul 2026. Cal's brief: connect owner settings to grants AND proposal, hold
real manufacturing detail (not just datasheets), machine-check it twice and let
a human check it a third time with notes at the gate, capture the rest by photo,
put the remaining questions on the right form, be MCP-capable, and accept leads
from every marketing channel — not just the calculator._

---

## 1 · The principle that decides everything below

**Capture a fact once, at the moment someone naturally knows it, and let every
document read it.** Nothing typed twice. Nothing invented to fill a box.

Facts sort into four lifetimes, and the lifetime tells you where it lives:

| Lifetime | Changes | Home |
|---|---|---|
| **Company** | almost never | Owner → Settings |
| **Person** (installer/consultant) | on hire | Add/edit installer |
| **Product model** | on catalogue change | Product record |
| **Job** | every job | Bill read → survey → install |

Putting a company fact on a job form is why the RECI number was blocking every
NC6 at once. That's now fixed at the root: `companyCompliance` (one store, read
by every template).

**Cal's point about teams and sizes is the reason this matters.** A one-man
operation and a twelve-crew company differ almost entirely in the *person* and
*job* layers — company and product facts stay identical. Getting the split right
now means multi-crew works later without re-modelling.

---

## 2 · Owner Settings feeds BOTH the grant and the proposal

Currently the compliance store feeds the ESB forms. It must also feed:

**The SEAI grant application** — name, address, phone, email, **SEAI registered
installer ID**, CRO number. Today `DowTemplate` reads `seaiCompanyId` (now wired
to the store) but the grant application document itself should read the same
place, so one save fixes every open grant.

**The proposal** — the company block on a customer-facing proposal (registered
name, VAT, RECI, address) is the same data. A proposal that shows a VAT number
and a grant form that shows a different one is exactly the kind of thing that
loses trust at signing.

**Action:** one `getCompanyCompliance()` read in the grant application template
and the proposal header. No second source.

---

## 3 · Products: manufacturing detail, not just a datasheet link

A datasheet PDF is a document. What the forms and the warranty need is
**structured** data:

| Field | Needed by |
|---|---|
| **Manufacturer** (separate from model) | NC6 §5 has separate Manufacturer and Model rows |
| **Model / reference number** | NC6 §5, warranty pack |
| **Rated current (A)** | NC6 §5 — the "not to exceed 25A single-phase" check |
| **Capacity (kVA as well as kW)** | the form asks kVA |
| **Type-test certificate + reference** | NC6 §4/§5 requires it attached per inverter |
| **Protection settings profile** | NC6 page 3 table — standard per inverter model |
| Warranty years, datasheet | already held |

Entered once per model. Then every job using that inverter fills its own form —
including the page-3 protection table, which is currently unmappable because the
data doesn't exist anywhere.

**Serial numbers are NOT here** — they're per unit, captured in the field (§4).

---

## 4 · Serial capture, and the triple check

This is the part that makes the pack self-assembling, and Cal's "double check,
then a human triple check with notes at the gate" is exactly the right shape.

**Layer 1 — machine captures.** The crew photographs the inverter plate and the
panel labels (they already do this for the evidence pack). Same extraction we
use on bills, pointed at equipment: **manufacturer, model, serial**.

**Layer 2 — machine cross-checks.** The captured model is compared to what the
**proposal specified**. This is the layer that earns its keep:

- Serial captured but model ≠ quoted model → **substitution flagged**. The NC6
  would otherwise describe equipment that isn't on the roof.
- Panel count captured ≠ panel count quoted → array size wrong on the form and
  on the grant.
- Inverter kW ≠ design kW → **may change NC6 vs NC7**, which changes whether the
  job legally needed pre-approval. Loud flag.

**Layer 3 — human confirms at the gate, with notes.** The installer sees what
was captured, what was expected, and any mismatch, and either confirms or
explains. **The note is part of the record** — "SE5K unavailable, fitted SE6K
with customer agreement, ESB notified" is the difference between a defensible
file and a discrepancy nobody can explain a year later.

Nothing auto-passes. A mismatch cannot be cleared silently — that's the house
draft-first rule applied to compliance.

---

## 5 · The remaining form questions, placed

| Question | Where it belongs | Why |
|---|---|---|
| **"First microgenerator at these premises?"** (NC6 §2) | **Consultant survey** | The consultant is on site and can ask. A homeowner won't reliably know it from a form field. |
| **MEC / MIC** (NC7) | **Bill capture first, survey as fallback** | MIC is on the bill for many supplies; if the read misses it, the surveyor confirms. Never ask the customer to look it up. |
| Customer landline | Bill capture, survey fallback | same pattern |
| Eircode | Bill capture (exists, often empty) → survey fallback | currently the #1 blocker after RECI |
| **Signature** | **Installer sign-off at handover** | The pad already exists in JobViewV2. eIDAS simple electronic signature + the kernel's append-only event as the audit trail. |

**The pattern worth naming:** every field has a *primary* capture point and a
*fallback*, and the fallback is always a person who is already on site. The
customer is never sent to find a number.

---

## 6 · Marketing channels → onboarding (it won't always be the calculator)

Right now the calculator/`/start` is the only real front door, and `ingest-lead`
assumes a website form. That's too narrow. Leads arrive from:

- the embeddable widget on an installer's own site
- Meta / Google ads landing pages
- a phone call taken by a consultant
- an email or WhatsApp enquiry
- a referral or a partner site
- a physical event / walk-in

**Design:** one door, many sources. `ingest-lead` already stamps `source` and
`brand` — generalise it so **every** channel posts the same shape, and the
source is carried through the whole pipeline (it's also the only way to know
which channel actually pays).

**Each arrival triggers the same onboarding chain** — acknowledge, size from
whatever we have, request the bill if we don't have it, book the survey. The
chain shouldn't care whether the lead came from a calculator or a phone call;
it should only care what data it has and what it still needs.

**Two things this needs:**
1. A **manual "add lead" that runs the same chain** (a consultant taking a phone
   call must not be a second-class path — today `LeadFormDialog` adds a lead but
   doesn't obviously enter the agent chain).
2. **Source attribution on the lead**, surfaced in analytics. "Which channel
   produced signed jobs" is the question that decides marketing spend.

---

## 7 · MCP capability

Making the platform MCP-capable means exposing its data and actions as tools an
assistant can call — so the business can be asked questions and given
instructions in language, not just clicks.

**Read tools (safe, first):**
- `list_leads(stage, stale, hot)` · `get_lead(id)` · `pipeline_summary()`
- `compliance_status(lead)` → exactly what `esbReadiness()` already computes
- `grant_status(lead)` · `revenue_summary(period)`

**Write tools (draft-first, gated):**
- `draft_proposal(lead)` · `draft_customer_update(lead)` · `book_survey(lead, slot)`
- Every write produces a **draft** and returns what it would do. A human
  approves in-app. This is the existing house rule, not a new one — it maps
  cleanly onto MCP because "prepare, don't send" is already how the agents work.

**Why it fits:** `consultantIntelligence` and `coachBrain` already answer
questions off the real book of business. MCP is the same answers, exposed
outside the app. The honest sequencing is **read tools first**, and no write
tool that can send anything to a customer without approval.

---

## 8 · Build order

1. **§2 wire compliance into the grant application + proposal header** — small,
   and stops two documents disagreeing.
2. **§5 the four field placements** (first-microgen → survey; MEC/MIC + eircode
   → bill, survey fallback; signature → installer sign-off).
3. **§3 product manufacturing fields** — unblocks NC6 §5 and the page-3 table.
4. **§4 photo capture + the triple check** — the big one, and the one that makes
   the pack assemble itself.
5. **§6 channels → one door, source carried through, manual add runs the chain.**
6. **§7 MCP read tools**, then gated write tools.

Everything except §7 is buildable against the schema that exists; only the
deploy is gated on GATE 0.
