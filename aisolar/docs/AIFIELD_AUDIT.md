# AIField audit — 27 Jul 2026 (late)

> Cal: "audit it and tell me what you find." Grounded in the code + browser,
> not the stale docs. Three files: InstallerPortalV5 (the shell), JobViewV2
> (the `/job` page), InstallRunner (the modal I built today).

## THE HEADLINE — two install flows exist, and neither is complete
There are **two separate implementations of the exact same install-completion
flow** (Pre-install → Roof → Electrical → Commissioning → Handover), reached by
different buttons in the same app:

| | **JobViewV2** (`/job/:id`, pre-existing) | **InstallRunner** (modal, built today) |
|---|---|---|
| Reached by | "Open job" buttons ×6 | clicking an install card ×4 |
| Shape | full tabbed page + Overview tab | full-screen gated modal |
| Photos + checks per stage | ✅ + notes per item | ✅ |
| Offline (localStorage) | ✅ | ✅ |
| Family colours per stage | ✅ | partial |
| **Serial capture** | ❌ just a checkbox + photo slot | ✅ real model+serial entry |
| **The triple check** (fitted vs proposal → NC6/NC7) | ❌ **absent** | ✅ the moat |
| **Stage gating** (lock until prev done) | ❌ free-nav | ✅ |
| **Field signature canvas** | photo slot only | ✅ draw-to-sign |

**So: JobViewV2 has the breadth (Overview, notes, tabs, polish); InstallRunner
has the compliance moat (serials, triple-check, gating, signature). Today I
built a parallel flow not knowing JobViewV2 already existed.** This is the
multi-AI drift to kill.

**"Make it sing" = ONE flow.** Fold InstallRunner's moat (serial + triple-check
+ signature + gating) into JobViewV2's structure, one entry point, delete/redirect
the other. Decision needed: page or modal. (JobViewV2 is a page; the crew on a
roof arguably wants the focused modal — Cal's call.)

## Smaller findings
- **Backend is faked (expected, Sweep 8):** start-job "customer messaged",
  reschedule "notified", inbox "sent to customer" are all toast-only. Inventoried
  in SWEEP8_DB_WIRING.md — not broken, just not wired.
- **Cookie-consent banner shows INSIDE the auth-gated installer app** (saw it on
  `/job`). A marketing consent popup on an internal tool reads wrong. Scope it to
  public pages.
- Depot Stock, Map (Google route), Today, Materials BOM, Week drag-reschedule —
  all verified working earlier today.

## What's genuinely good (don't touch)
- The staged evidence-pack concept, the triple-check compliance logic, the depot
  = wholesaler-shelf framing, offline-first localStorage, family colours.

## Recommendation
1. Resolve the duplication FIRST (pick one flow, merge the best of both).
2. Then scope the cookie banner out of the app.
3. Backend wiring is Sweep 8, not now.
