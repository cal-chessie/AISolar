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
- extract-bill-data: ~20-field extraction (rates, tariff, MPRN, day/night…).
- Deploy: `supabase functions deploy ingest-lead agent-drain extract-bill-data`
  + secrets INGEST_API_KEY, AISOLAR_TENANT_ID. Frontend: Vercel (vercel.json set).

## Known debt (docs/PIPELINE_AUTONOMY_AUDIT.md has the full graded list)
- NOTHING calls extract-bill-data from the UI — bill-upload front door missing.
- survey_scheduler + install_coordinator stamp dates without calendar logic and
  send no email despite touchpoints claiming so.
- Landing copy oversells (SMS/WhatsApp/roof-detection don't exist; grant agent
  tracks, doesn't submit). Truth-pass queued. Design pass = with Cal, on real
  screens only. Demo mode: never set VITE_ENABLE_DEMO in prod.
