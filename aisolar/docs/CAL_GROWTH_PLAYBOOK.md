# CAL'S GROWTH PLAYBOOK — learn it, sell it, market it
### Purpose: one doc you can actually internalise, then use to sell + market AISolar / AIOS when it's execution time.
### Every claim below is grounded in a real source — the build log, the audits, or the empire map. Where something is NOT yet built, it says so. No invented numbers.

> **The one-breath story (memorise this):** *"Most solar software stores your work. Ours watches it. Every deal is read continuously — what it's worth, how long it's sat, whether the customer's engaged, what's blocking the paperwork — and the system tells each person the ONE thing to do next, with the reason. And before an ESB form ever files, the AI reads the actual certificate and argues with the human if they disagree."*
> — source: `CALS_GROWTH_DEV.md` TEACHING section (Cal's own framing)

---

## PART 1 — LEARN IT (what this actually is, in plain words)

### 1.1 The spine (the real product)
The product is not "a CRM with AI." It's a **verified Irish-solar operating chain**:
`bill read → survey → design → one quote engine → NC6/NC7 pack sealed with a hash → grant → install → attested record`.

Why that's the moat (from `READINESS_AND_MOAT.md` + `AI_WORTH_ITS_WEIGHT.md`):
- **Irish statutory depth, end-to-end.** NC5/6/7 auto-fill, grant-ready packs, RECI sign-off. The paperwork Irish installers hate most. Deep, local, dull — *exactly why a global tool (OpenSolar) won't come here.* We own it end-to-end.
- **Multi-tenant routing built in.** One install runs many installers, each isolated (RLS floor + tenant resolver). A new installer = a new tenant, not a new build.
- **Agents draft, never send.** 10-agent runtime (queue + pg_cron). Risky moves — send proposal, take deposit, submit to ESB — always wait for a human button.
- **Verifiable numbers.** Every figure traceable to the bill read and hash-chained. *"Ask the other quote to prove their number."*

### 1.2 The AI — what's real vs what's hype
Honest verdict from `AI_WORTH_ITS_WEIGHT.md` (3 Aug): **the spine is special; the AI was a typist.** What we've now made real (verified on disk, `cowork-3aug` @ `e2417d6`):

| Capability | State | Evidence |
|---|---|---|
| Compliance Vision (reads certs, argues with human) | ✅ BUILT | `ArtefactCheckCard.tsx` — 3 checks (type-test plate, rating plate, RECI cert). Flags-not-blocks. `no_ai` = honest "gate works by hand." |
| Coach that knows the deal (dealIntel) | ✅ BUILT | `dealIntel.ts` — `dealSignals` / `nextMove` / `aiReports`. Reads value, opens, recency, tone, NC6 blockers. |
| Call-prep (20 sec before the call) | ✅ BUILT | `callPrep()` — where / objection-in-their-words / the number that answers it. Verified live on Corrib demo. |
| Coach on installer + customer POV | ✅ BUILT | Installer briefing leads with NC6 blocker; customer gets 13-stage-aware "where's my solar." |
| Inbox triage · survey-photo intel · voice→field · personalisation · customer money view | ⬜ NOT BUILT | Listed in `AI_WORTH_ITS_WEIGHT.md` ranked #4–#8. Weeks, not quarters — data + gates already exist. |

**The line for the pitch (from Cal's own doc):** *"the AI is our compliance officer, not our copywriter."*

### 1.3 The honesty architecture (why installers trust it — USE in marketing)
From `CALS_GROWTH_DEV.md`:
- Rules run the business; AI does the writing + reading. Kill the AI → leads still route, surveys book, packs build, invoices fire. *(The Emergency Stop card SHOWS this — demo it.)*
- The AI flags, the human decides. Nothing sends, signs, or files itself.
- Every claim cites its source: coach quotes the deal's own record; vision check shows what it read.
- No AI configured → the app says so. It never pretends.

### 1.4 The empire (the franchise thesis)
From `AIOS Layers × Verticals × Counties.md` (vault, committed):
- **Prove solar → all other verticals strap onto AIOS.** Solar is the hardest all-rounder (regulatory + physical + multi-party + trust). Proving it de-risks the franchise engine for 40+ verticals.
- 7 axes: Layers · Energy verticals (24) · Non-energy franchises (14) · Counties (32) · Frontier land-bank (13) · 10-yr land-bank (9) · Regulatory/Infra (26).
- `ai*.ie` cluster = ownable real estate, not just product names.
- **Valuation logic (your framing, not mine):** pre-revenue = replacement-cost floor (~sub-€1M); post-proof (one live customer through the full chain) the de-risk event engages; 10 paid customers = repeatable + revenue-bearing. The billion is a RIGHT-BUYER post-proof anchor, not a tag.

---

## PART 2 — SELL IT (the demo + the conversation)

### 2.1 The three demo moments (show, don't tell)
From `CALS_GROWTH_DEV.md`:
1. **Owner opens app** → NEEDS YOU: *"Call Corrib now — proposal opened 3×, last look today. €134,350 on the table. This is the window."* Not a dashboard — a colleague.
2. **AI Coach panel** → live AI-reports feed, every line computed from the book this second. Click a line → land on the deal.
3. **Commissioning gate** → attach type-test cert → Cross-check now → *"you typed 6.0 kW — the cert reads 5.0."* NC6→NC7 band error made impossible.

### 2.2 The objection-handling cheat sheet
| They say | You say (grounded) |
|---|---|
| "OpenSolar does this" | "They don't do Irish NC6/7 + RECI + SEAI end-to-end, and they don't read the cert and argue with you before it files. That's the bit that gets installers fined." |
| "AI in solar is hype" | "Ours is the compliance officer, not the copywriter. It catches a wrong serial before the ESB form goes in. Kill the AI and the business still runs — it's a safety net, not a black box." |
| "Will it send stuff without me?" | "Never. Every send, sign, file waits on your button. The agents draft; you decide. Demo the Emergency Stop." |
| "What about my data / other installers?" | "Tenant-isolated by RLS. One installer cannot see another's leads. Verified per-table." |
| "Can I trust the numbers?" | "Every figure traces to the bill read and is hash-chained. Ask the other quote to prove theirs." |

### 2.3 The franchise close (for the bigger conversation)
- Solar proven = the OS proven on the hardest vertical.
- 40+ verticals = the same OS with different industry rules strapped on.
- The expensive skeleton (kernel + crew + payments + deployment) is proven once.
- *Honest line:* "We've proven the OS runs the hardest real-world business end-to-end. Every other vertical is the same OS with different industry rules strapped on."

---

## PART 3 — MARKET IT (when execution time comes)

### 3.1 The message hierarchy
1. **Primary (the wedge):** "The AI that reads your certs and stops you filing a wrong ESB form." — compliance, not chatbots.
2. **Secondary (the operator gain):** "A colleague for every role — owner sees the window, installer sees the blocker, customer sees where their solar is."
3. **Tertiary (the trust):** "Rules run it, AI reads + writes, you decide. Kill the AI, business runs."

### 3.2 The doors (growth = more doors into the same pipe)
From `CALS_GROWTH_DEV.md` — every item is another `source_key` → the same keyed pipe. No new plumbing:
- Widget (insane) + share link + CSV + manual + API = launch.
- FB/IG Lead Ads · Google Lead-Form Ads · call-tracking · email-forward parsing · Zapier recipe = post-cohort.
- Wholesaler/distributor portal (SolaX angle) · cross-tenant benchmarking (anonymised) · reviews→referrals→social flywheel.

### 3.3 The go-live signal (from the deploy doc)
The door wired into the **actual** brand sites (RI/SI + Saunderson / Wide Awake / Solar Roscommon) IS the launch moment. When the real domains carry the widget and a real lead lands attributed, you're launched.

### 3.4 Truth-pass guardrails (NON-NEGOTIABLE in all marketing)
- No SMS/WhatsApp claim until actually built + live.
- No "roof detection" claim until real.
- No fake statuses / invented numbers anywhere customer-facing.
- The AI flags, drafts, prepares; a human sends, signs, files. Grant agent TRACKS, never submits.

---

## PART 4b — STRATEGY GAPS & OPEN DECISIONS (Hermes planning pass, 3 Aug)
A frank pass on what the growth story still misses. Two buckets: benefits not yet named, and GTM mechanics not yet decided.

### Real benefits not yet in the story (verified on disk / in build logs)
- **AI Design Studio** — roof design auto-drawn true-scale on the *actual* roof from bill + survey, not a manual drag. Benefit: no designer hours, proposal looks like a national's, and it's accurate.
- **The widget doesn't just save time — it brings leads.** Embed it and the installer's *own* customers start the journey and land as attributed leads. Adopt = more business AND less work. This is the stronger half of the wedge; it was under-sold as "distribution node."
- **It makes a 2-person installer look like a national.** Branded portal, tracker, handover pack — the end customer never sees a small operation. Kills the inbound "where's my stuff?" calls that eat a solo installer alive. Professionalism-as-a-feature is a real, unnamed benefit.
- **Owner morning digest ("3 things need you today").** Real (GO_LIVE experience list). Owner opens one screen, sees the three that need a human, closes the tab.
- **Pricing control in the owner's hands.** The €/kWp dial flows to every estimate, proposal, and stored contract. They set their own margin; the system enforces it everywhere.

### GTM mechanics not yet addressed
- **Pricing** — the doc says "7-day trial, card captured" but never states *what you charge*. Biggest hole; can't write a sales motion without a number. **[DECISION: price TBD — do not invent.]**
- **County grandfather offer as a motion** — Wave 1 = Roscommon, then "the grandfather offer goes to 32 counties." A specific, low-cost channel (existing relationships / county-by-county) that deserves its own line, not a footnote.
- **Founder-led sales** — at 10 clients, Cal *is* the sales motion. State as the deliberate early model: founder closes first 10, proves them, then systematises.
- **Reference / proof motion** — Roscommon as the proof tenant → its results become the case study that opens the other counties ("prove one, show the rest").
- **Why-now / market timing** — Irish solar boom, SEAI grants live, micro-gen regs tightening. The window where an installer needs this yesterday.
- **Competitive displacement** — what they use today (spreadsheets, OpenSolar, manual) and the cost of *not* having it (fined NC, lost leads, 6 hrs/week gone), beyond "we're automated."

### Decisions needed from Cal
1. **Price** (plan + number).
2. **A1 auth** — drop functions or "build without" (flagged earlier).
3. **Statutory yes/no** — ESB bands, typed e-sig, NDMG/ACA (flagged earlier).

---

## PART 4c — QUICK-REFERENCE ADDITIONS (from this pass)
- **Over-sold vs under-sold:** we over-sell the compliance capstone and under-sell the 90% — the AI bill reader, auto-estimate, self-booking callback, one maths chain, automated follow-up, in-field routing, and the customer intelligence / centralised coach / shared inbox / handover that make it ONE business.
- **The real headline:** "Your whole solar business, automated, in one platform — you only show up for the roof, the relationship, and the signature."
- **The wedge is two-sided:** (1) time + certainty back day one; (2) the ESB/SEAI trail assembles itself, correctly — that's why the automation is *trustworthy*, not just fast.
- **The widget is a lead engine, not a feature.** Embed = more leads + less work for the installer. Lead with this in installer conversations.

---


From `AI_WORTH_ITS_WEIGHT.md` + `FINAL_SPRINT.md` Sprint 1–2 open items:
- **ESB paper trail not recorded** — `lead_documents` + `esb_submissions` exist, nothing writes them. **Biggest launch-critical gap.** The whole compliance claim rests on it. *(Sprint 2, item 2A.)*
- **A1 onboarding** — signup→tenant→trial. No self-serve door yet. *(Blocked on Cal's auth functions or "build without".)*
- **Widget + sites** — the go-live signal itself.
- **Notification spine** — one event → bell + branded email.
- **AIField mobile** — installer hands-on-phone surfaces still assume desktop.
- **Customer money view** — grant status / paid / due / next, in their portal.
- **Inbox triage · survey-photo intel · voice→field · personalisation** — AI items #4–#8, not built.

> **Your two open decisions (from `CAL_GATE_DECISIONS.md`):** (A) A1 — drop auth functions OR say "build without"; (B) statutory yes/no — ESB bands · typed e-sig · NDMG/ACA figures. Until both close, the launch-critical gaps stay open.

---

## PART 5 — THE DEEPER STORY (for the right buyer, not the public pitch)
The product's real moat is not just features — it's that every offer, project, and verification is recorded as **evidence that outlives the author**: sealed, hash-chained, immutable, verifiable by a stranger without trusting anyone. That foundation is what makes the automation *trustworthy*, not just fast. It's the reason "rules run it, AI reads and writes, you decide" is a real claim and not a slogan. Keep this for the sophisticated buyer; the public pitch leads with time back + one platform.

---

## QUICK-REFERENCE (tattoo this)
- **One-breath story:** stores work → watches work → tells you the one next move → argues the cert before it files.
- **The line:** "the AI is our compliance officer, not our copywriter."
- **The demo:** NEEDS-YOU window → AI-reports feed → commissioning cross-check.
- **The moat:** Irish statutory depth + verifiable numbers + tenant network + the chain.
- **The truth:** rules run it, AI reads/writes, you decide. Kill AI → business runs.
- **The gap:** ESB paper trail not recorded = #1 launch blocker. A1 + statutory = your two calls.

---
*Sources: `CALS_GROWTH_DEV.md` · `AI_WORTH_ITS_WEIGHT.md` · `READINESS_AND_MOAT.md` · `FINAL_SPRINT.md` v2 · `CAL_GATE_DECISIONS.md` · vault `AIOS Layers × Verticals × Counties.md` + `Kernel Constitution & CDT.md` v5 · verified build `cowork-3aug` @ `e2417d6`. Written 3 Aug 2026 to help Cal learn, sell, and market — every claim grounded, every gap named.*
