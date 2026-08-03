# SESSION LOG — 3 August 2026 ("make this baby sing" → the AI got real)

> Everything built, fixed, decided and documented today. Grounded in the git log, not memory.
> **Branch `cowork-jul31` · 27 commits · `67ad1ad` pushed + ls-remote proven · tsc 0 · +2,464 / −998 lines.**
> Started "morning lets make this baby sing" — ended with the AI as compliance officer + closer, and the
> whole estate folded into one runway (`FINAL_SPRINT.md`).

---

## THE HEADLINE
1. **The three cockpits became one product** — owner, consultant, installer now share one shell, one banner
   system, one colour language, one money vocabulary. They no longer drift.
2. **The AI stopped being a typist and became intelligence** — `dealIntel` (knows every deal) + Compliance
   Vision (reads the certs) + an honest, gated coach.
3. **Two real security holes closed** — production can never skip login; the coach can never invent customers.
4. **The whole estate got folded into one ordered runway** — `FINAL_SPRINT.md` v2, every open item from
   every doc, nothing loose.

---

## 1 · THE HEART — one shell across all three cockpits  *(faf6acb)*
Owner, consultant and installer cockpits all adopt ONE `AppShell`. Before: each rolled its own header + tabs,
so sizing and family accents drifted between views. This was the root of "the sizing and the family are not
aligning." −87/+80 lines — mostly deletion of duplicated chrome.

## 2 · THE AGENT TRIO — symmetry + un-backwards logic  *(2b55829, a9b6bb1)*
- **First attempt was wrong** — I *stripped* AgentFoundation's banner. Cal: "that was the best one — I asked
  for symmetry." Reverted, then made it the standard.
- **New `SectionBanner` component** — Foundation's banner lifted into one reusable shape (icon · title ·
  honest flag · one plain-English line · optional stat row). Agent Training and AI Config now wear the
  identical shape. Switching sub-tabs feels like one screen changing content, not three apps arguing.
- **AI Config logic un-backwarded** — it used to ask you to pick a model and paste a key *before* asking
  whether to use AI at all, with Save hidden in a summary card. Now: ① connect + model → ② spend limit, and
  the on/off switch became an honest **Emergency Stop** card that states exactly what keeps working without
  AI (routing, stages, survey booking, the NC6/SEAI pack, reminders, invoices — all rules) vs what stops
  (written copy, follow-ups, smart extraction, coach). Cal: "a doomsday button is ok but not lies."

## 3 · THE NUMBERS BUG — trust restored  *(2b55829, a9b6bb1)*
Financials and Overview genuinely disagreed and nothing explained why: Overview counted only jobs paid in
full; Financials counted final-paid PLUS deposits — same word, two meanings. Both now read ONE source
(`computeOwnerStats`) and every tile states what it counts (Banked · Deposits held · Still to collect ·
Grants in flight). They can never disagree again.

## 4 · MOBILE — a real clipping bug  *(2b55829)*
On the installer's Today card at 375px, the profile row refused to shrink, so the address and MPRN were
clipped off-screen. Fixed at the flex level (min-w-0 / shrink-0 / truncate). No page-level horizontal scroll
anywhere — that rule holds.

## 5 · FAMILY COLOUR EVERYWHERE  *(9a6b7fa, 275ccca)*
- **Sidebar icon tints** restored on consultant + installer rails (my regression when they adopted the
  shell) — the same vocabulary as the owner rail, mapped to meaning (tech=work · pop=calendar/products ·
  doc-proposal=sell · doc-deposit=people/money · doc-contract=field).
- **Conversion funnel** — was one flat blue bar per gate; now the family colour walks the journey.
- **Agent breakdown tiles** — family palette cycling with share bars (after a correction: I'd restructured
  it into rows; Cal wanted colour on the tiles).

## 6 · ANALYTICS REORDER  *(9a6b7fa, 275ccca)*
Overview tab deleted (it was redundant). Its four KPIs + the two panels that earned their place (where jobs
stall · win rate by source) moved to a strip that lives ONCE inside Charts. Tab order now Charts → Leads →
Agents. (Correction mid-flight: I'd first pinned the strip to every tab — worse duplication — fixed to once.)

## 7 · CLIENTS — full-depth pipeline  *(9a6b7fa, 275ccca)*
Restored the kanban (I'd swapped it for a table; Cal wanted the pipeline kept and given the page). Now fills
the page depth with per-column scroll, white column bodies (grey wells were hiding cards), per-column value
totals, last-touch ageing. Rows open the one lead surface.

## 8 · ROOFDESIGNER — true-scale rebuild  *(5fc3870, 9e51370)*
The oversized-panels bug is dead. Replaced the keyless Google embed (which picked its own zoom, so
fixed-pixel panels read as garden slabs) with the studio's own Esri + `mppAt` Web-Mercator scale — panels
computed in true metres at any container width/zoom. Added a Clear button (remove all panels to zero, no
forced redraw).

## 9 · SETTINGS — truth-passed + resized  *(3b431b3, 952a625, 0d01293, d5fd224, 2f9f057)*
- Fake "connected" chips → honest deploy-command rows (server secrets never belong in the browser).
- Fabricated audit log deleted (empty until it reads real `activity_logs`).
- Channels merged INTO Integrations — one surface, each vendor card carries who-speaks-on-it.
- Desktop sizing fixed on Equipment/Pricing/Terms (2-col grids).
- **"What an estimate is built from"** — a new card naming all 21 bill data points, grouped, with a green
  dot on the 10 that move the money, and the full chain (bill → survey → your rates → one engine → what the
  customer sees). Proposal terms moved above pricing per Cal.

## 10 · ADD-LEAD — eircode + MPRN, end to end  *(87d0f9a + live migration)*
A launch blocker: real leads were losing the eircode (drives the roof read + NC6 §2) and MPRN. Added both
fields to the form, the write paths, and the read mapper. `leads.eircode` column added via idempotent
migration **applied live to V5** and verified.

## 11 · ⭐ AI GOLDEN — the big build  *(d011cf8, da9bba0)*
**`dealIntel.ts`** — the coach that actually knows the deal. Deterministic-first: every signal computed from
the real record (value, days-in-stage, proposal opens, thread tone, NC6 blockers). Three exports:
`dealSignals` (read one deal) · `nextMove` (THE one next move for this POV, ranked rules) · `aiReports` (the
live feed). Wired into: the owner's NEEDS-YOU gates, the coach's opening briefing, and a live **AI-reports
feed** at the bottom of the coach with a real act-now badge count. Verified live: *"Call Corrib now — the
proposal's been opened 3× and the last look was today. €117k on the table and they're actively reading.
This is the window."*

**Anchored navigation** — every gate now lands on the EXACT screen that fixes it (`?step=` on LeadFlow,
`?tab=` on JobView). Cal: "needs you has to go straight to the issue." A blocked pack → the commissioning
tab; a hot proposal → the send step; a stale lead → the conversation.

**Compliance Vision v1** — `verify-artefact` edge function + `artefactCheck.ts` + a cross-check card at the
commissioning gate. The vision model reads the inverter type-test cert and compares it against what the crew
typed; a mismatch (wrong AC rating, transposed serial) is flagged BEFORE the NC6 files. Honest by design: no
AI key → "no_ai" (never a fake pass), model unsure → "unreadable," staff-JWT only. The AC-band error that
would bite NC6→NC7 becomes structurally impossible.

## 12 · SECURITY — two real holes closed  *(2cbc2df)*
- **A9** — auth bypass was tangled with demo data behind one flag. Split: `isAuthBypassAllowed()` returns
  false in any production build even if `VITE_ENABLE_DEMO` leaks. Demo DATA stays (it's the onboarding
  feature Cal wants); the door never opens without login.
- **A10** — `coachBrain` called `generateDummyLeads()` ungated in 3 places. In production the coach would
  have answered questions about customers that don't exist. Every read now gated; returns empty + says so
  honestly with demo off. ProposalPage had the same hole; closed.

## 13 · THE DOCS — the whole estate into one runway
- **`FINAL_SPRINT.md` v2** — the definitive last-mile doc. A full-estate sweep mined every open marker from
  every note/audit/sweep (Sweep-8's 45 codes, SWEEP9/10/7.1, ROUND4, SAAS_MAP's per-surface list,
  PAPERWORK_AUDIT, DEPLOYMENT_CALS_LAST_GATE, CALS_GROWTH_DEV, COMPLIANCE_DATA_CAPTURE). Rewritten with a
  working agreement (7-point definition of DONE), per-sprint goals + done-means proofs, ⭐ load-bearing
  markers, statutory flags isolated as Cal's-yes-only, a deploy gate with per-line verifies, and a source
  ledger. Supersedes the ordering of every other doc.  *(9886d6f, 5267a74, c2d61af, 67ad1ad)*
- **`AI_WORTH_ITS_WEIGHT.md`** — the honest verdict: the spine is what's special; the AI was a typist.
  Ranked what makes it gold, led by compliance vision + the deal-aware coach.  *(2f9f057)*
- **`MASTER_TODO.md`** consolidated across all docs; **`PUNCH_LIST.md`** carried Cal's "nothing works" walk
  with root causes.  *(2d15585, 620cd06, 757696d, 8151722, 3f42836)*

---

## THE FIVE CORRECTIONS (recorded honestly — Cal caught each; all adopted immediately)
1. Stripped AgentFoundation's banner → should have made the others match it.
2. Swapped Clients kanban for a table → he wanted the pipeline kept, given the page.
3. Restructured the agent breakdown → he wanted family colour on the tiles.
4. Pinned the analytics strip to every tab → worse duplication; fixed to once.
5. Framed "Use AI at all?" as step 1 → implied the product is optional; became an honest emergency stop.
   Plus: missed 2 AI items and several docs on first passes → the lesson banked: mine ALL docs in one pass.

## DECISIONS MADE
- Production tooling verdicts: keep Postmark · PostHog light · Better Stack uptime-only · SKIP
  Upstash/Trigger.dev · Intercom ~25 clients · Beehiiv post-cohort · Cloudflare DNS-only · NO Next rewrite.
- The guided demo tour + demo-toggle-on-owner-sidebar = **Sprint 5, LAST**, only after the coach sings.

## WHAT'S LEFT (per FINAL_SPRINT v2)
Sprint 1 remainder (plate + RECI cross-checks · coach on installer + customer POVs · call-prep · inbox
triage) → Sprint 2 blockers (ESB paper trail FIRST · A1 onboarding · §D estimate fork · widget + sites ·
notification spine) → Sprint 3 conformity → Sprint 4 hardening/security → Sprint 5 finale.
**Waiting on Cal:** the ESB statutory reads (5.75/11.04 kW bands · typed e-signature) + his own
auth/onboarding TS functions for A1.

---
*27 commits · +2,464 / −998 · 9 new files · tsc 0 · pushed + proven. "Make this baby sing" → she's singing,
and now she thinks.*
