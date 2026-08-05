# THE LAST MILE — now → first client + wholesaler live (5 Aug 2026)

_What actually stands between here and a paying installer using this. Compiled
from FINAL_SPRINT (ticked), DEPLOYMENT_GATE, and this session. Honest: cohort-
blocking vs nice-to-have called out, because a real client is testing on deploy
and 40 wholesaler users are behind them._

## ✅ Where we are (the spine is built)
The whole workflow is built and browser-verified on the cast: leads → estimate →
survey (NC6/NC7) → proposal → deposit → **installer-routing gate** → install →
grant pack → handover → customer portal. The comms/AI brain sings across every
POV (grounded, guardrailed, white-label, teach-your-AI, works without AI). The
widget captures leads to the right tenant. The demo toggle + guided tour land.
**2C · 2D · 2E · Sprint 5 = done.** GATE 0 = closed.

The gap now is not "build the product" — it's **deploy it and prove it on real
infrastructure**, plus a short list of real builds.

---

## 🚦 LANE A — get the FIRST CLIENT testing (the true minimum)
_A first client can test WITHOUT self-serve billing — you provision them
(concierge onboarding is best practice at this size). So the minimum is mostly
DEPLOY, not new code._

1. **Deploy the edge functions + secrets** — Cal's gate (needs your CLI/password):
   - `supabase login`, then `./scripts/deploy-comms.sh` (send-notification ·
     brain-voice · portal-inbox) + `create-checkout` · `stripe-webhook` ·
     `ingest-lead` · `extract-bill-data` · `agent-drain`.
   - Secrets: `POSTMARK_SERVER_TOKEN` + verified sender · `STRIPE_SECRET_KEY` +
     `STRIPE_WEBHOOK_SECRET` (register the webhook URL after deploy).
   - Full per-line runbook + the 10-minute smoke = **DEPLOYMENT_GATE.md**.
2. **Auth Site URL = prod domain**, demo env OFF, PITR backups on. *(One-time.)*
3. **Provision the client's tenant** (a `provision_tenant` call — the door is
   live) + seed their brand/compliance in Settings.
4. **Together: the prod smoke** — door → survey → proposal (tracked) → deposit
   (real Stripe test charge) → route to crew → pack → handover; a real email at
   every send; read-flip verified signed-in. *(FINAL_SPRINT "Together".)*

**Done = your first installer runs one real job end-to-end on prod.**

---

## 🔨 LANE B — the real builds still open (ranked)
1. ⭐ **A1 · Stripe billing** — 7-day trial → per-seat subscription checkout
   (+1 seat per non-owner teammate). The auth/tenant FOUNDATION is live; this is
   the money layer on top. **Needed for self-serve, NOT for a concierge-
   onboarded first client** — so it can run in parallel with Lane A. *(Fresh
   session — marker in A1_BUILD_PLAN.md.)*
2. **2A · per-customer pack gate** — surface missing NC6/NC7/grant items at the
   3 human touchpoints (job card · consultant lead view · owner overview) so no
   pack files half-done. **Cohort-blocking** (Cal: "worst thing is a mistake in
   the paper trail"). + **NC8 decision** (>50kW = appendix-only?).
3. **2C · installer photos → storage** — a Supabase storage bucket +
   `install_evidence` rows. The one 2C leftover.
4. **Sprint 4 · the security proof** — role→route matrix (every route × every
   role) + the RLS proof pass (the Saunderson check: one tenant can NEVER read
   another's rows). Evidence pasted into the doc. **Do before 40 wholesaler
   users touch it.**
5. **2E · Maps key out of the client bundle** (edge proxy) — widget-blocking,
   not cohort-blocking.
6. **2E · sites wiring** — the brand-site doors (SolarIrelandGroup · Renewable
   Ireland · wideawakesolar) point at `ingest-lead`. The public go-live moment.

---

## 🎁 LANE C — polish (Sprint 3, not blocking, but Cal cares)
Shared page-header conformity · AIField mobile logic walk (serials→NC6→sign-off
on a phone) · Design Studio array snaps to the roof centroid · Sweep-8 codes
(M6 designs persistence · M7 proposal_versions).

---

## The honest read
- **To let your first client test:** Lane A (deploy + provision + joint smoke).
  Little-to-no new code — it's your gate to run.
- **Before the 40 wholesaler users / self-serve:** Lane B ①②④ (Stripe, pack
  gate, security proof).
- Everything else is parked on purpose (POST_COHORT) — build on revenue.

**The one decision to make now:** do we start **Lane A (deploy prep + the smoke
runbook, together)** or **Lane B ① (A1 Stripe, fresh session)** first? They can
run in parallel — deploy is your hands, Stripe is a build.
