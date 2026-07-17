# Secrets Runbook

Every secret used by AISolar, where it lives, and how to rotate it.

## Client-side (VITE_ prefixed — safe to expose)

| Secret | Where it lives | Rotation | Notes |
|--------|---------------|----------|-------|
| `VITE_SUPABASE_URL` | `.env`, Vercel env | On project migration | Public URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env`, Vercel env | On suspect leak | Anon key — RLS protects data |
| `VITE_MAPBOX_TOKEN` | `.env`, Vercel env | Quarterly | Free tier: 50k loads/mo |
| `VITE_ENABLE_DEMO` | Vercel env | n/a | Set `true` ONLY on staging |

## Server-side (Supabase Edge Functions + pg_cron)

| Secret | Where it lives | Rotation | Notes |
|--------|---------------|----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Vault + `supabase secrets set` | **Immediately if leaked** | Full DB access. NEVER in client bundle. |
| `SUPABASE_ANON_KEY` | `supabase secrets set` | On suspect leak | Used by edge functions for JWT verify |
| `ALLOWED_ORIGINS` | `supabase secrets set` | On domain change | Comma-separated list of allowed CORS origins |
| `STRIPE_SECRET_KEY` | `supabase secrets set` | Quarterly or on leak | `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | `supabase secrets set` | On webhook endpoint change | `whsec_...` — if unset, webhook returns 500 |
| `COINBASE_COMMERCE_API_KEY` | `supabase secrets set` | On suspect leak | For creating crypto charges |
| `COINBASE_WEBHOOK_SECRET` | `supabase secrets set` | On suspect leak | HMAC-SHA256 verification of Coinbase webhooks |
| `POSTMARK_SERVER_TOKEN` | `supabase secrets set` | On suspect leak | Email sending |
| `POSTMARK_SENDER_EMAIL` | `supabase secrets set` | n/a | Must be verified in Postmark |
| `LOVABLE_API_KEY` | `supabase secrets set` | Monthly | AI gateway — bill extraction + proposal drafting |
| `SITE_URL` | `supabase secrets set` | On domain change | Used in email redirects + Stripe success URLs |

## Optional

| Secret | Where it lives | Notes |
|--------|---------------|-------|
| `SENTRY_DSN` | Vercel env + `supabase secrets set` | Error tracking |
| `SLACK_ALERT_WEBHOOK` | `supabase secrets set` | For agent failure alerts |

## Setting secrets

### Edge function secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
# ... etc
```

### pg_cron / Vault secrets (used by agent schedules)
The v3 migration `20260718_v3_security_fixes.sql` creates placeholder vault
secrets. Operator MUST populate them with real values:

```sql
-- Rotate the service-role key in Vault
SELECT vault.update_secret(
  'supabase_service_role',
  '<paste_real_service_role_key_here>'
);

-- Verify
SELECT name, created_at FROM vault.secrets WHERE name = 'supabase_service_role';
```

## Rotation procedure (when a secret is compromised)

1. **Identify the scope** — which secret, when it leaked, what it grants access to.
2. **Rotate immediately** — generate a new key at the provider (Stripe, Coinbase, Postmark, etc.).
3. **Update everywhere** — `supabase secrets set`, Vault, Vercel env, local `.env`.
4. **Redeploy** — `supabase functions deploy --no-verify-jwt` is NOT needed; secrets are picked up on next function invocation.
5. **Verify** — trigger a test webhook / send a test email.
6. **Audit** — check Supabase logs for the compromised period. Look for unusual access patterns.
7. **Postmortem** — write up what leaked, how, and the fix. Store in `docs/incidents/YYYY-MM-DD-*.md`.

## What NEVER to do

- ❌ Never paste a secret into a Slack thread, GitHub issue, or support ticket.
- ❌ Never commit `.env` to git. (v3: `.gitignore` now blocks this.)
- ❌ Never hardcode a secret in a migration file. (v3: removed the hardcoded JWT.)
- ❌ Never log a secret to console. (v3: `log()` helper redacts known PII keys.)
- ❌ Never share service-role keys between staging and production.
- ❌ Never use `verify_jwt = false` on a non-webhook edge function. (v3: `config.toml` enforces this.)
