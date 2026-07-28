# SWEEP 7.1 — the notes log (Cal's `.note` destination)

> Convention (Cal, 28 Jul): when Cal says **".note"**, the item is appended
> HERE. 7.1 is the pass that walks the whole app after AIField, unifies the two
> worlds (consultant + installer), and hardens to institutional standard before
> Sweep 8. Newest at the top. Tick when landed. Truth-pass applies to Cal's
> ideas too.

## .note — agents plan the schedule ahead (28 Jul) · LOGIC BUILT
Agents plan the best route/schedule ahead of time, for BOTH sides:
- **Consultant — a WEEK ahead:** batch the week's booked surveys geographically
  (≤3/day), cluster nearby ones onto the same day, order each day's loop.
- **Installer — a FORTNIGHT ahead:** sequence the month's installs (1/day) from
  the installer's HOME base so consecutive days sit next to each other — never
  crisscross the county.
- **Business owner FIRST, customer accommodated (start rigid):** the scheduler
  returns the OWNER-optimal plan (least driving). The customer layer is ON TOP,
  NOT in the rigid core — the messaging agent OFFERS owner-optimal days ("Tue or
  Thu?"), the customer picks, and only a customer who can take none bends it
  (re-run with that job's date locked; the rest optimise around it). The agent
  PROPOSES, never imposes; the owner APPROVES (draft-never-send). Extension
  point wired in `scheduling.ts` (PlannableJob.lockedDate, TODO in Sweep 8).
- Both = one engine, two configs. **Pure logic BUILT: `src/lib/scheduling.ts`
  `planSchedule(jobs, { home, perDayCapacity })`** (reuses routeOptimize:
  order from home → slice into working days by capacity; surfaces unplaceable
  jobs, never drops them). REMAINING (Sweep 8, agent runtime): the agent runs
  it on a schedule (weekly / fortnightly), proposes the plan as a DRAFT for a
  human to approve (draft-never-send holds), and needs each installer/
  consultant's HOME ADDRESS captured in settings. Live-launch swaps the
  gazetteer/haversine cost for the Google Distance Matrix (real drive time).

### .note — van capacity + the OWNER interface for scheduling (28 Jul)
Refines the scheduling note above.
- **Van holds ~2 days of gear → restock cadence.** The installer fortnight plan
  optimises the WHOLE route: home ↔ warehouse/wholesaler ↔ jobs ↔ home, with a
  restock stop every ~2 days (not daily). The agent finds the best path incl.
  the reload trips — vehicle routing WITH replenishment. Extension points wired
  in `scheduling.ts` comment (restockEveryDays + depot position; Sweep 8).
- **Put the logic in the OWNER interface:**
  - Owner Settings holds **every employee's HOME address** (installers +
    consultants) + the **warehouse / wholesaler addresses**. The agents do the
    rest — compute survey routes + install schedules automatically from these.
  - **Agent transparency (trust through explainability):** the owner can CLICK
    an agent and SEE HOW IT'S PROGRAMMED — the route it chose, WHY, and the
    SAVINGS it's producing (km / min / €). **View-first** — not necessarily
    editable; the point is the owner watches the agent think and sees its value.
    (This is the opposite of a black box — the exact trust move the whole kernel
    thesis rests on: verify, don't trust.)
  - Ties to: the home-address capture is the same Settings pass as the compliance
    company details; agent-transparency belongs beside the agent console.

## AIField family transform (from AIFIELD_BUILD_PLAN v1.1 — carried here)
- Installer app-shell now MATCHES the consultant (full-bleed header, same tab
  styling, content uses width, Today two-column, 70vh maps, MapPanel expand). ✅
- STILL OPEN: installer **Inbox → the consultant two-pane inbox** (Cal's ask).
- STILL OPEN: JobViewV2 chrome family pass (doc-colour semantics over the
  generic greens; the moat works, the skin lags).
