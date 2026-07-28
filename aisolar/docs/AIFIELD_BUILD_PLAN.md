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

## Cal's two docs — READ 28 Jul (constitutional grounding complete; see
## OA/ORDINAL_KERNEL_REVIEW_CLAUDE_v1.md for the independent pass)

---

# CAL'S MORNING NOTES — 28 Jul, MERGED (the deltas on top of the plan above)
_Skills used: stop-slop. Truth-pass applies to Cal's ideas too (his rule)._

## The governing principle (Cal + Musk + the CDT)
"Not what can we add — what can we take away." Fully agentic, EASY to use,
fewer moving parts. Subtraction is the design method at every step below.

## LANDED TODAY (this session, commits on cowork-jul25)
- ✅ Commissioning captures EVERYTHING off the plate, once: fitted model +
  serial + **AC rating (kW)** + **export limitation** (full/limited-to-X-kW).
  Confirm gate requires all four; mismatch requires the note.
- ✅ **pdfFill reads the roof**: fitted model overrides proposal (labelled
  "as designed" until attested — and provisional values are NEVER drawn into
  a statutory box, appendix only); serial row added; the kWp-as-AC-rating bug
  is DEAD (honest-missing beats wrong); export hardcode is DEAD; substitution
  row appears on the appendix when flagged. NC7 contact person: verified
  already defaulting to customer (pdfFill data block).
- ✅ **decideCompliance runs on the FITTED rating** once attested — a
  substitution that crosses a band flips the form automatically.
- ✅ **NC6→NC7 flip warning ON THE ROOF**: exact, computed from the bands,
  tells the crew to stop and call the office BEFORE commissioning.

## ⚠️ FLAGS FOR CAL (verify before live — statutory, not mine to decide)
1. **ESB band maths**: code uses ≤6kW single / ≤11kW three. ESB micro-gen is
   25A/phase = **5.75 kVA single / 11.04 three**. At 5.75–6.0kW single-phase
   the code UNDER-FILES (NC6 when arguably NC7). Needs the ESB policy read +
   your yes before the threshold changes. Flagged in complianceDecision.ts.
2. **SEAI hold-till-paid wording**: your handover copy says SEAI may audit
   before releasing the grant + wants hard copies — UNCONFIRMED (the existing
   verify item). Product logic sound regardless; wording checked before ship.
3. **Survey phase capture**: form choice depends on single/three-phase from
   `confirmed_inverter_type` (regex, dummy data shows "string" wart). The
   survey rewire must make supply phase a FIRST-CLASS field. Filed.

## THE REST OF PART A (build order, Cal's notes folded in)
1. **Monitoring AI-Coach prompt** — knows the FITTED inverter (fieldRecord),
   walks the installer through commissioning THAT unit, generates the
   customer's right-app link (SolaX Cloud today; OUR app at VPP). The Trojan
   horse. "Fully programmed" — no half-wires.
2. **"Your system is live" email** — auto-sent at commissioning-complete,
   one tap to the right monitoring app. CAL'S DICTATED COPY (keep the voice):
   docs arrive on confirmation of final payment · keep safe, SEAI may audit
   before releasing the grant · they stay in your folder but SEAI want hard
   copies printed · your installer hands you the test certs to keep alongside.
   (Wording ships only after flag #2 verifies.)
3. **Handover pack, agent-assembled** — signature made AMAZING + all stage
   photos + serials + DoW → ONE branded PDF. Everything screams wow.
4. **Hold-till-paid + portal release** — installer PROTECTED both ways;
   agents trained on all the incremental importances → **SWEEP 8.1** (new:
   agent-training condition — everything discovered in 7.1 becomes agent
   training data before Sweep 8 closes).
5. **Growth loop on release** — refer(tracked commission) / share(design
   card) / review(GBP) / signage prompt on discount. As good as the website;
   OWNER-BRANDED; **higher-tier feature — and the tiers need LOCKING so
   nothing bleeds** (entitlement gating, filed with pricing work).

## PART B — the map (Cal's deltas)
- Eagle view+: go FURTHER than pins — use the market's proven tech, advanced.
- Smart route insight framed human: "home to the family earlier, never drive
  back to a job twice."
- **Wholesaler tie-in (CLOSED yesterday — Leinster)**: his catalog tops our
  shelf, special offers promoted, comparisons visible; he opens 40 installers
  on deployment. Material-pickup stop en route = jobs + supplier collections
  + compliance on ONE screen. Nobody joins these. Make it sing — the sounder
  this is, the harder he grows us.
- Navigation: hand the optimised order to Google/Apple Maps first.
- Weather: wire the EXISTING weather strip + reschedule-with-reason → rain
  auto-flags roof jobs + offers the move.

## NEW STANDING DISCIPLINES (from the notes)
- **Blogs from notes**: every technical note worth keeping becomes a blog —
  (1) Cal's own grounding, (2) marketing + user guides = trust + stickiness.
  Wire into the notes protocol; queue: "the triple check", "why your NC6
  describes the wrong inverter", "the 25A question", "hold-till-paid".
- **Installer's own vault**: serials prompt installers to keep their OWN
  record (their vault or one we create) — filed to Sweep 8 schema.
- **Standard, every turn**: senior expert dev team; bulletproof, crystal
  clean, zero junk; institutional grade OOTB, sitting on the kernel.
