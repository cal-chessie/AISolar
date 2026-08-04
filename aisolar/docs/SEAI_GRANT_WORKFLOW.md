# SEAI Domestic Solar PV Grant — the real flow + how AISolar builds to it

_Verified against seai.ie (Aug 2026). SEAI has **no API** — every submission is a
manual portal action. AISolar's job is therefore to **orchestrate + track** the
two humans (customer + owner) through SEAI's own steps, and to **generate the
paperwork**, not to integrate with SEAI's portal._

## The actual SEAI process (corrected)

| # | Step | Who does it | Where |
|---|------|-------------|-------|
| 1 | Choose a registered company; agree a formal contract (quote) | **Customer picks** the owner's company (its name appears in SEAI's list); owner provides the quote | AISolar proposal = the quote/contract |
| 2 | **Apply for the grant OFFER — before any works** | **Customer** applies on the SEAI portal, naming the registered company. Offer valid **8 months** | SEAI portal (external) |
| 3 | Install the system | Owner's crew | on site |
| 4 | **Post-works BER** by a registered assessor | **Customer** engages a BER assessor; must be **published** | external assessor |
| 5 | **Declaration of Works** signed + evidence submitted | **Only a registered installer** may sign the DoW; the **company submits evidence electronically** and gives the customer copies | SEAI portal (external) |
| 6 | SEAI processes + pays once all docs + BER published | SEAI → pays the **homeowner** (owner may discount the grant upfront and the customer reclaims — tenant config) | SEAI |

### Where Cal's mental model needed correcting
- **The CUSTOMER applies for the grant offer** (naming the company), not the owner. The company simply appears in the portal list for the customer to select.
- There isn't a clean contractor "accept the job" step at application. The **owner's active portal role is at the END** — signing the DoW (installer-only) and submitting the works evidence for the claim.
- Works must **not start until the grant offer is received** (8-month clock). This is the single most important gate to enforce in the flow.

## How AISolar builds to it (orchestration + tracking, leveraging what exists)

**Reuse:** `DowTemplate` (built), `paperTrail.ts` + `esb_submissions` pattern (sealing/tracking), `calculateSEAI` + new `seaiGrantEligibility`, `stageNotifications` (notify spine), `CustomerPortalV2` (customer surface).

**New — a grant lifecycle state machine** (mirrors the ESB submission tracking):
`eligible → offer_applied → offer_received → installed → ber_booked → ber_published → dow_submitted → paid` (+ `ineligible` / `offer_expired`).

1. **On proposal acceptance → customer "Apply for your SEAI grant" guided card**
   (in `CustomerPortalV2` + the acceptance email link). Contents:
   - The owner's **registered company name + SEAI registration number** to select on the portal (from Owner → Settings → `seaiInstallerId`).
   - A deep link to the SEAI apply page + the 3 things to have ready (MPRN, eligibility: built before 2021, contract/quote = the proposal).
   - A hard, friendly warning: **"Wait for your grant offer before we install"** (the 8-month clock; installing early voids the grant).
   - Eligibility pre-check surfaced (we already flag post-2021 / no-MPRN on the proposal).

2. **Owner-facing grant tracker** (a stage strip on the job / compliance window):
   advances the lifecycle, each transition written to the paper trail, with the
   **next action prompted**: confirm offer received → schedule install →
   book BER → **generate + sign DoW** (the registered installer) → submit
   evidence to SEAI → mark paid. Each stage has a "done means" proof
   (offer ref, BER cert published, DoW signed, SEAI claim ref).

3. **BER step** — capture post-works BER as a first-class item (booked date →
   published cert + rating), gating `dow_submitted`. Feeds the DoW's BER field.

4. **DoW** — the existing template becomes the signed artifact at stage 5;
   installer-only signature (eIDAS simple, same pattern as NC6/NC7); recorded in
   the paper trail with its seal. AISolar prepares; the registered installer
   files it on the SEAI portal.

5. **Truth-pass:** never claim AISolar "submitted to SEAI" — it prepares +
   tracks; a person files. Grant shown as an OFFER until SEAI confirms; paid
   only when the owner records the SEAI payment.

### Recommended first build step
The **grant lifecycle model + owner tracker** (state machine + paper-trail
transitions), because the customer card and DoW/BER steps all hang off it. Then
the customer "apply for your grant" card, then BER capture, then wire the DoW as
the stage-5 artifact.

## Resolved (Cal, 4 Aug)
- **Grant is NET and lands with the CUSTOMER** — SEAI pays the homeowner directly
  (they submit their bank details on the SEAI portal). The owner does NOT discount
  upfront and reclaim. Copy everywhere reflects "SEAI pays you the grant."
- **DoW + data sheets go to the CUSTOMER in pre-handover, on the customer portal**,
  because the customer schedules the BER and the **BER assessor needs them**. So
  `docs_shared` (stage 4) surfaces the DoW + data sheets on the portal BEFORE the BER.

## Still open
- Capture **`year_built`** on intake (absent in demo) so the eligibility gate is live.

## Build log — the spine (4 Aug)
- **src/lib/seaiGrant.ts** — the 8-stage lifecycle state machine + per-lead record
  (localStorage-first like fieldRecord; dual-write to `seai_grants` when authed).
  Exposes currentStage/nextStage/grantProgress/offerClock/advanceGrant + useGrant.
- **src/components/compliance/SeaiGrantTracker.tsx** — owner tracker: stepper +
  8-month offer clock + stage-aware next-action capture (advances only on real proof).
- **PaperworkWindow** — tracker mounted for domestic-grant scheme (Gate A area).
- **Migration** `20260804_seai_grants.sql` — table + RLS (sel=can_see_lead so the
  customer sees status; ins/upd/del=own_lead). APPLIED LIVE to V5 ywizcsulurxoqjdgnkvc
  + verified (4 policies present). Deploy elsewhere: it's in supabase/migrations.
- NEXT: customer "apply for your grant" card → DoW & data sheets (shared to customer
  portal for the BER assessor) → BER capture wired to the tracker stages.
