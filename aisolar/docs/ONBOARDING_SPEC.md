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

## THE 7-DAY TRIAL USER'S ACTIVATION (Cal, 3 Aug: "email, website, whatever else — to FULL use")
Day-0, in order, each step ≤5 min, the app walks them through it (checklist UI on first login):
1. **Sign up** — Flowith flow: email/Google → "who are you" → company name + county → **tenant auto-created, trial
   starts, card captured** (Stripe subscription, 7-day trial). *(A1 — to build, slot ④.)*
2. **Your brand (2 min)** — logo + accent + trading name → themes portal/proposal/emails/widget instantly.
   *(EXISTS — Settings → Brand, now DB-backed by the cutover.)*
3. **Company & compliance (3 min)** — RECI · CRO · VAT · address → unblocks every NC6/SEAI form. *(EXISTS — the
   Settings card names exactly what each field unblocks.)*
4. **EMAIL — zero DNS at trial:** outbound sends as **"Their Company <notify@[platform-domain]>" with reply-to their
   real address** — branded name, replies land in their normal inbox, nothing to configure. Custom domain/DKIM = a
   settings upgrade later, never a trial blocker. *(Slot ⑦ pattern.)*
5. **WEBSITE — the door (2 min):** Settings → "Your lead door" → **copy embed code** (iframe `/embed?k=THEIR-KEY`) →
   paste into their site or forward to whoever runs it. **No website? The same URL IS a shareable link** (works
   standalone — WhatsApp it, QR it on the van). *(The embed panel — to build, slot ④; keys + widget EXIST.)*
6. **Booking** — paste their Cal.com/Calendly link (Settings field) OR use the built-in survey booking (exists).
7. **Pricing dial** — confirm €/kWp + battery rate (defaults honest). *(EXISTS.)*
8. **Practice on the cast** — the 10-lead demo: walk one lead bill→proposal→pack. *(EXISTS + training walkthrough slot ⑧.)*
9. **Payments** — their Stripe keys in Settings → Integrations to take real deposits (or run manual-paid during trial).
10. **GO LIVE** — widget on their site → first real lead lands attributed → they're operating. Full use, day one.

## THE NATIONAL SITES WIRING (Cal, 3 Aug — SolarIrelandGroup + RenewableIreland repos)
Recon (3 Aug): both are **Next 16/React 19**; **NEITHER posts to ingest-lead today** (the door gap); RI has
`roi-calculator` (posts to its own `/api/roi-certificate` — keep the certificate, it's a great hook); SIG has
`book-survey`. Door keys live for both brands. **The build (next block, per site, design-matched):**
1. One tiny `lib/aisolarDoor.ts` per site: POST → `ingest-lead` with the brand's `x-source-key` (env var, not hardcoded).
2. **Calculator = the onboarding tool**: RI's roi-calculator + SIG (add one) capture → estimate reveal (value first)
   → "book your survey" (Cal.com embed — **NEED Cal's booking link**) → lead POSTs through the door with the calc
   numbers as bill data → certificate kept as the share/download moment.
3. Every other form (contact, book-survey, exit-intent) → the same door helper, tagged by `source`.
4. Deployment: both look Vercel-dashboard-connected (no config files) — env vars set in Vercel, keys never in git.
- One shared `<OnboardingFlow steps={...}>` component; steps as data (chips · input · oauth · reveal), per-entry-point
  configs. Attribution answers → `lead_touchpoints` / tenant record (real data, not decoration).
- Estimate reveal uses `computeQuote` LIVE with the tenant dial (the maths is already sound — show it off).
- Truth-pass: no invented social proof in the flow; referral code optional; consent line at signup (GDPR consent_records).

## AI KEYS (Cal, 3 Aug: "don't they need their AI keys as well??") — NO, and that's the product
Launch answer: **AI is INCLUDED — the platform's LLM key powers every tenant's agents** (bundled in the price; zero
setup friction; "your agents work the second you sign up" is a selling point, not a cost problem at 10 clients).
The OpenRouter card in Settings → Integrations ALREADY exists for **bring-your-own-key later** (cost control at
scale / enterprise preference). Post-cohort: per-tenant usage metering on the platform key.

## SITES BOOKING — the truth (verified 3 Aug)
- **In-app built-in EXISTS**: `SurveyBooking` — customer picks/counters half-day windows in their portal chat,
  both-sides-agree, T-1 reminder. This is the booking once a lead is IN the pipeline.
- **SIG book-survey TODAY**: opens a pre-filled **WhatsApp message to Cal** — works, but creates NO lead (invisible
  to the pipeline/agents). **RI: no booking surface at all.** The wiring makes the same forms ALSO create the lead
  through the door (WhatsApp kept as instant-notify if wanted) → then the in-app SurveyBooking takes over.
- **Cal.com**: Cal says the API key is already in the estate — NOT in aisolar/Renewably .env files (checked); locate
  in the wiring block (vault/Renewably estate) or Cal points to it. Key stays server-side env, never in git.
