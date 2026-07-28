# AIField Part A — the build guide (28 Jul 2026)
### One flow. The moat ported. The duplicate deleted. Line-precise at `476f4ac`.

> The decision (made, not open): **JobViewV2 is the ONE install flow.**
> InstallRunner's compliance moat moves INTO it; InstallRunner is then deleted
> so it can't drift. **No stage gating** — free-nav tabs are right for a crew.
> Spec authority: AIFIELD_BUILD_PLAN.md + COMPLIANCE_CHAIN_DESIGN.md §4.

## Why this order (one paragraph)
The bill→survey→design record already fills ~2/3 of NC6/NC7. The missing
fields are exactly what commissioning captures: fitted model, serial, real
export state. So the moat is not an installer feature — it is the moment the
statutory pack becomes self-assembling. Build the capture now; Sweep 8 wires
it to storage + pdfFill; the final NC render then completes itself.

## The six steps

**1 · Port the commissioning state.**
From InstallRunner.tsx:63–71 into JobViewV2's persisted state:
`serial`, `fittedModel`, `serialConfirmed`, `mismatchFlagged` (+ note).
Replaces the bare checkbox `serial_numbers_recorded` (JobViewV2.tsx:116).
✓ Accept: fields persist offline (localStorage, same key pattern), survive
refresh, render on the Commissioning tab.

**2 · Port the triple check.**
`modelsAgree` (InstallRunner.tsx:107–109): fitted model vs the proposal's
specified inverter. On mismatch: loud flag + **the installer's note is part of
the record** (Layer 3 of COMPLIANCE_CHAIN_DESIGN §4 — "SE5K unavailable,
fitted SE6K, customer agreed" is the defensible file). NC6↔NC7 warning copy
when the change could alter which form applies. A mismatch can NEVER be
cleared silently.
✓ Accept: match = calm confirm; mismatch = flag + required note + honest copy
("flagged — rides with the job record"; nothing claims "office notified"
until Sweep 8 wires the notification).

**3 · Port the signature.**
Canvas pad (InstallRunner.tsx:111–131) into Handover — replaces checkbox
`customer_signature` (JobViewV2.tsx:124). dataURL + signedAt persisted.
**Attestation framing law** (Decidability standing rule): the record says
*attested/signed by [name]* — never machine-"verified".
✓ Accept: draw → save → survives refresh; clear-and-redraw works; eIDAS
simple-signature note kept in code comment.

**4 · One entry point.**
Install-card clicks in InstallerPortalV5 → `/job/:id` (same route the
"Open job" buttons use). No path reaches InstallRunner.
✓ Accept: every install card opens JobViewV2.

**5 · Delete InstallRunner.tsx.**
`git rm` (history preserves it — correction by adding, in git's grammar).
✓ Accept: build green with the file gone; zero imports remain.

**6 · Verify like a senior dev.**
`npx tsc --noEmit` (vite build does NOT type-check — two crashes shipped
green before). Then dev-mount probe of `/job/:id`: all six tabs render, new
fields live, dark mode + tablet hold.

## The laws that govern every line
Design tokens only (rounded-panel/control, h-control) · family colours (tech
blue = capture, deposit green = confirmed, pop red = mismatch; amber never) ·
dark-mode-safe · tablet-first ("tablet is the money") · offline-first ·
truth-pass copy (no claim of sending/notifying until wired) · stop-slop ·
kernel refusal principle (this is Domain-001 work; nothing here touches the
kernel).

## Explicitly NOT in Part A (parked, no scope creep)
Storage/DB wiring (Sweep 8: `installed_equipment`, `install_evidence`,
signature→storage+hash) · pdfFill consumption (the NC render step) · OCR
plate-reading (edge fn at launch; manual entry is the fallback that ships) ·
monitoring AI-Coach + "system live" email + handover pack + growth loop
(Part A flywheel, next) · the map (Part B).

*Guide v1.0 — follow exactly; correct by adding.*

## v1.1 amendment — built 28 Jul, corrections from contact with the code
- **Step 3 was already done:** JobViewV2 had a full signature pad all along
  (modal + consent statement + re-sign, lines ~928–1025) — richer than
  InstallRunner's inline pad. The audit table's "photo slot only" was stale.
  Nothing ported; JobViewV2's kept.
- **Steps 1, 2, 4, 5 executed:** SerialState + CommissioningSerials (the
  triple check, required note on mismatch) live in JobViewV2's commissioning
  tab, gated into phaseCompletion; both portal entry points now navigate to
  `/job/:id`; InstallRunner deleted (`git rm`, history preserves it).
- **Verified:** `tsc --noEmit` green · `/job` mounts in dev · mismatch path
  exercised end-to-end in-browser (SolarEdge fitted vs SolaX specified →
  warning + required note → flagged record) · persisted record confirmed in
  localStorage (`jobview_v2_lead-009`) · survived full page reload with
  banner + both values rehydrated · zero console errors.
- Known cosmetic: the in-app cookie banner (pre-existing audit item) still
  shows inside the job view — scoped out of Part A, on the list.
