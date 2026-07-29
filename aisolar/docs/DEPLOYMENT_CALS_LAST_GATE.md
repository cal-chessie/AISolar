# DEPLOYMENT — CAL'S LAST GATE
### The operational layer on top of a finished architecture. 30 Jul 2026.
> GPT's due-diligence verdict: *"The architecture is no longer the risk… the remaining
> work is execution."* Scores 9.3–9.5/10; the missing 0.5 is THIS document — dependency
> graph, critical path, definition-of-done, rollback, cutover runbook, verification
> matrix. Read this first; everything else is linked at the bottom in reading order.

---

## 1 · THE DEPENDENCY GRAPH (what can run in parallel)

```
FOUNDATION (serial — everything hangs off this)          MESSAGING (parallel after deploy)
────────────────────────────────────────                 ─────────────────────────────
coxmtpnq TOKEN  ◄── the one key                          POSTMark token + DNS
   ↓                                                        ↓
GATE 0 remainder (keys dead · history purge)             email sends live (7 fns)
   ↓                                                        ↓
supabase db push (18 migrations, in order)               magic links / digests
   ↓
functions deploy ×16 + secrets                           OWNER (parallel after cutover)
   ↓                                                     ────────────────────────────
Cal signs up → BOOTSTRAP SQL → admin + test logins       agent_runs → analytics
   ↓                                                        → transparency windows
types regen (supabase gen types) → remove as-any bridge
   ↓                                                     GROWTH (post-launch)
CUTOVER: read-flip (7 stores) · real queries (18 files)  ────────────────────
   · demo OFF (VITE_ENABLE_DEMO unset)                   referrals → reviews → social
   ↓                                                     sources keys → SI/RI/county
SMOKE TEST → WAVE 1 ROSCOMMON                            Cal.com booking
```
**INSTALLER lane** (parallel after db push): installed_equipment verify → AIField
writes → ESB pack persistence → portal docs (M3).

## 2 · CRITICAL PATH — P0 / P1 / POST

**P0 (launch-blocking, in order):** token · GATE 0 · db push · fn deploy + secrets ·
auth + tenant bootstrap · RLS verified per-POV · demo OFF + real queries on the spine
(leads → survey → proposal → install) · lead creation front door (A2) · proposal
draft-send path · Postmark live · installer persistence (installed_equipment) ·
smoke test end-to-end.
**P1 (launch week):** products seed + catalog cutover · conversations UI → tables ·
provenance line on intake card · sources keys minted (SI / RI / county sites) ·
Cal.com · the 8 named tsc errors.
**POST:** payments PoV lockouts + tier entitlements · code-split (>600kB chunk) ·
Sweep 9 (guardrails, copy+snapshots, UX smoothing, hardening) · portal_submitter
browser agent · DNO axis + VPP · Britain jurisdiction pack.

## 3 · DEFINITION OF DONE (the ladder — no item skips a rung)

```
WRITTEN → MERGED → DEPLOYED → VERIFIED (human used it) → OBSERVED IN PRODUCTION
```
Example — Notifications DONE WHEN: row inserted ✔ email sent ✔ customer notified ✔
consultant notified ✔ touchpoint exists ✔ Realtime update ✔ audit log ✔ retry works ✔.
Example — Proposal send DONE WHEN: draft created ✔ human clicked send ✔ email arrived ✔
touchpoint written ✔ customer opened ✔.

## 4 · VERIFICATION MATRIX (truthful states, tonight)

| Component | Written | Merged | Deployed | Verified | Production |
|---|:-:|:-:|:-:|:-:|:-:|
| Kernel 0011 (receipts F1-F3) | ✔ | ✔ | ✔ | ✔ (rollback-test) | ✔ |
| 18 app migrations | ✔ | ✔ | □ | □ | □ |
| Dual-write layer (7 paths) | ✔ | ✔ | n/a (client) | ✔ (byte-identical) | □ |
| ESB submission pack (client) | ✔ | ✔ | n/a | ✔ (14pp, both states) | □ |
| 16 edge functions | ✔ | ✔ | □ | □ | □ |
| Auth + bootstrap | ✔ | ✔ | □ | □ | □ |
| Email sends (Postmark) | ✔ | ✔ | □ | □ | □ |
| Real-data cutover (18 files) | □ | □ | □ | □ | □ |
| GDPR erasure (extended) | ✔ | ✔ | □ | □ | □ |

## 5 · ROLLBACK (per deployable — "if this explodes")

- **Migrations:** add-only + idempotent = **roll-forward posture**; nothing drops or
  rewrites. Emergency: restore from the pre-cutover backup (runbook step 1).
- **Edge functions:** `git checkout <prev-tag> && supabase functions deploy <fn>` —
  previous version restored in minutes. Scheduler explosion: disable the pg_cron job,
  requeue failed rows (`agent_queue.status='pending'`).
- **Frontend:** Vercel → previous deployment → Promote (instant, zero data risk).
- **Kernel 0011:** `DROP TRIGGER relationships_receipt/policies_receipt` — reversible
  without data loss (receipts already written stay, correctly, forever).
- **Dual-writes:** no rollback needed — fire-and-forget with no read dependency until
  the flip; worst case rows sit unused.
- **Demo:** re-set `VITE_ENABLE_DEMO` to restore demo behavior instantly.

## 6 · THE CUTOVER RUNBOOK (the 10pm script — each step has a verify line)

```
□ 1  BACKUP: dashboard → Database → Backups → take manual backup      (verify: timestamp)
□ 2  GATE 0: old keys dead · Maps/Cal.com rotated · history purged    (verify: old key 401s)
□ 3  supabase link --project-ref coxmtpnqjybwlrfwkols                 (verify: linked)
□ 4  supabase db push                                                 (verify: to_regclass all new tables)
□ 5  supabase functions deploy (×16) + secrets set (SECRETS.md list)  (verify: curl ingest-lead 401 w/o key)
□ 6  supabase gen types typescript → commit → remove as-any bridge    (verify: tsc baseline)
□ 7  Realtime ON (conversations) · pg_cron ON (agent-drain)           (verify: cron row)
□ 8  Cal signs up → run AUTH_RUNBOOK bootstrap SQL → test login too   (verify: /owner loads as admin)
□ 9  Postmark token + DNS at Register365                              (verify: test mail Delivered)
□ 10 unset VITE_ENABLE_DEMO → redeploy frontend                       (verify: /owner redirects logged-out)
□ 11 seed products (catalog cutover)                                  (verify: products rows)
□ 12 SMOKE: lead via door → agents chain → survey booked → proposal
     draft → send → deposit → gate → ESB pack → kernel receipt        (verify: every rung of §3)
□ 13 RELEASE — point domains, GO
```

## 7 · OBSERVABILITY (the owner dashboard metrics, D-item)
failed emails · failed edge invocations · retry counts · avg agent duration ·
queue depth · stuck jobs (>15min) · daily LLM spend vs €200 cap. (Sentry post-launch.)

## 8 · THE DOCUMENT MAP (reading order, next session starts HERE)
1. **This file** — the gate + runbook
2. [FULL_AUDIT_30JUL.md](FULL_AUDIT_30JUL.md) — trust state, every department graded
3. [THE_MIGRATION.md](THE_MIGRATION.md) — landed vs staged, constitutional delta
4. [LAUNCH_HANDOVER.md](LAUNCH_HANDOVER.md) — Cal's training: email, SMS truth, every trigger
5. [THE_NETWORK_RULING.md](THE_NETWORK_RULING.md) — boundary/tenant/brand/source + 32 counties
6. [SETUP_COUNTY.md](SETUP_COUNTY.md) · [SETUP_STANDALONE_TENANT.md](SETUP_STANDALONE_TENANT.md) — the repeatables
7. [FULL_SCOPE_AND_ARCHITECTURE.md](FULL_SCOPE_AND_ARCHITECTURE.md) — whole-system map + browser-agent design
8. [SWEEP8_DB_WIRING.md](SWEEP8_DB_WIRING.md) — engineering notes (the permanent history; per GPT's split this file = Notes, THIS file = Checklist+Cutover)
9. Migrations `20260730`–`20260802` + kernel `COMH/…/0011_CONSTITUTIONAL_RECEIPTS.sql`
10. `OA/CONSTITUTIONAL_DOCTRINES.md` + `OA/ORDINAL_KERNEL_REVIEW_CLAUDE_v1.md` (v1.2)

*Per GPT's structural ruling: this file is the CHECKLIST + CUTOVER; SWEEP8_DB_WIRING
stays the ENGINEERING NOTES; FULL_AUDIT is the AUDIT. Three documents, three jobs.*
