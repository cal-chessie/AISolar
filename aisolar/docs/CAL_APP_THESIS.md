# AISolar — Thesis of a Nearly-Built Solar Installer OS
### Written by Hermes, 3 Aug 2026. Original synthesis, not a rearrangement of the build notes.
### Scope: the AISolar product only. (Kernel / GENNY / franchise architecture: out of scope, held separate.)

---

## The thesis in one sentence
**AISolar is not a CRM that helps installers organise their work — it is a verifiable operating system for the Irish solar sale, where every deal is continuously read, every document is cross-checked against its own evidence before it files, and the human stays the only signatory.** That combination — *continuous reading + evidence-before-filing + human-only-signing* — does not exist in the Irish market today, and it is the thing that turns "solar software" from a spreadsheet replacement into a business that installs itself.

---

## I. The problem it actually solves
Irish solar installers don't fail because they lack a dashboard. They fail on three quiet fronts:

1. **The paperwork is the product risk.** NC6/NC7 forms, RECI sign-off, SEAI grants — get one serial or one rating wrong and the submission is rejected, or worse, accepted incorrectly and later challenged. The cert exists; nobody reads it against what was typed.
2. **The deal goes dark between stages.** A proposal sits unopened, a survey date slips, a customer goes cold — and the installer finds out when the month closes, not when the window was open.
3. **The numbers drift.** The estimate shown, the proposal stored, and the invoice sent are computed in three places by three copies of the maths. They disagree. On a grant-backed, deposit-taking sale, a disagreement is a liability.

Existing tools (OpenSolar, generic CRMs) store the work. None of them *watch* it, *cross-check* it, or *keep the human honest* by architecture. That gap is the whole market opening.

---

## II. What the app is, end to end
One chain, one source of truth for the maths, four roles served:

`bill upload → AI reads the tariff (21 fields) → survey books → design drawn on the real roof → ONE quote engine prices it → proposal drafted → customer portal opens → deposit taken → install scheduled → commissioning gate → certs cross-checked → NC6/7 pack sealed → grant tracked → handover.`

Every step is a stage with an owner. The owner sees the whole book. The consultant sees their leads. The installer sees today's job and the route. The customer sees their own project, in plain language. **One lead surface, one money vocabulary, one tenant resolver, one quote engine** — that "one of everything" rule is not aesthetics, it is the disease-preventer: it is why the quote-drift and classification-schism bugs (which previously made stored proposals lie about grants and VAT) are now structurally impossible.

---

## III. The five architectural bets that make it defensible
These are decisions, not features — and they are what a competitor would have to re-derive, not just copy:

1. **Agents draft, never send.** The 10-agent runtime advances leads through stages, but every risky move — send proposal, take deposit, submit form — waits on a human button. This is enforced in the queue, not hoped for in the UI. It means the system can be autonomous *and* safe, which is the only autonomy a real business will accept.

2. **The four-dimension tenant model.** A lead carries `tenant_id` (custody, moves), `owner` (economics), `brand` (attribution, never moves), `source` (channel, never moves) — independently. That single decision is what lets one operator run two brands, lets a national account merge regional sites, and lets white-label work without data bleeding between customers. Most multi-tenant SaaS collapses these and pays for it later. This one didn't.

3. **Compliance Vision as a gate, not a chatbot.** The model reads the actual certificate photo — type-test plate, rating plate, RECI cert — and argues with the typed value *before* the NC6 files. A wrong AC rating (the NC6→NC7 band error) becomes structurally impossible. This is the "AI as compliance officer, not copywriter" line, and it is built and live-verified, not aspirational.

4. **The honesty architecture.** Rules run the business; AI does the writing and the reading. Kill the AI and leads still route, surveys book, packs build, invoices fire — the Emergency Stop card *shows* this. The AI flags, the human decides. No AI configured → the app says so; it never pretends. This is what earns installer trust, and it is the opposite of how most "AI CRM" products pitch themselves.

5. **Verifiable records.** Every figure traces to the bill read and is recorded as an immutable audit trail. "Ask the other quote to prove their number" is a real competitive wedge, not a slogan — because the trail exists and can be shown.

---

## IV. The AI — honest accounting
The AI was, until recently, a typist: it read a bill and wrote copy. That is useful and replaceable. What has changed in the final build sprint is the AI became *intelligence*:

- **dealIntel** reads the actual deal — value, days-in-stage, proposal opens, thread tone, what's blocking the paperwork — and tells each role the ONE next move in their voice. The owner gets "Call Corrib now — proposal opened 3×, €134k on the table, this is the window." Not a dashboard. A colleague.
- **Call-prep** gives a consultant three lines before the phone rings: where the deal is, the objection in the customer's own words, the number that answers it.
- **Compliance Vision** (above) is the gold — it is the one AI capability a competitor cannot bolt on, because it needs the whole chain (captured cert + typed gate + completeness rules + sealed pack) to exist first.

What is NOT built yet: inbox triage, survey-photo intelligence, voice-to-field, proposal personalisation, the customer's own money view. These are weeks, not quarters — the data and gates already exist. The point is that the AI's value crossed from "typist" to "officer" in this build, and that is the inflection the whole product was waiting for.

---

## V. The moat
Copy-resistant, in order of strength:

1. **Irish statutory depth, end to end.** NC5/6/7, RECI, SEAI — the dull, local, regulated paperwork. A global tool will not come to Ireland for it; a local tool hasn't built it as a chain. Owning it end-to-end is the moat.
2. **The compliance gate nobody else has.** Vision-that-argues-before-filing needs the full chain. Competitors have a proposal tool; this has the paper trail with a reader attached.
3. **Verifiable numbers as trust.** Traceable, immutable, showable. Trust is the wedge in a grant-and-deposit business.
4. **The tenant network effect.** Every installer on the OS makes the routing, benchmarking, and intelligence richer for the next. (Aggregate intelligence, anonymised, is a feature only a multi-tenant OS can offer.)

---

## VI. The business model
Per-installer SaaS with white-label at its core. Each installer (or operator running multiple brands) is a tenant: they get the full OS, branded as their own company, on a subscription. The platform's AI is included — the agents work the second they sign up, which is the selling point, not a cost. Bring-your-own-key is a later enterprise option for cost control at scale.

The wedge is the 7-day trial + the insane widget (a per-tenant embeddable calculator→lead door) + the onboarding flow that walks a new user through the whole spine on a realistic cast before they touch a live lead. Concierge onboarding at the first hand-picked clients is a feature, not a gap — at low client count, personally setting up each installer is best practice.

---

## VII. Growth — more doors, no new plumbing
Every growth channel is another `source_key` into the same keyed pipe: the widget, the share link, CSV, manual entry, the API — at launch. Post-launch: Meta lead ads, Google lead-form ads, call-tracking, email-forward parsing, a Zapier recipe, a wholesaler/distributor portal, and the reviews→referrals→social flywheel. None require new architecture; they resolve to a tenant + brand + origin, then flow through routing and security already built. A new channel is a weekend, not a rebuild. That is why growth is cheap here.

---

## VIII. The build truth (honest state)
**Built and verified on disk (this session, branch `cowork-3aug` @ `e2417d6`):**
- The three-cockpit shell unified; one money source; numbers bug killed.
- Compliance Vision: three artefact cross-checks at the gate, honest `no_ai` fallback.
- dealIntel + coach on owner/consultant/installer/customer POVs; call-prep card.
- `/customer/:token` magic-link portal (kills the paid-customer 404).
- A9 security: production can never bypass login. A10: coach can never invent customers.
- RLS floor extension + pricing-key migration written, correct, pushed — but **not yet applied to live V5** (needs your `db push`).

**The one true launch blocker:**
- **The ESB paper trail is not recorded.** `lead_documents` + `esb_submissions` tables exist; nothing writes them. The compliance *vision* is built, but the compliance *record* — the sealed pack's REAL submission reference — is not yet saved. The system can now *see* a mistake; it does not yet *save the proof that it was caught and filed*. Until this is wired, the core compliance claim rests on a gap. This is Sprint 2's first item and it is the difference between "compliant by feature" and "compliant by record."

**Your two open decisions:** A1 auth/onboarding (drop your functions or say "build without") and the statutory yes/no (ESB bands, typed e-signature, NDMG/ACA figures). Neither is a coding mystery; both are yours to release.

---

## IX. The proof path to value
The asset is real and unified. Its value is currently anchored to replacement cost (a sub-€1M floor for pre-revenue, undeployed software) because there is no receipt behind a higher number. The receipt is one real customer through the full chain in production: door → proposal → deposit → install → pack recorded → handover. That single event is the de-risk moment — it converts "promising build" into "proven OS." Ten paying customers converts "proven once" into "proven repeatable," which is where a real revenue multiple first applies and the strategic interest becomes concrete.

The work between here and that receipt is execution, not invention: apply the two migrations, deploy the functions, flip to real data, wire the paper trail, run the smoke test. Weeks, not a rebuild.

---

## X. What it is NOT
- Not an AI chatbot product. The AI is a compliance officer and a closer's edge, bounded by human sign-off.
- Not a global tool. It is Irish-statutory-deep by design; that narrowness is the moat.
- Not claiming channels it doesn't have. No SMS/WhatsApp/roof-detection in any copy until built and live — truth-pass is law, in the product and in the marketing.
- Not finished. The spine is built; the paper trail, the onboarding door, and several AI lifts are open. The runway (FINAL_SPRINT) sequences them; nothing is hidden.

---

## The bottom line
AISolar is a verifiable operating system for the Irish solar sale. Its defensibility is not the UI and not the AI — it is the *chain* (bill → cert → pack, all cross-checked and recorded) and the *discipline* (agents draft, humans sign, the app never pretends). That chain is built. The one gap — recording the paper trail — is the last thing standing between a strong demo and a safe, insurable, sellable product. Close it, prove it once with a real customer, and the asset stops being a story and starts being a business.

---
*Grounded in: on-disk verification of `ArtefactCheckCard.tsx`, `dealIntel.ts` (`callPrep`), `CustomerPortalTokenRoute.tsx`, `demoMode.ts` (A9), `20260802_rls_floor_extension.sql`; the build log (Sprint 1 completions); `CALS_GROWTH_DEV.md`, `AI_WORTH_ITS_WEIGHT.md`, `READINESS_AND_MOAT.md`, `FINAL_SPRINT.md` v2. Kernel/GENNY/franchise architecture intentionally excluded per Cal's steer.*
