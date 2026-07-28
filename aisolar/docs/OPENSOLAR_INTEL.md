# OpenSolar Intel — design-depth + accuracy modeling (first pass, 28 Jul 2026)
### What was verified, the surprise finding, and the upgrade path for OUR engine
*Skills used: WebFetch research pass · stop-slop on copy. Deep crawl queued
(fresh session, web-crawl-stack + scrape skills — see §4). Truth-pass: every
claim below is marked VERIFIED (fetched today) or KNOWN (from Cal's own vault
positioning notes) or QUEUED (needs the deep crawl).*

## 1 · The three sources — what they actually are

**developers.opensolar.com — VERIFIED thin shell today.** Landing page is
marketing ("AI-powered designs, everything stays in sync"); `/docs` and
`/api-docs` both 404 from outside. Their real API reference sits behind
different paths/auth. → the deep crawl (§4) goes in with the crawl stack, not
WebFetch. KNOWN (vault, AISolar Refinement Brief): OpenSolar is the named
competitor whose boundary is our wedge — **they stop at the signed contract;
we carry one record bill→install→evidence→grant→receipt.**

**github.com/Open-Earth-Foundation/opensolar — VERIFIED, and a SURPRISE.**
It is NOT design software at all. It's a 2019-era **blockchain solar-financing
platform**: Stellar settlement, crowd-funded solar assets, IoT energy monitors
triggering automated monthly payments, IPFS-hashed legal contracts, three
digital asset classes (Investor / Recipient / Payback), 8-stage project
lifecycle, stakeholder roles (Investor/Recipient/Originator/Contractor/
Developer/Guarantor), Go + MQTT + Docker. **Zero irradiance/yield modeling.**
→ Worthless for design accuracy. **Priceless as PRIOR ART for our RWA/M2M
layer**: someone already walked energy-asset-financing-with-IoT-attestation-
and-chain-settlement — and their shape rhymes with ours (their IoT monitor ≈
our EnergyPilot node; their payment-trigger ≈ our TelemetryReceived→
SettlementRecorded; their asset classes ≈ our attribute streams; their 8
stages ≈ our workflow). Study their failure modes before Genny/RWA hardens:
what they under-specified (no accuracy/validation methodology anywhere) is
exactly what our kernel's evidence discipline fixes.

**openpvtools.readthedocs.io — VERIFIED: an index, and the map to the gold.**
A catalogue of 26 open-source PV modeling tools. The four that matter to us:
- **pvlib python** (BSD-3, active) — THE industry-standard PV modeling
  library: solar position, irradiance transposition (POA), module temperature
  models, DC/AC conversion, inverter models, loss chains.
- **SAM / System Advisor Model** (NREL, C++) — the accuracy REFERENCE for
  PV + financial modeling; what serious tools validate against.
- **pvfactors** — diffuse shading + bifacial irradiance.
- **RdTools** — PV timeseries degradation/technical analysis (the aftercare/
  monitoring layer's friend, post-VPP).

## 2 · Their deep tissue vs OUR engine — the honest gap map

OUR engine today (verified in `src/lib/leadIntake.ts`): flat 950 kWh/kWp
baseline → `annualYieldFactor()` derates by orientation/pitch/shading bands →
`computeQuote()` (bill-aware rates, CEG, occupancy self-consumption, battery
arbitrage, NDMG/domestic grants, dual payback). **Strong on the MONEY layer —
almost certainly stronger than OpenSolar on Irish tariff/grant/occupancy
truth. Simple on the PHYSICS layer** — banded derates, no hourly model.

The pvlib/SAM-grade physics they (and Aurora) sit on, in upgrade order for us:
1. **Solar position + POA transposition** (hourly irradiance on the actual
   roof plane, from TMY data for the site) — replaces the flat 950 base with
   site-specific physics. pvlib does this in ~20 lines. Ireland TMY data:
   PVGIS (free EU service — also the source SEAI-adjacent tools trust).
2. **Temperature-corrected module output** (SAPM/PVsyst temp models) — real
   panels lose output warm; Ireland's cool climate is actually a SELLING
   POINT our proposals never make ("your roof runs cooler than the datasheet").
3. **System loss chain** (soiling, wiring, inverter efficiency curve,
   clipping when DC/AC ratio > 1) — replaces implicit losses with named ones;
   the proposal can then SHOW the loss waterfall (trust wedge: "ask the other
   quote to prove their number" becomes devastating).
4. **Horizon/obstacle shading** beyond bands — Google Solar API buildingInsights
   already gives us per-roof sun hours (wired, CORS-proxy pending); blend it.
5. **pvfactors/bifacial + RdTools degradation** — post-launch, VPP-era.

**The strategic read:** don't chase Aurora/OpenSolar on 3D LiDAR modeling —
match them on *stated accuracy* via pvlib+PVGIS (weeks, not years), and beat
them where they don't play: verified bill truth, occupancy-driven
self-consumption, hash-chained numbers, compliance autopilot, and the record
that keeps going after the contract they stop at.

## 3 · Best bits to TAKE (design-software behaviours worth stealing)
- **One record, always in sync** (their own pitch) — we already out-do this
  end-to-end; make our marketing SAY it with their confidence.
- **Stated accuracy + validation posture** — publish OUR methodology page
  ("how the numbers are made": bill-read → PVGIS irradiance → loss chain →
  occupancy model → grant math, each step citable). Nobody in the Irish
  market does this. Fits the OA citability DNA perfectly.
- **Design-to-proposal zero re-entry** — ours already; keep it sacred.
- **Their API-first posture** — our MCP tools plan (COMPLIANCE_CHAIN_DESIGN
  §7) is the modern version; proceed as specced.

## 4 · QUEUED — the deep crawl (fresh session, skills mandatory)
- [ ] developers.opensolar.com full crawl (web-crawl-stack + scrape skills):
      API objects (projects/systems/designs/contacts), webhook surface,
      proposal/pricing models, imagery sources, accuracy claims.
- [ ] pvlib docs targeted read → spec `annualYieldFactor v2` (PVGIS TMY +
      POA + temp + loss chain) as a drop-in behind computeQuote — SAME spine,
      deeper physics; numbers-through-spine law unchanged.
- [ ] SAM financial-model comparison vs computeQuote (validate our payback
      math against the reference; publish the delta honestly).
- [ ] Open-Earth opensolar post-mortem read for RWA prior art (their stage
      machine + asset classes vs our streams) — feeds Genny/RWA design.
- [ ] Cal's own OpenSolar notes — incoming; merge into this file on arrival.

*First pass complete. Correct by adding.*
