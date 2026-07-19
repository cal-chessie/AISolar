# Pipeline Autonomy Audit — honest grades (July 2026)

Grading scale: **A** = truly autonomous, production-grade · **B** = autonomous but shallow logic · **C** = writes records / sends notifications, humans do the real work · **D** = exists in name only.

## Stage-by-stage

**Lead capture (websites → platform) — A (as of this session).** Both sites POST into `ingest-lead` with validation, dedupe, brand attribution and fallback email. County sites plug in with zero code.

**Lead intake agent — B+.** Real scoring, deterministic system estimate, dedupe by MPRN, now advances stage so the chain cascades (fixed this session — it previously dead-ended every lead). Shallow spots: scoring is 4 if-statements, not the LLM; estimate ignores day/night usage even when known.

**Bill extraction — B, but ORPHANED.** The edge function now extracts ~20 fields (MPRN, provider, tariff, day/night rates, standing charge, VAT, estimated-reading flag…). However **no frontend code calls it** — there is no bill-upload UI wired to `extract-bill-data` anywhere in the app. The "bill at the front door" currently has no door. Wire it into the intake/estimate flow during the design pass.

**Survey scheduler — C.** Books "first available installer, today+5 at 10:00". No calendar availability check, no customer slot choice, no conflict detection — and its touchpoint claims channel "email" but **no email is sent**. This is the stage you called the real meat (customer books a callback, consultant runs the survey) and it's currently the weakest link. RealCalendar/UnifiedCalendar components exist in the UI but the agent doesn't consult them.

**Survey → proposal handoff — A (as of this session).** Previously broken: proposal drafter read `confirmed_*` columns that existed on no survey row, so every proposal silently fell back to ballpark estimates and "no battery". Now a DB trigger copies completed surveys into `lead_intake.confirmed_*` in the same transaction, the drafter reads confirmed → survey → estimate in that order, and the survey table gained structured battery/inverter/shading/area columns.

**Proposal drafter — B+.** Genuinely drafts: LLM narrative with versioned prompts, cost tracking, deterministic fallback, correct draft-never-auto-send gate. Hardware is hardcoded (one panel model, one inverter) rather than chosen from `solar_products`.

**Follow-up agent — A-.** LLM-personalised, stage-aware, respects `follow_up_settings` thresholds, real emails, idempotent. The closest to the pitch.

**Grant "submitter" — C, misnamed.** Creates an internal `seai_applications` row and logs "started application". Nothing is submitted to SEAI (no public API exists). Rename to *Grant Tracker* in UI copy — as "submitter" it misrepresents.

**Install coordinator — C+.** Same pattern as survey scheduler: first available installer, today+28, no materials logic despite the landing page claiming "materials ordered".

**Post-install — B.** Warranty email, review request, notification — real and appropriate.

**Digest / stale-lead / payment-reminder crons — B.** Real emails on real schedules through the audited agent runtime. Solid.

**Customer portal — B.** Token-gated, reads real pipeline data; the front-loaded data now actually reaches it (via the handoff fix). Gets an automatic A once survey capture is enriched in the UI.

## The honest summary

Infrastructure: genuinely excellent — queue, audit trail, cost caps, idempotency, RLS. **The nervous system is real.** What's thin is decision quality in the middle stages: the two "scheduling" agents don't schedule, they stamp dates. And two front-door pieces (bill upload UI, customer slot-picking on the calendar) don't exist yet — they're the highest-leverage builds because everything downstream now provably carries the data.

## Recommended build order (post-Vercel)

1. Bill-upload step in intake UI → `extract-bill-data` → write `extracted_*` to `lead_intake` (door for the front door).
2. Survey scheduler v2: read consultant/installer calendar availability, offer the customer 3 slots (portal link), confirm on selection, send the actual email.
3. Install coordinator v2: same calendar logic + real checklist trigger.
4. Rename grant agent in UI copy; wire `solar_products` into the proposal drafter.
