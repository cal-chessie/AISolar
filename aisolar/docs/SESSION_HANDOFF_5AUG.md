# SESSION HAND-OFF — 5 Aug 2026 (read this FIRST next session)

_A very long, very productive session. Everything is committed. This is the map to
resume cleanly._

## ⭐ GIT STATE (verified with `git ls-remote`, the source of truth)
- **Work on: `cowork-5aug` @ `04b4fe8`** — has EVERYTHING below. This is the live branch.
- `cowork-3aug` @ `471d853` — the earlier batch (§D fork · commercial calc · manual bill
  entry). A strict ANCESTOR of `cowork-5aug`. Untouched.
- **There was NO rollback.** A mid-session "the remote reset to f78e329" scare was a
  MISREAD: `git fetch origin <branch>` updates `FETCH_HEAD`, NOT `refs/remotes/origin/<branch>`,
  so `git rev-parse origin/<branch>` can be stale. **Lesson: trust `git ls-remote`, never the
  local tracking ref, to check remote state.**
- Never `--force` push. `cowork-3aug` and `cowork-5aug` diverge only in that 5aug is ahead;
  future work continues on `cowork-5aug`.

## WHAT SHIPPED THIS SESSION
### ESB paper trail (Sprint 2A — closed + beyond)
- Full **NC7 + NC7-01** overlay (all pages: §4/§5 incl **MIC/MEC + 3 assessment questions**,
  §6/§7 owner signatory, the confirmation cert header + protection column + sign-off + owner
  declarations, Vector-Shift truth-pass). Installers roster (Safe Electric Cert Number).
- Verified via `scripts/pdf-verify.mjs` + rendered PNG visual passes.

### SEAI grant workflow (whole thing — docs/SEAI_GRANT_WORKFLOW.md)
- Truth-pass fixes (domestic 0% VAT, BER required, planning exempt regardless of size, €700
  not €900) + `seaiGrantEligibility` gate surfaced on estimate + proposal.
- Lifecycle spine (`seaiGrant.ts`) + **`seai_grants` table live on V5** + owner tracker
  (8-month clock) + customer card + auto-advance off the commissioning gate.
- **DoW + data-sheet PDF artifact** (`seaiDocs.ts`), auto-shared on install; both-party
  **eIDAS handover signatures** → printed on the DoW; **equipment datasheets bundled**.

### §D estimate fork + commercial calculator
- `calculateSystemEstimate` forks on `propertyType`: domestic unchanged; commercial =
  ex-VAT + VAT reclaim + **NDMG + ACA (folded into effective net) + ROI + IRR**, rate read
  off the bill (**€0.24 commercial fallback**, "indicative — real bill at proposal" note).
- Door `/start` asks Home/Business; `SolarCalculator` fully re-skinned for commercial.

### Manual bill entry (survey) + migration
- `BillEntryFields` (shared) — ALL bill-extract fields + **MIC/MEC**, on the manual route AND
  the Edit→Correct-the-read path (unified). Feeds estimate + NC7 §5 (same `mic_kva` field as
  the Electrical step — one entry, auto-synced).
- Migration `20260804_site_surveys_nc7_capacity.sql` — **applied live to V5**.

### A1 auth foundation (docs/A1_BUILD_PLAN.md — the model is fully drawn + discussed)
- `tenants` table + `provision_tenant` (card-payer=admin, 7-day trial, per-seat field) —
  **live on V5**. Model = `user_roles.tenant_id` (already read by the RLS floor).
- The AISolar-site door (`/signup`): "I'm an installer" vs "estimate for my property" (→/start).
  Installer onboarding (Flowith chips, INSTALLER copy) → `signUp` → `provisionTenant` → `/owner`.
- **Tenant isolation PROVEN on V5** (tenants + leads, RLS via JWT-claim simulation).

### 2D notify() spine (docs/NOTIFY_SPINE.md)
- `notify(event)` → bell (tenant-scoped `notifications`) + branded email + portal link.
  Both-ends, draft-gated, demo-safe. Wired: team invite · deposit link · photo request ·
  proposal sent · handover pack.

## OPEN THREADS — exact resume points
1. **A1 Stripe (FRESH SESSION — Cal's call).** Resume marker in `docs/A1_BUILD_PLAN.md`
   ("RESUME IN A FRESH SESSION"): card + 7-day subscription, provision-on-confirm hook
   (`aisolar_pending_tenant` stash), land-in-app checklist. Files: `InstallerSignup.tsx`,
   `tenant.ts`, `20260804_a1_tenants.sql`.
2. **Finish 2D wiring** — reschedule/survey-options (`LeadFlow:~495`), referral, callback
   (`CustomerPortalV2`). AND **extend `supabase/functions/send-notification`** to send a
   branded GENERIC email (to/subject/message/portalPath + tenant from-name/reply-to) so the
   email rail fires for the new event types (bell rail already works).
3. **2C — per-surface DB wiring** (the big multi-surface one; fresh-session candidate):
   consultant reply→`touchpoints`+Postmark · installer photos→storage+`install_evidence` ·
   owner deposit→`create-checkout` · customer ask-AI→persist+notify.
4. **2E — the widget**: embeddable calc→lead door + owner "copy embed code" panel; the
   property path already routes to Solar Ireland Group via `ingest-lead`.
5. **2A leftovers**: pack-completeness gate at the 3 human touchpoints; NC8 decide (appendix-only?).
6. **Post-cohort** (docs/POST_COHORT.md): SEAI nudge cadence (rides notify's `seai_*` events),
   grants-at-risk radar, deposit→multi-installer geo-routing.

## DECISIONS LOCKED (do not re-litigate)
- Tenant model = **`user_roles.tenant_id`** (one tenant/user). First-admin = **whoever enters
  the card**. **Per-seat billing** (+1 seat per added non-owner-email teammate).
- Entry model = the **fractal**: AISolar-site door forks installer (A1 → their tenant + a lead
  in Renewably's pipeline) vs property (→ estimate → Solar Ireland Group). **Copy law**: one
  OnboardingFlow, per-audience copy — installer signup ≠ solar enquiry.
- Commercial estimate: rate off the bill, **€0.24 fallback**; **ACA folded into effective net**.
- GATE 0 (rotate the 3 leaked Supabase keys + Maps key, purge history) gates ANY live signup.

## LIVE V5 MIGRATIONS THIS SESSION (all applied + verified)
`20260804_doc_vocab_reconcile` · `20260804_seai_grants` · `20260804_site_surveys_nc7_capacity`
· `20260804_a1_tenants`. All also saved in `supabase/migrations/`.
