# THE OPERATING STACK — Cal's 2 Aug dump, captured + triaged
### Cal (verbatim intent, one-man band, first SaaS launch): "be my eyes and ears… I don't want to be bogged down with design or broken parts on launch… read between the lines." READ: **capture the whole vision so nothing is lost, keep the LAUNCH list small and true, and fix the broken parts before he ever sees them.**

> Triage law: **P0/LAUNCH** = a cohort customer or installer hits it week one · **POST-COHORT** = the growth machine,
> built on revenue · **ENTERPRISE/LATER** = the full operating stack, built when volume demands it. Nothing here is
> dropped — it's SEQUENCED. Companion docs: [DEPLOYMENT_READINESS_2AUG.md](DEPLOYMENT_READINESS_2AUG.md) (the launch
> checklist + the 20) · [SWEEP10_NOTES.md](SWEEP10_NOTES.md) §H (customer-star execution) · [CALS_GROWTH_DEV.md](CALS_GROWTH_DEV.md).

---

## 0 · VERIFIED TONIGHT (the eyes-and-ears findings — facts, not fears)
1. 🔴 **P0 BUG — the paid-customer 404.** `create-checkout` redirects to `/customer/<access_token>?payment=success|cancelled` — **no `/customer/:token` route exists** (App.tsx has none; CustomerPortalV2 does no token reads). A customer who just PAID lands on NotFound. **Fix = build the token-keyed customer portal route** (= the magic-link front door, pending task #8) and point checkout's success/cancel there. This is the single worst launch landmine found to date.
2. ⚠️ **AIField mobile: Cal's instinct CONFIRMED in code.** `ClientHub` has ONE responsive breakpoint; `DayRoute` is desktop-first (`lg:` only — no mobile tier); `JobViewV2` carries a fixed `w-[288px]` rail + sparse `sm:` coverage. Tablet-fits-sometimes is exactly what this pattern produces. **Needs the dedicated mobile-first pass** (installer's hands are on a PHONE on a roof).
3. ⚠️ **Coach: structure exists, depth is thin.** Role-branching is real (`RoleBasedAICoach` role prop; 32 role refs in `coachBrain`), but intelligence = hard-coded stage lines (ROUND4 finding still true). To be "the hidden multiplier per POV" it needs: real signals (bill size, deal value, days-in-stage, workload) + the NC6-gate awareness (readiness doc §4.2) + per-POV voice. Design → §2.
4. ⚠️ **Notifications: half-wired.** In-app bell component + 4 email functions exist; a unified "event → bell + email + (later) digest" spine with brand theming is NOT yet one system. Design → §2.
5. ✅ **Quicklinks foundation exists** — 64-char crypto tokens on every lead; what's missing is the SURFACES: the customer route (P0 above), "copy portal link" buttons for staff, links embedded in every outbound email.

## 1 · LAUNCH (fix/build BEFORE the cohort — added to the readiness checklist)
- **P0 customer portal route** `/customer/:token` (token-keyed read of the lead's own record — proposal, stage tracker, invoices, docs) + checkout redirect lands there + "copy portal link" on the consultant/owner lead views + the link in every customer email. *(This IS the magic-link + quicklinks ask + task #8, one build.)*
- **AIField mobile-first pass** — ClientHub/DayRoute/JobViewV2 responsive rebuild; thumb-reach actions; the rail collapses; test at 375px. *(Cal: "heavily optimised for mobile.")*
- **AIField logic once-over** — walk every button/state (serials gate → NC6 fields → sign-off chain) with the click-path method; verify the full rational flow holds on a phone.
- **Design Studio once-over** — same treatment (it feeds the proposal the customer sees).
- **Coach v1.5** — keep deterministic, add the real signals + NC6-gate prompts + POV voice per §0.3. (LLM depth is post-cohort — X8.)
- **Notification spine v1** — one `notify(event)` path → bell + branded email, consistent design touches, portal link always included.
- **Proposal "fantastic" pass** — it's GREAT (Cal's word); make it sing: tenant accent + logo through every block, the tracker teaser, one-click deposit button (readiness #14), mobile-perfect type scale.
- **Family package sings per-brand** — the white-label depth item (readiness #13): one `tenantBrand` object (logo · accent · from-name) themes portal, proposal, emails, widget, tracker. Family colours for OUR brands; any-brand for tenants.
- *(Everything already on [DEPLOYMENT_READINESS_2AUG.md] §7 stands — RLS push, pricing key, serverStore align, read-flip, A1, ingest hardening, dead-letter alerts.)*

## 2 · POST-COHORT (the growth machine — Cal's dump, faithfully)
- **Service / relationships / outcomes** as the lens on every view (what we did · who we're with · what it produced).
- **Acquisition → repeatable sales** (front+back) → **fulfilment** → **volume & scalability** — the four-stage operating readout on the owner cockpit (the numbers that tell a one-man band where to stand today).
- **Agents + learning loops** — owner tunes prompts, workers train by using, agents report what they learned (the training model already noted in CALS_GROWTH_DEV — build TO it).
- **Observability** — Sentry (errors) + PostHog-type product analytics (funnels, drop-offs, feature use). SECRETS.md already carries a SENTRY_DSN slot. Wire at first real traffic; pre-cohort it's noise.
- **Email/Granola-style capture** — call/meeting notes → the lead's record → coach context.
- **Automation + agentic action gates** — every new automation passes a human-gate review (the draft-only law, extended).
- **Customer success & retention → referral** — post-install nurture, review ask, referral loop (the flywheel already in CALS_GROWTH_DEV).
- **Expansion nurture tracking** — track the county-franchise pipeline (wholesaler → installers → owners) like a sales pipeline.

## 3 · ENTERPRISE / LATER (the full stack — captured, not forgotten)
- **Shared drive w/ ranked multi-access** — team folders, context packs, role-ranked visibility, agentic reports/analytics on top.
- **Knowledge graph over the tables** — entity linker · duplicate resolvers · record normalisation · raw-interaction store · context optimisation. (The kernel's relationships table is the seed — Phase 2 aligns here.)
- **Recursive structures / workflow logic + optimiser** — workflows as data, agents propose optimisations, humans ratify.
- **Strategy generator** — reads the operating readout, drafts the next play.
- **The org-as-agents suite** — testing · ops & logistics · executive team · crisis management · GDPR/legal/ethics desks (each an agent + human gate; GDPR foundations already real: consent records, anonymise_lead, erasure).
- **Testing discipline** — the executed-assertion pattern from the maths audit, made a CI habit.

## 4 · THE HONEST SENIOR-TEAM READ (first SaaS launch, one man)
Launch = **§1 + the readiness §7 list. Nothing else.** Every §2/§3 item is real and WILL matter — after live customers
prove the core. The trap for a first launch is building the operating stack before the operation. You have: sound maths
(27/27), a live spine, textbook agents, fail-closed doors, sealed NC packs. What was missing tonight was a door for the
PAYING customer — found, named P0, next build. That's what eyes-and-ears is for. **Sequence: P0 portal → AIField
mobile+logic → coach/notifications/proposal polish → white-label sing → cohort.** One list. We walk it.
