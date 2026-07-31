# AISolar → Launch — The Master Plan
### Grounded 30 Jul 2026. The one plan. Do not re-derive §0 or §1 — they are settled.
> Companions: [`AISOLAR_CONSTITUTIONAL_AUDIT.md`](AISOLAR_CONSTITUTIONAL_AUDIT.md) (the reconciliation) ·
> [`AISOLAR_SAAS_MAP.md`](AISOLAR_SAAS_MAP.md) (the surface walk) · [`kernelVocabulary.ts`](../src/lib/kernelVocabulary.ts) (the grammar).

## §0 · WHERE WE ARE — settled, never re-derive
- **Constitution frozen** (`OA/Charter/AIOS_CONSTITUTIONAL_MODEL.md`). **Kernel sealed** — clean, boundary-native,
  10 invariants verified, `v0.1.0-genesis` on Supabase `qolqqgcbilymmlzkkrgn` (schema `kernel`).
- **AISolar audited, pass 2, GROUNDED** (SWEEP 8/9 + `kernelVocabulary.ts` + `THE_ONE_READ`). The result is a
  **reconciliation, not a demolition**: most of AISolar is already constitutionally correct.
- **The lesson (permanent):** *ground before you audit.* Read `THE_ONE_READ` → `kernelVocabulary` → SWEEP 8/9
  before touching AISolar. Pass 1 guessed and was wrong (would have deleted the PII tables — a GDPR disaster —
  and invented a vocabulary that already exists). Never again.
- **The one blocker:** AISolar has **no live database** (`coxmtpnq` is dead). Sweep 8 wires fakes → real Supabase;
  there is nothing to write to until a fresh AISolar app DB exists. Plus GATE 0 (keys/deploy, Cal) + GATE B (no
  prod migration until OA/GRIDS/COMH align, Cal).

## §1 · ALL THE PRIMITIVES — the frozen catalogue
**Constitutional primitives (kernel, never change):** Boundary · Identity · Event · Admission · Evaluation ·
Projection · Verification.

**AISolar (Domain 001) — three layers, every concept lands in one:**

**① KERNEL — the 26 domain events** (`layer='domain'`, refs+hashes+counts only, no PII, admitted above the kernel):
`LeadCreated · StageTransitioned · BillUploaded · EstimateGenerated · CallBooked · SurveyCompleted ·
ProposalGenerated · ProposalSent · ContractSigned · DepositPaid · FinalPaymentReceived · InstallScheduled ·
InstallStepCompleted · InverterConnected · SignOffCaptured · GrantReady · GrantStatusChanged · MessageSent ·
MessageReceived · ConsentCaptured · ReviewRequested · ReviewReceived · EscalationRaised · ApprovalRequested ·
ApprovalResolved`
- **Identities** (kernel Identity, admitted `identity_type`): `prospect` (lead) · `person` (staff/consultant/installer/owner) · `equipment` *(open: identity vs payload)*.
- **Boundary** (kernel): the installer business — admitted, never an AISolar table.

**② APP — erasable PII + projections** (constitutionally *required* app-side; GDPR erasability):
- PII/data: leads · lead_intake · proposals · site_surveys · contracts · invoices · conversations/messages ·
  notifications · seai_applications · consent_records · feedback · profiles · documents/photos (→ storage).
- projections (never stored as truth): `workflow_stage`/pipeline · the proposal document · paid/unpaid ·
  current checklist · every cockpit / portal view.
- domain data: the product catalog (unify the two) · lead sources.
- implementation/config: agent_queue/runs · ai_config · agent_prompts · email_templates · tenant settings.

**③ LEAK — the entire constitutional redesign (three items):**
- `user_roles` + `has_role()` → **RoleGranted / RoleRevoked** events, authority projected *(inv 7)*.
- `assignments` → **AssignmentMade** events, relationship projected *(Relationship Decision)*.
- `activity_logs` → **removed** — the event chain is the log *(inv 6)*.

## §2 · THE SWEEPS — the execution
### Sweep 8 — DB full-send (finish the wiring) · *gated*
Fakes → real. **Unblock first:** a live AISolar app DB. Then: push schema → wire surfaces → verify. Contents:
funnel ends **A1** (auth/tenant) + **A2** (front-door lead → `LeadCreated`); **A3–A8**; migrations **M1–M14**;
per-surface wiring (the 4 cockpits + portals, `SWEEP8_DB_WIRING.md`); the **emit points** (D2/L6 → the 26 events).
*Parks behind the live DB + GATE B.*

### Sweep 9 — hardening (bulletproof, five-team bar) · *mostly gate-free*
Do now, no DB: kill the **8 `tsc` errors** · the **AI guardrail** (server-side context scoping — no cross-tenant
leak, 9.0/L4) · error boundaries + Sentry seams · **demo-OFF + remove every `generateDummyLeads` path** (A9/A10) ·
full **truth-pass** · family-colour/UI consistency · dark mode · accessibility · mobile. *(Post-deploy verify needs the DB.)*

### Sweep 10 — final polish + launch hardening *(NEW — Cal, 30 Jul)*
The last mile once 8 + 9 land:
- **Design final pass** — artist's touch across every surface, family-colour, new product snapshots.
- **GTM set** — pitch/investor deck, per-offer one-pagers, Domain-001 case study, demo video/GIFs, ad creative
  (truth-pass, DO-NOT-CLAIM throughout).
- **Founder teaching walkthrough** — the guided demo mode that arms Cal to sell every surface.
- **Launch readiness** — RLS per-POV isolation proof · GATE 0 close (keys/history/deploy/bootstrap/smoke) ·
  the go-live checklist · a Roscommon end-to-end dry-run.

## §3 · THE PATH — ordered
1. **Ratify the audit** — Cal confirms the three-layer split + the three leaks (§1). *(gate on everything below)*
2. **Sweep 9 gate-free hardening** — start now, no DB, no gate.
3. **Stand up the live AISolar app DB** — fresh tenant Supabase project (fresh keys sidestep GATE 0). *Cal's call.*
4. **Sweep 8** — push schema → wire fakes→real → verify. *(needs #3)*
5. **Admit AISolar above the kernel** — register the 26 events at `layer='domain'`, wire the emit points, replace
   the 3 leaks with events + projections. *(needs audit ratify + GATE B)*
6. **Sweep 10** — final polish + launch hardening.
7. **Go live** — Roscommon end-to-end → the three-together GTM (Roscommon live · Outreach by Renewably · Train the consultant).

## §4 · GATES & BLOCKERS — owned
| Item | Owner | Blocks |
|------|-------|--------|
| Live AISolar app DB | **Cal** (decision) | all of Sweep 8 |
| GATE 0 (RLS advisories, keys, history, deploy) | **Cal** (hands, ~60%) | prod deploy |
| GATE B (OA/GRIDS/COMH alignment) | **Cal** (conversation) | every kernel-touching change + prod migration |
| Schema gap (migrations ↔ `types.ts`) | Claude | accurate Sweep 8 (reconcile on the live DB) |
| Dummy-data count (12 vs 18) | Claude | the demo-off gate (A10) |

## §5 · NEXT
- **I can start now, unblocked:** Sweep 9 hardening (§2) — real progress, zero gates.
- **Needs Cal:** ratify the audit (§3.1) · the live AISolar DB decision (§3.3) · open GATE 0 / GATE B when ready.
