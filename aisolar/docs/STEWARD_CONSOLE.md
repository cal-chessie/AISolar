# Steward Console & Platform Ops — the map (Cal's ask, 29 Jul)

> Cal, end of 29 Jul: "I need what the Owner's overview is, but for MY ownership of
> the app and all its users — live analysis, analytics, heatmaps, Sentry, a way to
> watch everyone, isolate versions for fixes, and not break every user at once."
> This is that, mapped. The relief up front: **most of it you BUY, not build**, and
> the fear (a change breaks everyone) is a *solved* problem with standard tools.

## 1. The confusion, named: there are TWO "owners"
You've been calling both "owner" and they're different surfaces:

| Surface | Who | Scope | State |
|---|---|---|---|
| **Owner Cockpit** (`OwnerCockpit.tsx`) | the BUSINESS owner of ONE tenant (an installer company) | their pipeline, team, revenue | EXISTS |
| **Steward Console** (new) | **YOU** — platform owner | ALL tenants: fleet health, every agent run, every user, deploys, versions, incidents | TO BUILD (thin) |

You were right: you need a second surface. It's not a bigger Owner Cockpit — it's a
*God-view over the whole estate*. But it's thin, because it's a **view over data you
already collect** (agent_runs, the audit trail, touchpoints), plus embeds of bought tools.

## 2. BUY vs BUILD — the part that de-overwhelms you
You do not build an observability platform. You integrate three, and build one thin view.

**BUY / integrate (NOT your moat — hours-to-days each):**
- **Sentry** — error + performance monitoring (frontend *and* Supabase edge functions).
  When code throws, Sentry catches it, groups it, tells you *which user / tenant / route*,
  and alerts you. **This is the literal answer to "every user goes wtf" — you see the
  error as it happens, often before they email.** ~an afternoon to wire.
- **PostHog** — the single best buy for a solo founder: **product analytics + funnels +
  session replay + HEATMAPS + FEATURE FLAGS + A/B tests in ONE tool.** Generous free tier,
  cloud or self-host. It covers your "live analytics", your "heatmaps", AND your "isolate
  future versions" (flags) in one signup. ~a day to get value.
- **Uptime monitor** — a `/health` endpoint + a cron, or Betterstack/Pingdom. "Is it up?"
- **Postmark** — transactional email. You already have it partly wired.

**BUILD (thin — specific to your kernel, nobody sells it):**
- The **Steward Console** view over your own agent/tenant data + embeds/links to the above.

## 3. The Steward Console — its sections (the points mapped)
A view over data you already emit. Sections, roughly in build order:
1. **Fleet health (the live feed)** — last hour: agent runs (ok/fail), emails sent, queue
   depth, error rate, LLM spend today vs cap, active tenants. One "is the machine healthy?"
   board. Data = the audit trail + `agent_runs` you already write.
2. **Agent ops** — per-agent run log, failures + retries, the **self-learning report**
   (corrections → what agents got wrong → proposed prompt revisions as DRAFTS to approve).
   Already designed in `SWEEP8_DB_WIRING.md` (self-heal spec) — this is where it *surfaces*.
3. **Per-tenant drill-down** — pick a tenant → their health, their agents, their spend,
   their errors. This is how you answer "what's going on with installer X?".
4. **Users & access** — who's in, roles, invites, last-seen.
5. **Deploys & versions** — current version, feature-flag states, rollout %, one-click
   rollback link (Vercel). This is your "isolate future versions to segment for fixes".
6. **Incidents & alerts** — open Sentry issues, escalations the self-heal layer raised.
7. **Analytics & heatmaps** — embed or deep-link PostHog; don't rebuild it.

## 4. The safe-deploy stack — the answer to "every user be like wtf did you do"
This fear is CORRECT, and it is entirely solved by standard practice. Five layers:
1. **Preview deploys** — Vercel already gives every branch its own URL. Test before prod. ✅ have it.
2. **Feature flags** (PostHog) — ship the code **dark**, turn it on for **1 beta tenant**,
   then 10%, then all. If it misbehaves, **flip it off — no redeploy, seconds**. THIS is the
   safety valve. "Every user goes wtf" becomes "I toggled it off before lunch."
3. **Canary / beta tenant** — one friendly tenant gets new things first.
4. **Instant rollback** — Vercel rolls back to the previous deploy in one click.
5. **Add-only, idempotent migrations** — your existing house rule; never a destructive
   migration on live data. ✅ have it.
With 1–5 in place, a bad change is a 5-second toggle or a 1-click rollback, not a crisis.

## 5. Emails & automations — you're not running "campaigns"
Reframe the thing you've never done: you are NOT running marketing broadcasts. You are
running **transactional + lifecycle automations** — each email has a *trigger* (an event),
a *recipient*, and a *purpose*. Simpler to reason about than a campaign.
- **The full email inventory already exists** — `SWEEP8_DB_WIRING.md` → "EMAILS" table maps
  every send point with its state (real / fake / new). The map is drawn; Sweep 8 wires the fakes.
- **Transactional** (Postmark, event-triggered: booking confirm, proposal, "system live",
  reminders) = the game now.
- **Marketing / broadcast** (newsletters, nurture blasts) = LATER, a *different* stream, and
  it needs unsubscribe + GDPR consent. Don't mix them; don't need it for launch.

## 6. Self-learning back end — already designed, not a mystery
`SWEEP8_DB_WIRING.md` → "SELF-HEAL · REPORT · LOG · IMPROVE" spec. Principle: **self-healing
ACTS, self-reporting LOGS, self-improvement PROPOSES — humans approve** (draft-first, same as
outbound email). Corrections → `agent_corrections` → weekly Steward report → proposed prompt
revisions as DRAFTS → you approve → version bump. The Steward Console (§3.2) is its face.

## 7. "Am I overthinking it?" — the honest calibration
- **Overthinking, YES (relief):** you don't *build* most of this. Sentry, PostHog, uptime,
  flags — signups + SDKs, not projects. At 10 first clients you need the **20%**, not the
  fleet-ops cathedral.
- **Overthinking, NO (validated):** you're right that before hundreds of users you need
  these, and you're right that a change *could* break everyone — that instinct is good, and
  it's exactly what the §4 stack exists to kill. Correct fear, standard solution.

## 8. The staged plan (a sequence, not a blob)
- **Pre-launch (before the first 10 clients) — the safety net, days not months:**
  Sentry (errors) · PostHog (analytics + heatmaps + flags) · confirm Vercel rollback ·
  a **minimal Steward health view** (§3.1 over existing agent_runs) · feature-flag anything
  risky. This is enough to not fly blind and not break everyone.
- **Growth:** enrich the Console (per-tenant drill-down, self-learning report surfaced),
  alerts → Slack/email, canary/cohort rollouts.
- **Scale (hundreds):** SLOs + error budgets, an on-call rota, deeper fleet analytics,
  the kernel-chain-recorded improvement history (post-Gate B).

## What we do in the morning (agreed with Cal)
1. **Installer app — the job survey click-through + the family UI/UX makeover on Overview
   + sizing** (still old + tablet-sized). See the `.note` in `SWEEP_7.1.md`.
2. Optionally, stand up the **pre-launch safety net** (§8): Sentry + PostHog + a first
   Steward health view — so you're never blind once the cohort lands.
