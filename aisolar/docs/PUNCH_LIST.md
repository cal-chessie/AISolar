# PUNCH LIST — "nothing seems to work properly" walk (Cal + Claude, 3 Aug)
### Cal's named issues + the hunt for more. Each item: ROOT CAUSE (code-diagnosed, not vibes) → the fix → its slot.
### ✅ = fixed on the spot · 🔨 = build slot assigned · ⚠️ = needs Cal's eyes/decision

## Cal's four
1. ✅ **No add-client from Owner Cockpit** — TRUE (Consultants/Installers had Add dialogs; Clients didn't).
   **FIXED 3 Aug:** "Add client" button in Clients → opens the SAME new-lead flow the consultant uses (`/lead-flow`,
   one create path, no duplicate form).
2. 🔨 **Design Studio "panels oversized"** — ROOT CAUSE FOUND: **two panel-scale systems exist.**
   `roofGeo.mppAt()` (DesignStudio) draws TRUE Web-Mercator scale; but `RoofDesigner.tsx` (the calculator/widget path)
   **deliberately oversizes** — its own comment: *"a real 1m×1.7m panel is only ~8×13px at this zoom — sized so a
   domestic roof [reads well]."* At some widths/zooms that fake scale bleeds absurd. ALSO: the default array drop
   sits on the **driveway, not the roof** (seen live on Sarah's lead — String 1 parked on the drive).
   **FIX (slot ⑤ Design-Studio once-over):** ONE scale source = `mppAt` true-scale everywhere; default placement
   snaps to the Google-Solar roof segment centroid; min-zoom guard so panels never render bigger than the roof.
3. 🔨 **Installer routing "seems off"** — the ALGORITHM is sound (nearest-neighbour + 2-opt on haversine ×1.3 road
   detour — code-verified). What's actually off: **the demo cast's geography.** 10 leads spread Dublin–Galway–
   Roscommon–Athlone, so any "day route" spans half of Ireland and reads as nonsense. Plus `DayRoute` is desktop-only
   (`lg:` classes, no mobile tier — the known AIField mobile gap).
   **FIX:** (a) cast tweak — cluster each installer's jobs geographically (one Dublin day, one West day) so the demo
   route reads TRUE (slot ⑧ demo polish); (b) DayRoute mobile tier rides slot ⑤ AIField mobile pass.
4. 🔨 **Settings "defo needs revamp"** — agreed, and it's a TRUTH-PASS issue, not just design: **14 hardcoded
   'connected' chips** (Stripe/Postmark/Maps show "connected" regardless of reality) + a **mock audit log** (fabricated
   events with fake actors). In-app fiction — the exact thing we never ship.
   **FIX (slot ⑥, pulled forward):** integration chips read REAL config presence (key set in tenant_settings/secrets =
   connected; else "not configured"); audit log reads `activity_logs` (real table, RLS'd) with an honest empty state;
   the Pricing & Terms tab (revamped 2 Aug) is the design bar for the rest.

## Design Studio — VERDICT after the desktop walk (3 Aug, screenshots both widths)
The LeadFlow Design step is **SOUND at 711px AND 1440px** — true-scale panels (mppAt %-space), gear rail, real
computeQuote money incl. the honest self-use-only payback line. The OVERSIZE lives on the **keyless calculator/widget
path (`RoofDesigner`)**: fixed-pixel panels (9×14px) drawn over a Google *embed* that **picks its own zoom** (the
`z=20` param isn't honoured reliably) — when the embed zooms out, fixed-px panels read as garden-sized slabs.
**FIX (slot ⑤, sharpened):** replace the keyless embed layer with SatTiles + mppAt true scale (the studio's own
system — ONE scale everywhere), and snap the studio's default array to the solar-read roof centroid (it drops on the
driveway today). ⚠️ Cal: if you saw the oversize on the Design step itself, send one screenshot of your window — I could
not reproduce it there at either width.

## Found on the same walk (the "more" Cal asked for)
5. 🔨 **Estimate step still recommends domestic-shaped systems for every lead** — Sarah (7.2kWp designed) shows
   "12 kWp recommended" from the bill-only stub. The known Sweep-10 §D fork item — surfaces confusingly beside a real
   design. Fix rides §D (branch the intake estimate on property_type + cap by designed system when one exists).
6. ⚠️ **4 draft-gated toasts** ("deposit link queued — goes out with your approval") are HONEST human-gates but
   nothing ever fires after approval pre-launch — each needs its real send wired at the notification spine (slot ⑦)
   or the copy softened until then. One blank onClick in ProposalView:424 to chase.
7. 🔨 **Demo geography vs installers** (feeds #3): Cian Murphy's "day" = Roscommon + Athlone + Galway. Cluster per
   installer in the cast.
8. 🔨 **Flow resets to Estimate on reload** — /lead-flow/lead-004 for a PROPOSAL-DRAFTED lead lands on the Estimate
   step every time (step state is component-local). Deep links + reloads should DEFAULT to the lead's current stage.
   Small fix, big daily annoyance — slot ⑤.
9. ⚠️ **Confirmation emails point at localhost** until the prod domain lands — Supabase Auth Site URL must be set at
   Vercel-domain time (already on Cal's-hands list; restated here so it's never missed — it bit the global-login setup).

## New finds (3 Aug, later walk — Opus)
10. 🔴 **Add-lead captures NO eircode + no MPRN** (`LeadFormDialog`) — eircode drives the roof read + NC6 §2; add both
   (eircode w/ format hint). Blocker: real leads lose the field the whole compliance chain needs.
11. 🟠 **Design Studio: can't remove ALL panels** — "Redraw" forces back into draw mode; add a clean clear-to-zero.
12. 🟠 **Agent pages/headers don't conform between views** — `AgentFoundation` mixes CardTitle/h2/h3, consultant uses a
   different AgentWindow; no shared header → sizing + family drift. Fix = ONE shared page-header component (slot ⑥).
13. ℹ️ **"Still Google?" answered** — base map = Esri (keyless, ours); Google Solar = optional Level-2 auto-detect only.

## Order of attack
Quick wins done now (#1). Slot ⑤ opens with Design Studio scale + placement + AIField mobile (#2, #3b).
Settings truth-wiring joins slot ⑥ front-end revamp (#4). Cast geography with slot ⑧ (#3a, #7). Spine wires the
gated sends (#6). §D fork covers #5. **Nothing on this list is unowned.**
