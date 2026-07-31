# AISolar — Constitutional Audit (Admission Derivation)
### Pass 2 · GROUNDED · 30 Jul 2026
> Supersedes pass 1 (which guessed the event vocabulary and wrongly "removed" the PII tables). This pass is
> read against the actual code + notes: `src/lib/kernelVocabulary.ts`, `docs/SWEEP8_DB_WIRING.md`,
> `docs/SWEEP9_NOTES.md`, `docs/THE_ONE_READ.md`, `types.ts`, the 38 migrations. Tested against
> `OA/Charter/AIOS_CONSTITUTIONAL_MODEL.md` + the ten invariants. **Nothing enters the sealed kernel
> (`v0.1.0-genesis`).** AISolar is proven *above* it.

## Headline — the model is ~80% already designed; this is a reconciliation
AISolar already embodies the constitution in three places, and pass 1 missed all three:
1. **A domain event vocabulary exists** — `kernelVocabulary.ts`, 26 events, *"names EXACTLY as registered in
   kernel.event_types (verified 28 Jul)."* Refs-only, pre-registered, 64 KiB cap, draft→approve→outcome.
2. **The refs/PII split is doctrine** — kernel gets **refs + hashes + counts**, never PII. **PII stays in app
   tables because append-only + PII = an unhealable GDPR wound.** So app tables are the *required erasable
   layer*, not truth and not "removals."
3. **Attestation law** — field capture is *attested by a named person, never "verified"* (occurrence is the
   frontier no record crosses). Already in the payload contracts (`SignOffCapturedPayload.attested_by_ref`).

So AISolar's constitutional shape is **three layers**, and the audit's job is to place every concept in one:

```
KERNEL (immutable, refs+hashes, PII-free)   → the 26 domain events (layer='domain'), admitted above the kernel
APP    (erasable, PII + projections)        → the tables holding names/bills/notes + projected state (GDPR-required app-side)
LEAK   (stored-as-truth that must move)      → authority / relationships / status / logs → events + projections
```

## The domain event vocabulary (the real spine — `kernelVocabulary.ts`, not invented)
`LeadCreated · StageTransitioned · BillUploaded · EstimateGenerated · CallBooked · SurveyCompleted ·
ProposalGenerated · ProposalSent · ContractSigned · DepositPaid · FinalPaymentReceived · InstallScheduled ·
InstallStepCompleted · InverterConnected · SignOffCaptured · GrantReady · GrantStatusChanged · MessageSent ·
MessageReceived · ConsentCaptured · ReviewRequested · ReviewReceived · EscalationRaised · ApprovalRequested ·
ApprovalResolved` — **26.** Admitted as `layer='domain'` event_types above the neutral kernel. Payloads are
refs/hashes/counts only (proven in `InstallStepCompletedPayload`, `InverterConnectedPayload`, `SignOffCapturedPayload`).
*Pass-3 check: this list vs the actual emit points + the workflow stages in `STAGE_TO_EVENT`.*

---
## Decision log — every table (grounded; verdict · layer · reason + trace)
Layers: **K**=kernel-event · **A**=app PII/projection (erasable, above kernel) · **L**=leak→events · **I**=implementation

| table | layer | verdict | reason + trace |
|-------|:---:|---------|----------------|
| `leads` | A + K | **Keep (app) — its truth is events** | Identity (referent) + PII (name/eircode/contact) that MUST be erasable → stays app-side. Existence + moves are `LeadCreated`/`StageTransitioned` events (refs). Its `workflow_stage` **column is a projection** of those events. *(Identity; chain 8 PII; inv 4)* |
| `lead_intake` | A | **Keep (app, PII)** | 21-field bill extraction = PII/financial, erasable. `BillUploaded`/`EstimateGenerated` record that it happened (refs). *(chain 8)* |
| `proposals` | A(proj) + K | **Keep (app) — projection + event** | The document is a **projection** of the lead's events (bill+design+grant+product). `ProposalGenerated`/`ProposalSent` are the events. Versions append-only. *(Projection; inv 4)* |
| `site_surveys` | A + K | **Keep (app, PII/design) + `SurveyCompleted`** | roof/occupancy/photos = app data; the completion is an event. Status column → projection. |
| `contracts` | A + K | **Keep (app) + `ContractSigned`** | signed doc app-side (storage + hash); the signing is an attested event. *(attestation, chain 10)* |
| `invoices` | A(proj) + K | **Keep (app) — projection** | `DepositPaid`/`FinalPaymentReceived` events; paid/unpaid = projection of payment events. *(inv 4)* |
| `installation_checklists` | A + K | **Keep (app) + `InstallStepCompleted`** | per-stage completion = events (refs: checks_done, photos_captured count). Current checklist = projection. |
| `installed_equipment` | A + K | **Keep (app) + `InverterConnected`** | serial/fitted-model = equipment attrs (not PII, ride as refs); the connection is an attested event. Feeds NC6 §5. *(kernelVocabulary payload)* |
| `seai_applications` / `seai_documents` | A + K | **Keep (app) + `GrantStatusChanged`** | grant tracking app-side; status changes are events. **Grant TRACKS, never submits** (truth-pass). |
| `esb_submissions` | A + K | **Keep (app) + `InstallStepCompleted`(handover)** | the sealed pack record (storage_path + sha256 + lifecycle) — app-side per M-plan; the milestone is an event. |
| `conversations`/`conversation_messages`/`touchpoints`/`lead_touchpoints` | A + K | **Keep (app, PII) + `MessageSent`/`Received`** | message BODIES are PII/erasable → app; that a message occurred = event (ref). The one thread is a projection. |
| `notifications` | A + K | **Keep (app) + `MessageSent`** | send record app-side; event records it. *(both-ends law L1)* |
| `consent_records` | A + K | **Keep (app, append-only) + `ConsentCaptured`** | GDPR consent = app append-only + the `ConsentCaptured` event (ref). Erasable subject data stays app-side. *(chain 8)* |
| `feedback` | A + K | **Keep (app) + (ReviewReceived / correction)** | text app-side; the correction ref rides `AgentCorrectionRef` (hash). |
| `project_documents`/`lead_documents`/`survey_photos`/`installation_photos` | A | **Keep (app + storage)** | artifacts live in **storage**; DB holds path + sha256 + size. Never in the chain (64 KiB / PII). *(emit law 4)* |
| `products`/`solar_products` | A(domain) | **Keep (domain data), merge** | AISolar's catalog = domain-owned reference data. Unify the two (SWEEP8 M8). Not kernel. |
| `installers` | — | **Kernel Boundary** | accountable party → a kernel boundary. Not an AISolar table. *(Boundary)* |
| `profiles` | A + K(Identity) | **Keep (app, PII)** | person referent = kernel Identity; name/contact = erasable app PII. |
| **`user_roles` + `has_role()`** | **L** | **CHANGE → events** | **The authority leak.** Roles are projected from `RoleGranted`/`RoleRevoked` events, never a table + flag. `has_role()` becomes a projection. *(Authority Decision; inv 7 — no decree)* |
| **`assignments`** | **L** | **CHANGE → events** | stored *relationship* (lead↔consultant/installer). → `AssignmentMade`/`StageTransitioned`, read by projection. *(Relationship Decision)* |
| **`activity_logs`** | **L** | **Remove** | the event chain **is** the log. Duplicated history. *(inv 6 re-derivable)* |
| `agent_queue`/`agent_runs` | I | **Keep (implementation)** | the execution engine. Intents ride `ApprovalRequested/Resolved`; the queue is machinery. |
| `agent_prompts`/`ai_config`/`email_templates`/`follow_up_settings`/`notification_preferences`/`tenant_settings` | I/A | **Keep (app config)** | implementation + tenant config (`serverStore.ts` already dual-writes these). Not kernel truth. |

## The gaps (folded in from SWEEP 8 — not re-derived)
- **A1 auth + tenant provisioning** (`/auth`, `/onboarding`) — signup → boundary + `RoleGranted` + first-admin bootstrap. *launch-critical.*
- **A2 front-door lead creation** (`/start`, `/upload`) — bill upload must birth a lead via `ingest-lead` → `LeadCreated`. *launch-critical, highest-leverage.*
- **A9 POV gating** — **demo mode bypasses all role/route gating** (`ProtectedRoute` returns children unchecked). Demo OFF in prod + RLS per-POV proof.
- **A10 dummy data** — `generateDummyLeads` in ~12–18 files (docs disagree — verify). No dummy path reachable in prod.
- **Gates:** GATE 0 (RLS advisories, key/history) · **GATE B — no prod migration until OA/GRIDS/COMH aligned; every kernel-touching change parks here.**

## §4 Implementation blueprint — *pass 3, after this reconciliation is ratified*
The events already exist; the blueprint is: admit the 26 as `layer='domain'`, wire the emit points (SWEEP8 D2/L6),
keep PII/projection app-side, replace `user_roles`/`assignments`/`activity_logs` with events + projections.

## §5 Ten-invariant compliance — *pass 3*
Each surviving concept vs all ten; the three leaks (authority/relationship/log) fail inv 4/6/7 today and are the redesign.

## Open (do not guess)
1. The 26-event list vs the actual emit points + `STAGE_TO_EVENT` — confirm complete.
2. The migrations↔`types.ts` schema gap — reconcile which tables truly exist (live DB is `coxmtpnq`, dead).
3. `A10` dummy-data file count (12 vs 18) — a drift to resolve before the demo-off gate.
