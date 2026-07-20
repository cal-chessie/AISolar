# Website → AISOLAR Lead Pipeline

## The chain (all wired as of July 2026)

```
solarireland.com / renewableireland.ie lead form
        │  POST + x-ingest-key
        ▼
ingest-lead edge function          (validates, dedupes 24h, inserts `leads`)
        ▼
trg_enqueue_lead_intake            (DB trigger — fires for all website sources)
        ▼
agent_queue → agent-drain (cron, every minute)
        ▼
lead_intake agent                  (scores, estimates system, writes lead_intake,
        │                           advances workflow_stage → intake_complete)
        ▼
trg_enqueue_stage_agent            → survey_scheduler
   survey_complete                 → proposal_drafter
   proposal_sent                   → follow_up
   approved                        → grant_submitter
   invoice paid (trigger)          → install_coordinator
   installed                       → post_install
   cron                            → customer_digest / stale_lead_escalator / payment_reminder
```

## Deploy steps

1. Apply migration + deploy function:
   ```bash
   supabase db push
   supabase functions deploy ingest-lead
   supabase secrets set INGEST_API_KEY=$(openssl rand -hex 32)
   ```
2. On both website Vercel projects set:
   - `AISOLAR_INGEST_URL=https://coxmtpnqjybwlrfwkols.supabase.co/functions/v1/ingest-lead`
   - `AISOLAR_INGEST_KEY=<same value as INGEST_API_KEY>`
3. Test: submit the contact form on either site → within ~1 minute the lead
   should appear in the Owner Cockpit with a score, an estimate, and stage
   `intake_complete`, with the survey_scheduler run logged in agent_runs.

## Website senders

- Solar Ireland: `src/lib/aisolar.ts`, called from `/api/contact` (source `website_contact`)
- Renewable Ireland: `src/lib/aisolar.ts`, called from `/api/chat/lead` (`website_chat`),
  `/api/chat/book-survey` (`website_survey`), `/api/exit-intent/lead-magnet` (`exit_intent`),
  `/api/lead/qualify` (`website_qualified`)
- All senders are fire-and-forget: Postmark email is the fallback if AISOLAR is down.
- `brand` field distinguishes sites — county sites later just pass their own brand.
