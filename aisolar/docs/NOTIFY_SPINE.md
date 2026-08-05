# notify() — the outbound spine (Sprint 2D) — build + wiring notes

_One call → the bell + a branded email with the portal link. Replaces the
scattered "queued — goes out with your approval" toasts that never sent._

## What's built (5 Aug)
- **`src/lib/notify.ts`** — `notify(event)`. Writes the BELL (`notifications` rows,
  one per staff recipient) and, for customer-facing events, invokes the
  `send-notification` edge fn for the branded email. Honest `NotifyResult`
  `{ ok, bell, email }`.
- **Laws it holds:** both-ends (customer email + staff bell) · draft-gated (the human
  approves in the UI, THEN notify fires — never auto-sends) · demo-safe (no session →
  no-op, returns `{reason:'demo'}`) · fire-and-forget (a failed send never blocks).
- **Recipient resolution:** `staffRecipients(leadId)` bells everyone in the lead's
  TENANT with a staff role (tenant-scoped via `leads.tenant_id` → `user_roles`) —
  so the bell already respects the A1 multi-tenant floor. Falls back to the actor.
- **Event types** (union): proposal_sent · deposit_link · photo_request · reschedule ·
  handover_pack · referral · team_invite · stage_change · callback_request ·
  **seai_offer_reminder · seai_ber_overdue** (the parked SEAI nudges ride these two).

## Wired (5 Aug) — the fake "queued" toasts now fire notify()
Every one shows an honest toast: **sent** when signed-in (bell + email land) vs
**queued** in demo (no-op). All draft-gated — the button click IS the approval.
- ✅ **Team invite** — OwnerCockpit (consultant + installer). States "adds a seat to
  your plan" (Cal's seat rule).
- ✅ **Deposit link** — `ConsultantCockpitV5` + `owner/FinanceWindow`. (The real Stripe
  link is `create-checkout` — notify carries/announces it.)
- ✅ **Photo request** — `ConsultantCockpitV5`.
- ✅ **Proposal sent** — `LeadFlow`.
- ✅ **Handover pack** — `compliance/PaperworkWindow`.

## Still to wire (same one-liner pattern)
- **Reschedule / survey options** — `LeadFlow:~495` (survey window offer).
- **Referral** — the post-completion referral ask (find the seam when it's built out).
- **Callback request** — `CustomerPortalV2` (customer → consultant, both-ends).

## ⚠️ EDGE-FN DEPENDENCY (do this before the email rail is real)
`supabase/functions/send-notification/index.ts` today switches on a FIXED set of
types (invoice_created, deposit_paid, …) and resolves the lead's email server-side.
notify() now also passes a **generic** body (`to`, `subject`, `message`, `portalPath`).
**To make the email rail fire for the new event types, extend that edge fn** to:
1. accept `to`/`subject`/`message`/`portalPath` and send a branded generic email when
   the `type` isn't one of its built-ins;
2. use the tenant's **from-name + reply-to** (branded outbound, L1) — trial default
   `"Their Company <notify@[platform-domain]>"` with reply-to their real address;
3. append the portal link.
Until then: **the BELL rail works end-to-end** (client insert); the EMAIL rail lands
only for the edge fn's built-in types.

## Gaps / next
- **`magic_link_tokens` (M4)** — not on V5 yet. The portal link for a customer with no
  account is a magic link; today the customer portal uses `access_token` on the lead
  (works). A dedicated token table is the M4 hardening.
- **The bell UI** — `notifications` is read by the header bell already; confirm it
  filters to the signed-in user (RLS) and marks read.
- **Both-ends email to staff** — currently staff get the bell; add an optional staff
  email digest (send-notification-digest exists) rather than per-event spam.

## Verify (signed in, real tenant)
Add a teammate in Owner → Team → a `notifications` row lands for the tenant staff +
(once the edge fn is extended) the invite email sends. Demo mode: no row, honest
"queued" toast. tsc 0.
