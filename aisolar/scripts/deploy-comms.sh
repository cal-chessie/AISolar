#!/usr/bin/env bash
# deploy-comms.sh — turn the comms + AI rails fully ON (Cal's gate, one command).
#
#   ./scripts/deploy-comms.sh
#
# Deploys the three edge functions and prints the secrets still needed.
# Requires: supabase CLI logged in (supabase login) once.
set -euo pipefail
REF="ywizcsulurxoqjdgnkvc"

supabase functions deploy send-notification --project-ref "$REF"          # generic branded email + magic links
supabase functions deploy brain-voice --project-ref "$REF"                # LLM voice layer (BYO key via AI Config)
supabase functions deploy portal-inbox --project-ref "$REF" --no-verify-jwt  # magic-link customer writes (token-authed by design)

echo ""
echo "── Secrets (set once; the email rail is silent until the Postmark ones exist) ──"
echo "supabase secrets set POSTMARK_SERVER_TOKEN=... --project-ref $REF"
echo "supabase secrets set POSTMARK_SENDER_EMAIL=notify@yourdomain.ie --project-ref $REF"
echo ""
echo "OpenRouter key: entered in-app (Owner → AI Config) — no secret needed."
echo "VERIFY: send a consultant reply → the customer email lands with the magic link."
