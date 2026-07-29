# LAUNCH HANDOVER — Cal's training document
### Every notification, every trigger, every marketing rail — in plain language. 30 Jul 2026.
> You said: "nobody should know this better than us." Correct. This is the document that
> makes that true. Everything below is read from the code tonight, not from memory.

---

## PART 1 · EMAIL — what you actually have (and it's more than you think)

**The engine:** Postmark (an email delivery service — like a post office with receipts).
One shared sender file: `supabase/functions/_shared/email.ts`. Every send in the platform
goes through it.

**The seven send functions (edge functions on Supabase):**

| Function | What it emails | Real or gated? |
|---|---|---|
| `send-survey-notification` | "your survey is booked" | REAL (survey_scheduler agent calls it) |
| `send-notification` / `send-notification-digest` | general + digest notifications | REAL path, needs Postmark token |
| `send-proposal-accepted` | proposal accepted confirmation | REAL path |
| `send-payment-reminder` | deposit/payment chase | REAL path |
| `send-follow-up-digest` | follow-up agent's digest | REAL path |
| Proposals themselves | — | **draft-never-send: a human clicks send. Always.** |

**What YOU must do to switch email on (one-time, ~30 min):**
1. Postmark account → get the **Server Token**.
2. `supabase secrets set POSTMARK_SERVER_TOKEN=...` (goes in the vault, never in code).
3. **DNS at Register365** (this is the "sender signature"): Postmark gives you 2 DNS
   records (DKIM + Return-Path) per sending domain. Add them for `aisolar.ie` (and later
   each brand domain). This is what stops your mail landing in spam.
4. Send one test → check the Postmark dashboard shows "Delivered."

**Campaigns (outbound marketing — the part you've never done):** lives in the
**Renewably CRM** (1,332 installer contacts), not in AISolar. The rails already built:
draft → **you approve** → send, capped at **40/day** (deliverability protection), from
`aisolar.ie` via Resend (protects renewably.ie's reputation), replies to
`connect@aisolar.ie`. Your motion: the outreach agent books the call — *"the agent that
booked you this call is what I'm selling you."* A campaign = a batch of drafts you
approve in one sitting. That's it. No mystery.

## PART 2 · SMS — the truth (truth-pass, non-negotiable)

**There is no SMS.** Twilio is not connected. WhatsApp is not connected. The app makes
zero SMS claims anywhere (we swept the last fake toast out in July). **Never put SMS in
marketing until the day it demonstrably works.** Post-launch path if wanted: Twilio
account + Irish sender registration, or Meta WhatsApp Business — both are your-hands
setups; the notification path is already shaped to add a channel honestly when real.

## PART 3 · EVERY TRIGGER IN THE SYSTEM (the "no trigger not firing" inventory)

**Kernel (live, verified tonight):**
- `events_chain` — hash-chains every event (the tamper-proof spine)
- `events_no_update` / `events_no_delete` — history physically cannot be rewritten
- `events_actor_tenant` — every event stamped with who + which boundary
- `relationships_tenant` + `ck_relationships_noself` — relationship hygiene
- `relationships_receipt` + `policies_receipt` — **NEW tonight**: nothing constitutional
  changes without a receipt
- `commands_transition` — intent lifecycle guard
- 3 policy brakes: €200/day LLM cap · outbound approval gate · loop ceiling 25

**App DB (in migrations, land with `db push`):**
- `trg_enqueue_stage_agent` — a lead reaching a stage auto-queues the next agent
  (the chain: intake → survey_scheduler → proposal_drafter → follow_up)
- survey→lead_intake copy trigger (confirmed_* handoff) · website-ingest intake trigger
- `set_updated_at` on new tables · GDPR `anonymise_lead()` (now clears eircode + notes)

**Agent runtime (the 6 handlers, queue-drained by pg_cron — never inline):**
`lead_intake` · `survey_scheduler` · `proposal_drafter` · `follow_up` ·
`grant_submitter` (TRACKS, never submits) · `install_coordinator`

**In-app notifications a user sees (honest copy, verified):** booking confirmations,
survey booked, proposal ready (draft), deposit paid, install scheduled, DoW routes-to-BER
note ("on completion" — never "sent"), ESB pack ready.

## PART 4 · THE DOOR — how ANY sovereign brand connects (Doctrine 002)

We never rewire a sovereign's site. We publish the contract; they adopt it:

```
POST https://<project>.supabase.co/functions/v1/ingest-lead
Header:  x-ingest-key: <their source key>
Body:    { name (required), email or phone (required),
           brand, source, county, eircode, address, message, monthlyBill }
```
Dedupe: same email+brand within 24h = one lead. Alternative adoptions: the **embed
widget** (`/embed` calculator, tenant-branded) or the **hosted link** (`/start?src=…`).
Solar Ireland and Renewable Ireland connect exactly this way — their choice, their
implementation, our door. (Per-source keys land with the `sources` migration.)

## PART 5 · LAUNCH CHECKLIST (in order, each unblocks the next)

1. 🔑 **coxmtpnq access token** → `supabase link && supabase db push` + deploy 16 functions + secrets (`docs/SECRETS.md`)
2. 🔑 **GATE 0 remainder:** Maps/Cal.com key rotation · old-keys-dead · history purge
3. 📧 **Postmark token + DNS** (Part 1 above)
4. 👤 **You sign up first, then run the first-admin bootstrap SQL** (`docs/AUTH_RUNBOOK.md`) — skip this and you're locked out as a customer
5. 🚫 **Demo OFF in prod** (`VITE_ENABLE_DEMO` unset) — turns the real POV gates on
6. ✅ **Smoke test:** create lead via the door → watch it chain through the agents → NC6 pack → receipt on kernel
7. 🚀 **Wave 1: Roscommon end-to-end** — then the grandfather offer goes to 32 counties

**Post-launch (parked, in writing):** payments/PoV lockouts/onboarding lockdown +
front-end copy refresh — your list, next session. County + standalone tenant setup:
`docs/SETUP_COUNTY.md` · `docs/SETUP_STANDALONE_TENANT.md`.
