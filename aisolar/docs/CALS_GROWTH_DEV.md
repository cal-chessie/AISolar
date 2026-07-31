# Cal's Growth Dev — the post-launch growth backlog
### Growth-stage lead-gen, integrations, and expansion. **NOT day-one.** The core front door (widget · share link · CSV · manual · API) covers launch. This is what comes *after* the cohort proves the core. Opened 31 Jul 2026 at Cal's call.

> **The unifying principle:** every item here is just **another door into the same keyed pipe** — it resolves a
> `source_key` → tenant + brand + `origin_brand_id`, then flows through the exact routing (gate_bridge + AIGrids) and
> security floor already built. **No new plumbing — only new doors.** That's why growth is cheap here.

## Lead-gen integrations (more doors)
- **Facebook / Instagram Lead Ads connector** — installers run FB/IG lead ads; pull the leads via the Meta API →
  ingest through the brand's `source_key`. High-value: it's where a lot of solar demand actually is.
- **Google Lead-Form Ads connector** — same shape, Google Ads lead extensions → the keyed pipe.
- **Call-tracking** — a tracked number per brand; an inbound call → a lead (with the recording/transcript as a
  touchpoint). Solar is phone-heavy; this captures the calls the widget misses.
- **Email-forward parsing** — a per-brand inbox; a forwarded enquiry → parsed → ingested. For installers who get
  leads by email today.
- **Zapier / webhook recipe** — the door is *already* an authenticated API; publish a Zapier template so any
  installer can wire their own CRM/tools with no dev.

## CSV import — the agent layer
- **v1 (launch, core):** simple upload → map columns → insert via the door key. (Lives in the core, not here.)
- **Growth (here):** an **import agent** — smart column-mapping, dedupe against existing leads, address/eircode
  normalisation, light enrichment. Ship when import volume earns it.

## Expansion
- **Cal.com booking** — survey/consult scheduling wired into the onboarding flow (pairs with the onboarding-flow
  polish that's tagged "with marketing").
- **Referrals → reviews → social** — the growth flywheel (a happy install asks for a referral + a review, which
  feeds social proof back into the funnel).
- **Ad-spend attribution** — tie FB/Google spend back to routed, closed leads, per brand, in the owner dashboard.

## More — my picks (Cal: "anything else you think")
- **Reviews & reputation** — auto-request a Google/Trustpilot review after a signed-off install; surface the best on
  the tenant's site + the calculator. Solar buyers check reviews hard — this compounds trust into conversion.
- **Wholesaler / distributor portal** — your SolaX angle made real: a distributor forwards leads to their installer
  network through one keyed door and watches the shelf move. Fits the Leinster-exclusive play directly.
- **Cross-tenant benchmarking (anonymised)** — "your close rate / avg system size vs the network." A data moat only a
  multi-tenant OS can offer; owners love it, and it never exposes another org's leads (aggregate only).
- **Finance at the proposal** — solar-loan / financing options on the proposal (a real close lever — a monthly figure
  beats a lump sum). An integration, not new core math.
- **SMS / WhatsApp follow-up channel** — a genuine future channel installers ask for. ⚠️ **TRUTH-PASS GUARDRAIL:**
  never named in any copy, toast, or checklist until it is actually built **and** live. Listed here as a thing to
  *build*, never a thing to *claim* — the same line we hold everywhere.
- **Britain jurisdiction pack** — the clone test (SEAI→UK grants · Eircode→postcode · ESB→DNO). Expansion once Ireland's proven.

## TEACHING — the agent runtime in plain words (Cal: "mark it teaching", for users + marketing)
How to explain the agents to an owner or a prospect, no jargon:
- **A relay, not a scrum.** A lead moves through stages; at each stage *one* agent does *one* job and hands off. They
  never trip over each other — a queue serialises them (jobs claimed atomically, one drain on a 1-minute timer).
- **The agents:** *intake* (scores + estimates) → *survey scheduler* (books the visit) → *proposal drafter* (writes the
  quote) → *install coordinator* (schedules the fit). Each owns its stage.
- **They can't run away.** The risky moves — send a proposal, take a deposit, submit to ESB, release a national lead —
  always wait for a human button. Agents draft; people decide.
- **They don't break on a bad day.** If the AI model is down, agents fall back to safe deterministic text — the lead
  still moves.
- **You train them, you don't rebuild them.** Each agent's voice is a prompt in config — tune how your proposals read
  or how the coach talks, no developer, no deploy.

## Develop-later / gaps (Cal: "lots of places we still need to develop — note")
- ⬜ **AIGate human surface** — the national gate-call (send-to-county / keep / pool) records but has **no cockpit yet**.
  MUST exist before national leads flow. Pairs with **AI Coach in the loop** prompting the human through it.
- ⬜ **Notify-all-parties completeness** — stage-notification plumbing exists; every party getting the right message at
  every step is the onboarding-flow polish (with marketing).
- ⬜ **Agent enrichment** — deepen each agent's thin spots as real leads reveal them.
- ⬜ **Owner agent-training UI** — where an owner tunes prompts + watches the agents learn alongside them.
- ⬜ **AI Coach → conversational** — the coach prompting + speeding the human at every gate ("speed up the human").

## The training model — Cal's design, noted as INTENT (build TO it)
The workers **train** the agents by using them; the owner **observes** and adjusts. Both are extensions of each other —
a consultant/installer nudges an agent when it's unsure, the owner watches the pattern and tunes the prompt if needed.
⚠️ **Not surfaced to the user yet** — the "this agent needs a hand / here's how it's learning" surface is the
owner+worker training UI on the gaps list. **Build to this model, not around it.**

## The kernel — why it's more than a ledger (teaching)
AIGrids decides · gate_bridge remembers · **the kernel makes it constitutional:** sealed, hash-chained, immutable
evidence a stranger can verify *without trusting anyone*. That unlocks uses beyond the app — e.g. a **VPP**: the
attested install records become **provable capacity you can trade on**, because the evidence holds independent of who
asserts it. *The evidence outlives the author.* (Phase 2 — post-cohort.)

## Onboarding demo — a lead of each type (Cal's idea, noted)
A curated demo set — **one lead per type: NC6 · NC7 · commercial · domestic · farm** (+ the one or two edge cases) — so
every new user *and* each cohort installer practises the **whole flow** on realistic leads before touching a live one.
The best onboarding + training tool we can hand them. (Demo mode already exists; this is the curated content for it.)

## Website integration = the LIVE / LAUNCH SIGNAL (Cal, noted)
The door wired into the **actual** brand sites — national (RI/SI) + Saunderson / Wide Awake / Solar Roscommon — is both
**practical** (real leads in the field) and **the go-live moment itself.** When the real domains carry the widget/link
and a real lead lands attributed, we're launched. (On the deploy checklist as the launch signal.)

## AIGate human surface — POST-LAUNCH (global brand)
The national gate-call cockpit (send-to-county / keep / pool) + notify + AI-Coach prompt. **Not launch-blocking** — the
first installer cohort never hits it (their leads are county/independent-born, held locally). Build when the global/
national brand goes live. Pairs with **AI Coach in the loop** prompting the human through each call.

## Why none of this is scary
Each is bounded: it ends at `ingest-lead` with a `source_key`. The tenant isolation, routing, attribution, and the
AIGate human gates all apply automatically. A new channel is a weekend, not a rebuild.
