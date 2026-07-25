# Full audit — every sweep, what's missing, what needs polish

_2026-07-25. Verified against the code, not from memory. 28 commits across
yesterday and today._

---

## Part 1 — Sweep status

| Sweep | Scope | Status |
|-------|-------|--------|
| 1–3 | Agents / kernel / approval-gated outbound | ✅ Done |
| 4 | Installer + customer + job surfaces | ⚠️ **Nominally done, but see §3.7 — AIField is thin** |
| 5 | Public pages, dead-page cleanup, re-skins | ✅ Done |
| 6 | Whole-app audits (dead-ends, back-buttons, sizing, truth-pass, empty states, dark) | ✅ All 6 items |
| 7 | Reach | 🟡 **Technical layer done. Content/marketing layer half-done** |
| 8 | Launch necessities | ⛔ Blocked on GATE 0 |

### Sweep 7 — what's actually done vs not

**Done:** llms.txt, sitemap, AI-crawler robots.txt, Organization/WebSite JSON-LD,
per-page meta on every public page (after fixing the helmet no-op — see §2.1),
`/faq` with FAQPage schema, `/blog` with 4 full articles + BlogPosting schema,
blog reachable from nav + footer.

**NOT done:**
- **Hero snapshots never refreshed.** Cal asked for "new snapshots of the
  updated features" on every hero. The AISolar hero still shows the old bill
  card; nothing shows the widget, the AI Coach, the engagement signal or the
  compliance pack. **This was asked for and skipped.**
- **Agents page never built.** Cal green-lit a page for the ten agents and their
  skills. Not started.
- **Placeholder marketing stats still live** (`src/config/brand.ts:72`, flagged
  TODO in the file itself). These are invented numbers on customer-facing pages.
  Truth-pass violation, still shipping.
- **Blog is 4 articles.** Enough to launch, not enough to rank a category.

---

## Part 2 — Bugs found and fixed (for the record)

Real defects, several of which would have shipped:

1. **Per-page SEO never rendered.** react-helmet v2 was a silent no-op under
   React 18 — every page shipped the same generic title. Invisible without
   inspecting the DOM. (`713c8b7`)
2. **Every click-through landed mid-page.** No scroll restoration anywhere.
   (`b3c00b0`, `a22941e`)
3. **Mobile horizontal overflow** — grid items with `min-width:auto` dragged the
   page sideways. (`d577dd1`)
4. **Cookie consent defaulted optional purposes ON** — a GDPR violation
   (pre-ticked ≠ consent), plus buttons collapsing to 22px. (`9955e1c`)
5. **Hard-coded €1,800 grant** in LeadFlow's display *and pitch script* — quoted
   the same grant for every system size. (`64b4ffa`)
6. **SEAI grant maths were wrong** (flat €900/kWp vs real tiered €700/€200),
   VAT 13% vs actual 0%, phantom €300 BER uplift. (`599e07d`)
7. **Two contradictory commercial grant formulas.** (`4d33319`)
8. **Fake `aggregateRating` (4.8, 127 reviews)** in structured data — invented
   review data, penalty risk. (`6ec0126`)
9. **Missing icon imports twice** (`Award`, `Check`) — runtime crashes that
   passed the build because Vite doesn't type-check.

### 2.1 Process gap worth fixing
`vite build` does **not** type-check. Two runtime crashes passed green today.
**Add `tsc --noEmit` to the build or a pre-commit hook.** Cheap, stops a class
of bug I'm currently catching by eye.

---

## Part 3 — Cal's seven items, verified

### 3.1 AIOS page — needs work ✅ agreed
It's cal.com/enterprise's skeleton with AIOS content. Issues: the kernel event
visual is the only real product shot; "the family" section is text; blue was
added but it's still mostly monochrome with blue accents rather than an AIOS-blue
page. No proof, no numbers, nothing showing the ten agents.

### 3.2 Pricing page — needs work ✅ agreed
Tiers, seats and marquee highlights are in. What's missing: **no comparison of
what you LOSE by going down a tier**, no FAQ (pricing pages need one — "can I
change plans", "what counts as a seat", "what happens at trial end"), no annual
saving shown in money (only %), and the AIOS "Custom" tier has no qualifying
signal so it attracts the wrong enquiries.

### 3.3 Consultant cockpit is flat ✅ agreed
Everything is the same visual weight — the pipeline, the inbox, the documents
all read as grey cards in a grey frame. There's no hierarchy telling a
consultant where to look first. Today's view is the only opinionated screen.
It also has **no colour** — the family system (red for AISolar) never reached it.

### 3.4 AISales design needs serious work ✅ agreed
AISales is currently *just a wordmark on the consultant cockpit header*. It was
sold on the landing page as "the closer's home" with engagement intelligence,
but there is no distinct AISales identity, layout or experience — it's the same
generic cockpit. **Marketing is ahead of the product here.** That gap needs
closing before launch or the landing page is overselling.

### 3.5 Intelligence needs hardening ✅ agreed — and it's shallower than it looks
`consultantIntelligence.leadIntel()` is **13 hard-coded stage descriptions** plus
two enrichment cases (proposal opened ≥2×, approved-but-unpaid). `coachBrain` is
deterministic pattern-matching over the same data — no LLM, and by design for
now. What it does NOT use: bill data, system size, deal value, consultant
workload, seasonality, response times, or any comparison across leads. It reads
as intelligent on a demo; it will look thin on 200 real leads.

### 3.6 NC6 must be automated ✅ agreed — **it is NOT automated today**
Verified: only **two** documents actually generate filled — `DowTemplate`
(Declaration of Works) and `LoaTemplate` (Letter of Authority). The NC6/NC7
forms themselves are **7 blank PDF links** in the forms library. The UI says
"auto-prepared from survey + design" but what's prepared is the *pack around*
the form, not the form. **This is the single biggest gap between what the
product claims and what it does.**

### 3.7 Installer cockpit — total rewire ✅ agreed
654 lines, 6 tabs (today, week, jobs, inbox, materials, map). What a crew
actually needs and doesn't have: start-job → customer auto-notified (marketed on
the landing page, doesn't exist), staged checklist with photo gating, panel and
inverter **serial capture** (which would feed the warranty pack AND the ESB/RECI
paperwork), field sign-off/handover signature, exception handling ("can't
complete today" → reschedule + tell the customer why), and **offline tolerance**
for rural roofs. See `AISALES_AIFIELD_BUILD_MAP.md` for the sequencing.

---

## Part 4 — The structural gap under all of it

**Ten components run on `generateDummyLeads()`:** AnalyticsDashboard,
AgentFoundation, CeoWindow, CustomerIntelligenceProfile, InsightsView,
ConsultantCockpitV5, OwnerCockpit, SiteSurveyForm, RealCalendar.

The entire operator side of the product is a demo. The rails to real data exist
(traced in `AISALES_AIFIELD_BUILD_MAP.md` §1 — front door → grant is wired end to
end), but nothing is connected and nothing is deployed. **Every polish item
above sits on top of this.** Worth deciding whether to polish the demo or
connect the data first — connecting it will change what the screens need to show.

---

## Part 5 — Also outstanding (asked for, not done)

- **Terms of Service rewrite** — Privacy was rewritten; Terms is still the old
  version. Asked for explicitly.
- **Per-tenant feature toggles** — Cal: "I must be able to turn some of the best
  features off." Real feature-flag work, not started.
- **Heatmap/session analytics** — Cal flagged it. Needs to sit behind the
  performance-consent we built, and a line in the Privacy Policy.
- **`ingest-lead` auth model** — BLOCKING. Shared-secret auth can't be called
  from a browser. Needs an anon-callable first-party path or a rate-limited
  public sibling. Decide before wiring more capture points.
- **GATE 0** — leaked keys still need rotating and purging from git history.
  Blocks the cohort.
- **computeQuote() consolidation** and **tenant-configurable rates** — known
  post-launch debt, correctly deferred.

---

## Part 6 — Suggested order

1. **Decide: polish the demo, or connect real data?** Everything else depends.
2. **NC6 automation** — biggest claim/reality gap, and it's the compliance moat.
3. **Installer rewire** — screens 1–3 from the build map.
4. **AISales identity + consultant cockpit hierarchy/colour** — closes the
   marketing-vs-product gap.
5. **Intelligence hardening** — once real data exists to be intelligent about.
6. **Marketing polish** — AIOS page, pricing page, hero snapshots, Agents page.
7. **GATE 0 + deploy.**
