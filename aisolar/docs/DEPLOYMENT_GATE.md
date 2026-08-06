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
  this flag is why. **Belt on top (5 Aug):** even if that flag leaks, a REAL
  signed-in session now forces demo data OFF everywhere (`hasRealSession()` in
  demoMode.ts + `useLeads` awaits the session) — a stray `?demo=1` can no longer
  hijack a paying tenant's pipeline. Demo is the signed-out / prospect-walkthrough
  state; to demo to a prospect, use a signed-out browser (incognito).
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
| `postmark-webhook` | records hard bounces + spam complaints → suppression list (protects the shared domain's reputation) | Postmark → project URL |
| `ingest-lead` | the widget/site lead door — **the embed widget is dead without it** | public sites, `/embed?src=` |
| `extract-bill-data` | bill-photo → estimate numbers | intake/estimate |
| `agent-drain` | the agent queue (drafter etc.) — draft-only law | owner approvals |
| others (`send-*`, `slack-approve`, `analyse-roof-photo`, `solar-roof`, `expert-chat`, `verify-artefact`, `coinbase-*`) | deploy as their surfaces go live — not cohort-blocking | — |

## 2 · Secrets (Supabase → project → secrets; NONE are set today)
```
supabase secrets set POSTMARK_SERVER_TOKEN=...        # email rail is SILENT without it
supabase secrets set POSTMARK_SENDER_EMAIL=notify@<verified-domain>
supabase secrets set STRIPE_SECRET_KEY=...            # create-checkout
supabase secrets set STRIPE_WEBHOOK_SECRET=...        # stripe-webhook signature check
supabase secrets set POSTMARK_WEBHOOK_SECRET=...      # gates the bounce/complaint webhook
```
- Postmark sender must be a **verified sender signature/domain** in Postmark or
  every send 422s. Set reply-to on the same domain (branded-outbound law).
- Stripe webhook: after deploy, register the endpoint URL
  (`https://<ref>.functions.supabase.co/stripe-webhook`) in the Stripe dashboard
  and paste the signing secret back as the secret above. **Test mode first.**
- **Email deliverability — do this or the whole cohort lands in spam (#69):**
  - **DNS on the sending domain (the "together when back" Postmark session):**
    **SPF** (add Postmark's include), **DKIM** (Postmark's CNAME records), and
    **DMARC** — start `v=DMARC1; p=quarantine; rua=mailto:dmarc@<domain>`, move to
    `p=reject` once reports are clean. Postmark's dashboard hands you the exact SPF/DKIM values.
  - **Bounce/complaint webhook:** after deploy, in Postmark register the webhook for
    **Bounce + SpamComplaint** →
    `https://<ref>.functions.supabase.co/postmark-webhook?secret=<POSTMARK_WEBHOOK_SECRET>`.
    Deploy it `--no-verify-jwt` (Postmark isn't a Supabase user — the secret IS the auth).
  - Already in code: the pre-send **suppression check** + a `List-Unsubscribe` header
    on every send. The webhook is what populates the suppression list.

## 3 · Auth config (Supabase dashboard → Auth)
- **Site URL + Redirect URLs**: add the production domain (and `/signup`,
  `/customer/*` paths) — signup emails bounce to localhost otherwise.
- Email confirmations ON; the `/signup` door + `provision_tenant` are already live
  (A1) — sanity: sign up a throwaway, confirm tenant row + role land.

## 4 · Database (all migrations ALREADY APPLIED live — schema verified complete 5 Aug)
`doc_vocab_reconcile · seai_grants · site_surveys_nc7_capacity · a1_tenants ·
notifications_bell · ai_knowledge · assignments_roster_ref` — nothing to run.
- ⚠️ **No migration-history table** (applied via management API, not `db push`).
  Live schema is complete + correct. If you EVER stand up a fresh project: run
  `supabase/migrations/` in order — they're idempotent/add-only, safe to re-run.
- Tenant isolation **PROVEN LIVE 5 Aug** (cross-tenant read test, rolled back —
  LAST_MILE 🔒). Re-run that check after any RLS change and before the 40 users.

## 5 · Client env — the DEFINITIVE manifest (deploy sets EXACTLY these 3)
```
VITE_SUPABASE_URL=https://ywizcsulurxoqjdgnkvc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the V5 anon/publishable key>   # public by design
VITE_GOOGLE_MAPS_KEY=<referrer-locked to your domains in Google Cloud>
```
- ⚠️ **Use `VITE_SUPABASE_PUBLISHABLE_KEY`, NOT `..._ANON_KEY`** — a stray
  `ANON_KEY` reference in widgetLead.ts was fixed 5 Aug; the app is unified on
  PUBLISHABLE. (`VITE_SUPABASE_PROJECT_ID` sits in `.env` but is unused in code.)
- **No `VITE_ENABLE_DEMO` in prod** (§0). No service keys in client env, EVER.
- 🔐 Referrer-lock `VITE_GOOGLE_MAPS_KEY` in Google Cloud to the tenant domains
  before the sites go public (it's client-bundled — normal for Maps; edge-proxy
  D4 is the belt-and-braces later).

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
9. **Widget:** Settings → "Put your calculator on your website" → copy the iframe
   → open `/embed?src=<your key>` → finish an estimate → submit → a lead lands in
   your pipeline (needs `ingest-lead` deployed + the tenant's `sources` row).

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
