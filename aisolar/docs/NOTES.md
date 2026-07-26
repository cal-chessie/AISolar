# NOTES — running edit log

> Protocol (Cal, 2026-07-25): whenever Cal ends a sentence with `.notes`, the
> item gets appended here so we can come back to the edit later once he has
> spotted it along the way. Newest at the top. Clear an item when it's done.

## Open

- **Domestic-vs-commercial (the grant driver) comes from the BILL, not the survey.** _(Cal, 25 Jul)_ — the bill read already knows if it's domestic or commercial (tariff, account type, MPRN profile), so `seaiPropertyType` must be seeded from the **bill/intake** at the estimate stage; the survey only CONFIRMS it. Two consequences: (1) the **bill extraction must capture/infer domestic-vs-commercial** as one of its fields (currently the 21-field extract has no explicit property_type — GAP; infer from tariff/account or add a field). (2) The **estimate is inherently pre-survey = an estimate** ("(est.)"), so don't chase false precision there; the survey makes it accurate. Wired `seaiPropertyType` (in `seaiPipeline.ts`) into LeadFlow/EstimateView/ProposalView reading intake(bill) → survey-confirm, replacing the hardcoded `'domestic'`. Grant: domestic caps €1,800 (12 kWp too); same 12 kWp commercial ≈ €4,800 (NDMG).
- **→ Survey rewrite spec is now `docs/SURVEY_REWRITE_BRIEF.md`** (Hermes-verified, mode-aware, kills the occupancy-0.70 root cause + gear duplication). That brief supersedes the polish notes below — build the survey against it: 8-step reorder (Confirm mode-aware / Occupancy HERO / Wants / Roof+Shading merged / Electrical / Installation / Photos / →Studio handoff), no gear fields in survey, and the critical fix (drafter must use `selfConsumptionFromOccupancy`, not 0.70). Step 1 template approved; `SurveySection` helper built; the in-progress step-2 Goals rebuild is superseded by the reorder.
- **NEXT UP — Survey needs a COMPLETE REWIRE, not a polish (`SiteSurveyForm.tsx`, 1057 lines).** _(Cal, 25 Jul: "the subset survey needs a complete rewire bro, it's all over the place, the logic is chaotic". Proof: the Goals step renders BLANK.)_ **Step 1 (Customer Info) IS the approved template** — Cal: "restructured, love it" (clean summary card: avatar header + high-contrast `dl` grid + `label-micro`, NOT faint disabled boxes). **Rebuild steps 2–7 from scratch to match that template**, with clean step state/render logic (the current chaotic switch is the problem). Consider extracting each step into its own small component. The building-type dropdown was a DUPLICATE of the "What kind of building is this?" toggle — removed (keep the toggle only; it's bill-driven → `seaiPropertyType`). Apply everything learned today, best 2026 product design, "make it sing":
  - **Per-step family identity** — the 7 steps (Customer / Goals / Roof / Environmental / Electrical / Installation / Photos) each get a family tone via the shared `cockpitUi` TONE (icon chip + accent), so the survey reads by hue not one grey form.
  - **cal.com inputs** — swap the ad-hoc `h-12` inputs/selects for the design-token controls (`h-control`, `rounded-control`, clean focus rings); tighten spacing (cal.com density), fix the info callout (`bg-primary/5` → family-tinted).
  - **A live "what we know" strip** — a KPI-style summary (system size / occupancy read / recommended gear) that fills in as the consultant works, so the survey feels like it's building the design in real time (ties to the studio).
  - **The occupancy questions sing** — `household_occupants` + `home_during_day` drive the whole financial story; make them the hero moment (they set self-consumption → savings).
  - **Products inside the survey with recommendations** (Cal's note) — the `recommended_panel/inverter/battery_model` fields become the family product cards (reuse `DesignStudio`'s `GearPicker` / `ProductSnapshot`), recommended off the survey data. Add **warranty as a field** on the product input (Cal's note).
  - **Responsive incl. TABLET** (Cal: "tablet is the money") + **dark-mode-safe** (no `bg-primary text-white`; the existing toggles already use `text-primary-foreground` — keep that).
  - Preserve ALL react-hook-form wiring, the Supabase save (`site_surveys` / `survey_photos`), `mapSurveyToProposal`, `sendStageChangeNotification`, `GuidedPhotoCapture`, `SurveyStepProgress`. Polish the render, not the plumbing.
  - **Family pass on EVERY LeadFlow step AND every survey sub-step** _(Cal, 25 Jul)_ — not just Estimate. Estimate ✓ done (KPI strip, coloured rows, calm booking). Still to do with the full family treatment: Survey (all 7 sub-steps), Design Studio (rebuild — see below), Proposal (+ fix £→€ `PoundSterling` icon, bring the crown-jewel `ProposalView` energy in), Send. Completed steps in the LeadFlow stepper now light up green (doc-deposit) ✓.
  - **Edit toggle on every step** _(Cal, 25 Jul)_ — the consultant checks each step is correct as they go, so every step needs an "Edit" toggle (like the Estimate's `editingEstimate`) that flips display fields to editable so any field can be corrected in place along the flow. Apply the same pattern to Survey steps, Design (orientation/pitch/models), Proposal (costs/discount).
  - Then: Design Studio polish (after Cal's own review + feedback), then Proposal/Financing family touch → send → final button/trigger/logic sweep, then Installer, then Owner, then AI Coach last.
  - **Design Studio phase-1 is LIVE** (`src/components/leadflow/DesignStudio.tsx`, wired into LeadFlow's design step) — Cal reviewing it now; phase 2 = drag-to-place panels on real Google Solar roof segments + live-roof read via edge-fn proxy. Old inline `DesignStep` in LeadFlow.tsx is now dead code, safe to delete.
- **AI Coach pass goes LAST, fed by all our notes + info.** _(Cal, 25 Jul)_ — the `RoleBasedAICoach` panel (the floating "AI Coach" on every surface, customer + consultant + installer + owner) still has the OLD design and hasn't had the artist's touch. Do it as the FINAL pass, after every surface + the design studio are built, so it's informed by everything we've learned this session (the family design system, the intelligence, all the notes). It's the layer that ties the whole product together — build it once we know the whole shape. Distinct from the customer AIChat portal (`CustomerPortalV2`, already redesigned).
- **BUILD SEQUENCE (Cal, 25 Jul):** (1) finish **Installer cockpit (AIField)** → (2) **FINAL DESIGN POLISH PASS — the artist's touch across EVERYTHING, Owner → Grant** → (3) **Sweep 8 (DB full-send)**. The polish pass is a dedicated phase, not ad-hoc: apply the design standard (family colour RED/YELLOW/BLUE/GREEN — yellow yes, amber never; cal.com density; KPI tiles; shared `cockpitUi`; full responsive incl. tablet; dark-mode-safe, no `bg-primary text-white`) to EVERY surface not yet done — **Owner cockpit, Grant flows (grant DoW / SEAI), NC6 / NC7 compliance, marketing pages, auth / onboarding**, and anything else — so the whole SaaS reads as one product end to end. Cal wants this standard "throughout the build from owner to grant." Done + verified so far: consultant Today / Insights / Calendar / Inbox, customer AIChat, products bundles. Then and only then, Sweep 8.
- **→ Sweep 8 DB wiring checklist lives in [SWEEP8_DB_WIRING.md](SWEEP8_DB_WIRING.md).** _(Cal, 25 Jul)_ — the running inventory of every frontend action that fakes the backend (toast/local/setTimeout) and needs real Supabase (tables, edge fns, triggers, notifications, magic links, payments, kernel events). Started with everything known this session + codebase; APPEND to it as installer + final build land, so Sweep 8's DB full-send is a checklist, not a memory test.
- **All customer interactions + chats must notify both ends.** _(Cal, 25 Jul)_ — every customer-facing interaction (chat message, callback request, doc action, stage change) should fire a notification to BOTH the customer AND the consultant/company, so neither side misses a reply. For launch, **email with a magic link** to open the relevant chat/thread is an acceptable channel (stays truth-pass: email only, NOT SMS/WhatsApp). Wire it into the existing Postmark path + `NotificationsBell` (consultant side already has a bell); customer side = email + magic link. Applies to `CustomerPortalV2` chat + the consultant Inbox.
- **All numbers must pass through the spine (one source of truth).** _(Cal, 25 Jul)_ — savings/cost/payback/production must be computed ONCE in a central place (the data spine / `leadIntake` engine) and READ everywhere, never recomputed ad-hoc per component. This is the root fix for divergences like the customer AIChat header showing €3,320 (occupancy-driven) while a legacy chat line in `buildConversation` says €3,272, and the earlier proposal masthead €2,727-vs-€2,108. Action: a single `computeQuote(lead)` (or similar) returning {annualSavings, paybackYears, twentyYear, production, selfConsumption, ...} used by CustomerProposal, ProposalView, EstimateView, CustomerPortalV2 header, and `buildConversation` messages. Ties to [[quote-engine-debt]] (computeQuote spec'd but built file-by-file).
- **Book a call should live inside the chat.** _(Cal, 25 Jul)_ — the customer's "Book call" is currently a quick-action button that opens cal.com in a new tab. It should happen IN the conversation like `SurveyBooking` already does (an in-chat cal.com card), so booking is part of the thread, not a detour. Decide: replace the quick-action, or have it drop a booking card into the chat.
- **AI learning loop needs to be programmed.** _(Cal, 25 Jul)_ — the self-learning loop is marketed but not built. Today: the "Wrong" buttons in `AgentWindow` (used in `ConsultantToday`, wired via `onCorrect`) capture a correction but dead-end in a `toast` — no persistence, no training signal, no owner report. Programme the full loop: (1) correction captured with context (which agent, which action, what was wrong, the fix) → (2) persisted as a training/feedback record → (3) feeds agent improvement (self-healing/self-improving: adjust prompts/rules or flag for retrain) → (4) surfaces to the OWNER as a "what the agents learned this week / where they're being corrected most" report. Ties to [[post-launch-workstreams]] (self-healing agents + self-learning→owner) and the agent-drain runtime. Distinct build; scope before touching.
- **White-label must replace ALL "AISOLAR" with the tenant brand.** _(Cal, 25 Jul)_ — anywhere the customer (and ideally staff) sees "AISOLAR"/"AISolar" as branding, white-label should swap in the tenant's brand via `useTenantBrand` (tb.name / tb.proposalCompanyName / logo). Known spots to sweep: `CustomerPortalV2.tsx` header ("AIChat by AISolar" — currently `brand.name`), the `AichatWordmark`, any masthead/wordmark/footers. `CustomerProposal.tsx` already does this right (uses `useTenantBrand`). Decide whether the product names ("AIChat", "AISales", "AIField") stay or also white-label. Cross-cutting sweep, do as its own pass.
- **HARD GUARDRAIL on the customer "Ask AI" — must not leak business intelligence.** _(Cal, 25 Jul)_ — the homeowner-facing AIChat (`generateAIResponse` in `src/lib/conversation.ts`, driven from `CustomerPortalV2.tsx`) must be fenced: it answers ONLY about THEIR own project (their savings, stage, paperwork, warranty, install date). It must refuse/deflect anything about pipeline, margins, other customers, internal ops, consultant coaching, agent internals, or system data. Needs an allowlist/refusal layer, not free text. NOT yet enforced — treat as an open security item (truth-pass: don't claim it's guarded until the refusal layer ships). Pairs with the audience filter already added to `buildConversation` (hides "opened proposal 4×" from the customer).
- **Customer AIChat (`CustomerPortalV2.tsx`, /my-projects) — the same love.** _(Cal, 25 Jul)_ Cal's notes, being actioned now: (1) chat box too far to the bottom — sprawls full-width/full-height, input a mile down; fix by containing it in a centred max-w column. (2) Header too basic — add the progress bar (progressPct is computed but was unused!) + the project numbers in family colour. (3) Documents feel flat — colour each doc card by type (proposal gold, contract blue, invoice/deposit green, warranty, SEAI blue) instead of all-grey. (4) The whole thing doesn't sing — family + cal.com polish throughout. Mirror the consultant Inbox's care. Keep savings occupancy-consistent with CustomerProposal (don't reintroduce a €2,727-vs-€2,108 mismatch).
- **Proposal + Financing get the artist family touch, then the send, then a final sweep.** _(Cal, 25 Jul)_ — `ProposalView.tsx` now carries the new intelligence (aerial, product snapshots + datasheets, occupancy lever, WOW money story, gate-check + append-only versions) but the CHROME is still mostly charcoal/grey + the doc-proposal frame. Give the proposal + the financing/money block the family colour + cal.com density (reuse `cockpitUi` Kpi/TONE) the cockpit now has. Then bring that same flavour into the SEND window (GateCheck). THEN one final sweep: check ALL buttons, triggers, and logic across the consultant flow (dead handlers, wrong routes, stale state, truth-pass). Also spotted in passing: ESB compliance row renders "Connection: string" (dummy `confirmed_inverter_type` = literal "string") — fix in the sweep.
- **Roll the family/cal.com design language across every surface.** _(Cal, 25 Jul)_ — the consultant cockpit revamp (family colour, KPI tiles, cal.com density, shared `cockpitUi.tsx`) is the template. Same treatment to roll out to: the **Installer cockpit (AIField)**, the **AIChat** (customer + consultant facing), and the **Owner cockpit** (do Owner LAST — "he might get jealous so we fall back on him"). Every tab should make the user feel "this is my home, I make serious money here, I love using it." Consultant tabs still to do: **Survey, Inbox** (Cal's "especially"). Done + verified (family colour + KPI strip + cal.com density, mobile/tablet/desktop): **Today** (`ConsultantToday.tsx`), **Insights** (`ConsultantInsights.tsx`, full revamp), **Calendar** (`RealCalendar.tsx`, added week-ahead strip). Shared design system lives in `src/components/consultant/cockpitUi.tsx` (Kpi, TONE, eurCompact) — reuse it for every remaining surface.
- **Products belong inside the survey, with recommendations.** _(Cal, 25 Jul)_ — the product catalogue shouldn't be a standalone tab the consultant hunts through; product selection should live INSIDE the survey flow, and the system should RECOMMEND products off the survey data (roof size/orientation/shading + occupancy + bill). i.e. after the survey captures the roof + usage, surface a recommended panel/inverter/battery set (with the reasons), editable by the consultant, that then carries into the proposal. Ties to [[cockpit-revamp-pending]] survey work and the Google design studio.
- **Warranty needs its own field on the product-category input.** _(Cal, 25 Jul)_ — when the owner adds/edits a product, warranty should be a first-class input field, not buried in a free-text `specs.Warranty` string (ProfessionalProducts SAMPLE_PRODUCTS) or hardcoded per model in `@/config/productCatalog` (`warrantyYears`). Add a numeric warranty-years field to the product add/edit form so it's captured on input and flows straight to the proposal snapshot (ProductSnapshot already renders `{warrantyYears}-yr warranty`). Ties into unifying the two catalogues (owner SAMPLE_PRODUCTS vs customer productCatalog).
- **Articulate the financials, savings + benefits for the WOW.** _(Cal, 25 Jul)_ — the money can't read as a fact sheet. First pass shipped `moneyStory()` (src/lib/proposalNarrative.ts): monthly cashflow back, ~% of current bill erased, free-power years after payback, and "€X ahead of doing nothing" over 20 years — one function feeding BOTH the consultant proposal and the homeowner's copy so they say the same thing. Keep pushing the copy + visual weight of this block; it's the WOW moment.
- **Customer growth loops (the referral engine).** _(Cal, 25 Jul)_ — (1) **Referral link in the homeowner's AIChat**: money-off for them + a referral fee for the referrer, all tracked. (2) **Testimonial/review link on a happy completion** → drives Google Business Profile reviews. (3) **Share-to-socials button** after completion, of the "perfect picture" the installer takes on completion. All customer-facing = the WOW + referral engine we agreed screams WOWWWWZA.
- **Audit what GATE 0 made us wrongly defer.** _(Cal, 25 Jul)_ — the keys ARE in `env.local`, so GATE 0 (rotate leaked keys before PROD deploy) does NOT block LOCAL building or verifying. Re-check everything a prior session deferred as "gated on GATE 0 / coxmtpnq / Maps Static key" and pull forward whatever is actually buildable now: precise roof render (Maps Static), cockpits on real data (coxmtpnq Supabase), AI Coach LLM wire, widget lead capture, drawn-roof persistence. GATE 0 stays a *deploy* gate, not a *build* gate.
- **AIField: the MAP is the star.** _(Cal, 25 Jul)_ — a super-intelligent map marking every client's property; one-click best routes + scheduling intelligence tuned for fuel economy and time saving ("finish early, get home today"); guided coach tips on where to improve; click a property → that customer's whole profile takes over the screen. Base flow underneath: today-in-order → tap Start notifies the customer → staged photo checklist (photos = the evidence pack) → serials captured once → triple-check fitted-vs-proposal → offline-tolerant sign-off.
- **Use cal.com's actual calendar booking + white-label throughout, front and back.** _(Cal, 25 Jul)_ — replace the ad-hoc booking/scheduling everywhere (marketing "talk to us" CTAs, survey scheduling, install coordination, consultation) with cal.com's real booking (embed / API), white-labelled to the tenant. Applies front-end AND back-end (the agent scheduler flows). Big cross-cutting integration; scope it before touching.
- **The kernel is also fully autonomous.** _(Cal, 25 Jul)_ — likely another pillar for the AIOS / Agents page copy, alongside Immutable · Cryptographic · Distributed. Consider "Autonomous" as a fourth beat or a supporting line.

## Done


## Survey step 1 is mode-aware (the consultation, not just a bill confirm)
- Bill on file -> the full 21-point BillReadPanel (name/phone/email + "17 details read" + day/night split) with an Edit toggle to correct any field the AI mis-read. This is the "brill" step 1, restored (stop writing over it).
- No bill (lead phoned in) -> "New enquiry" capture: editable name/phone/email + "Their electricity, from the call" (typical monthly bill / annual usage / day rate / meter) + eircode->address. The consultant keys the bill-equivalents live on the call. Either bill figure seeds the estimate.
- Detection: billReadCells(bill).length >= 4. New schema fields: contact_name/phone/email, monthly_bill, day_night_meter. onSubmit writes contact + monthly_bill + annual_kwh back onto the lead so estimate/drafter/proposal read the same figures.
- Building type moved OFF step 1 (was asked twice) and ONTO the Occupancy step, deposit-green active state. Occupancy stays the hero. Survey Status card removed (pointless).
- Eircode/address lives on step 1 (grab everything on the phone call), NOT re-asked in the Install step. Removed the duplicate Property Location lookup from case 6. Rule Cal set: capture each thing once, and the phone consultation on step 1 grabs all the data it can.

## Survey steps 5/6/7 rebuilt + photos moved per-stage (full family/cal.com pass)
- Electrical (5): thin — main fuse / grid connection / meter location, tech-blue SurveySection. GEAR DELETED (panel/inverter/battery/count/size z-fields removed from schema, onSubmit, logActivity). The Design Studio is the single source of gear now. surveyValidation no longer requires gear; it requires OCCUPANCY (the hero) instead.
- Installation (6): pop-red SurveySection "Getting a crew on the roof" (storeys/scaffold/attic/parking + styled existing-solar toggle) + neutral "Notes for the fitter" (availability/access/on-the-job/permits). Duplicate address lookup already removed.
- Photos are captured PER STAGE (Cal): roof shots on the Roof step, board+meter on Electrical, attic+inverter+access on Install. GuidedPhotoCapture now takes photoIds/showExtras/showHeader; retoned to family palette (tech SNAP button, deposit-green captured, pop-red "Needed" — amber removed). Final step (7) = "The photo pack": a status grid of every shot + an "Anything else worth a shot?" extras adder.

## DESIGN STUDIO — session 25 Jul (the cockpit build)
Full rebuild of the Survey→Design step into a real cockpit. State:
- **Layout**: two panes — map (~63% show-stopper) + compact controls below it; gear is the smaller side column. `Map left/right` flip toggle swaps sides AND column widths (wide column follows the map). Estimate/Survey/Design all aligned to `max-w-6xl` (survey no longer capped at 4xl). Map is `aspect-[16/9]` so the whole studio fits desktop (docH ~973 on 800).
- **Expand** = a cal.com-style CENTRED window (backdrop + X exit + backdrop-click close), NOT a full-screen cover. Inline map and modal both use the SAME aspect so the array holds its exact roof position between them.
- **Real satellite**: Google Static Maps with `center=<address>` (server-side geocode, no client CORS). REQUIRED: "Maps Static API" enabled on the Cloud project (Cal enabled it 25 Jul — was 403 "API not activated"). Keyless fallbacks explored: OSM Nominatim geocode works (CORS-ok); Esri World Imagery `export` does NOT (cached tile service, 500) — only its XYZ tiles work. `src/lib/roofImagery.ts` holds osmGeocode (kept for Solar coords).
- **Accurate panel sizing (make-or-break)**: panels drawn as a FRACTION of the map's real width (`arrayMetresW / (640 × metres-per-pixel)`), resolution-independent — accurate inline, expanded, flipped. Was a canvasW-stuck-at-680 bug (~11% too big). Per-panel dimensions now live in the catalog: `widthM / heightM / watts` on each panel; the SELECTED panel drives footprint + kWp. Every panel model is a different size.
- **Controls**: Panels / Columns (shape the grid, kills the mystery auto-layout) / Strings (splits across MPPTs) / Rotate / Fill. Persisted on `designData` (arrayX/arrayY/arrayRot/arrayCols/strings).
- **Gear tidy**: uniform 2-col grid, clean names (`maker + wattage`, SKU dropped to the secondary line). Cal wants only **2 options per category** (in progress).
- **Real production (spine)**: `annualYieldFactor()` + `annualProduction()` added to `leadIntake.ts` — derates the flat 950 kWh/kWp by orientation / pitch / shading (handles both shading vocabularies none/light/moderate/heavy and none/minimal/partial/significant). A north-facing shaded roof no longer reads like a south one. **MUST also run in the ProposalDraftAgent so the proposal reads the same (numbers-through-spine).**
- **Done button**: design step ends with "Design done, build the proposal" (Cal wants it + the money moved UP the right column).

### Colour / token decisions (25 Jul)
- `--doc-proposal` reverted to gold (48/40 hue) — a TRUE yellow failed the white-background readability test ("yellow is not looking good on white", "dump the yellow"). `--brand-accent` remains the family true-yellow but isn't used for text on white.
- Survey step family-colour map (Cal, exact): Confirm=blue, Occupancy=green, Goal=green, Roof=blue, Electrical=blue, Install=red, Photos=red. Sub-stepper chips light up in each step's colour (STEP_TONE in SurveyStepProgress).

### TOMORROW's build (Cal, deferred explicitly)
1. **Strings spawn their own arrays** — multi-array data model: `arrays[]`, each with its own position/rotation/cols/count/string; the studio does the string math; adding panels beyond a roof face flags/spills instead of overhanging.
2. **Movable + zoomable map** — an interactive satellite layer (MapLibre GL or similar) so you can pan, zoom and frame bigger houses (current static image can't — "45% is not enough on some houses"). Arrays anchored to geo-coords.
3. **Open on a smart default** — drop the studio in with a sensible array already placed (Google Solar max, or bill-sized). Cal: "if the max actually works on every roof then we got something really special."

### TODAY still open (in progress, agreed order)
- Gear → 2 per category (clean single row).
- **Money on the design** — surface the money (annual/monthly saving, coverage, payback, grant) prominently and MOVE IT UP the right column; the design is where the customer leans in.
- **Good-better-best** — flip between 2-3 designs (essentials / recommended / max, or with/without battery), each showing its money instantly. Biggest sales lever.

### Known / flagged
- Google Solar `buildingInsights` (panel-fit "Fill the roof") is a browser fetch → CORS-blocked on localhost; proxy through an edge function for production (googleSolar.ts already flags). The IMAGE is unaffected.
- Minor: first KPI value ("10.6 kWp") wraps to 2 lines on narrow KPI cards (tablet 4-up / mobile 2-up) — shared Kpi component, left as-is.

## .note (25 Jul) — add a string = panels on ANOTHER roof
TOMORROW: the multi-array/strings work must let the consultant **add another
string to put panels on a different roof face**. Framing Cal wants: one string
per roof (front / back / side), each its own placeable array, and the studio
does the string math across them. This is the concrete shape of the
`arrays[]` model already listed for tomorrow — a string IS a roof's array.

## .note (25 Jul) — SEAI grant mix-up (fix tomorrow)
The studio's new System-cost card uses `domesticSolarGrant(kWp)` unconditionally
(caps €1,800 for any domestic ≥4kWp). WRONG when the property is commercial
(NDMG ~€4,800 for 12kWp) or when the grant should be bill/property-type driven.
TOMORROW: make the grant property-type aware — `seaiPropertyType(...)` off the
BILL read (not the survey), choose domesticSolarGrant vs calculateNDMG, and run
it through the spine so estimate + studio + proposal all show the same grant.
Cross-links the existing "logic is the bill not survey" note.

## .note (25 Jul) — per-product pricing
Diverter + EV charger now carry a `price` in the catalog and are added to the
studio gross cost (they previously didn't move the price at all). BROADER TODO:
migrate ALL gear to per-product prices in the catalog and have the cost math
read them, instead of the flat per-kWp / per-kWh model in pricing.ts. Must stay
reconciled with the ProposalStep breakdown (line items → grossCost) so the
studio and proposal agree — do this alongside the numbers-through-spine work.

## Moat + deployment readiness (25 Jul) → docs/READINESS_AND_MOAT.md
Full senior-dev assessment written up. Headline moat move for tomorrow+: wire the
LEARNING LOOP (consultant corrections + proposal outcomes + install results →
train the system, aggregated cross-tenant via the kernel, no PII). Plus:
compliance autopilot (NC5/6/7 + grant packs + RECI), the traceable-number chain
surfaced on the proposal, owner-level aggregate intelligence. Readiness P0
blockers before any real user: GATE 0 key rotation (Maps key now ships in the
bundle — restrict or proxy), RLS audit, demo-mode guard, Ask-AI guardrail.

## NUMBERS ACCURACY SWEEP — 26 Jul (computeQuote lands)
ONE engine now: `computeQuote()` + `ratesFromIntake()` in leadIntake.ts. Studio,
ProposalView, CustomerProposal, portal header all call it. Bill-aware rates
(day 0.36 off Sarah's bill, night 0.17), supplier CEG table + `cegRate()` in
seaiPipeline (Pinergy 0.20; TENANT-CONFIG, verify at onboarding), battery
night-arbitrage (IE_ENERGY.BATTERY_CYCLES_PER_YEAR=200), commercial VAT 13%
IN the maths (VAT_COMMERCIAL), NDMG for commercial, add-ons in gross+net,
dual payback lines (with export / self-use only), versions snapshot numbers,
EstimateView sc occupancy-driven, dead DesignStep deleted (167 lines, 2 dup
formulas), docTemplates yield fallback derated, quick actions (Size to bill).
Verified in-browser: €2,833 self-use + €344 CEG + €192 arbitrage = €3,369 ✓.
Remaining known delta: stored proposal.system_size_kw vs live design until
Sweep 8 persists the design. NOT PUSHED — awaiting Cal's yes.

## THE REAL BILL TEST (27 Jul) — Cal's own Electric Ireland bill
Page 1 of a REAL major-utility bill has: account no, MPRN, supplier, billing
period, usage comparison, VAT, total, reading type. It does NOT have: eircode
(rural townland address), unit rates, tariff name, day/night split — those live
on PAGE 2. Consequences shipped today:
- Bill upload now asks for FRONT AND BACK (multi-file dropzone; extract-bill-data
  v4 accepts imagesBase64[] max 2, back-compatible with imageBase64). Deploy the
  edge fn on next supabase functions deploy.
- Eircode capture in THREE deliberate places: Estimate (View now SAVES it to the
  lead, not map-only state — "do both at the same time"), Survey Confirm ("The
  bill didn't show these" gap section: eircode / day rate / annual kWh, in the
  open, not behind Edit), Design Studio map header (add/edit chip, re-geocodes).
- Honesty: copy already says "up to 21 details" and every panel counts what was
  ACTUALLY read. Keep it that way.
- RULE: customer bills are PII — never commit bill images or their data to the
  repo. Cal's bill was design input only.

## ROADMAP (Cal, 27 Jul) — the order to the finish line
1. Design Studio: smart default + good-better-best (remaining two).
2. STAND-UP: what would make it world class. Then HARDEN.
3. Proposal + AIField (installer) second to none.
4. Owner cockpit full walkthrough (or he gets jelly).
5. Finish Sweep 7 (content/marketing layer), then every sweep fine-tooth comb.
6. SWEEP 8 VERY LAST. Cal has something IMPORTANT AND DEEP to share when we get
   there — bring the best self, keep good notes between now and then.
STANDING ORDERS until then: migrations best-practice (idempotent, add-only),
watch for old bleed from earlier AI passes, fix bugs on sight, harden as we go,
tighten to world-class where it's the right call, remove leftover crap. Cal
lost his senior dev and is trusting us with deployment-readiness standards —
READINESS_AND_MOAT.md is the checklist; keep it current.

## Products page (27 Jul)
- Add product + Edit product (pencil on every card) shipped — full form
  (category/maker/model/desc/cost/RRP/stock/SEAI/photo), localStorage demo
  persistence (aisolar_custom_products + aisolar_product_overrides), margin
  computed live. Sweep 8: move to the products table with photos in storage.
- REAL product images are the TENANT'S to upload (manufacturer/distributor
  imagery they're licensed to use) — the per-kind SVG illustrations are the
  default so nothing ever renders empty. We do not scrape manufacturer photos.

## .note (27 Jul) — battery size must come from the battery MODEL
designData.batterySize (survey confirmed_battery_kwh || 5) can disagree with the
selected battery product (deal strip says "Tesla Powerwall 3 (13.5kWh)" while
arbitrage prices 5 kWh). Morning fix: batteries carry their kWh in the catalog
(parse spec or add kwh field); picking a battery sets batterySize. Keep quote
identical across studio/proposal/send (kWp rounding standardised to 1dp today).
