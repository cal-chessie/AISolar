# AISOLAR — installer platform (Vite + React 18 + Supabase `coxmtpnq…`)

The per-tenant workbench: bill extract → survey → proposal → grant → install →
customer portal, driven by a 10-agent runtime (queue + pg_cron drain).
Estate map: `~/Desktop/SONSSONS/COMH/RENEWABLY/LAUNCH_MAP.md`
Kernel law: `~/Desktop/SONSSONS/COMH/RENEWABLY/KERNEL_INTELLIGENCE.md`
Repo root is the parent `AI SOLAR/` folder; app lives here in `aisolar/`.

## House rules
- Read before write. Never `--force` push. Migrations idempotent, add-only.
- Agents run ONLY through `agent-drain`. `status: "draft"` on proposals — never auto-send.
- This is ONE tenant's workbench. Kernel (separate Supabase) is the switchboard.

## State (2026-07-18 — uncommitted, see git status)
- NEW `supabase/functions/ingest-lead` — public door for website leads
  (`x-ingest-key` = INGEST_API_KEY secret; stamps AISOLAR_TENANT_ID, fail-closed;
  24h dedupe by email+brand). Websites already point at it.
- NEW migrations: `20260721_website_ingest.sql` (intake trigger covers website
  sources), `20260722_survey_handoff.sql` (survey→lead_intake confirmed_* copy
  trigger + richer extracted_* columns), `20260723_role_management.sql`
  (admin role-grant path + recursion-safe policies + grant_role RPC). Run with
  `supabase db push`. AUTH: see `docs/AUTH_RUNBOOK.md` — MUST run the first-admin
  bootstrap SQL once after Cal signs up or he's locked out as a customer.
- agent-drain: lead_intake now advances stage → intake_complete (chain cascades);
  proposal drafter reads confirmed_* from lead_intake first; duplicate authHeader
  bug fixed.
- extract-bill-data: 21-field extraction (rates, tariff, MPRN, day/night…) and
  as of 20260724 it PERSISTS all 21 to lead_intake (13 typed cols already
  existed; migration adds the other 8 + bill_extracted_at) plus extraction_raw.
  Write is authorised: needs a staff JWT or the lead's 64-char access_token
  (like create-checkout), so anonymous callers can't overwrite by UUID guess.
  Response now returns `persisted:boolean` — a failed write never reads OK.
- Migration 20260724_bill_extract_complete.sql also FIXES a GDPR leak:
  anonymise_lead() was leaving extracted_eircode (+ notes) behind on erasure.
- Deploy: `supabase functions deploy ingest-lead agent-drain extract-bill-data`
  + secrets INGEST_API_KEY, AISOLAR_TENANT_ID. Frontend: Vercel (vercel.json set).

## Known debt (docs/PIPELINE_AUTONOMY_AUDIT.md has the full graded list)
- FIXED 2026-07-23: bill front door EXISTS at /start (+/upload) — upload/manual
  → 21-point estimate + satellite → book. Still needed at launch: create the
  lead from the booking so agents pick it up (blocked on coxmtpnq access).
- FIXED 2026-07-22 (commit 9b56e89): survey_scheduler + install_coordinator now
  SEND real Postmark email and record channel/emailSent honestly. Still naive
  DATES (today+5 / today+28, no calendar logic) — calendar-aware scheduling is
  open.
- Truth-pass: marketing pages hold to DO-NOT-CLAIM; 2026-07-23 removed the last
  in-app "email + SMS" toast + "SMS notification" checklist row in LeadFlow
  (SMS/Twilio is disconnected until launch). Grant agent TRACKS, doesn't submit
  — keep it phrased that way everywhere.
- Demo mode: never set VITE_ENABLE_DEMO in prod.
