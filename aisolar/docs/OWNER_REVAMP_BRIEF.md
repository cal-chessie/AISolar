# OWNER COCKPIT REVAMP — the brief (Cal, 3 Aug: "make the whole thing sing")
### Scope: OwnerCockpit.tsx (1123 lines, 13 tabs). Executes as the OPENER of the next build session — design work runs with the browser live at every step (screenshot-verify per change), full ui-ux-pro-max + design-token discipline (instrument.css: rounded-panel 16 / rounded-control 10 / h-control 40). This brief holds the grounded findings so zero re-derivation.

## The read (grounded scan, 3 Aug)
Tabs: Overview · Calendar · Estimates · Clients · Consultants · Installers · Financials · SEAI & Compliance · Agents ·
Analytics · Products · Settings · Help-us-improve (+ an internal LeadDetailView).

## Duplication to REMOVE (Cal: "any duplication remove")
1. **LeadDetailView inside the cockpit** (est/proposal/timeline mini-tabs) = a THIRD lead-detail surface beside
   LeadFlow (consultant) + ClientHub (installer). KILL it → Clients rows open **LeadFlow** (the real workspace, has
   the portal-link button, always current). One lead surface, one truth.
2. **The twin AgentWindows** (`owner/AgentWindow` vs `agents/AgentWindow`) — resolve to ONE (whichever the consultant
   side uses), retire the other to _TRASH.
3. **Estimates tab vs Consultants' estimates** — same data two renders; owner keeps the ROLL-UP (counts/value/aging),
   click-through goes to the consultant view rather than re-implementing the list.
4. **Overview stat tiles vs Analytics** — Overview shows the same KPIs Analytics charts. Overview = TODAY (decisions);
   Analytics = TRENDS (analysis). De-dupe the numbers that appear in both with one `ownerStats` source (exists).

## OVERVIEW — the revamp (the morning cockpit, "3 things need you")
Order of attention (top→down): ① **NEEDS YOU** first (not fourth) — the human gates: failed agent, unsigned NC6 blockers,
proposals >48h unopened, payment overdue. ② **MONEY strip** — banked · pipeline · signed-to-collect (keep, tighten).
③ **TODAY** — schedule + surveys due (keep). ④ **PIPELINE bar** (keep, it's good). ⑤ **LIVE ACTIVITY** collapsed to the
last 5 with "view all". Kill: any tile that duplicates Analytics trends. Add: the **morning digest** feel — the owner
reads top-to-bottom in 30 seconds and knows where to stand. Coach pinned per-POV (owner voice: margins, bottlenecks,
gates — the hidden multiplier).

## PER-TAB pass (easier use + viewing)
- **Clients**: search+filter chips (stage · type · county); rows show type badge (the 5 archetypes), value, next action;
  click → LeadFlow. - **Consultants/Installers**: workload bars + today's jobs; click → their day.
- **Financials**: deposits vs finals aging, unpaid chase list (pairs with payment-reminder agent).
- **SEAI & Compliance**: the pack-status board — per-lead nc6Completeness chips (the gate surfacing, slot ③ tie-in).
- **Agents**: live runs + the dead-letter list w/ retry (alerting tie-in). - **Products**: the catalog + (later) the
  pricing-dial second entry. - **Settings**: keep (just revamped). - **Feedback**: keep, tiny.
- ALL tabs: consistent header (title · one-line what-this-is · primary action right), empty states that teach,
  family RED accents on interactive elements (AISolar), mobile: sidebar → bottom tabs at <lg.

## Definition of SING
30-second morning read · zero duplicated surfaces · every number traceable to ownerStats/computeQuote · every tab
answers "what do I DO here" · tokens everywhere · screenshot set refreshed for the front-end revamp (slot ⑥ feeds off this).
