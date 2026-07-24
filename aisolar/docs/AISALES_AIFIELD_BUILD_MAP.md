# AISales + AIField — build map

_Written 2026-07-24 for the next session. Cal: "it should be even better than the
customer's play tool."_

---

## 1. Is the front door pointed through to the grant? — YES, architecturally

Traced in code, not assumed:

| # | Link | Status | Evidence |
|---|------|--------|----------|
| 1 | Front door → lead | **Wired** | `/start` callback now calls `captureLead()` → `ingest-lead` (commit 7516fad) |
| 2 | ingest-lead → `leads` + `lead_intake` | **Built** | `ingest-lead/index.ts` — "Inserts into `leads` (+ `lead_intake` when bill data is present)" |
| 3 | lead_intake → agent queue | **Built** | DB trigger `trg_enqueue_lead_intake` enqueues the lead_intake agent |
| 4 | Agents advance the pipeline | **Built** | `agent-drain` — intake → survey → proposal → install → invoice |
| 5 | Survey → proposal (confirmed_*) | **Built** | migration `20260722_survey_handoff.sql` copy trigger; proposal drafter reads `confirmed_*` first |
| 6 | Proposal → SEAI grant | **Built** | `finishProposalDrafter(... seaiGrant ...)` then agent `grant_submitter`: "preparing and tracking the application" |
| 7 | Grant + ESB pack | **Built** | `decideCompliance()` → NC5/NC6/NC7; PaperworkWindow renders the pack |

**So: the rails are laid the whole way from the front door to the grant.**
Nothing in the chain is missing or hand-waved.

**What is NOT true yet — the two honest gaps:**

- **Nothing is deployed.** The edge functions aren't live on `coxmtpnq`, so
  every call fails. It now fails *visibly* rather than lying (7516fad).
- **The cockpits read demo data.** `ConsultantCockpitV5` and the installer
  portal both call `generateDummyLeads()`. Even once leads exist in the DB,
  those screens won't show them until they're switched to real queries.

**Blocking item:** `ingest-lead` authenticates with a shared secret
(`x-ingest-key`). Fine server-to-server, unusable from a browser. Needs either
an anon-callable first-party path or a thin rate-limited public sibling that
forwards server-side. **Decide this before wiring anything else to it.**

---

## 2. AISales — the closer's cockpit

Today it's the strongest surface we have (pipeline, inbox, calendar, documents,
engagement intelligence, the conversational coach). The gap is that it runs on
dummy data and stops at "here's the situation" rather than "here's the move".

### Build list
1. **Point it at real data.** Replace `generateDummyLeads()` with a real query;
   keep a demo-mode flag so the tour still works. This is the single highest-value
   change — everything else is decoration until this lands.
2. **The estimate the customer built must arrive.** The `meta` we now send with
   `captureLead` (system size, net cost, saving, grant, payback, bill fields,
   eircode) should render at the top of the lead so the consultant opens with
   the customer's own numbers and never re-asks.
3. **Drawn roof persistence.** Still the open item from earlier: store the
   eircode-anchored box (position/size/angle/rotation) on `lead_intake` so the
   consultant and the proposal re-render the exact roof the customer drew.
4. **One-click next action.** Consultant Intelligence already computes the
   bottleneck and the next move — make the next move a *button* (book survey,
   send proposal, chase deposit), draft-first.
5. **Quote editing.** The consultant needs to adjust panel count, add a battery,
   change the product, and see margin — then push to proposal. Today the
   proposal is drafted by an agent and reviewed, but not edited in-app.

---

## 3. AIField — the crew app (Cal: "it does nothing beyond the grandfathered survey")

He's right. The installer portal has job tabs, a map, materials and a survey
form, but a crew's actual day isn't supported end to end.

### What a solar crew's day actually needs
1. **Today, in order.** Stops in time order, drive time, who's on the van,
   what's loaded. (Partly exists — needs to be the front screen.)
2. **Start job → customer told automatically.** The moment a crew taps Start,
   the homeowner gets "we're on the way" with prep steps. (Marketed on the
   landing page; must actually exist.)
3. **The install checklist, staged.** Pre-install → roof → electrical →
   commissioning → handover, each with required photos, each gating the next.
   Photos are the evidence pack, not decoration.
4. **Materials off the van.** What was fitted vs what was planned (serial
   numbers for panels/inverter) — this feeds the warranty pack AND the ESB/RECI
   paperwork, so capturing it once kills a whole category of admin.
5. **Certs and sign-off in the field.** RECI/electrical sign-off, customer
   signature at handover, on the phone, offline-tolerant.
6. **Exceptions.** "Can't complete today" with a reason → reschedules the job
   and tells the customer why, in plain words. This is where trust is won.
7. **Offline-first.** Irish roofs, rural sites, bad signal. Queue writes and
   sync — non-negotiable for a field tool.

### Sequencing
Screens 1–3 make it usable. 4–5 make it the compliance moat (they feed the pack
we already build). 6–7 make it trustworthy. Do them in that order.

---

## 4. Suggested order for next session

1. Decide the `ingest-lead` auth model (blocks everything else). 
2. AISales onto real data + show the carried estimate.
3. AIField screens 1–3.
4. Drawn-roof persistence (serves both).

Everything above is buildable against the schema that already exists; only the
deploy is gated on GATE 0.
