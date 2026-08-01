# Paperwork Engine — Audit (1 Aug 2026, "eyes & ears" pass)
### Cal: "audit all paperwork now, take notes, add SUPERSEDED beside what's been done." No shortcuts.

> **Ground truth = the code, read this pass** — not the sweep docs. Markers:
> **✅ SUPERSEDED** = built & verified, don't re-open · **⬜** = open/not wired · **⚠️** = real gap, bug, or VERIFY-BEFORE-LIVE.
> The chain: **bill read → survey → design → commissioning gate → form choice → fill → sealed pack → submit.**

---

## A · Form-choice brain — `src/lib/complianceDecision.ts` — ✅ SUPERSEDED (built)
- **ESB ladder** (pure fn): NC6 ≤6kW single / ≤11kW three · NC7 ≤50kW · NC8 >50kW. Routes on **TIIC** (the AC
  inverter rating parsed from the model), **not** panel kWp — a 7kWp array on a 5kW hybrid is correctly NC6.
- **Field record wins**: once the crew attests the AC rating off the plate, ESB routing runs on the fitted number — a
  substitution that crosses a band flips the form automatically.
- **SEAI scheme**: `domestic-grant` vs `non-domestic-microgen`, off **`property_type`** — the ONE classification field
  (unified 1 Aug; the drafter + this both read `survey.property_type ?? intake.property_type`). ✅
- `requiredDocs` returns the exact doc set per lead (no row for what isn't needed). Wired into `PaperworkWindow`,
  `docTemplates`, `ComplianceCommand`.
- ⚠️ **VERIFY-BEFORE-LIVE (open, in-code 28 Jul):** the 6/11 kW bands are shorthand. Micro-gen is 25 A/phase =
  **5.75 kVA single / 11.04 kVA three** — the code **under-files at exactly 5.75–6.0 kW single-phase**. Needs an ESB
  policy read + Cal's yes; a statutory threshold is sign-off, not a quiet edit. Boundary cases eyeballed until then.

## B · Fill engine — `src/lib/pdfFill.ts` — ✅ SUPERSEDED (built + calibrated)
- **NC6**: 35/35 coordinate-overlay placements **calibrated + verified** (probe + verify + visual, 30 Jul); pages 4–5
  blank by design (pre-2022 legacy). **NC7**: 9/9 comb-row placements. **NC5**: true AcroForm fill (531 fields).
- **Data appendix** (Mode 1) always appended — every captured field on one A4 sheet, so nothing is mis-placed on ESB's
  own flat PDFs. `nc6Completeness()` is the **regulator gate** — lists every blocker; `ready` = print/sign/send.
- **eIDAS simple e-signature** (typed installer name + drawn pad + audit trail). RECI certs never filled here (Safe
  Electric issues those).
- **Form-integrity guard**: NC6 pinned to 240733 bytes / 6 pages — warns loudly if ESB revise the form (recalibrate).
- ⚠️ **NC8 overlay is EMPTY** — `OVERLAY_MAPS.NC8 = []`. A >50kW job (large-commercial territory when TIIC>50kW) gets
  only the data appendix, no in-box fill. ⬜ Calibrate NC8 (probe+verify) or state appendix-only for NC8 at launch.
- ⚠️ **VERIFY-BEFORE-LIVE:** ESB acceptance of a typed e-signature vs wet ink on the NC6 (policy read); until confirmed
  the pack says "print, sign & date by hand."

## C · Sealed submission pack — `buildSubmissionPack()` — ✅ SUPERSEDED (built)
ONE PDF the installer takes to the ESB portal: **manifest/checklist cover** · **filled NC6** · **portal entry sheet**
(every real value to re-key — the anti-rejection wedge) · **bundled certs** (RECI · signed DoW · type-test · SLD) ·
**attestation + SHA-256 seal** of the exact NC6 bytes · tamper-evident metadata. Wired to a button in `JobViewV2`.

## D · Data feeding the forms — ✅ mostly SUPERSEDED
- **21-field bill extract** → `lead_intake` (typed 1 Aug). **`companyCompliance`** (RECI/CRO/VAT/landline/mobile/email/
  address) from Owner→Settings. **`fieldRecord`** (as-fitted model/serial/AC/export/type-test/first-connection) from the
  commissioning gate. **`year_built`** (SEAI). All feed `pdfFill.collect()` + `nc6Completeness()`.

---

## ⚠️ FINDINGS — the real gaps (no shortcuts)

### 1. `tenant_settings` CHECK rejects `company_compliance` + `pricing` — LAUNCH-RELEVANT BUG (confirmed live)
- The constraint (paperwork_engine migration) allows only `('proposal_terms','finance_config','tenant_brand')`. But
  `serverStore.pushTenantSetting` is called with **5** keys — `companyCompliance.ts:56` writes `company_compliance`,
  `pricing.ts:70` writes `pricing`. Both **violate the CHECK → rejected → silently swallowed** by the fire-and-forget
  `quiet()` wrapper.
- **Impact:** `company_compliance` — the RECI/CRO/VAT/address/email **every NC6 + SEAI form needs** — has *never*
  persisted server-side; and the new `pricing` dial won't either. Works client-side (localStorage) today; **breaks at
  the read-flip / for the edge drafter**, which read the DB.
- **Correct development (Cal's call — it's a DB change):** widen the CHECK to the 5 real keys, idempotently and
  non-destructively (constraint-only, no data touched). SQL ready — see the bottom of this doc. *(Alternative: drop the
  CHECK and let the `pushTenantSetting` TS union be the single source of allowed keys — kills the duplicate list. The
  widen keeps a DB guard; recommend the widen.)*

### 2. `doc_type` vocabulary mismatch — latent, bites when persistence wires
- `decideCompliance.requiredDocs` uses **short** ids: `seai_app`, `dow`, `itc`, `reci`, `ber`, `nc6`, `nc7_01/02`.
- `lead_documents.doc_type` CHECK uses **long** ids: `seai_application`, `declaration_of_works`, `inspection_test_cert`,
  `reci_cert`, `ber_cert`, `nc7_03`…
- `fieldRecord.certs` uses a **third** set: `reci`, `dow`, `typeTest`, `sld`.
- Today nothing inserts `lead_documents`, so it's inert — but the moment persistence wires, inserts of the short ids
  fail the CHECK. **Reconcile to ONE doc-id set** before wiring the pack to the DB.

### 3. `lead_documents` is never inserted — ⬜ Sweep 8 (the "track & chase" promise isn't real yet)
- The table + storage bucket + RLS exist; **nothing creates rows.** The pack is built + downloaded **client-side only**.
  The doc-pack status lifecycle (`not_started → prepared → awaiting_signature → sent → received → complete`) and the
  "agents prepare/track/chase" story are **not wired**. In-code: "Client-side today; DB persistence + real
  submission/notify are Sweep 8 (M1–M3, X1)."

### 4. Dead premises comment + column — cosmetic, fix with the deprecation migration
- The paperwork_engine migration says *"the bill reader captures premises type"* — it does **not** (a bill can't;
  `property_type` from the survey does). `extracted_premises_type` is now deprecated (0 code reads, 1 Aug). Correct the
  comment when the in-schema deprecation lands.

### 5. Grant = TRACK, not SUBMIT — truth-pass, keep phrased that way
- `seai_app` / `seai_offer` are **tracked**, never auto-filed by an agent. The Grant agent tracks; a registered human
  submits. Hold this line in every surface (no "submits your SEAI grant" copy).

### 6. NC7 family bundling — minor
- `decideCompliance.requiredDocs` lists `nc7_01`, `nc7_02`; `pdfFill.FORM_PARTS.NC7` bundles `nc7-01/02/03`. Align the
  required-docs list with the parts actually bundled (add `nc7_03`).

---

## SUPERSEDED ledger — built & verified, DO NOT re-open
- NC6 overlay calibration **35/35** · NC7 **9/9** · NC5 AcroForm fill · the data appendix · `nc6Completeness` gate ·
  the sealed submission pack (manifest · portal sheet · certs · SHA-256 seal · metadata) · field-record-wins ·
  eIDAS simple e-signature · `decideCompliance` routing (NC6/7/8 + seaiScheme) · `companyCompliance` capture ·
  `fieldRecord` commissioning gate · the classification unify (`property_type` → seaiScheme).

## The constraint fix (ready — apply on Cal's yes; non-destructive, constraint-only)
```sql
-- Idempotent, non-destructive (no data touched). Widen tenant_settings to the
-- five keys pushTenantSetting actually writes; kills the silent-reject of
-- company_compliance + pricing.
alter table public.tenant_settings drop constraint if exists tenant_settings_key_check;
alter table public.tenant_settings add constraint tenant_settings_key_check
  check (key in ('proposal_terms','finance_config','tenant_brand','company_compliance','pricing'));
```
> Ship as its own migration (e.g. `20260801_tenant_settings_keys.sql`). After it lands, `company_compliance` (paperwork's
> company block) **and** the pricing dial persist for real — closing the true scope of "is pricing set properly?" and
> making the NC6 company block survive the read-flip.
