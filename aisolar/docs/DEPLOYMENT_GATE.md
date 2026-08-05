# DEPLOYMENT GATE — the everything-you'd-forget list (5 Aug 2026)

_Cal: "these are the types of things I'm going to forget on deployment." This is
THE checklist, compiled from every recent doc (SESSION_HANDOFF_5AUG, COMMS_AI_SYSTEM,
NOTIFY_SPINE, A1_BUILD_PLAN, FINAL_SPRINT, SWEEP8_DB_WIRING). Work top to bottom;
tick as landed. First client tests on THIS._

## 0 · The one-liners you'll actually forget
```
./scripts/deploy-comms.sh        # deploys send-notification + brain-voice + portal-inbox
```
- **Demo OFF in prod:** the production build must NOT set `VITE_ENABLE_DEMO` — demo
  mode is what makes every send a silent no-op. If a prod user sees the demo cast,
  this flag is why.
- **OpenRouter key is entered IN-APP** (Owner → AI Config), not a secret. Until it's
  in, the AI runs on the deterministic floor — which works, so this can wait.

## 1 · Edge functions (repo has 20; LIVE project has ZERO deployed)
Deploy the comms three via the script above. Then the ones the flows already call:

| Function | Why it must exist | Called from |
|---|---|---|
| `send-notification` | ALL email (built-in + generic + magic link) | notify(), survey form |
| `portal-inbox` | magic-link customers' messages/callbacks reach staff | portal (token fallback) |
| `brain-voice` | LLM voice on the brain (optional, floor works without) | portal polish() |
| `create-checkout` | the deposit CHARGE (Stripe) | customer portal pay button |
| `stripe-webhook` | marks deposit/final PAID in the DB | Stripe → project URL |
| `ingest-lead` | the widget/site lead door (Solar Ireland Group route) | public sites, embed |
| `extract-bill-data` | bill-photo → estimate numbers | intake/estimate |
| `agent-drain` | the agent queue (drafter etc.) — draft-only law | owner approvals |
| others (`send-*`, `slack-approve`, `analyse-roof-photo`, `solar-roof`, `expert-chat`, `verify-artefact`, `coinbase-*`) | deploy as their surfaces go live — not cohort-blocking | — |

## 2 · Secrets (Supabase → project → secrets; NONE are set today)
```
supabase secrets set POSTMARK_SERVER_TOKEN=...        # email rail is SILENT without it
supabase secrets set POSTMARK_SENDER_EMAIL=notify@<verified-domain>
supabase secrets set STRIPE_SECRET_KEY=...            # create-checkout
supabase secrets set STRIPE_WEBHOOK_SECRET=...        # stripe-webhook signature check
```
- Postmark sender must be a **verified sender signature/domain** in Postmark or
  every send 422s. Set reply-to on the same domain (branded-outbound law).
- Stripe webhook: after deploy, register the endpoint URL
  (`https://<ref>.functions.supabase.co/stripe-webhook`) in the Stripe dashboard
  and paste the signing secret back as the secret above. **Test mode first.**

## 3 · Auth config (Supabase dashboard → Auth)
- **Site URL + Redirect URLs**: add the production domain (and `/signup`,
  `/customer/*` paths) — signup emails bounce to localhost otherwise.
- Email confirmations ON; the `/signup` door + `provision_tenant` are already live
  (A1) — sanity: sign up a throwaway, confirm tenant row + role land.

## 4 · Database (all 5-Aug migrations are ALREADY APPLIED live — verified)
`doc_vocab_reconcile · seai_grants · site_surveys_nc7_capacity · a1_tenants ·
notifications_bell · ai_knowledge` — nothing to run for these. If deploying to a
FRESH project ever: run `supabase/migrations/` in order.
- Tenant isolation was PROVEN on V5 (two-user RLS test, 4 Aug). Re-run the smoke
  after any RLS change.

## 5 · Client env (.env.production)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → V5 (`ywizcsulurxoqjdgnkvc`).
- **No demo flag** (see §0). No service keys in client env, ever.
- 🔐 Known pre-widget task (FINAL_SPRINT D4/D3): move the Maps key behind an edge
  proxy — it's in the client bundle today. Not cohort-blocking; IS widget-blocking.

## 6 · Post-deploy smoke (the 10-minute proof, in order)
1. Sign in staff → bell shows real rows (not the demo feed).
2. Send a consultant reply on a real lead → row persists + customer EMAIL lands
   with the magic link.
3. Open that magic link → portal shows the real lead → type a question → staff
   bell rings (portal-inbox path, no session).
4. "Call me back" → bell + the AI's honest confirm.
5. Move a stage in the kanban → bell + customer stage email (human labels).
6. Deposit: portal pay → Stripe test charge → webhook flips `deposit_paid` →
   FinanceWindow shows it → **assign-installer gate appears** (2C) → assign →
   installer notified.
7. Settings → Teach your AI → teach an answer → ask it in the portal → instant FAQ.
8. AI Config: enter OpenRouter key → portal answers arrive re-voiced (same numbers).

## 7 · Cohort day-1 truths (say these to the first client)
- Every send is behind a human click; nothing auto-sends (draft-gated law).
- The AI only speaks about the customer's own project (guardrails) and hands off
  to a human when it doesn't know — and logs it for you to teach.
- SEAI grant: the CUSTOMER applies + is paid; we prepare + track (never say "we
  submit your application").
- No SMS/WhatsApp claims. Email + portal only (truth-pass law).

## Parked (post-cohort, tracked elsewhere)
- Installer photos → storage + `install_evidence` table (2C leftover, needs bucket).
- `magic_link_tokens` rotation table (M4 hardening; lead access_token serves today).
- Slack rail for consultants (v2) · SEAI nudge cadence + grants-at-risk radar
  (POST_COHORT.md) · geo-routing for installers (post-cohort).
