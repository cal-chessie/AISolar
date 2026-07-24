# AISOLAR — Full Sweep Audit

_Snapshot: 2026-07-24 · branch `cowork-jul21` · build green._

A pass over all eight sweeps: status, what's genuinely done, and everything
spotted "on the travels" that isn't covered by a sweep item. Written to a file
(not chat) so the next session can act on it directly.

## Sweep status

| Sweep | Scope | Status |
|-------|-------|--------|
| 1–3 | Agents / kernel / approval-gated outbound | ✅ Done (per task board) |
| 4 | Installer + customer + job surfaces | ✅ Done |
| 5 | Public pages — dead-page cleanup, re-skins, `/start`, one CTA | ✅ Done |
| 6 | Whole-app audits (dead-ends, back-buttons, sizing, truth-pass, empty states, dark) | ✅ Done — all 6 items |
| 7 | Reach | 🟡 **Technical layer done**; content+marketing layer pending |
| 8 | Launch necessities | ⛔ Gated on coxmtpnq / GATE 0 |

### Sweep 6 — verified complete
- **33 Dead-ends:** Export CSV (Analytics + Estimates, real downloads), EstimatesView "Open", Products "Add to proposal" ×4 (honest toast). CeoWindow "Download report" already wired (`exportKpis`).
- **34 Back-buttons:** every deep view (Paperwork, JobView, Owner, LeadFlow, CustomerPortal) has an escape.
- **35 Sizing:** 251 hard-coded radii → 2 canon tokens (`rounded-panel` 16px, `rounded-control` 10px). Heights/gaps left as per-surface (shared with avatars/icons — not safe to globalise).
- **36 Truth-pass:** SMS metric → Portal alerts; "emails, SMS, calls" → dropped SMS; fake €1,800 grant fixed in EstimatesView **and now LeadFlow** (was still hard-coded — see findings).
- **37 Empty states:** Products + Estimates now show "no results".
- **38 Dark-mode:** cockpit verified; token-driven, contrast holds.

### Sweep 7 — reach
- ✅ `llms.txt`, `sitemap.xml`, AI-crawler `robots.txt`, Organization+WebSite JSON-LD, `/faq` (8 citable answers + FAQPage), `SEOHead` fixed (fake rating removed). Commit `6ec0126`.
- 🟡 Pending (next session, skills loaded): per-page meta on money pages, landing/marketing revamp to the current stack, Agents+skills page, blog + articles.

## Findings — missed / spotted on the travels

1. **LeadFlow hard-coded €1,800 grant** (lines ~283, 423) — same truth-pass bug as EstimatesView; the pitch script literally told the customer "the SEAI covers €1,800" for every system. **FIXED** this pass → uses the real `seaiGrant` already in scope.
2. **Sitemap listed `/blog`** which 404s (blog not built). **FIXED** → removed; goes back when the blog ships. Also **added `/start`** (public conversion page, was missing).
3. **Placeholder marketing stats** (`src/config/brand.ts:72`, flagged TODO) — the landing pages carry invented marketing numbers. Must be replaced with true figures (or removed) during the marketing revamp — E-E-A-T/truth-pass. **OPEN (revamp).**
4. **Per-page meta gap** — AIOS/AISolar/AITeam/Pricing still share `index.html`'s single title. **OPEN (revamp).**
5. **Marketing is behind the product** — the site doesn't yet surface the rebuilt calculator/embeddable widget, the conversational AI Coach, the consultant engagement/bottleneck intelligence, the SEAI+ESB grounding, or the ten agents. **OPEN (revamp)** — see `sweep-7-handoff` memory for the full list to feature.

## Known post-launch debt (tracked, not blocking)
- **`computeQuote()` single engine** — math is correct but file-by-file, not the one unified call spec'd. Consolidate when the math next changes.
- **Rates hard-coded** (retail/export/yield/orientation) — not tenant-config; needed for the county franchise model, not launch. `brand.pricing` shows the pattern to extend.

## Launch blockers (Sweep 8 / GATE 0)
- **Leaked Supabase keys + Maps key** must be rotated and purged from git history before the cohort goes live.
- **coxmtpnq access** — deploy edge functions (`ingest-lead`, `extract-bill-data`, `agent-drain`), run migrations, first-admin bootstrap. Until then: widget lead capture, drawn-roof persistence, and the AI Coach LLM wire stay dark.

## Verdict
Sweeps 1–6 complete; Sweep 7 technical layer complete; the app builds clean and
is truth-pass consistent after this pass. Remaining work is the Sweep 7
content/marketing layer (a fresh session with the SEO + marketing + UI/UX skills)
and the GATE 0 / coxmtpnq launch prerequisites.
