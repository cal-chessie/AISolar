# Survey Rewrite Brief (verified) — `SiteSurveyForm.tsx`

> Source: Cal's vault `Survey Rewrite Brief.md` (Hermes-verified, disk-proofed, 25 Jul).
> This is the on-disk copy so the rebuild executes against it. Step 1 (Customer Info)
> is the APPROVED template ("restructured, love it"). Rebuild the rest to match it —
> but REORDERED per this brief. The reusable `SurveySection` helper is already in the
> file; keep it. The in-progress step-2 "Goals" rebuild is SUPERSEDED by the reorder
> below (occupancy is promoted to its own hero step; bill-derived fields move to Confirm).

## The three disk-verified logic flaws this kills
1. **Hero input buried + plumbed to a constant.** The survey captures occupancy, but the drafter stores `IE_ENERGY.SELF_CONSUMPTION_PCT = 0.70` (`leadIntake.ts:169`) instead of calling `selfConsumptionFromOccupancy()`. Render recomputes occupancy-driven → **stored ≠ rendered** (the €2,727-vs-€2,108 / €3,272-vs-€3,144 drift chased all day). The highest-value answer in the survey currently does NOTHING in the stored proposal.
2. **Survey re-collects bill data instead of confirming it.** The 21-point bill read already has monthly_bill, MPRN, address, consumption, tariff, and infers building type. Steps 1–2 re-ask them. Should CONFIRM, not re-collect.
3. **Gear fields live in two places.** `recommended_system_size` / `recommended_panel_count` / `recommended_panel_model` (+ inverter/battery) still exist as `z.optional` fields in `SiteSurveyForm.tsx:54–61`, even though the **Design Studio now owns gear**. Two sources of truth → divergence. Delete the gear z-fields from the survey.

## The corrected flow (8 steps)
1. **Confirm** (mode-aware — see branch) — name / email / phone / bill / MPRN / address / consumption / tariff / building-type. Bill-read mode = pre-filled, tick "correct", zero fresh questions. Other modes = collect.
2. **Occupancy (HERO, promoted)** — who's home in the day · how many. Its own focused step, not a dropdown in goals. **Drives self-consumption → savings. Mandatory for a real savings number.**
3. **Wants** — battery / diverter / EV / priorities (toggles + free text).
4. **Roof + Shading** (MERGED — env folded into roof) — type / condition / orientation / pitch + shading / obstructions.
5. **Electrical** (kept thin) — panel capacity / meter / grid type.
6. **Installation** — storeys / scaffold / parking / access / availability.
7. **Site Photos** — the evidence pack (`GuidedPhotoCapture`).
8. **→ Design Studio handoff** — survey sends roof + occupancy + wants to the studio; the **studio owns** panel/inverter/battery model + count. **No gear fields in the survey.**

## Capture-mode branch (the final logic — Step 1 is mode-aware)
| Mode | Step 1 behaviour | Occupancy source | MPRN |
|---|---|---|---|
| **Bill upload** | Confirm pre-filled values | Customer fills hero step | Present (from bill) |
| **Manual entry** | Collect fresh (no bill read) | Customer fills hero step | Collected if known |
| **Phone / consultant** | Consultant keys live; same fields, consultant-facing UI | Consultant captures from call | Collected when available; **lead valid without** |

Principle: **the fields are identical across modes; only the pre-fill differs.** Bill-read = confirm; everything else = collect. Occupancy (step 2) is ALWAYS a hero step, every mode (even a phone customer answers verbally). **MPRN is optional-at-intake**, anchored later (it's a kernel ref — sha256, refs-only — not a blocker).

## The critical fix (make the savings real)
**Occupancy must flow: survey → `selfConsumptionFromOccupancy()` → STORED proposal number** (in the drafter, not just the render). Kill the `0.70` constant for any lead that has occupancy data. Until this lands, the survey's hero answer is cosmetic. This is cross-linked into the Sweep 8 truth table (`docs/SWEEP8_DB_WIRING.md`) as a make-or-break item.

## Build notes
- Keep `SurveySection` (family-toned card, matches step-1 template). Consider one small component per step for clean state/render (the current chaotic `switch` is flaw-adjacent).
- Preserve the Supabase save (`site_surveys` / `survey_photos`), `mapSurveyToProposal`, `sendStageChangeNotification`, react-hook-form wiring.
- Delete the gear z-fields from `surveySchema`; the studio is the single source of gear.
- Family colour per step, edit-toggle per step (Cal), dark-mode-safe, tablet-solid, stop-slop copy.
