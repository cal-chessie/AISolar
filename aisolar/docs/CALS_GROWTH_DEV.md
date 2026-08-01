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

## ⚠️ Quote-engine drift — deep-clean findings (1 Aug, "eyes & ears" pass) — LAUNCH-RELEVANT
The proposal **DRAFTER** (`agent-drain` edge fn — it *stores* the proposal; the contract + invoice rest on that number)
carries a hand-copied mirror of the quote math that has **drifted from the corrected frontend engine** (`computeQuote`).
Deno can't import `src/`, so the mirror was copied by hand and fell behind. **Five drifts, stored ≠ shown:**
1. **Domestic grant is STALE** — drafter uses **€900/kWp** flat (`min(kwp,2)*900`, cap 1,800); the *verified* rate is
   **€700 first-2kWp / €200 thereafter, cap €1,800** (`seaiPipeline.domesticSolarGrant`). Drafter over-states the grant on systems < ~4 kWp (e.g. 2 kWp: stores €1,800, real €1,400).
2. **Commercial VAT (13%) dropped** — drafter `grossCost = systemSize × PER_KWP`, no VAT line; `computeQuote` adds
   `VAT_COMMERCIAL`. A commercial stored proposal is **missing 13%.**
3. **Battery cost dropped** — drafter grossCost ignores `batteryKwh × batteryPerKwh`; a battery proposal stores a cost that's **too low.**
4. **Savings from the EARLY intake estimate** — drafter carries `intake.estimated_annual_savings` (computed at intake via
   the domestic-only `calculateSystemEstimate`, flat-0.70-ish), NOT recomputed occupancy-aware from the survey. **This IS
   the L2 "0.70" drift** — stored savings ≠ the occupancy-driven savings the customer is shown.
5. **`PER_KWP` hardcoded = 1800** in the drafter — not the tenant's pricing (see admin-pricing below).

**Root cause + fix:** the edge-mirror convention (Deno ≠ `src/`) let the drafter's math rot. Fix = **ONE source of truth**
— an edge `_shared/quote.ts` mirroring `computeQuote` EXACTLY (grant tiers · VAT · battery · occupancy · tenant pricing),
used by the drafter — OR the drafter stores what the frontend `computeQuote` produced. Institutional rule: *no two places
computing the same thing.* **Severity: launch-critical** (a signed contract on a wrong grant/VAT/battery figure is a real problem) → also flag on `DEPLOYMENT_CALS_LAST_GATE.md` §0 as the true scope of L2.

## Admin-settable equipment pricing (Cal, 1 Aug — "make it possible for the admin") — ✅ BUILT + verified 1 Aug
**Done.** The admin sets perKwp / batteryPerKwh / panelWatts in **Settings → Pricing & Terms → Equipment pricing**
(verified in-browser on the dev preview: edit a rate → Save → persisted to the dial `getPricingConfig` reads). One dial,
whole system:
- `getPricingConfig()` (`src/lib/pricing.ts`) reads the saved dial FRESH each call — localStorage today (offline-first,
  same shape as `financeConfig`/`tenantBrand`), so every estimate · design step · proposal · `computeQuote` moves the
  instant it's saved. brand.pricing → default remain the fallbacks.
- `savePricingConfig()` dual-writes localStorage **+** `tenant_settings` key `'pricing'` (via `pushTenantSetting`, which
  now admits the `'pricing'` key).
- The **edge drafter** (`agent-drain` → `loadTenantPricing`) reads the same `tenant_settings 'pricing'` for the lead's
  tenant → feeds `computeQuote({…, pricing})`, so the STORED proposal uses the tenant's rates too. This closes drift #5.
- ⚠️ **Cutover caveat (honest):** the `tenant_settings` write no-ops until a JWT carries the `tenant_id` claim (**A1**) —
  exactly like the other four owner settings. Pre-A1 the dial drives the on-screen frontend quote via localStorage while
  the edge drafter falls back to `DEFAULT_PRICING`; **post-A1 both the shown AND stored quote use the tenant's dial.** So
  admin-pricing is fully live the moment A1 lands (already launch-critical on the deploy doc).

**The right way to COMPLETE it (A1 — the proper development, not a shortcut):** the `tenant_settings` write needs the
request to carry the tenant. Three parts, developed as one workstream:
1. **JWT tenant claim** — a Supabase **custom access-token hook** injects `tenant_id` into every issued token, derived
   from the user's membership row. Then `pushTenantSetting` (reads `app_metadata.tenant_id`) writes for every authed
   owner and tenant-RLS scopes it — no per-call lookup. *(Interim-correct, not a hack: resolve `tenant_id` from the
   user's profile row on save until the hook lands.)*
2. **Onboarding stamps the membership** — owner signup / installer invite writes the user↔tenant row (service role) so
   the hook has something to read. This is the A1 auth/tenant-onboarding item on the deploy doc.
3. **Read-flip** — once tokens carry `tenant_id` and `tenant_settings` is populated, flip `serverStore` + the getters
   to read DB-first (localStorage-first by design today). ONE cutover — all five owner settings **and** the pricing
   dial go shown+stored together. Until then the dial is honest and correct on-screen (localStorage); only the STORED
   proposal waits on this.

**⚠️ SECOND blocker on the stored path (found 1 Aug, VERIFIED against live V5):** the `tenant_settings` CHECK allows
`proposal_terms`/`finance_config`/`tenant_brand`/`company_compliance` (4 keys — `20260730` added company_compliance). It
**rejects `key='pricing'`** (silently, via fire-and-forget `quiet()`), so the pricing dial never persists server-side.
*(Correction: an earlier note said company_compliance was rejected too — the live check shows it is allowed.)* The fix is
one idempotent migration adding `'pricing'` (the pattern `20260730` used) — ready SQL in `PAPERWORK_AUDIT.md` §1; Cal's yes ships it.

**And the tenant-resolution split (the real A1 nuance, verified 1 Aug):** RLS's `has_tenant_access` resolves the user's
tenant from the **`user_roles` table** (so tenant-scoping works TODAY, no JWT claim needed). But `pushTenantSetting`
resolves tenant from **`app_metadata.tenant_id`** (the JWT). So the owner-settings DB write no-ops until either the JWT
carries tenant_id (the A1 hook) **or** `pushTenantSetting` reads `user_roles` like RLS does — the latter is simpler,
consistent (one tenant source), and works now. Prefer aligning `pushTenantSetting` to `user_roles`.

## ⚠️ Classification schism — the stored≠shown ROOT (1 Aug, "eyes & ears") — FIXED
Domestic-vs-commercial (which picks the grant + VAT) was split across **two** fields:
- `property_type` (`residential`/`commercial`) — the survey's "home or business?", written by `SiteSurveyForm`, read
  by the whole frontend (Estimate · Proposal · Design · LeadFlow · surveyValidation) with fallbacks. **The real one.**
- `extracted_premises_type` (`domestic`/`commercial`) — added by the paperwork-engine migration, read by the edge
  **DRAFTER** + `complianceDecision`, **written by NOTHING.** Always null.

The drafter read ONLY the dead field with no fallback → `seaiPropertyType(null)` → `domestic` → **every commercial/farm
job was STORED as domestic** (lost NDMG + 13% VAT) even though the screen showed it right. That is the true root of
stored≠shown — deeper than the five quote drifts, because it silently killed the propertyType input they depend on.

**FIX (1 Aug):** unify on `property_type`. The drafter now reads `survey.property_type ?? intake.property_type ??
lead.property_type` — the frontend's own chain, so stored == shown. `complianceDecision` unified the same way.
The dead `BillReadPanel.premisesType` prop (which falsely claimed premises type is "read off the bill" — it can't be)
was removed. `extracted_premises_type` now has **0 code reads**; the COLUMN is inert — **deprecate it in-schema**
(`COMMENT ON COLUMN … IS 'DEPRECATED → use property_type'`), non-destructive, no drop. This is what actually
**finishes** the quote-drift fix.

## Why none of this is scary
Each is bounded: it ends at `ingest-lead` with a `source_key`. The tenant isolation, routing, attribution, and the
AIGate human gates all apply automatically. A new channel is a weekend, not a rebuild.
