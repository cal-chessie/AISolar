# AISOLAR — The Solar Installer Operating System

> Run your solar business on autopilot. Bill extract at the front door. Autonomous agents handle survey scheduling, proposal drafting, SEAI grants, install coordination, and customer follow-ups. Your crews install. The platform does the rest.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + framer-motion
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Realtime + Storage)
- **AI:** OpenRouter (7 LLMs supported) — bill extraction, proposal drafting, role-aware coaching
- **Payments:** Stripe (card) + Coinbase Commerce (crypto)
- **Comms:** Postmark (email) + Twilio (SMS) + WhatsApp Business
- **Maps:** OpenStreetMap (free) / Mapbox (satellite imagery for the property; NO auto roof-detection — proposals use bill + survey data)
- **Deploy:** Vercel (static) + Supabase (serverless)

## Quick Start

```bash
# Install
npm install

# Dev (with demo mode enabled)
VITE_ENABLE_DEMO=true npm run dev

# Build
npm run build

# Preview
npm run preview
```

## Environment Variables

See `.env.example` for the full list. Key vars:

```bash
# Client-side (safe to expose)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_ENABLE_DEMO=false  # Set true ONLY for staging/preview

# Server-side (set via `supabase secrets set`)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
POSTMARK_SERVER_TOKEN=...
LOVABLE_API_KEY=...
```

See `docs/SECRETS.md` for the full rotation runbook.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Owner Cockpit                   │
│  (sidebar: Overview, Calendar, Consultants,      │
│   Installers, Clients, Products, Agents,         │
│   Analytics, Settings, CRM)                      │
├─────────────────────────────────────────────────┤
│  Consultant Inbox    │  Installer Portal        │
│  (messaging app +     │  (job cards → JobView   │
│   slide-out estimate/ │   with tabbed checklist: │
│   proposal panels)    │   Pre-install, Roof,     │
│                       │   Electrical, Commission,│
│  LeadFlow pipeline:   │   Handover + signature)  │
│  Estimate→Survey→     │                          │
│  Design→Proposal→Send │  Customer Portal V2      │
│                       │  (conversation-first     │
│                       │   chat thread + AI)       │
├─────────────────────────────────────────────────┤
│            Agent Foundation (10 agents)          │
│  Tabs: Agents | Training | AI Config             │
│                                                  │
│  agent-drain edge function (every 1 min):        │
│  claim_next_job → dispatch → complete/fail       │
│                                                  │
│  DB triggers: stage change → enqueue agent       │
│  Idempotency: touchpoints table                 │
│  Dead-letter: fail_agent_job at max_attempts    │
├─────────────────────────────────────────────────┤
│              Supabase Kernel                     │
│  Postgres 15 + RLS + pg_cron + Vault             │
│  Realtime (9 tables published)                   │
│  Storage (survey-photos, project-documents)      │
│  Edge Functions (12 + agent-drain)               │
└─────────────────────────────────────────────────┘
```

## Key Views

| Route | View | Who |
|-------|------|-----|
| `/owner` | Owner Cockpit (sidebar + pipeline + calendar + analytics) | Owner |
| `/consultant` | Consultant Inbox (messaging app + estimate/proposal slide-out) | Consultant |
| `/installer` | Installer Portal (job cards → JobView with checklist) | Installer |
| `/my-projects` | Customer Portal (conversation-first chat + AI + docs + GDPR) | Customer |
| `/lead-flow` | LeadFlow (Estimate → Eircode/Satellite → Survey → Design → Proposal → Send) | Consultant |
| `/job` | JobView (tabbed: Overview, Pre-install, Roof, Electrical, Commissioning, Handover) | Installer |
| `/calculator` | ROI Calculator (public, no signup) | Public |
| `/auth` | Prestigious Auth (split-screen: customer path vs staff path) | All |

## The 10 Autonomous Agents

| Agent | Trigger | What it does |
|-------|---------|-------------|
| Lead Intake | New lead (bill upload) | Normalize, dedupe by MPRN, score 0-100, create lead_intake |
| Survey Scheduler | Stage → intake_complete | Book site survey based on installer availability + location |
| Proposal Drafter | Stage → survey_complete | Auto-draft proposal from survey data (status=draft, never auto-send) |
| Follow-Up | Cron daily 09:00 | Stage-appropriate emails, idempotent via touchpoints (3-day window) |
| SEAI Grant | Stage → approved (contract signed) | Start SEAI application, compile paperwork checklist |
| Install Coordinator | Invoice deposit_paid | Schedule install, order materials, send T-7/T-1 reminders |
| PostInstall | Stage → installed | Warranty email, schedule review request T+7, handover pack |
| Customer Digest | Cron Monday 10:00 | Weekly status email to active customers |
| Stale Lead Escalator | Cron daily 08:00 | Flag leads past 2x threshold to consultant + manager |
| Payment Reminder | Cron daily 09:30 | Escalating tone: T+7 friendly → T+45 final demand |

## Agent Training + AI Config

Inside the Agents view (3 tabs):
1. **Agents** — status, runs, queue, manual trigger
2. **Training** — edit system prompts, add behavioural rules, test prompts (dry run), view auto-learned patterns
3. **AI Config** — OpenRouter API key, 7 LLM models, database access (12 tables), temperature, max tokens, daily cost cap

## GDPR Compliance

- Cookie consent banner (4 consent types: essential, performance, marketing, AI processing)
- Data subject rights panel (access, portability, rectification, erasure)
- Privacy policy at `/privacy` (GDPR Articles 13 & 14)
- Terms of service at `/terms` (Irish consumer law)
- Consent audit log (in System Settings → Audit)
- Sub-processor disclosure (6 processors with DPA status)
- `anonymise_lead()` SQL function for right-to-erasure
- PII-safe logging in edge functions (email/phone/token redaction)
- RLS on all tables
- Storage buckets private with signed URLs

## Security

- `verify_jwt = true` on all non-webhook edge functions
- Stripe webhook signature mandatory (no dev fallback)
- Coinbase webhook HMAC-SHA256 verification
- Service role key in Supabase Vault (not hardcoded)
- Vercel security headers (HSTS, CSP, X-Frame-Options, etc.)
- `.env` gitignored
- Demo mode gated behind `import.meta.env.DEV`

See `AISolar_v3_Security_Audit.md` for the full security audit.

## Compliance Papertrail

The system pre-populates compliance documents from survey + install data:

| Cert | Source data | Status tracking |
|------|------------|----------------|
| SEAI Solar Electricity Grant | MPRN (from bill), system size (from survey), invoice (auto), install photos (from checklist) | pending → in_progress → submitted |
| ESB NC6 Microgen Export | Inverter type (from survey), system size, install date | pending → submitted |
| RECI Electrical Sign-off | Isolator installed, RCD tested, earth bond, SPD (all from installer checklist) | pending → filed |

These certs are linked to the customer portal — what the customer sees in "Documents" is the same compliance status.

## Database Migrations

26 original migrations + 3 v3 migrations:
- `20260718_agent_foundation.sql` — lead_intake, agent_runs, agent_queue, email_templates, touchpoints + pg_cron
- `20260718_v3_security_fixes.sql` — RLS sweep, storage private, Vault secrets, retention crons, anonymise_lead, claim_next_agent_job
- `20260718_v3_agent_runtime.sql` — DB triggers (stage change → enqueue), pg_cron for agent-drain

## Documentation

- `AISolar_Bug_Audit.md` — v1 audit (135 bugs)
- `AISolar_v2_Rebuild_Documentation.md` — v2 architecture
- `AISolar_v3_Audit_and_Plan.md` — v3 senior dev audit (150 findings)
- `AISolar_v3_Week1_Security_Fixes.md` — v3 security fixes
- `AISolar_v3_Security_Audit.md` — final security audit (28 findings)
- `docs/SECRETS.md` — secrets rotation runbook

## License

Proprietary. © AISOLAR 2026.
