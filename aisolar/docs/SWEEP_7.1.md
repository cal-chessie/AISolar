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
- Both = one engine, two configs. **Pure logic BUILT: `src/lib/scheduling.ts`
  `planSchedule(jobs, { home, perDayCapacity })`** (reuses routeOptimize:
  order from home → slice into working days by capacity; surfaces unplaceable
  jobs, never drops them). REMAINING (Sweep 8, agent runtime): the agent runs
  it on a schedule (weekly / fortnightly), proposes the plan as a DRAFT for a
  human to approve (draft-never-send holds), and needs each installer/
  consultant's HOME ADDRESS captured in settings. Live-launch swaps the
  gazetteer/haversine cost for the Google Distance Matrix (real drive time).

## AIField family transform (from AIFIELD_BUILD_PLAN v1.1 — carried here)
- Installer app-shell now MATCHES the consultant (full-bleed header, same tab
  styling, content uses width, Today two-column, 70vh maps, MapPanel expand). ✅
- STILL OPEN: installer **Inbox → the consultant two-pane inbox** (Cal's ask).
- STILL OPEN: JobViewV2 chrome family pass (doc-colour semantics over the
  generic greens; the moat works, the skin lags).
