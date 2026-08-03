# DEPLOYMENT — CAL'S LAST GATE
### The operational layer on top of a finished architecture. 30 Jul 2026.
> GPT's due-diligence verdict: *"The architecture is no longer the risk… the remaining
> work is execution."* Scores 9.3–9.5/10; the missing 0.5 is THIS document — dependency
> graph, critical path, definition-of-done, rollback, cutover runbook, verification
> matrix. Read this first; everything else is linked at the bottom in reading order.

---

## 📁 THE DOC MAP (1–3 Aug docs — ALL of them, none loose; Cal: "don't leave loose docs")
**Order of truth: [`GO_LIVE.md`](GO_LIVE.md) (THE final gate + §9 Cal's adds + §10 first-cohort honest list) →
the register in [`CALS_GROWTH_DEV.md`](CALS_GROWTH_DEV.md) (every TODO, deduped + month-6 parked w/ build-times).**
Detail docs: [`MASTER_AUDIT_1AUG.md`](MASTER_AUDIT_1AUG.md) (estate map, live-verified) ·
[`DEPLOYMENT_READINESS_2AUG.md`](DEPLOYMENT_READINESS_2AUG.md) (squad verdicts + the 20) ·
[`PAPERWORK_AUDIT.md`](PAPERWORK_AUDIT.md) (NC6/7 engine truth) · [`THE_OPERATING_STACK.md`](THE_OPERATING_STACK.md)
(the vision, triaged) · [`ONBOARDING_SPEC.md`](ONBOARDING_SPEC.md) (Flowith flow + 7-day ACTIVATION checklist + sites
wiring plan) · [`OWNER_REVAMP_BRIEF.md`](OWNER_REVAMP_BRIEF.md) (next session's opener — Cal's GO given).

## 0 · RECONCILED TO V5 — THE CURRENT MAP (31 Jul 2026) ⭐ READ THIS FIRST
> §1–8 below are the **coxmtpnq-era** reference (still-good runbook mechanics, DoD ladder,
> rollback). This section supersedes their DB specifics. Full engineering history:
> `docs/V5_BUILD_LOG.md`.

### 📊 WHERE WE ARE — **~65% to a live cohort tenant** *(revised down after the SWEEP-8 reconciliation — honest > flattering)*
```
Foundation ......... ████████████ 100%   DB · 38 migrations · network · door keys
Core systems ....... ████████████ 100%   gate_bridge · AIGrids routing · RLS floor · access model · front door
App wiring ......... █████░░░░░░░  ~45%   read-flip · serverStore align · A1 tenant-onboarding · L2 numbers · notify · home/business fork
Deploy execution ... ░░░░░░░░░░░░   0%    functions + secrets + Postmark + demo-off  ← YOUR keys
Smoke + go ......... ░░░░░░░░░░░░   0%    full-spine test, then release
```
**Architecture (Foundation + Core) is done + proven — the hard, un-scary part. The honest work left is app wiring (more
than I'd shown — incl. A1 tenant-onboarding), then execution + your keys, then the smoke test. See the reconciliation below.**

**THE WALL IS GONE.** §1–8's blocker was coxmtpnq unreachable under Lovable. We rebuilt on a
fresh **AISolar-V5** DB (`ywizcsulurxoqjdgnkvc`) that our token reaches directly. **GATE 0
(leaked keys) is retired for V5 — fresh keys.** The deploy can proceed, carefully.

### ✅ DONE + VERIFIED (the V5 rebuild already climbed the hardest P0 rungs)
- ✅ Fresh V5 DB · **all 38 migrations applied** (8 classes of never-tested migration bugs fixed in the files).
- ✅ Network seeded: 7 brands · boundaries · `kind` (national/county/independent) · **per-door `source_key`s**.
- ✅ **gate_bridge + AIGrids** (routing) built + proven 8/8 (origin-kind fork · €500 gate national-born only · AIGate gate-call · hash-chained events verify).
- ✅ **Security floor:** tenant-scoped RLS on `leads` + 19 children (80 policies) · helpers `is_platform_admin`/`has_tenant_access`/`can_see_lead`/`own_lead` · **isolation proven** (a county seat sees only its tenant).
- ✅ **Access model:** `owner` role wired (AppRole · isOwner · route gates) · platform-admin vs org-owner split · Cal = global admin. tsc clean.
- ✅ **Multi-tenant secure front door:** `sources` door keys + `resolve_lead_door()` + `ingest-lead` rewritten (tenant + `origin_brand_id` off the key) — **proven end-to-end**.
- ✅ FK integrity (contracts/invoices/leads→brands) · read path partly wired (`realLeads`, 13 components).

### ⬜ LEFT FOR A CLEAN, SECURE DEPLOY (each with its verify line)
**P0 — launch-blocking, grouped by WHO MOVES IT:**

🔨 **MY SIDE — build, no keys needed (Claude can knock these out now):**
- ⬜ **A1 · Auth + tenant onboarding** — installer signup → create tenant + role + first-admin bootstrap. **Launch-critical, not built** (Cal was bootstrapped by hand). *(SWEEP-8 A1 — the miss the reconciliation caught.)*  (verify: a fresh signup lands in its own tenant + scoped cockpit)
- ⬜ **Home/business fork + estimates** — the door asks "home or business?"; domestic vs commercial KPI/estimate presentation (SWEEP-8 A2 + SWEEP-9 §9.1)  (verify: a domestic and a commercial lead render their own estimate)
- ⬜ **L2 · Numbers-through-spine** — proposal drafter STORES `computeQuote()` + `selfConsumptionFromOccupancy()` (kill the flat `0.70`)  (verify: stored proposal figures === what the customer is shown)
- ⬜ **Real-data read-flip** — finish `realLeads` across the workbench + align `serverStore` (dual-write) to V5 tables  (verify: cockpit shows DB leads, not dummy)
- 🟡 **Wire the hero widget** — ✅ `leadCapture.ts` threads the tenant `source_key` (`?k=` → `x-source-key`; resolved the client-auth "SECURITY NOTE" — the door key is the anon-safe path). tsc clean. **Remaining:** the owner "copy your embed code" panel (installer grabs `<iframe …?k=THEIR-KEY>`) + browser end-to-end proof (needs the function deployed).  (verify: a widget submission lands as an attributed lead)
- ⬜ **National merge** — RI + SI → **one national account, two brands** + create Cal's **owner login**  (verify: owner cockpit shows RI + SI, nothing from another org)  · *OUR finale — Cal + Claude, saved for last* 🎯

🔑 **YOUR SIDE — keys / accounts, only Cal (Claude preps everything):**
- ⬜ **Kill the OLD leaked keys** (coxmtpnq · calchessie `vythuqax` · kernel · Maps/Cal.com) + purge git history  (verify: old key → 401)
- ⬜ **Deploy 16 edge functions** to V5 + set secrets — *Claude preps every function + a secrets manifest; Cal pastes the key values*  (verify: `curl ingest-lead` → 401 without a key)
- ⬜ **Postmark** token + DNS  (verify: test mail Delivered)
- ⬜ **Demo OFF** (`unset VITE_ENABLE_DEMO`) + **frontend deploy** (Vercel, V5 env)  (verify: `/owner` redirects when logged-out)
- ⬜ **Put the door on the LIVE brand sites** — national (RI/SI) + Saunderson / Wide Awake / Solar Roscommon on their **real domains**. Practical field lead-flow **AND the go-live signal itself**.  (verify: a real lead from a live site lands attributed)

🤝 **TOGETHER — the gate between "deployed" and "trusted":**
- ⬜ **SMOKE TEST** the full spine: door → route → survey → proposal draft → send → deposit → ESB pack. **Every human
  button is the head of a chain** (stage advance → touchpoint → kernel event → notification → email) — test each one fires
  the *whole* chain, and once Postmark is live, that **the email actually sends**.  (verify: every DoD rung in §3 · a real email Delivered per button)

*⚠️ Not launch-blocking → **post-launch:** the **AIGate human surface** (national gate-call cockpit) — the first installer cohort never hits it; tracked in `Cals_Growth_Dev`.*

**P1 / with-marketing / post-launch (pulled from the sweeps + build log):**
- ⬜ **Onboarding demo set** — one curated lead per type (**NC6 · NC7 · commercial · domestic · farm**) so every user + cohort installer practises the full flow before going live · pre-launch training asset
- ⬜ **CSV bulk import** — fields + upload→map→insert via door key (agent layer later) · onboarding nicety
- ⬜ **Sweep 7 content/marketing revamp** — per-page meta · surface the widget/coach/agents · replace placeholder stats · blog · *with marketing*
- ⬜ **Onboarding-flow polish** — first contact logged → notify all parties → email/calendar booking · *with marketing*
- ⬜ **Sweep 9 hardening** — guardrails · PoV payment lockouts + tier entitlements · code-split (>600kB) · *post-launch*
- ⬜ **Sweep 10 — final polish + GTM** → **full logic pulled forward in [`SWEEP10_NOTES.md`](SWEEP10_NOTES.md)** (design final pass · GTM set · domestic/commercial fork · founder walkthrough · stragglers · **opens with a full re-check of every sweep + audit round**). The last mile after 8+9 → then Go-Live (Roscommon + Renewably outreach + train the consultant). Absorbs ROUND4's design items so nothing's re-diagnosed.
- ⬜ **ROUND4 stragglers (read in full 31 Jul)** — **Terms of Service rewrite** (Privacy was rewritten, ToS still old — *pre-launch legal*) · **add `tsc --noEmit` to build/pre-commit** (ROUND4 caught 2 runtime crashes that passed green — cheap guard) · **heatmap/session analytics** → `Cals_Growth_Dev`. *(NC6 automation · installer rewire · AISales identity — all since DONE; ROUND4's #1 BLOCKING "ingest-lead browser auth" — CLOSED tonight via source keys.)*
- ⬜ **Kernel connection** — bind `gate_bridge` → the inscribed kernel · *Phase 2, post-cohort*

### 🔎 SWEEP-8 / SWEEP-9 RECONCILIATION (added 31 Jul after Cal challenged "did you get everything" — I hadn't)
My LEFT list compressed SWEEP 8's ~45 items into "read-flip + serverStore." Too coarse. Granular source of truth stays
`SWEEP8_DB_WIRING.md`; this maps status to V5 so nothing hides.

**✅ Tables that NOW exist on V5** (migrations applied): `installed_equipment` · `esb_submissions` · `products` ·
`feedback` · `consent_records` · `conversations` · `conversation_messages` · `lead_touchpoints` · `notifications` ·
`agent_queue/runs/prompts` · `ai_config`. *(The table exists; the app WIRING to it is still open — below.)*

**⬜ Tables SWEEP 8 named that are NOT built** (their migrations were never written) — land with their feature, mostly P1/growth:
`agent_corrections` (M5, learning loop) · `designs` (M6) · `proposal_versions` (M7) · `installer_vault` (M10) ·
`staff.home_address`+`depots` (M12) · `agent_route_runs` (M13) · `inventory` (M14) · `referrals`+`tier_entitlements` (M9) · magic-link tokens (M4).

**⬜ LAUNCH-CRITICAL wiring I under-captured — now surfaced:**
- **A1 · Auth + tenant onboarding** *(my side)* — installer signup → create tenant + role + bootstrap. I bootstrapped
  Cal by hand; the self-serve flow is **not built**. **No new tenant onboards without it — the biggest miss.**
- **A2 + 9.1 · Front-door home/business fork** *(my side)* — lead capture is the tenant's own site (the door we fixed);
  it must ASK "home or business?" and fork domestic (€1,800 grant, 0% VAT, €-savings framing) vs commercial (NDMG, ex-VAT,
  ACA year-1 write-off, ROI/IRR framing). Engine half-detects it; the ask + the two estimate presentations are open.
- **L1 · Both-ends notifications** *(my side + deploy)* — every interaction emails customer + consultant (+ magic link).
  Plumbing exists; completeness = the onboarding-flow polish. *(Was on the list, under-scoped.)*
- **L2 · Numbers-through-spine (the 0.70 kill)** *(my side)* — the proposal drafter must STORE `computeQuote()` +
  `selfConsumptionFromOccupancy()`, not the flat `0.70`. Real stored-vs-shown mismatch. `docs/SURVEY_REWRITE_BRIEF.md`.
- **A3–A7 · per-surface wiring** *(my side + deploy)* — leadflow sends · settings-persist · ai-config · gdpr-consent ·
  calculator carry-through. Most ride the read-flip + `serverStore` deploy.
- **Storage-bucket RLS** *(my side)* — photos/signatures/packs: scoped read + signed URLs. My floor covers
  `leads`+19 children; the storage buckets still need the scoping pass before real customer files.

**SWEEP 9 = post-deploy (mostly P1 already), two flagged UP:**
- 🔴 **9.0 · AI guardrails (SECURITY-CRITICAL)** — least-privilege LLM context (server-built, never client) + a red-team
  jailbreak/exfil suite, wired **the same day the LLM goes real** (SWEEP8 X8), not after. Not launch-day IF the LLM stays deterministic.
- **9.1 · domestic/commercial estimate fork** — see A2 above.
- 9.2–9.6 (copy/snapshots · UI smoothing · tsc-zero + Sentry · marketing set · founder teaching walkthrough) → `Cals_Growth_Dev` / P1.

**Bottom line:** the spine + security floor + front-door + access model are real + proven; the honest gaps I'd missed are
**A1 (auth/tenant onboarding)**, **the home/business fork + estimates**, **L2 (the 0.70 store)**, the **unbuilt feature tables**,
and **storage-bucket RLS** — now on the board, not lurking. **A1 is the one that moves onto the launch-critical line.**

### THE SPLIT — your hands vs mine
- **You (I cannot touch):** secret **values** (API keys/tokens) · accounts (Vercel, Postmark, DNS) · killing old keys · git-history purge.
- **Me:** all prep · the DB · function code · this checklist · the national merge · every verification I *can* run.

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
   ↓                                                        ↓
functions deploy ×17 + secrets                           SLACK: signing secret +
   ↓                                                     Interactivity URL → the
   ↓                                                     veto works with nobody
   ↓                                                     watching (already built)
   ↓                                                     OWNER (parallel after cutover)
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
| Kernel 0012 (boundaries · verify · manifest · admission) | ✔ | ✔ | ✔ | ✔ (rollback-test) | ✔ |
| Kernel 0013 (approval RPC + attestor on receipt) | ✔ | ✔ | ✔ | ✔ (rollback-test) | ✔ |
| Slack ops: webhooks + poster + heartbeat | ✔ | ✔ | ✔ (local) | ✔ (posted, refusal tested) | ✔ |
| Slack approval wire (`slack-approve`) | ✔ | ✔ | □ | ✔ (kernel side) | □ |
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
- **Kernel 0011/0012/0013:** each is DROP-reversible without data loss — triggers
  (`relationships_receipt` · `policies_receipt` · `commands_receipt`), the
  `kernel.boundaries` view, `verify_chain_linkage()`, `conformance_manifest()`,
  `resolve_kernel_command()`. Receipts already written stay, correctly, forever.
  Nothing was renamed and no write path changed, so a drop restores the prior shape
  exactly. **Rollback of the `layer` classification is an UPDATE, never a delete.**
- **Slack approval wire:** turn Interactivity OFF in the Slack app (instant kill —
  taps stop reaching the endpoint), or unset `SLACK_SIGNING_SECRET` (the function
  then fails closed with 500, never resolving anything unverified). Pending commands
  simply stay pending — the safe state. Approvals already receipted are permanent.
- **Slack poster:** delete/rotate the webhook URL in the Slack app. Agents lose their
  voice; nothing else is affected (no read dependency anywhere).
- **Dual-writes:** no rollback needed — fire-and-forget with no read dependency until
  the flip; worst case rows sit unused.
- **Demo:** re-set `VITE_ENABLE_DEMO` to restore demo behavior instantly.

## 6 · THE CUTOVER RUNBOOK (the 10pm script — each step has a verify line)

```
□ 1  BACKUP: dashboard → Database → Backups → take manual backup      (verify: timestamp)
□ 2  GATE 0: old keys dead · Maps/Cal.com rotated · history purged    (verify: old key 401s)
□ 3  supabase link --project-ref coxmtpnqjybwlrfwkols                 (verify: linked)
□ 4  supabase db push                                                 (verify: to_regclass all new tables)
□ 5  supabase functions deploy (×17, incl. slack-approve) + secrets  (verify: curl ingest-lead 401 w/o key)
     └ slack-approve MUST deploy --no-verify-jwt (Slack sends no JWT;
       its HMAC signature IS the auth). Secrets it needs:
       SLACK_SIGNING_SECRET · KERNEL_URL · KERNEL_SERVICE_ROLE_KEY
       + SLACK_{BUILD,DECISIONS,MONITORING}_WEBHOOK for the poster
□ 5b SLACK APP CONFIG (api.slack.com/apps → AIOS Agents):
     · Basic Information → copy *Signing Secret* → that is SLACK_SIGNING_SECRET
     · Interactivity & Shortcuts → ON → Request URL = the deployed
       slack-approve URL                                              (verify: Slack shows a green tick on the URL)
     · Test: post a decision → tap Approve → command flips + CommandResolved
       appears on the chain naming you                                (verify: select payload from kernel.events
                                                                       where event_type='CommandResolved')
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

**LIVE ALREADY — the Slack ops layer** (built 30 Jul, `docs/SLACK_OPS.md`):
- `~/.aios/slack-post` — the message contract made mechanical. **No `--proof`, no post**
  (exit 2). Channels are one-purpose and a fourth is refused — Doctrine 002 means no
  county or tenant ever gets a channel in our ops surface.
- `~/.aios/kernel-heartbeat` — **green = silence.** Posts red ONLY on: `orphans != 0` ·
  an immutability trigger missing · a receipt trigger missing — i.e. the moment the
  guarantee "nothing constitutional changes without a receipt" stops being enforced by
  the machine. That alert says **STOP deployment**, and it outranks everything.
  Schedule: `(crontab -l 2>/dev/null; echo "0 8 * * * $HOME/.aios/kernel-heartbeat") | crontab -`
- `supabase/functions/_shared/slack.ts` — same contract for edge functions, `proof`
  required at the type level *and* at runtime.
- Webhook URLs live in `~/.aios/slack-webhooks.env` (chmod 600) — **they are keys**:
  never git, never a log line, never a chat message.

## 8 · THE DOCUMENT MAP (reading order, next session starts HERE)
1. **This file** — the gate + runbook
2. [FULL_AUDIT_30JUL.md](FULL_AUDIT_30JUL.md) — trust state, every department graded
3. [THE_MIGRATION.md](THE_MIGRATION.md) — landed vs staged, constitutional delta
4. [LAUNCH_HANDOVER.md](LAUNCH_HANDOVER.md) — Cal's training: email, SMS truth, every trigger
5. [THE_NETWORK_RULING.md](THE_NETWORK_RULING.md) — boundary/tenant/brand/source + 32 counties
6. [SETUP_COUNTY.md](SETUP_COUNTY.md) · [SETUP_STANDALONE_TENANT.md](SETUP_STANDALONE_TENANT.md) — the repeatables
7. [FULL_SCOPE_AND_ARCHITECTURE.md](FULL_SCOPE_AND_ARCHITECTURE.md) — whole-system map + browser-agent design
8. [SLACK_OPS.md](SLACK_OPS.md) — the ops nervous system: three channels, the message contract, and **where your veto lives when neither of us is in the room**
9. [SWEEP8_DB_WIRING.md](SWEEP8_DB_WIRING.md) — engineering notes (the permanent history; per GPT's split this file = Notes, THIS file = Checklist+Cutover)
10. Migrations `20260730`–`20260802` + kernel `COMH/…/0011_CONSTITUTIONAL_RECEIPTS.sql` · `0012_CONSTITUTIONAL_KERNEL_v1.sql` · `0013_APPROVAL_RESOLUTION.sql`
11. `OA/CONSTITUTIONAL_DOCTRINES.md` + `OA/ORDINAL_KERNEL_REVIEW_CLAUDE_v1.md` (v1.3)

*Per GPT's structural ruling: this file is the CHECKLIST + CUTOVER; SWEEP8_DB_WIRING
stays the ENGINEERING NOTES; FULL_AUDIT is the AUDIT. Three documents, three jobs.*
