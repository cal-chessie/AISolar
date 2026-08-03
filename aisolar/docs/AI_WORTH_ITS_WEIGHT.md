# Is the AI worth its weight in gold? — the honest answer (3 Aug 2026)
### Cal: "have we actually used the full capability of what AI can do here? what would make the AI worth its weight in gold? have we built something truly special? what's still missing?"

## The honest verdict first
**What's special is BUILT — and it isn't the AI.** The moat is the *chain*: bill → survey → design → one quote engine →
NC6/NC7 pack sealed with a hash → grant → install → attested record. Irish statutory depth end-to-end, multi-tenant
routing, agents that draft and never send. Nobody proven does that in Ireland. **That stands on its own.**

**The AI today is the weakest differentiator we have.** It does two real jobs — reads a bill (vision) and writes
proposal/follow-up copy — plus a coach that is mostly hard-coded strings. That's *AI as a typist*. Useful, replaceable.
Nothing on this list below is a rewrite; every one rides the runtime, the queue and the gates that already exist.

## What would make it worth its weight (ranked by moat × effort)
1. **⭐ Compliance vision — the one nobody can copy.** Point the model at the artefacts we already collect: the
   inverter type-test cert, the RECI cert, the serial/rating plate photo, the SLD. It reads them, cross-checks against
   what the crew typed, and flags the mismatch *before* the NC6 is filed. Our AC-rating band bug (NC6→NC7) becomes
   impossible. **This is the gold: AI as the compliance officer, not the copywriter.** The photos and certs are already
   in `fieldRecord`; the gate already exists.
2. **⭐ The coach that actually knows the deal.** Today: 13 hard-coded stage lines. Real version reads THIS lead —
   deal value, days in stage, opens, the thread's tone, what's blocking the pack — and gives the human the ONE next
   move, in their POV's voice. That's the "hidden multiplier" already promised in the spec; right now it's a stub.
3. **Call prep, 20 seconds before the call.** Consultant taps a lead: three sentences — where they are, the objection
   in their own words from the thread, the number that answers it. Pure lift on close rate, zero new plumbing.
4. **Inbox triage.** Every inbound reply classified (question · objection · booking · complaint · silence) with a
   drafted response waiting behind the human gate. The unified inbox exists; this makes it think.
5. **Survey photo intelligence.** Roof photos → shading, obstructions, orientation sanity-check against the design.
   Catches the "designed for a roof that isn't there" error before the customer sees a proposal.
6. **Voice → field record.** Installer talks; the agent writes the structured note + updates the checklist. Gloves,
   ladder, rain — typing is the enemy on site.
7. **The learning loop (already designed, not built).** Won/lost outcomes feed back: which wording closed, which
   objection recurred, which agent needed a hand. The owner watches it improve. `AgentTraining` is the surface; the
   loop behind it is the missing half.
8. **Proposal personalisation from their actual life.** Not "a 6kWp system" — "you're out all day, so the battery is
   what makes this work for you", written from the day/night split we already read.

## What's still missing (beyond AI — the honest sweep)
- **The paper trail isn't recorded** — `lead_documents` + `esb_submissions` exist, nothing writes them. Biggest
  launch-critical gap; the whole compliance claim rests on it.
- **A1 onboarding** — signup → tenant → trial. No self-serve door yet.
- **The widget + the sites** — the go-live signal itself.
- **Notification spine** — one event → bell + branded email, with the portal link always in it.
- **AIField mobile** — an installer's hands are on a phone; two surfaces still assume a desktop.
- **The customer's own view of the money** — grant status, what's paid, what's next, in their portal.

## The verdict, plainly
**Have we built something truly special? Yes — the spine.** It's honest, it's verifiable, it's Irish-statutory deep,
and it's rare. **Is the AI pulling its weight? Not yet.** It writes; it doesn't yet *know*. Items 1 and 2 above are
what turn "there's AI in it" into "I can't run my business without this" — and both are weeks, not quarters, because
the data and the gates are already there.
