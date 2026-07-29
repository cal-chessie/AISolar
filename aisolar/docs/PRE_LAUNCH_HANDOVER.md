# PRE-LAUNCH FULL HANDOVER — the Owner's demand

> Paste this to the build team (you) to force ONE complete, honest, no-stone-unturned
> accounting of AISolar before I launch. Written in my voice, as the owner. This is the
> only handover I get — leave nothing hidden.

---

You are handing my company over to me. I'm about to put my name, my money, and years of
my life on the line and turn this on for real installers. I don't want a demo. I don't
want to be protected from bad news. I want the **truth about my own baby** — everything
you know, everything you're not sure of, and everything you'd be embarrassed for a
hostile investor, a regulator, or an acquirer to find *after* I've launched.

**Rules for your answer — I will hold you to every one:**
- For EVERY item, label it: **REAL** (works + tool-verified) · **FAKED** (toast / local
  state / demo / dummy) · **WRITTEN-NOT-DEPLOYED** · **NOT BUILT**. No "should work."
- Bring **evidence** — a screenshot, a query, a file:line, a tsc result. If you can't
  verify it here, say so and tell me exactly how to.
- Truth-pass: no claim the product can't back today. If it's a placeholder, call it one.
- Where you don't know, say **"I don't know"** and what it would take to find out.
- Assume I forget nothing and will re-read this in six months when something breaks.
- End with decisions you need FROM ME. Don't guess my product strategy — surface it.

Now walk me through ALL of it. Go as deep as the code goes. Touch every surface.

## 1. The one-page truth
In one honest paragraph: what actually works end-to-end today, what's the REAL % of the
pipeline that's autonomous vs faked, what single thing blocks launch, and what's the one
risk that would hurt me most. No hedging, no hype.

## 2. The pipeline, stage by stage
For each stage — **bill extract → lead intake → survey → proposal → grant → install →
compliance → customer portal** — tell me: is it real/faked/written; does the data
actually flow from one stage to the next; what's the decision quality; what breaks it;
and show me the proof. Where does a record silently fall back to a ballpark?

## 3. The 10 agents (the automation is the whole pitch)
For every agent (lead intake, survey scheduler, proposal drafter, follow-up, grant,
install coordinator, post-install, digest, stale-lead, payment reminder): what does it
REALLY do, does it **decide or just stamp**, what are its guardrails, what does a run
cost, how does it fail, and is it **deployed or only written**? Then the "thin middle"
in full — exactly which agents stamp instead of decide, and everything left to make them
genuinely autonomous (scheduler-v2, product-pick, real calendar availability, the
customer slot-offer, geographic clustering, smarter scoring, the self-learning loop).

## 4. Access & POV — who can reach what
Is every role gated — **owner sees their tenant, sales their pipeline, installer their
jobs, customer only their own project**? Is **demo mode bypassing that gate right now**
in everything you've shown me? Is **RLS proven per-POV at the database** — can a
consultant *query* another consultant's or another tenant's data? Give me the demo-off +
RLS-proof plan, and tell me straight: if I flipped this to production this second, who
could see what they shouldn't?

## 5. Security & the AI leak surface
Can the **customer AI or the role coaches leak outside the app, or across tenants/roles**,
including to a user trying to trick them? Is the context **least-privilege and assembled
server-side** (so a jailbreak reveals nothing that was never in it)? Are bills/messages
treated as **data, not instructions**? Show me the **red-team results**. Any secrets in
the repo, the client, or a prompt? Is **GATE 0** done — leaked keys rotated, Maps key
rotated, git history purged?

## 6. Data
Is the **dummy data removed / gated off** — or is `generateDummyLeads` still the source in
prod paths (how many surfaces)? Does every screen read REAL data when demo is off? GDPR:
consent record, `anonymise_lead` on erasure, no PII left behind? Kernel: refs-only, no
PII in payloads, service_role only?

## 7. The compliance moat — NC6 / NC7 / NC8
This is why installers can't leave. Field by field: **what completes itself, from which
source** (site/customer, system design, fitted equipment, installer/RECI, protection,
signature)? What's the **last 30%** now that AIField is closed, and why aren't we
finishing it? Are the **SEAI grant rates and NDMG figures verified against the SEAI
source** (not guessed)? Is the **RECI number actually persisted** or a placeholder? Is
the **eIDAS drawn signature** legally sufficient and never machine-signed? What happens on
a **fitted-vs-proposal mismatch** and the **NC6→NC7 form flip**? Does NC8 route correctly?

## 8. The funnel — both ends
**A1:** can I onboard a paying installer today — signup → tenant → first-admin bootstrap →
role? **A2:** does a homeowner uploading a bill on the tenant's own solar site (widget /
embed / `ingest-lead`) actually **birth a lead** the agents pick up — or does the booking
go nowhere? Confirm the **two identity forks** (app user = business-owner/sales-guy;
lead = domestic/commercial on the tenant site) and where each is captured.

## 9. Money
**SaaS billing:** is the **7-day free trial + card** (Stripe Billing subscription, trial →
card → recurring) built — because I can't charge installers without it. **Customer
deposits:** does `create-checkout` + the webhook actually take money and update state?
**Financing:** is the finance line ("€89/mo vs €127/mo saving") and a lender path built —
my biggest conversion lever? **Entitlements:** are features gated by plan/tier? **Pricing
accuracy:** VAT (0% domestic / reclaimable commercial), the ACA tax write-off, the grant
schemes — all correct?

## 10. Deployment & infrastructure
What is **actually deployed** vs written-on-the-branch? Give me the deploy commands + the
post-deploy verify for each edge function. Rollback path? Feature flags? **GATE 0 / GATE
B** status. The **migrations queue** (M1–M14) — order, idempotent, add-only, RLS-on-day-
one? Staging vs prod, env vars, secrets, the Supabase project + Vercel state. If a change
breaks every user, how fast can I undo it?

## 11. Observability & reliability
Is **Sentry** wired (frontend + edge)? A **/health** + uptime check? Do routes mount under
an **error boundary** or fail silently? Is the **self-heal / report / improve** layer real
or spec? When an agent fails, a tenant's queue jams, or the LLM cost cap trips — do I find
out, and how?

## 12. The kernel / OA
Inscription status (v1 draft?), the **F1 mutable-outside-chain** hole, **GATE B**, the
emit points, and what it takes to light the live kernel. Be honest: is it a launch
**dependency** (it isn't) or a **trust upgrade** for after? What can I claim about it
today without lying?

## 13. UI/UX & design
Which sweeps are done; what's **polished vs still rough**; mobile / dark mode / a11y
coverage; family-design consistency (any generic chrome left); the **stale marketing
snapshots**; empty/loading/error states; and the **8 baseline tsc errors** — what are
they and are they cosmetic or real?

## 14. Marketing & GTM
Is the public copy **accurate to what the product now is** and clean of DO-NOT-CLAIM
(no SMS/WhatsApp/roof-detection, no invented stats/reviews)? New snapshots? The pitch/
deck, the **Domain-001 case study**, the positioning, and the **founder teaching
walkthrough** — can I fluently demo and sell every surface to a prospect or investor?

## 15. Legal & regulatory
SEAI accuracy, RECI, ESB/NC forms, GDPR, eIDAS, insurance/liability, the
attestation-by-named-human model, and the full **DO-NOT-CLAIM** list. Anything here that
could get me fined, sued, or struck off a register?

## 16. The plan & the gates
The sweep structure (7.1 / 8 / 9), the team org and who owns what pre/post-migration, the
gates (0, B), and the **launch-critical shortlist** — the ordered path from where I am
today to my first paying installer.

## 17. Strategy decisions only I can make
Lay out the calls you're waiting on me for, with your recommendation + the trade-off:
- **Single simple product (start→grant)** vs the full moat — what to strip, what to keep.
- **Host tenant-branded capture pages** vs widget/API only.
- **Financing partner**, **pricing + trial length**, and **what to cut** to launch sooner.

## 18. Risks & what keeps you up
The million-and-one problems: what breaks at 10 tenants, at 100. Concentration, supplier,
regulatory, key-person, and cost risks. If you had **one week** before launch, what would
you fix first, and what would you consciously leave broken?

## 19. The unknown unknowns
What is **NOT captured in any doc**? What am I **not asking that I should be**? What would
a hostile due-diligence, a regulator, or an acquirer find that I'd be embarrassed by?
Surface it now — this is the only handover.

## 20. Close it out — give it to me straight
1. **Go / no-go** for launch, and why.
2. The **ONE thing** to fix first.
3. The **ordered path** (≤10 steps) from today to the first paying installer.
4. **What you need from ME** (decisions) to unblock you.
5. Anything else you'd want to know **if this were your money, not mine.**

---
*This is my baby and my one handover. Tell me everything. Then tell me what you didn't.*
