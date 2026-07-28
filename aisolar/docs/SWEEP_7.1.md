# SWEEP 7.1 — the notes log (Cal's `.note` destination)

> Convention (Cal, 28 Jul): when Cal says **".note"**, the item is appended
> HERE. 7.1 is the pass that walks the whole app after AIField, unifies the two
> worlds (consultant + installer), and hardens to institutional standard before
> Sweep 8. Newest at the top. Tick when landed. Truth-pass applies to Cal's
> ideas too.

## One centralised conversation — installer inbox = consultant inbox (29 Jul) ✅
Cal: *"I want the installer's inbox to be the same as the consultant's — and
carry the same centralised conversation."* Done, by SHARING, not cloning:
- **`buildConversation(lead)`** (`src/lib/conversation.ts`) is THE one thread per
  client. Customer portal + consultant + installer all read it. A reply is a
  **touchpoint on the lead**, tagged with the sender (`consultant` / `installer`),
  so the field team now has a first-class voice in the same record. An
  installer's internal ops touchpoints (e.g. "uploaded 8 photos") stay off the
  homeowner's view; an installer's OUTBOUND message reaches everyone.
- **`components/shared/MessageBubble.tsx`** — the ONE renderer (rich proposal /
  contract / install / warranty cards, agent/customer/company bubbles). Extracted
  from the consultant so both apps draw the thread identically; the label reads
  "Installer" or "Consultant" from the message's `sender`.
- **`components/shared/ConversationInbox.tsx`** — the ONE two-pane inbox (search +
  client list with last-message preview · thread · reply). Installer uses it with
  `audience="installer"` + Call / Open-job header actions; the consultant keeps
  its richer chrome (summarise, slide-outs) but shares the same bubble + thread.
- Truth-pass: NO "delivered / email sent" claim is made — the thread is the shared
  in-memory record today. **Sweep 8:** persist touchpoints + Supabase Realtime so
  a reply on one device shows on another (real cross-device centralisation), and
  wire Postmark for the actual send.

## AIField — the named IA (28 Jul) ✅ "name everything"
The settled structure, every part named. Two facts kill the old duplication: an
installer does **ONE install a day**, and **surveys are the consultant's** — so
Today is *the one job*, not a list, and nothing re-shows "jobs" four ways.

**The 4 tabs** (`InstallerPortalV5.tsx`, `TabId = 'today'|'schedule'|'routing'|'inbox'`):
| Tab | Its one job | Built as |
|-----|-------------|----------|
| **Today** | Today's ONE install, in full — the map layout Cal loves | `ClientHub` (30%) + 70% site `MapPanel` + "View the week's routing" |
| **Schedule** | The plan ahead — drag an install to another day | the week/fortnight calendar (`+ roster + unscheduled queue = TODO`) |
| **Routing** | The drive | day route ↔ week eagle view · wholesaler pickup folded in as stop 0 |
| **Inbox** | Talk to the customer | the shared **`ConversationInbox`** (above) |

**Surfaces (reached FROM tabs, not tabs):**
- **`ClientHub`** (`components/installer/ClientHub.tsx`) — the ONE client surface:
  profile · BOM (`computeBOM(lead)`) · message · **Start**. From Today (and, next,
  Schedule's roster). The anti-duplication keystone.
- **`JobViewV2`** — the install itself (checklist → commissioning serials +
  triple-check + coach → handover). Reached by **Start** in the hub. The moat.

**Dissolved / renamed (what the merge killed):**
- **Materials** tab → gone: BOM into `ClientHub`, van load-out into **Routing**,
  shelf/ordering into the **Owner** interface.
- **Jobs** tab → merged into **Schedule** (same information).
- **Map** → renamed **Routing** (purpose now unambiguous: the drive).
- **Surveys** → gone from the installer entirely (consultant's world).
- Full spec: [`docs/AIFIELD_IA.md`](AIFIELD_IA.md).

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
- Installer **Inbox → the consultant two-pane inbox + one centralised
  conversation** (Cal's ask). ✅ (shared `ConversationInbox` + `MessageBubble` +
  `buildConversation` — see top section, 29 Jul).
- STILL OPEN: **Schedule** roster + unscheduled queue (drag calendar is in;
  the full client roster below it → opens `ClientHub` is not).
- STILL OPEN: JobViewV2 chrome family pass (doc-colour semantics over the
  generic greens; the moat works, the skin lags).
