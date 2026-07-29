# ONE-PAGER — Stand up a STANDALONE TENANT (no county license)
### An installer who just wants the app. ~30 minutes. The pure-SaaS path.

**What they ARE:** an app tenant + their own brand(s) + their own doors. No county
boundary, no franchise economics — straight SaaS (their tier + seats).

## The steps

**1 · Account (them, 5 min):** sign up at `/auth` → pick plan (€197/€497/€997 +€97/seat)
→ you (or auto, post-A1) grant their role. First-ever signup on a fresh deployment:
run the first-admin bootstrap SQL (`docs/AUTH_RUNBOOK.md`) — once, ever.

**2 · Company facts (them, 10 min — Owner → Settings):**
- **RECI/Safe Electric number** (without it: no NC6, and the app will say so)
- company mobile · email · registered address (the NC6 installer block)
- SEAI installer ID (grant DoW reads it)
- logo + colours → proposals, portal, widget all carry their brand

**3 · Their doors (5 min):** mint a `source_key` per site/campaign in sources.
Their website adds ONE of: the embed widget snippet · a POST to `ingest-lead` ·
the hosted `/start?src=` link. (Contract: `LAUNCH_HANDOVER.md` Part 4.)

**4 · First lead walk (10 min, with them watching — this is the sale closing itself):**
bill upload → 21-field extract → estimate → survey booked by the agent → proposal
DRAFT (they click send — nothing sends itself) → deposit → install day: the crew's
commissioning gate (serials off the plate, attested) → **the 14-page sealed ESB pack
downloads** → grant tracked. Every step visible in their cockpit, every agent action
logged.

**What they never see (and never breaks them):** the kernel. A standalone tenant emits
to their own boundary; if they later take a county license, it's an upgrade
(`SETUP_COUNTY.md` step 1-2), not a migration.

**Support surface:** the AI coach in-app · you at connect@aisolar.ie · everything they
do is receipted, so "what happened?" always has an answer.
