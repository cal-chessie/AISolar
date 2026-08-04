# A1 — Auth + tenant onboarding — BUILD PLAN (draw-up for discussion, 4 Aug)

_Cal: "draw it up first, have a little discussion, then build." Building WITHOUT
Cal's own auth/onboarding TS functions (his call) — when he drops them, his win;
this plan holds the intent. Grounded in ONBOARDING_SPEC + AUTH_RUNBOOK + a LIVE
check of V5 (`ywizcsulurxoqjdgnkvc`), not the runbook (which is written for the
dead `coxmtpnq`)._

## ⚖️ THE COPY LAW (Cal, 4 Aug — load-bearing, don't lose it)
There is **one onboarding flow component**, reused across every entry point — but
the **copy is per-audience**. The chip-based estimate screens (monthly spend →
home/business → county → day/night) are the **CUSTOMER solar-enquiry** flow. An
installer *can walk them to test the software*, **but the A1 owner/installer
signup must be re-copywritten for someone signing up to RUN the platform**, not
someone getting a solar quote. Same skeleton, different words + different
questions. Never ship the enquiry copy on the installer signup.

| Flow | Audience | Example question (right copy) |
|------|----------|-------------------------------|
| Widget / estimate (EXISTS) | Homeowner / business getting a quote | "What's your typical monthly electricity bill?" |
| **A1 signup (BUILD)** | Installer/owner adopting the SaaS | "Who's setting this up — owner, consultant, or installer?" |
| Customer portal first-open (EXISTS) | A tenant's customer | "Here's where your project lives" |
| Team invite (BUILD) | Staff joining a tenant | role pre-set by the invite |

## ✅ RESOLVED — the entry model (Cal, 4 Aug discussion)
It's ONE machine, **fractal**: Renewably captures installers the way an installer
captures homeowners. The AISolar site opens with **one chip fork** — the first
screen of the OnboardingFlow:

> **"What brings you here?"** → **[ I'm an installer ]** · **[ Estimate for my property ]**

- **I'm an installer** → the **A1 funnel**: installer-copy chips → sign up →
  (a) their **own tenant** provisions (they're its admin) AND (b) a **lead lands in
  Renewably's pipeline** (the SaaS sale — attribution chips feed *Renewably's*
  marketing). The estimate/OnboardingFlow engine is REUSED, re-copywritten.
- **Estimate for my property** → the **existing** estimate flow (§D home/business
  fork → estimate). The lead then **POSTs via `ingest-lead` into Solar Ireland
  Group's tenant** (SIG source key) → **SIG's national routing** (domestic → county
  installer · commercial → consultant). Almost all existing rails — this is the
  "national sites wiring" item pointed at SIG.

**Three flows, but two are the ends of one funnel + one already exists:**
| # | Flow | Status |
|---|------|--------|
| 1 | Homeowner on an installer's widget → the installer's DB → estimate | **DONE** (widget + §D fork) |
| 2 | Installer → a lead in Renewably's DB (top of A1 funnel) | build (reuse engine, installer copy) |
| 3 | Installer → their own tenant (A1 conversion) | build (tenant provisioning + trial + first-admin) |
| — | Property lead on the AISolar site → **Solar Ireland Group** via ingest-lead | mostly existing rails |

So the REAL A1 build = **the door fork + #2 + #3**. The estimate machine is done;
A1 bolts tenant-creation onto the far end and swaps the words.

## What A1 actually is (scope — it's the multi-tenant foundation)
1. A reusable **`<OnboardingFlow steps={…}>`** — one question per full screen,
   big tappable chips (not dropdowns), progress implied, "no pressure, switch
   anytime", OAuth-first (Google + email), tenant-brand-themed, mobile-perfect at
   375px. **Steps are DATA** (chip | input | oauth | reveal), so each entry point
   supplies its own steps + copy against the same shell.
2. **Signup → tenant auto-create → first-admin bootstrap → 7-day Stripe trial**
   (card captured) → hand into brand + compliance activation.
3. Wired at the four entry points above.

## Current V5 state (verified live)
- **Exists:** tables `profiles`, `user_roles`; functions `handle_new_user`
  (assigns `customer` to every signup — deliberate, stops self-assigned admin),
  `grant_role`, `has_tenant_access`, `user_is_admin`, `own_lead`, `can_see_lead`.
  Pages `AuthPage` (/auth, /get-started), `OnboardingMode` (/onboarding).
- **THE GAP:** **no `tenants` table** on V5 — yet `has_tenant_access(user,
  tenant_id)` is already called by the RLS floor. Multi-tenancy is half-wired:
  RLS expects tenants; the table + the signup→tenant stamp don't exist. This is
  the heart of A1.
- EXISTS + reusable: Settings → Brand (DB-backed), Company & compliance card,
  Installers roster, pricing dial, the 10-lead demo + tour, the widget keys.

## Build order (slices — smallest safe first)
1. **DB foundation** — `tenants` table (id, name, county, accent, trial_ends_at,
   stripe_customer/subscription, created_by) + `user_roles.tenant_id` (or a
   `tenant_members` join) + `handle_new_user` updated to create-or-join a tenant
   and stamp it + first-admin = the tenant creator (no manual SQL). Migration
   add-only; RLS proof that a second tenant can't see the first.
2. **`<OnboardingFlow>` shell** — the chip/input/oauth/reveal step engine, brand-
   themed, 375px. Pure UI, no auth risk.
3. **A1 signup steps (INSTALLER copy)** — who's entering · how did you find us
   (attribution → real marketing data) · company name + county · OAuth/email →
   creates the tenant, starts the trial, stamps first-admin.
4. **Trial** — Stripe 7-day, card captured; `trial_ends_at` gates.
5. **Re-point the other entry points** at `<OnboardingFlow>` with their own steps
   (widget = enquiry copy [exists, refit] · customer first-open · team invite).

## Decisions — LOCKED (Cal, 4 Aug)
1. ✅ **Tenant model:** `user_roles.tenant_id` — **one tenant per user, simplest.**
   (Not the join. National merge is a later problem; keep it simple for the cohort.)
2. ✅ **First-admin = whoever enters the card.** The person who puts their card
   details in on signup gets `admin` on the new tenant (they're the billing owner).
   Kills the manual bootstrap SQL. Team members added later get their role, not admin.
3. ✅ **Trial billing:** card captured at signup (Stripe 7-day trial).
4. ✅ **His TS functions:** build without; reconcile if they arrive.
5. 📌 **SEAT BILLING (Cal — note now, don't defer the design):** when the admin adds
   an installer or consultant on a **different email**, that's **another billable
   seat** on the Stripe subscription. Same email (the owner wearing multiple hats) =
   no extra seat. Wire the subscription as **per-seat** so this holds from day one;
   the enforcement/proration polish can follow, but the model is seat-based now.

## Still open
- **GATE 0:** the 3 leaked Supabase keys + Maps key must be rotated + history purged
  before ANY live signup. A1 can be BUILT + tested now; **going live is gated on GATE 0.**
- **OAuth:** Google + email at launch, or email-only for the cohort (Google needs an
  OAuth app configured)? — gates the signup UI slice, not the DB foundation.

## Done-means
A stranger hits the installer signup → answers installer-copy chips → a tenant is
created, they're its admin, a 7-day trial is running, and they land in the app
branded as their own company — verified as a real signed-in tenant, and a SECOND
signup proves tenant isolation (they can't see tenant one's data).
