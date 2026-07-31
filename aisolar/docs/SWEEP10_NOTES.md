# Sweep 10 — Final Polish + Launch Hardening + GTM (the prep doc)
### The last mile after 8+9. All the logic pulled forward 31 Jul from ROUND4 (code-verified 25 Jul) + Sweep 9.2/9.5/9.6 + the master plan — so Sweep 10 is **execution, not re-diagnosis.** Cal: "pull up all the logic so we don't think it through again."

> **Sequence (master plan):** 8 (wire+deploy) → 9 (smooth+harden) → **10 (final polish + GTM)** → **Go-Live** (Roscommon
> end-to-end · Renewably outreach · train the consultant). Truth-pass / DO-NOT-CLAIM throughout. Skills: `sweep9-design`
> · `sweep9-product-copy` · `sweep9-institutional` (truth-pass arbiter) + `ui-ux-pro-max` + marketing skills.
>
> **Decide FIRST** (ROUND4 Part 4/6): *polish the demo, or connect real data?* Connecting changes what the screens
> show — so the **read-flip (§0 of the deploy doc) comes BEFORE this polish**, or we polish twice.

## ⚠️ STEP 0 — SWEEP 10 OPENS WITH A FULL RE-CHECK (Cal, 31 Jul)
**Before any polish or go-live, re-walk EVERY sweep and EVERY audit round** against the deploy doc §0 reconciliation —
confirm nothing was left behind:
- Sweeps **1–6** (done — confirm they still hold) · **7** + **7.1** · **8** (the ~45-item reconciliation) · **9** + 9-Teams · **10** (this doc).
- Audits: **SWEEP_AUDIT_ROUND4** · **FULL_SWEEP_AUDIT** · **FULL_AUDIT_30JUL** · **PIPELINE_AUTONOMY_AUDIT** · the **AIFIELD / CONSTITUTIONAL / ENGINEERING** audits.

The sweep docs are banner-marked *"reconciled → `DEPLOYMENT_CALS_LAST_GATE.md` §0"*; **§0 + this doc are the live
checklist**, the sweep docs the granular source to spot-check. **The whole point: zero surprises at go-live.**

## A · DESIGN FINAL PASS — the exact critiques + fixes (ROUND4 §3, verified against code)
- **AIOS page** — today it's cal.com/enterprise's skeleton with AIOS content. FIX: make it an actual **AIOS-BLUE page**
  (not monochrome + blue accents); the "family" section is TEXT → make it visual; add proof/numbers; **SHOW the ten
  agents**, don't just describe them. (Only real product shot today = the kernel-event visual.)
- **Pricing page** — tiers/seats/marquee are in. ADD: (1) **what you LOSE going down a tier** (a comparison), (2) a
  **pricing FAQ** ("can I change plans", "what counts as a seat", "what happens at trial end"), (3) **annual saving in
  money**, not just %, (4) a **qualifying signal on the AIOS "Custom" tier** — without one it attracts the wrong enquiries.
- **Consultant cockpit — hierarchy + colour** — everything reads the same visual weight (pipeline / inbox / documents =
  grey cards in a grey frame); no hierarchy telling a consultant where to look first (Today is the only opinionated
  screen). FIX: visual hierarchy + the family **RED** (AISolar) that never reached it.
- **AISales identity** — was "just a wordmark on the cockpit header," sold as "the closer's home" with engagement
  intelligence (marketing ahead of product). *Redesigned since — `docs/AISALES_AIFIELD_REDESIGN.md`; **VERIFY** the
  redesign fully closed the marketing-vs-product gap.*
- **Intelligence depth** — `consultantIntelligence.leadIntel()` = **13 hard-coded stage descriptions + 2 enrichment
  cases**; `coachBrain` is deterministic. Does NOT use: bill data, system size, deal value, consultant workload,
  seasonality, response times, or cross-lead comparison. Reads intelligent on a demo; **thin on 200 real leads.** FIX
  (ties to Sweep 8 X8 LLM + the learning loop): real signals + an LLM behind it, once real data exists.
- **DONE — do not redo, just verify they hold:** NC6 automation (30 Jul, regulator-grade) · installer rewire (AIField).

## B · MARKETING / SNAPSHOTS (ROUND4 Sweep-7-not-done + Sweep 9.2)
- **Hero snapshots never refreshed** — the AISolar hero still shows the OLD bill card; nothing shows the widget, AI
  Coach, engagement signal, or compliance pack. **Reshoot every hero from the CURRENT UI:** agent Inside windows · owner
  scheduling transparency + savings · AIField JobViewV2 rail · the unified inbox · the approve loop.
- **Agents page** — Cal green-lit a page for the ten agents + their skills. *(A `/agents` route now exists — VERIFY it's
  the full page, not a stub.)*
- **Placeholder marketing stats** (`src/config/brand.ts:72`, TODO in-file) — invented numbers on customer-facing pages.
  **TRUTH-PASS VIOLATION still shipping** → replace with real figures or remove.
- **Blog** — 4 articles (enough to launch, not to rank a category) → write more for category rank.
- **Per-page meta / SEO** — the deferred Sweep 7 content layer (per-page title/description on the money pages).

## C · THE GTM SET (master plan Sweep 10 + Sweep 9.5) — truth-pass, DO-NOT-CLAIM
- **Pitch / investor deck** — the two-worlds thesis · the compliance moat (bill→install→NC) · Domain 001 = the proof ·
  the agent-transparency trust move.
- **Per-offer one-pagers** — AISolar (blue/red) + AITeam (green), off the family ladder.
- **Domain-001 case study** — the real installer running end-to-end (the existence proof).
- **Demo video / GIFs** — the current UI (agent Inside windows · scheduling transparency + savings · AIField · unified
  inbox · approve loop).
- **Ad creative + one-line explainer** — *"an Irish solar installer operating system; reads the day/night split from
  your bill."*
- Owners: Product & Copy (words) · Design (visuals) · Institutional (truth-pass). **No invented stats/reviews; no
  SMS/WhatsApp/roof-detection.**

## D · DOMESTIC vs COMMERCIAL ESTIMATE FORK (Sweep 9.1 — ties to deploy A2)
Same `computeQuote()` engine, TWO presentations, chosen off the "home or business?" answer:
- **Homeowner** — lead with annual €-saving · payback (yrs) · the **€1,800 SEAI grant** · net cost · 20-yr savings ·
  monthly cashflow ("cashflow positive from month one"). Warm, plain-English.
- **Commercial** — lead with ROI% / IRR / payback, then **NDMG grant** · **ex-VAT price** · **ACA year-1 tax write-off**
  (show the after-tax net) · demand-charge reduction · a carbon/kWh line for ESG. CFO framing; an investment case
  (NPV/IRR). ⚠️ **VERIFY NDMG + ACA figures against the SEAI PDF before quoting.**

## E · FOUNDER TEACHING WALKTHROUGH (Sweep 9.6)
A guided TEACHING walkthrough of every surface **for Cal (non-dev founder)** — per surface: what it is · what it does ·
**how it's programmed** (reuse the agent Inside windows + owner scheduling transparency) · the **talk track** · **why it
matters** (the moat, "verify don't trust"). Format: a script/doc + a guided demo mode off `/demo`. Doubles as new-user
onboarding AND arms Cal to sell.

## F · STRAGGLERS / HARDENING (ROUND4 Part 5 + Sweep 9.4)
- **Terms of Service rewrite** — Privacy was rewritten; ToS is still the old version (**pre-launch legal**).
- **Per-tenant feature toggles** — Cal: "I must be able to turn some of the best features off" (real feature-flag work; ties tier entitlements A11).
- **Heatmap / session analytics** — behind the performance-consent + a Privacy Policy line → `Cals_Growth_Dev`.
- **`tsc --noEmit` in build/pre-commit** — ROUND4 caught **2 runtime crashes that passed green** (Vite doesn't type-check). Cheap guard.
- **The 8 baseline tsc errors** (Sweep 9.4) — clean build before cohort.

## Suggested order (ROUND4 Part 6, still sound)
1. **Real data first** (the read-flip — §0) · 2. NC6 [done] · 3. Installer rewire [done] · 4. **AISales identity +
cockpit hierarchy/colour** · 5. **Intelligence hardening** (once real data exists) · 6. **Marketing polish** (AIOS ·
Pricing · hero snapshots · Agents page) · 7. **GATE 0 + deploy.**

## Already closed (so nobody re-opens them)
NC6 automation · installer rewire · AISales redesign · the 9 ROUND4 bugs · **ingest-lead browser-auth** (ROUND4's #1
BLOCKING — solved 31 Jul via per-door `source_key`s + the `leadCapture` wire).
