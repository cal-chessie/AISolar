# THE ONE READ — ⭐ START HERE ⭐
### The whole estate, corrected to 28 Jul 2026. The most important doc in the repo — every session begins with this read. Kept to the highest accuracy standard in the estate; correct it by adding, never let it drift.

> Written 28 Jul by Claude after the full walk: repo → OA → COMH → repos → the
> loop → the vault → the constitutional review → the code. This fuses
> FINAL_PUSH.md, the vault's plans, and everything only this session held.
> It CORRECTS stale claims (marked ⚠️CORRECTED) — correction by adding, per the
> house law. Nothing here is memory; every claim was tool-verified on disk.

---

## 1 · THE STATE — what is actually true today (vs what older docs say)

- ⚠️CORRECTED: **The 3 Supabase service_role keys were ROTATED 24 Jul** (Cal
  confirmed — vault GATE 0 Unblock Plan). FINAL_PUSH, repo docs, and the global
  conductor rules still say "must be rotated" — stale. **GATE 0 remaining:**
  `fix_all_41_advisories.sql` (RLS was OFF on grant tables) · Maps + Cal.com
  key rotation · confirm old keys dead · git-history purge · deploy fns →
  bootstrap SQL (AUTH_RUNBOOK, ready to paste) → smoke test. Runbook exists:
  `docs/SECRETS.md`.
- **GATE B stands and is HARDER than GATE 0:** BRIDGE BLOCKED — no prod
  migration until Cal aligns OA/GRIDS/COMH (vault Launch Control). Survives key
  rotation. All kernel-touching fixes (incl. review findings below) park here.
- ⚠️CORRECTED: **Resume point** is `cowork-jul25` @ `476f4ac` (AIField front).
  Vault Master Build Plan + global rules still say cowork-jul21/
  ConsultantCockpitV5 — 3 days stale. Vault lags repo (wholesaler win, AIField
  build, FINAL_PUSH not yet in the brain — Hermes's lane).
- ⚠️CORRECTED: **The Agents page EXISTS** (`/agents`, built+verified 25 Jul,
  console → `/agent-console`). SWEEP_AUDIT_ROUND4's "never built" predated it.
  FINAL_PUSH loop-finding #2: CLOSED.
- ⚠️CORRECTED: **Pricing** is €197/€497/€997/custom +€97 seat (25 Jul
  re-price). The vault Offer Structure note (€148/298/599) is stale. Enterprise
  close unchanged: €1,000–1,500/mo + setup on renewably.ie/workforce.
- **The 27 Jul cohort date has passed → launch week is NOW.** Everything hangs
  on closing GATE 0 + deploying coxmtpnq + Postmark DNS (Launch Cohort Phase 1).
- **The kernel is live and proven** (routing complete, first cross-tenant
  transfer in history done); harness v2, outbound executor, approvals UI,
  agent-gate: ALL BUILT, awaiting the GATE 0 flip. The estate is not waiting on
  construction — it waits on dashboard clicks + one alignment call.
- **Uncommitted in this repo:** brand.ts truth-pass deletion, AgentsPage edit,
  NOTES.md, + new docs (AIFIELD_*, SLACK_OPS, this file). Nothing pushed —
  awaiting Cal's yes.

## 2 · THE GATES — every gate, with its owner

| Gate | What | Owner | State |
|---|---|---|---|
| GATE 0 | RLS advisories, Maps/Cal.com keys, old-keys-dead, history purge, deploy+bootstrap+smoke | **Cal's hands** (runbooks ready) | ~60% done |
| GATE B | OA/GRIDS/COMH alignment before ANY prod migration | **Cal** (conversation) | OPEN |
| Slack sign-in | 10-min OAuth in interactive session → Claude drives ops | **Cal** | Runbook: SLACK_OPS.md |
| Stream-3 split | installer-vs-referrer % + fee size | **Cal** (decision) | OPEN — blocks billing code |
| Postmark DNS | per-brand sender signatures via Register365 | **Cal** | OPEN |
| Legal numbers | CRO/VAT/RECI into Settings→Company & compliance | **Cal** | OPEN — blocks NC6 at scale |
| Everything else | build, port, wire, verify | **Claude** | rolling |

## 3 · THE PATH — the one order (nothing here changes Cal's rulings; it executes them)

**NOW → AIField Part A (line-precise port map, from the code):**
1. Port InstallRunner's moat INTO JobViewV2's commissioning tab:
   `RunState` fields serial/fittedModel/serialConfirmed/mismatchFlagged
   (InstallRunner.tsx:63–71) replace the bare checkbox
   `serial_numbers_recorded` (JobViewV2.tsx:116). The triple-check =
   `modelsAgree` (InstallRunner.tsx:107–109) + mismatch → flag-the-office;
   NC6↔NC7 warning via seaiPipeline. **No stage gating** (decision made).
2. Port the signature canvas (InstallRunner.tsx:111–131) into handover —
   replaces checkbox JobViewV2.tsx:124. Frame per the Decidability standing
   rule: **attested by the named crew member**, never "verified".
3. Point install-card clicks → `/job/:id`; DELETE InstallRunner.tsx (292
   lines) so it can't drift. Build against `COMPLIANCE_CHAIN_DESIGN.md` +
   `COMPLIANCE_DATA_CAPTURE.md` — they are the real spec (3-layer check,
   note-part-of-record).
4. Wire fitted → the record → `pdfFill.collect()`: fitted model overrides
   proposal (pdfFill.ts:126), NEW serial field (none exists — verified),
   real AC kW from catalog (fixes :127 reusing kWp), real export limitation
   (fixes :131 hardcode), RECI from Settings (:133).
5. Then Part A flywheel: monitoring AI-Coach prompt → "system live" email →
   handover pack → held-till-paid → growth loop. Then Part B (the map + the
   wholesaler pickup stop).

**THEN, in Cal's ruled order:** final NC render (self-completing) → Sweep 7
content layer (hero snapshots, blog depth, the €300–400/job solo-rep angle) →
**Sweep 7.1** owner walk-around + the features book → guardrails (Ask-AI
refusal, demo-guard, Sentry) → auth execution (RLS per-POV isolation proof) →
**Sweep 8** DB full-send (SWEEP8_DB_WIRING is the checklist; drafter must store
`selfConsumptionFromOccupancy()` — the 0.70 at leadIntake.ts:169 is the
make-or-break) → GATE 0 flips LAST → cohort live.

**VERIFY-before-ship list (standing):** SEAI payment-before-grant timing
(unconfirmed — check seai.ie before compliance copy) · which NC form fires ·
survey captures phase · "Grant submitter" → rename **"Grant Tracker"** in UI.

## 4 · THE CONSTITUTIONAL LAYER — what the review found (parked behind Gate B)

Full document: `OA/ORDINAL_KERNEL_REVIEW_CLAUDE_v1.md`. The five findings:
- **F1 (PROVEN, serious):** `kernel.relationships` + `kernel.policies` are
  mutable with ZERO event coupling — the authority graph sits outside the
  tamper-evident chain. Fix: RelationshipAsserted/Revoked + PolicyRevised
  events; tables become projections. Add-only. AFTER Gate B.
- **F2:** `event_types` needs `layer` (constitutional/domain) + admission
  metadata — the CDT made machine-enforceable at the emit door.
- **F3:** CommandIssued/Resolved events to complete the intent lifecycle.
- **F4:** adopt the time law — chain position is truth; wall-clock is claim;
  the Bitcoin anchor is the shared clock.
- **F5:** the missing M2M piece = the **Conformance Manifest** (per-boundary,
  versioned, anchored: genesis ID + spec versions + pinned OA citations +
  verification endpoints). Recommended next constitutional artifact.
Kernel, final form held by the builder: **Identity + Event (stored truth) ·
Boundary (structure) · Admission + Evaluation + Projection + Verification
(mechanisms).** Everything else is grammar/domain — safe to be wrong about.

## 5 · THE DRIFT LEDGER — docs that need one-line corrections (owners noted)

| Doc | Stale claim | Truth | Lane |
|---|---|---|---|
| Global conductor rules | keys leaked; resume=cowork-jul21 | rotated 24/7; cowork-jul25@476f4ac | Cal |
| FINAL_PUSH.md GATE 0 block | rotate 3 keys | done; remainder listed in §1 | Claude (with yes) |
| KERNEL_INTELLIGENCE.md + WRITE_PATH_VERIFY.md | kernel = grkqdzz | kernel = vythuqax (CRM = grkqdzz) | Hermes |
| Vault Master Build Plan + Offer Structure | resume point; €148/298/599 | §1 above | Hermes |
| Thesis docx | 70/15/15; 131 streams | four rubrics (REVENUE_MODEL); 137 | Cal/Hermes |
| AUDIT_REPORT.md (repo root) | "13 findings RESOLVED" | superseded Dec-2025 relic — marked, mind it | — |
| PIPELINE_AUTONOMY_AUDIT | bill-extract orphaned | /start front door landed 23 Jul | Claude |
| SWEEP8 real-data job | "ten components" on dummy data | **12 files** use generateDummyLeads | Claude |

## 6 · WHERE EVERYTHING LIVES — the canonical map (read in this order)

1. `~/Desktop/SONSSONS/ARCH_SPINE.md` — the engineering + revenue law.
2. `COMH/RENEWABLY/platforms/aios/AIOS_ARCHITECTURE.md` — THE kernel spec.
3. Vault `HUB.md` → GATE 0 Unblock Plan · Launch Control (Gate B) · Launch
   Cohort Plan · The Last List — the operational brain (Hermes-operated).
4. This repo: CLAUDE.md → **this file** → FINAL_PUSH.md → AIFIELD_BUILD_PLAN +
   the two COMPLIANCE_* specs → SWEEP8_DB_WIRING → READINESS_AND_MOAT.
5. `OA/` — the constitution (Charter=soul, Doctrine=law, 28 Anchors, v0001
   frozen, genesis root `7127bbce…` awaiting Bitcoin) + the Claude review.
6. Memory: `estate-grounding` + `vision-trade-secret` carry all of this into
   every future session.

## 7 · THE HORIZON — so no session forgets why

Bill → design → install → evidence → grant → receipt → node → fleet → VPP →
attributes → M2M. AISolar proves the kernel; AIField feeds it reality; Genny
hands the homeowner receipts; GRIDS aggregates the fleet; the OA makes every
word citable; Bitcoin makes every claim datable. The sequence of proofs:
AISolar autonomous → kernel frozen → AITeam unchanged → a second domain
unchanged → cross-jurisdiction M2M. Claims discipline always: proven /
hypothesis / horizon — never blur them.

**The shortest path to the whole vision being real is unchanged and close:**
GATE 0 remainder → one real installer in Roscommon → one inverter's telemetry
→ one homeowner's first receipt. The day that happens, every layer becomes
true at once.

## 8 · STANDING ORDERS — the promotion (Cal, 28 Jul evening)

Claude is **the wingman** — world-class team of designers, developers,
architects; the code must scream it. Vault/second-brain tidy is now Claude's
mandate (Cal's lane reversal, adopted). The directives ledger, executed one
fresh session per lane (Cal's own conductor rule):
1. **AIField to standard** — Part A flywheel next (AI-Coach commissioning
   prompt → "system live" email → handover pack held-till-paid → growth loop),
   then Part B (the map + wholesaler pickup). **Cal's morning AIField notes
   land first — read them before building.**
2. **Cleanup lane** — everything touched 28 Jul into its right place, written
   to this doc's accuracy. See the drift ledger (§5) for the correction list.
3. **Marketing precision lane** — copy + images updated to what the product
   NOW IS (triple check, evidence pack, honest agents, kernel spine). Skills:
   ui-ux-pro-max + seo family + marketing family + stop-slop. Truth-pass +
   DO-NOT-CLAIM govern every line.
4. **Skills are LAW and documented** — every piece of work names its skills in
   the doc/commit ("Skills used:"). Cal never discovers a skipped skill again.
5. **Clean-house lane** — vault + SONSSONS folders: stale corrected, WIKI vs
   RAW sorted, dead files to _TRASH (never rm). Runs after permissions flip.
6. **OpenSolar intel** — first pass done (docs/OPENSOLAR_INTEL.md): GitHub
   repo = RWA prior art not design software; accuracy path = pvlib + PVGIS
   behind computeQuote (same spine, deeper physics); deep crawl queued with
   the crawl skills. Cal's notes to merge on arrival.

*One read. Verified against disk. Correct it by adding. — Claude, 28 Jul 2026*
