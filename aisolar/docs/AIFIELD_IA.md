# AIField — information architecture (settle the logic, THEN make each screen sing)
### 28 Jul 2026 · Cal's structure, thought through. No build until approved.

## Two facts that kill the duplication
1. **An installer does ONE install a day** (established — installs are day-missions).
2. **Surveys don't matter to the installer** (Cal) — surveys are the consultant's.
   The installer app shows **installs only**. No survey ever appears here.

Those two facts mean Today isn't a *list* — it's *the one job* — and the app
stops re-showing "jobs" four different ways.

## THE ONE IDEA THAT REMOVES THE DUPLICATION: the client hub
Everywhere you meet a client — on Today, in the Week roster — you open the SAME
surface: the **client hub**. Not a job-card here, a client-row there, a profile
somewhere else. One panel: **profile · BOM (what to load) · route to site ·
message · START**. Start begins the install (JobViewV2) right there.
Build it once, reach it from everywhere. That is the anti-duplication move.

## The tabs (in order)

| # | Tab | Its ONE job | What's on it |
|---|-----|-------------|--------------|
| 1 | **Today** | *Today's single install — everything to do it* | The map-screen layout Cal likes: big map (the site + drive from home) + the **client hub** beside it (profile, BOM overview, "view the week's routing" link, **Start**). One install, in full. Start → the install begins (JobViewV2). |
| 2 | **Week** | *The plan ahead — see & move it* | Top: the agent-planned week/fortnight — **drag an install to another day**. Below: the **full client roster** — click any → the client hub (profile + BOM + routing + message + start). (This is Week **and** Jobs — they shared the same information.) |
| 3 | **Routing** | *The drive* | The map screen, kept as-is, **renamed Routing**. The week's installs as the route/drive on the map. Reached here, or from Week / Today's "view routing" link. |
| 4 | **Inbox** | *Talk to customers* | Threads — **demoted to last**. Primary access is the **message button on each client hub**, not this tab. |

**Not tabs — surfaces reached from the tabs:**
- **Client hub** — profile · BOM · route · message · Start. From Today + Week.
- **JobViewV2** (the install itself) — checklist → commissioning (serials +
  triple-check + coach) → handover. Reached by **Start** inside the client hub.

## What each merge/rename kills
- **Today + Map → Today** (map-screen design, scoped to today's one install).
- **Week + Jobs → Week** (same information — one schedule + roster screen).
- **Map → Routing** (renamed; purpose is now unambiguous: the drive).
- **Materials tab → folded** into the client hub (BOM = what to load for THIS
  client) + Today. No standalone Materials list re-deriving the same BOMs.
- **Surveys → gone** from the installer entirely (consultant's world).
- **Inbox → demoted** to a per-client message button + a last tab.

## The logic thread (why it holds together)
Agent plans the fortnight (from home base, restock woven in) → **Week** shows it
and lets you move a day → **Today** is today's one install, everything on one
screen → **Start** → **JobViewV2** (the moat) → **Routing** is the drive →
**Inbox** is the talk, one tap from any client. Each screen is one step in the
installer's real day. None repeats another.

## OPEN — need Cal's call before build
- **Depot stock / the wholesaler shelf** (the Leinster deal — his products
  promoted): where does it live now Materials is folded? Proposal: on **Routing**
  as the restock/pickup stop (it already carries the depot). Confirm.
- **Routing vs Week's map:** kept distinct on purpose — Week = manage/move,
  Routing = drive. If that still feels like two views of one thing, Routing can
  become a *toggle inside Week* instead of its own tab. Cal's call.

*Approve / redraw this, then each screen is built to sing against a settled
structure. Skills to load at build: ui-ux-pro-max (one-purpose-per-screen,
family tokens), stop-slop.*
