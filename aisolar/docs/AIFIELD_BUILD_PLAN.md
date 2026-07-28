# AIField — the build plan (28 Jul 2026, agreed with Cal, START HERE next session)

> Cal + AI aligned this the night of 27 Jul. Cal has more ideas to add in the
> morning with a clear head. Build as a senior-dev team: institutional-grade,
> bulletproof, crystal-clean, zero leftover junk. Nothing pushed without Cal's yes.

## The decision already made
- **Keep `JobViewV2`** (the `/job` tabbed page) as the ONE install flow. It's the
  fuller, better-considered flow (Overview + 5 stages + notes + family colours).
- **Retire `InstallRunner.tsx`** (the modal I built 27 Jul — a parallel reinvention).
  Point install-card clicks to `/job/:id`, then delete InstallRunner so it can't drift.
- **Port the moat FROM InstallRunner INTO JobViewV2:** real serial + fitted-model
  entry at Commissioning, and the TRIPLE CHECK (fitted inverter vs proposal →
  NC6→NC7 warning + flag-the-office on mismatch).
- **Do NOT bring gating** (lock-until-previous). JobViewV2's free-nav tabs are the
  right UX for a crew.

## The market read (why this wins)
Two software worlds, unjoined: (1) solar design/proposal tools (OpenSolar, Aurora,
Solargraf, Pylon) STOP at the signed contract; (2) field-service/routing tools
(ServiceTitan, Jobber, OptimoRoute) know nothing about solar compliance. NOBODY
carries one record bill→design→proposal→install→commissioning→evidence→handover→
grant→referral. Ireland-specific (SEAI/ESB/RECI) = global players won't bother.
Deep, local, dull, defensible. Plus: monitoring handoff is manual everywhere — no
one auto-sends the right app link keyed to the fitted inverter (our VPP Trojan horse).

## Part A — the handover flywheel (the moat; build first)
1. **Commissioning (on the roof):** serial + fitted-model + triple-check. Monitoring
   becomes an **AI Coach prompt** that knows the fitted inverter and walks the
   installer through commissioning THAT unit + generates the customer's app link.
2. **"Your system is live" email** — auto-sent, one tap to the right monitoring app
   for their product (SolaX Cloud today; OUR app at VPP launch).
3. **Handover pack, agent-assembled:** signature + all stage photos + serials +
   Declaration of Works → one branded PDF.
4. **Leverage:** pack HELD in the customer portal, RELEASED on final payment.
   Installer gets paid; customer gets a "big success" moment; it's the organised
   evidence bundle for a SEAI inspection.
5. **Growth loop on release:** refer-a-friend (tracked, commission) + share-to-social
   (auto-generated design card) + Google review. Discount given → installer prompted
   for signage. Every completed job spawns the next.

## Part B — the map, made to sing (the wow; after A)
- Eagle view: the whole week's jobs pinned, colour-coded by type + day.
- Smart route: sequence each day by real drive time (vehicle-routing solve),
  quantify the win ("saves 47 min / 22 km today").
- **Killer tie-in:** a material-pickup stop — collect SolaX gear from the Leinster
  wholesaler en route (connects the map to the wholesaler deal).
- Navigation: hand the optimised multi-stop order to Google/Apple Maps first;
  in-app only when genuinely better.
- Weather-aware: wire the existing weather strip + reschedule-with-reason flow so a
  rain warning auto-flags roof jobs and offers the move.

## The through-line: AIField finishes the ESB forms
Traced 28 Jul (src/lib/pdfFill.ts `collect()`). Bill→survey→design already fill ~2/3
of NC6/NC7 (name, address, Eircode, MPRN, phone, email, kWp, panels, battery,
company, RECI, phase). The MISSING fields are exactly what AIField captures:
1. **Fitted vs proposed** — forms pull inverter model from the PROPOSAL, not what
   AIField confirms fitted. Wire AIField commissioning → pdfFill.
2. **Serials** — captured in AIField (localStorage), `collect()` has no serial field.
3. **Inverter rating (kW) is wrong** — reuses system_size_kw (DC kWp) as AC rating.
4. **Export limitation hardcoded** 'None — full export'; AIField has the real check.
5. NC7 "Contact person" unmapped. RECI placeholder if Settings unfilled.
So: build AIField commissioning to FEED the record, then the NC final render
genuinely completes itself. This is why AIField comes before the final NC render.

## Build order
1. Commissioning upgrade into JobViewV2 (serial + triple-check + monitoring AI-Coach
   + auto app-email) — and feed the record so the NC forms read fitted-not-proposed.
2. Handover pack + hold-till-paid + portal release.
3. Growth loop (refer / share / review / signage).
4. The map (eagle view → smart route → wholesaler pickup).

## VERIFY before shipping (truth-pass on our own claims)
- **SEAI payment/grant timing** — Cal thinks full payment may be required before the
  grant; UNCONFIRMED. Check seai.ie before any compliance wording ships. Product
  logic (hold pack till paid) is sound regardless.
- Which form fires (NC5/6/7/8) — confirm seaiPipeline selection logic is right.
- Confirm the survey actually captures single/three-phase.

## AFTER AIField: Sweep 7.1
Before Sweep 8, do **Sweep 7.1** — walk through ALL previous sweeps on file
(FULL_SWEEP_AUDIT.md, SWEEP_AUDIT_ROUND4.md, FINAL_PUSH.md) and verify everything
works smooth and is complete. THEN the security+preferences audit, THEN Sweep 8.

## Cal's two docs (incoming)
Cal will share 2 documents to read before the deep work: the constitutional kernel
for M2M agents, and this being a vertical on it. Learn them fully when shared.
