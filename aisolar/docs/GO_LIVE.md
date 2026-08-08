# GO LIVE — the final gate (2 Aug 2026)
### THE one doc. Knock these out → deploy. Everything below is either live-verified or carries its fix. Detail lives in the named docs (all in `aisolar/docs/`); this is the order and the truth.

## 0 · FIRST DEPLOYMENT SHAPE — ✅ VERIFIED LIVE against routing
**Cal's national brands + the first client's three sites.** Live seed matches exactly:
Renewable Ireland + Solar Ireland (national, 1 door each) · **Saunderson + Wide Awake Solar (independent) + Solar
Roscommon (county, franchised)** = the client's three, 1 door each · Tyrone/Westmeath held. `aigrids.route_lead` live;
origin-kind law proven 8/8 (independent→hold · county-owned→hold · unowned→up · national→€500 gate/pool).
**⭕ GO-LIVE CONFIRM: the client's 3 brands share ONE tenant_id** (his one login sees all three feeds) — check at his onboarding.

## 1 · THE BUILD LIST (mine, in order — the knock-out list)
① **P0 — customer portal `/customer/:token`** (paying customer currently lands on a 404; magic links, copy-link, links in every email)
② **The cutover** — serverStore tenant-align (user_roles) → read-flip (DB-first). The data spine.
③ **ESB paper trail** — ONE doc-id vocab → `lead_documents` + `esb_submissions` writes (sealed → portal-submitted → REAL ref → status chain) · **pack legibility redesign** (portal-order field grouping, bigger type — "sounder and easier to read") · **⭕ PER-CUSTOMER PACK CONFIRMATION GATE**: before launch, every cohort customer's pack passes `nc6Completeness` + a human eyeball — marked, not assumed · missing-items NOTIFY surfaced at the 3 human touchpoints (job card pre-visit · consultant lead view · owner badge) + Coach speaks them
④ **The WIDGET (insane)** + Flowith-pattern onboarding on every entry point (ONBOARDING_SPEC.md — Cal's own auth/onboarding functions override on arrival)
⑤ **AIField mobile-first** (ClientHub 1 breakpoint · DayRoute desktop-only · fixed rail — confirmed) + full logic walk · Design Studio once-over
⑥ **FRONT-END REVAMP** — fresh snapshots from the CURRENT UI · copy pass every page · pricing page rebuilt · proposal "fantastic" · white-label sings per-brand
⑦ **Coach v1.5** (per-POV voice + real signals + gate awareness) · **notification spine v1** (one notify() → bell + branded email, portal link always in)
⑧ Hardening — ingest rate-limit/honeypot · dead-letter alerting · demo cast on the 5 archetypes
**Woven through ④–⑦, not parked (Cal: "the little growth tactics throughout"):** review ask at the 5★ moment · referral card IN the branded handover pack · milestone money emails with what-happens-next · SEAI grant status visible to the customer · doc vault in the portal (their certs forever) — the 360 feeling, "what they always wanted."

## 2 · YOUR HANDS (whenever ready)
~~`supabase db push`~~ (RLS-floor + pricing-key fixes — ✅ ALREADY APPLIED + verified live 8 Aug, see §9) · push the branch (commits local) ·
the two ESB policy reads (5.75/11.04 bands · typed e-sig) · old-key rotation · edge-fn deploy + secrets · Postmark
token + DNS (I prep) · Vercel domain · doors onto the live brand sites · paste your auth/onboarding functions (file/RAW).

## 3 · TOGETHER
The smoke test (every human button fires its full chain + a real email lands) · read-flip verification · the client's
tenant onboarded through the new flow · per-customer pack confirmation (the ⭕ gate above).

## 4 · BROWSER ENTRY AGENT (Cal's idea — captured as designed intent)
A `portal_submitter` browser agent that keys the NC6/NC7 into the ESB portal itself. **The schema already anticipates
it** — `esb_submissions` was designed for "a future portal_submitter browser agent [that] writes back esb_reference."
Post-launch, human-gated (agent fills, installer reviews + clicks submit), truth-pass (never fabricates a ref). Until
then the redesigned entry sheet + recorded submissions is the safe path.

## 5 · THE EXPERIENCE 20 (what makes the app FEEL unstoppable)
1 Portal stage TRACKER (the Domino's moment) · 2 Widget estimate REVEAL (numbers animate in, value before ask) ·
3 Milestone money emails ("deposit in — your install window is…") · 4 The HANDOVER PACK as a beautiful branded
artifact w/ review ask + referral card inside · 5 Review→Google at the 5★ moment; referral code woven in ·
6 Coach per-POV (the hidden multiplier) · 7 AIField thumb-first (big scan buttons, photo-first, offline-tolerant) ·
8 Proposal savings STORY ARC (bill today → after → 20yr) + satellite roof + one-click deposit · 9 Empty states that
TEACH (first-run explains itself) · 10 Optimistic UI + skeletons (stage moves feel instant) · 11 Global search
polished (cmd-K everywhere) · 12 Bell + daily digest as one calm system · 13 Print styles (paper still rules on
site) · 14 AIField as a PWA (add-to-homescreen, one-bar-of-signal tolerant) · 15 Per-tenant theming END-to-end ·
16 The NC6 "READY TO FILE" celebration moment (the compliance win made visible) · 17 Customer doc VAULT (certs +
warranties, theirs forever) · 18 SEAI grant status timeline for the customer (the money they're waiting on) ·
19 Owner MORNING DIGEST ("3 things need you today") · 20 Speed pass (route-splitting + images — premium feel).

## 6 · REDUNDANCIES FOUND (kill or consolidate — honest list)
- **`touchpoints` AND `lead_touchpoints`** — TWO live tables for one concept (old + the 20260801 store). Consolidate at cutover; one survives.
- **`AiTeamPage.tsx` AND `AiTeamPageV2.tsx`** — both in pages/; V2 wins, retire the old (to _TRASH, never rm).
- **TWO `AgentWindow` components** (`owner/AgentWindow` + `agents/AgentWindow`) — verify intent; likely one retires.
- **THREE email senders + agent-drain's own sends** — resolved by the notification spine (v1 above).
- **Demo battery premium vs the pricing dial** — resolved by the demo-cast rebuild.
- *(NOT redundant: the frontend + edge quote engines — that's the Deno boundary, one-source-mirrored, documented.)*

## 7 · RATING vs PROVEN MARKET SOFTWARE (honest, internal-only)
| Area | Us | Proven (OpenSolar / field-SaaS class) | Read |
|---|---|---|---|
| Irish statutory depth (NC6/7 + SEAI + sealed pack) | **9** | ~3 | **Category of one. THE wedge.** |
| Bill-read intake → instant estimate | **8** | ~5 | Genuinely differentiated front door |
| Agent runtime (relay, gates, honesty) | **8.5** | ~4 | Textbook-verified; rare in the niche |
| Multi-brand routing / white-label | **8** | ~5 | The franchise machine nobody else has |
| Proposal/design studio | 6.5 | 8.5 | They're years deep (3D shading, component DBs) — our §1⑥ closes feel, not depth |
| Field app maturity | 5 → 7 after ⑤ | 8 | The mobile pass is the gap |
| Reporting/analytics | 5 | 8 | Post-cohort (PostHog line in the stack doc) |
| Integrations breadth | 3 | 8 | Deliberate: doors-not-marketplace at launch |
| **Overall today** | **~6.5 pre-launch** | 7.5–8 on breadth | **Don't fight breadth. Win the wedge: bill→install→NC→grant, end-to-end, in Ireland. Nobody proven does THAT.** |

## 8 · WHY gate_bridge MATTERS (Cal: "you know why?") — yes:
because every offer/project/verify recorded through it is **evidence that outlives the author** — the hash-chained
record the kernel binds to in Phase 2. The handover pack, the review, the referral, the VPP (attested installs as
provable, tradeable capacity) all stand on THAT chain. It's not plumbing; it's the moat's foundation stone. Protected.

## 9 · CAL'S 3-AUG ADDITIONS (specs, slotted)
- ✅ **DB fixes LIVE** — the two migrations applied + verified on V5 (3 Aug, via the mgmt channel when the CLI wasn't
  installed): `pricing` key admitted · the five tables tenant-scoped. **The bleed is closed in production.**
- ✅ **Demo cast → 10 leads** (key stages, all five archetypes).
- **7-DAY TRIAL → PAYMENT (the SaaS's own billing)** — slot ④ (with onboarding): Stripe **subscription** Checkout with
  `trial_period_days: 7`, card captured up-front, `stripe-webhook` (exists) flips `tenants.subscription_status`
  (trialing → active → past_due); a soft in-app banner at T-2 days; past_due = read-only mode, never data loss. Owner
  self-serve via Stripe Customer Portal (cancel/card/invoices — zero build). Uses the existing keys/webhook plumbing.
- **BRANDED OUTBOUND (every email = the TENANT'S brand)** — slot ⑦ (the notification spine): all send-* + agent-drain
  emails render from `tenant_brand` (logo · accent · from-NAME · reply-to = the tenant). **Launch pattern:** one
  verified platform domain, per-tenant from-name + reply-to ("Saunderson Solar <hello@notify.aisolar.ie>", replies →
  the installer). **Per-tenant DKIM domains = post-cohort** (real DNS work per client; the from-name pattern is what
  every major SaaS ships first).
- **CLIENT-SIDE AUTONOMOUS** — the sum of ④ (signup→tenant→trial), ② (settings self-serve, now DB-backed), the widget
  hand-out, and ⑦ (self-running comms). No new slot — it's the definition of done for those.
- **TRAINING + WALKTHROUGH** — slot ⑧→⑨: the founder teaching walkthrough (SWEEP10 §E) + guided demo off `/demo` on
  the 10-lead cast + per-surface "what/why/how" — doubles as cohort onboarding. The 5-archetype cast IS the courseware.
- **OWNER COCKPIT REVAMP** — next session's OPENER: `OWNER_REVAMP_BRIEF.md` (grounded; kills the third lead-surface +
  twin AgentWindows; Overview = the 30-second morning read).

## 10 · FIRST COHORT — the honest senior list (what 10 clients ACTUALLY need)
**You're NOT missing (already true):** the pipeline works end-to-end · money in (Stripe hosted) · the NC pack · RLS
isolation (now incl. settings) · magic links · demo/training data · GDPR floor (consent, erasure, privacy) · agents
draft-gated · the routing for your exact deployment shape.
**MISSING and it matters (the build list catches ALL of it):** trial→payment (above) · branded outbound (above) ·
A1 signup (slot ④) · training (above) · support channel — **a WhatsApp group per cohort client + you; no ticketing
tool at 10 clients** · Terms of Service rewrite (legal, on the register) · **backups: turn ON Supabase PITR** (one
switch, your hands) · a **status habit, not a status page** (you message the group if anything blips).
**Deliberately NOT needed at 10 (don't build):** self-serve everything (concierge onboarding IS best practice at 10 —
you personally onboarding each client is a feature, not a gap) · dunning automation (Stripe retries + you know all 10
by name) · seat limits/entitlement enforcement (price it, don't police it yet) · status page · in-app ticketing ·
SLA docs · SSO. **The trap is building month-6 SaaS before client #1. The list above is client-#1 true.**

— *Docs index (all in `aisolar/docs/`): MASTER_AUDIT_1AUG · DEPLOYMENT_READINESS_2AUG · PAPERWORK_AUDIT ·
THE_OPERATING_STACK · ONBOARDING_SPEC · OWNER_REVAMP_BRIEF · SWEEP10_NOTES · CALS_GROWTH_DEV. This doc supersedes their ORDERING; their detail stands.*
