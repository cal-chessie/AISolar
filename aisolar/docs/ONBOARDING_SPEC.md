# ONBOARDING SPEC — the Flowith-pattern, across EVERY entry point (Cal, 2 Aug)
### Cal shared Flowith's onboarding as the bar: full-screen, chip-based, one question per screen, zero form-dread. "Authentication and onboarding typeform-style functions across all entry points. The widget needs to be insane — that's what's set up for each user."

> ⚠️ Cal also has **his own auth/onboarding TypeScript functions to share** — NOT yet received. When he drops them
> (paste to a file / RAW, never chat), reconcile THIS spec to THEM — his functions win. This doc holds the pattern
> so the design intent survives until then.

## The pattern (from the Flowith reference, adapted)
One question per full screen · big tappable CHIPS not dropdowns · progress implied not numbered · "no pressure,
switch anytime" reassurance line · OAuth-first signup (Google + email; referral code field) · brand-themed
(tenant accent + logo — white-label law applies) · every step skippable where honest · mobile-perfect.

## Where it runs (all entry points, one system)
1. **Installer/owner signup (A1)** — "Who's entering?" (Owner · Consultant · Installer chips) → "How did you find
   us?" (attribution chips — feeds real marketing data) → company basics (name · county · RECI later) → OAuth/email
   → first-admin bootstrap + tenant stamp. THE A1 flow, dressed properly.
2. **The WIDGET (the insane one — each tenant's own front door)** — the customer's first 60 seconds: bill upload OR
   chips (monthly spend → home/business → county → day/night) → instant estimate reveal (the wow moment: savings,
   grant, payback animating in, tenant-branded) → "see your full proposal" → name/email/phone LAST (value before
   ask) → magic-link lands in inbox. Chip-based, one-per-screen, embeddable at 375px.
3. **Customer portal first-open (`/customer/:token`)** — micro-onboarding: "Here's where your project lives" →
   tracker → what happens next. No signup — the token IS the auth.
4. **Team invite (consultant/installer joining a tenant)** — role pre-set by the invite; two screens max.

## Build notes
- One shared `<OnboardingFlow steps={...}>` component; steps as data (chips · input · oauth · reveal), per-entry-point
  configs. Attribution answers → `lead_touchpoints` / tenant record (real data, not decoration).
- Estimate reveal uses `computeQuote` LIVE with the tenant dial (the maths is already sound — show it off).
- Truth-pass: no invented social proof in the flow; referral code optional; consent line at signup (GDPR consent_records).
