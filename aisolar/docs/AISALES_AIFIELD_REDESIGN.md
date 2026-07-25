# AISales + AIField — the redesign

_Cal, 2026-07-25: "We built the homeowner's roof tool. Now build the real deal
for the consultant and the installer. Rethink the logic. Cut redundant steps.
Make both the stickiness — I feel like I can't do my job without it."_

This supersedes the build list in `AISALES_AIFIELD_BUILD_MAP.md`. That doc was
"what's missing." This one is "what the tool should be."

---

## Device profiles decide the layout (Cal, 2026-07-25)

- **AISales — mobile-first, tablet-second.** The consultant is on a phone on a
  call or in a kitchen. Actions are thumb-reachable and bottom-anchored; the
  "next move" is a big primary button, not a menu item. Quote editing gets the
  extra room on tablet. Nothing important lives in a hover or a right-rail.
- **AIField — mobile-first, full stop.** Outdoors, gloves, sun glare, bad signal.
  Big tap targets, high contrast, camera-native serial capture, signature on the
  phone, offline queue. Checklist stages are full-screen, one thing at a time —
  never a dense multi-tab dashboard.
- **Owner — tablet + laptop/desktop.** Dense forms are fine here: Settings, the
  product catalog, margins, the compliance card. This is the back office, not the
  field.

Design rule that follows: **AISales and AIField are built at 375px first and
scale up.** If a step doesn't work one-handed on a phone, it's the wrong step.

---

## The one principle that changes everything

**The two humans doing their normal jobs IS the data capture.** Nobody does
"compliance admin" as a separate step. The consultant's survey fills the fields
NC6/NC7 need from a survey (first-microgen, phase). The installer's checklist
photos + serials fill §5 and the page-3 protection table. The statutory pack
assembles itself as a byproduct of the sale and the install.

If that holds, the tool stops feeling like a form you feed and starts feeling
like the thing that does your job with you. That is the stickiness.

---

## AISales — the closer's cockpit

### What's wrong with the current shape
It's organised like a **CRM** — tabs for Inbox, Pipeline, Calendar, Documents,
Intelligence. That's tool-organised, not job-organised. A closer doesn't think
in tabs. They think one thought all day: **"who do I touch next, and what do I
say?"** Three tabs (Inbox / Pipeline / Calendar) are three views of the same
leads. And the Intelligence readout stops at "here's the situation" instead of
"here's the move."

### Cut
- **Collapse Inbox + Pipeline + Calendar into ONE prioritised worklist ("Today").**
  Kanban stays as a *secondary* view for when you want the board; it is not the
  daily driver.
- **Kill "Engagement Intelligence" as a standalone panel.** Fold the signal into
  the lead row as the *reason for its rank* ("opened proposal 3× today").
- **13 hard-coded intelligence strings → gone.** Either it's derived from the
  lead's real state or it isn't shown.

### The four things that make it can't-work-without-it
1. **The morning list writes itself.** Open AISales → a ranked list of exactly
   who to call, why (real signal), and a drafted opening line built from the
   customer's OWN numbers — the estimate they built in the roof tool (system
   size, saving, payback, grant). The consultant never re-asks what the customer
   already told the tool. *This is the single highest-value change.*
2. **The next move is a button, not a note.** Book survey / send proposal / chase
   deposit — draft-first, one tap. The bottleneck logic already exists; make it
   act.
3. **Quote editing in-app, with live margin.** Adjust panel count, add a battery,
   swap the product → see margin move → push to proposal. A closer shapes the
   deal live on the call. Today the agent drafts and the human can only review.
4. **The survey the consultant runs fills the compliance fields.** First-microgen
   Y/N and supply phase are captured here, once, and they flow straight to NC6/NC7.
   The consultant never sees a "compliance form."

### Redundancy verdict
Five tabs → **one worklist + one board + one lead panel.** Everything else was a
different lens on the same leads.

---

## AIField — the crew app

### What's wrong with the current shape
"It does nothing beyond the grandfathered survey." Right. It has job tabs, a map,
materials, and a **survey form** — but a survey is the surveyor's job, done before
the crew arrives. Handing an installer a survey form is the wrong primitive. And a
crew's day is **linear and physical**, not a dashboard.

### Cut
- **Drop the survey form from the crew app.** Wrong tool for this human.
- **Fold Map + Materials into "Today."** They're not destinations; they're two
  facts about the current stop (where, and what's on the van).

### Rebuild around the job in progress, in order
1. **Today, in order.** Stops in time order, drive time, van load. The front
   screen — not a tab.
2. **Tap Start → customer told automatically.** "We're on our way," with prep
   steps. Marketed on the landing page; must actually fire.
3. **Staged install checklist.** Pre-install → roof → electrical → commissioning
   → handover. Each stage gates the next. Each requires its photos. **The photos
   ARE the evidence pack** — ESB, RECI, warranty — not decoration.
4. **Serials off the van (the compliance moat).** At commissioning, capture the
   inverter/panel serials — camera assist reads the plate, the crew confirms every
   digit. This one capture feeds NC6 §5, the page-3 protection table (via the
   product's type-test profile), AND the warranty pack. Capture once, kill a whole
   category of admin.
5. **The triple check runs here.** Machine reads the serial/model off the plate →
   machine cross-checks it against what the proposal specified → human confirms at
   the gate with notes. Catches a substituted inverter that would make the NC6
   describe kit that isn't on the roof — and a kW change can flip NC6 → NC7,
   meaning the job legally needed pre-approval it never got. Nothing clears
   silently.
6. **Sign-off in the field.** RECI/electrical sign-off + customer signature at
   handover, on the phone, offline-tolerant. The signature placement NC6/DoW are
   waiting on lands here.
7. **Exceptions build trust.** "Can't finish today" + reason → reschedules the job
   and tells the customer why, in plain words.

### Sequencing
Screens 1–3 make it usable. 4–5 make it the compliance moat. 6–7 make it
trustworthy. In that order.

---

## Order of build (next sessions)

1. **AISales onto real data + the carried estimate at the top of the lead.**
   (Highest value; unblocks the morning list.) Gated on the `ingest-lead` auth
   decision and demo-mode flag.
2. **AIField screens 1–3** (Today → Start-notifies → staged checklist).
3. **Product catalog fields** (manufacturer-split, rated current, type-test,
   protection profile) — unblocks NC6 §5 + page 3, and is what the serial
   cross-check compares against.
4. **AIField serial capture + triple check** (screen 4–5). The moat.
5. **Signature placement** (screen 6) → closes NC6/DoW.
6. **Quote editing + one-click next move** in AISales (polish that makes it sticky).

GATE 0 (leaked keys) still blocks anything going live regardless of the above.
