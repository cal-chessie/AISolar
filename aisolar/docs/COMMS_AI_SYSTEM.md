# The comms + AI system — the one map (5 Aug 2026)

_Cal's brief: "make the AI seamless and truly helpful to all involved, with
exactly-timed prompts for each use case… I need to know this system well for
delivery, marketing and sales." This is that map. Skills used: stop-slop._

## The shape of it — three brains, one spine, one thread

```
                       ┌─ THE ONE THREAD (buildConversation) ─┐
  Customer portal ─────┤  same messages, three audiences       ├───── Consultant inbox
  (AIChat)             └──────────────┬───────────────────────┘      Installer inbox
                                      │
        customerBrain ─── coachBrain(consultant·installer) ─── dealIntel/triage
                                      │
                              notify() — THE SPINE
                     bell (notifications table) + branded email
```

- **ONE THREAD.** `buildConversation(lead, audience)` renders the same record to
  customer, consultant and installer. Audience trims what's inappropriate (the
  homeowner never sees "opened proposal 4×"; field-ops stay internal).
- **THREE BRAINS.** `coachBrain` speaks to the consultant (pipeline) and the
  installer (jobs, BOM, route, serials). `customerBrain` (NEW, 5 Aug) speaks to
  the customer. All three ground every sentence in the live record — none of
  them can disagree with the screen they sit on, because they read the same
  functions the screens do.
- **ONE SPINE.** `notify(event)` → a bell row for every staff member in the
  lead's tenant + (customer-facing events) a branded email with the portal link.
  Draft-gated: a human's click is the approval; nothing sends itself.

## customerBrain — what makes it a moat

Ask it anything in the portal and it:
1. **Classifies the concern** (complaint → objection → booking → BER → grant →
   timing → savings → payment → warranty → battery → status), in that priority
   order — a complaint containing a question is still a complaint.
2. **Answers from the record, not a script.** The savings figure is the SAME
   `computeQuote` number the header shows. The grant answer reads the lead's
   LIVE grant lifecycle record (applied / offer in hand + days left / BER next /
   paid) and the §D fork — a business hears NDMG + VAT reclaim + ACA, never
   "€1,800".
3. **Advances the stage's purpose.** Every answer closes on the ONE next step
   for where the project actually is (STAGE_NEXT): proposal stage sells
   confidence, approved sells the deposit's meaning, installed points at the BER
   that releases their money.
4. **Escalates honestly.** Complaint/objection/booking/unknown → the answer
   carries an `escalation`; the portal fires `notify()` and the copy only claims
   "I've let Cian know" because the flag actually landed (a real write failure
   swaps the claim for the phone number). The consultant's bell rings with the
   customer's words verbatim.
5. **Prompts exactly on time.** `suggestedQuestions(lead)` — the chips change
   per stage: early asks "planning permission?", proposal asks "how are my
   savings worked out?", installed asks "how do I book my BER?".

**Team coordination:** the same brain drafts the consultant's suggested reply
for question-type inbounds (`inboxTriage`), so the human opens the inbox to an
answer already done — edit, send. Objections still get the callPrep framing;
brain answers that would escalate are kept out of the consultant's mouth.

## Every trigger, wired (who hears what, when)

| Moment | Fires | Staff bell | Customer email† |
|---|---|---|---|
| Customer types in portal (AI answers) | `customer_message` | quiet row — thread completeness | — (they're in the portal) |
| Customer objection / complaint / booking / unanswerable | `callback_request` / `reschedule` | ⚠ with their words verbatim | — |
| "Call me back" button | `callback_request` | 📞 urgent + their number | — |
| Stage move (kanban/pipeline) | `stage_change` | team sees the move | ✓ built-in edge type |
| Proposal sent (LeadFlow) | `proposal_sent` | ✓ | pending edge extension |
| Deposit link (consultant + owner finance) | `deposit_link` | ✓ | pending edge extension |
| Photo request | `photo_request` | ✓ | pending edge extension |
| Survey options offered | `survey_options` | ✓ | pending edge extension |
| Handover pack released | `handover_pack` | ✓ | pending edge extension |
| Team invite (owner adds staff) | `team_invite` | ✓ (+ seat note) | invite mail pending edge ext |
| Survey completed (form) | `stage_change` via edge fn | ✓ | ✓ |
| SEAI nudges (post-cohort) | `seai_offer_reminder` / `seai_ber_overdue` | reserved | reserved |

† The email rail: `send-notification` handles its built-in types today
(stage_change, invoice, deposit_paid…). The generic types need the **edge-fn
extension** (accept to/subject/message/portalPath + tenant from-name) — noted in
NOTIFY_SPINE.md, deploy-time work. The BELL rail is live end-to-end now.

**The bell is real now.** Signed in, `NotificationsBell` reads the
`notifications` table (RLS: rows addressed to you + rows on leads you can see),
honours the DB read flag, and mark-all-read persists. Demo keeps the role feed.

## Delivery / marketing / sales — how to talk about this

- **The demo moment:** open the customer portal beside the consultant inbox.
  Type "this feels expensive" as the customer → the AI answers with THEIR
  payback number and no pressure, and the consultant's bell rings with the
  objection verbatim + a drafted reply waiting in the inbox. One motion, both
  ends. That's the moat in 20 seconds.
- **The line:** "Your customers get an answer in seconds that's actually about
  their project — and your team never misses the moment it matters, because the
  same brain that answered them just briefed you."
- **Why competitors can't fake it:** the AI doesn't sit beside the record, it
  reads it — quote engine, grant lifecycle, invoice state, install date. Every
  number it says is checkable on the same screen. No hallucinated grant rates
  (we fixed ours: €700/€200 tiered, cap €1,800, SEAI pays the CUSTOMER).
- **Truth discipline sells to installers:** nothing auto-sends, every send is
  behind their click, and the AI says "I've told a human" only when it has.

## Fixed on this audit (5 Aug)
- AI quoted €900/kWp + "we auto-start your grant application" → brain now carries
  the verified scheme + the customer-applies model. On-screen contradiction
  (MoneyView "we'll file after install" vs grant card "apply before install")
  resolved — both read the live grant record.
- Silent moments closed: portal questions, callbacks, stage moves all notify.
- `notifications.tenant_id` column was MISSING — every consultant reply on a
  real lead failed to persist. Migration applied live (+ RLS for user-addressed
  and no-lead rows).
- Bell was a hard-coded demo feed while notify() wrote rows nothing read.
- Cookie banner double-mounted (App + portal) and `quiet()` crashed on every
  consent click (Supabase thenable has no .catch). Both fixed + verified.

## Still open (ranked)
1. **Edge-fn extension** for the generic email rail (deploy-time, with AI key).
2. **Realtime on notifications** — the bell fetches on mount; a Supabase
   Realtime subscription makes it ring live mid-session.
3. **Customer message persistence when token-authed** — portal writes no-op
   without a session (demo-safe by design); the magic-link customer needs an
   edge-function path (M4) so their messages persist + bell staff in production.
4. **Referral send** — the last unwired notify seam.
5. **LLM voice layer** — the brains are deterministic floors; the AI-key LLM
   pass (Sprint 2D personalisation) adds voice on top, never facts.
