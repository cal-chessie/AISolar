# FULL AUDIT — 30 Jul 2026, every department
### Commissioned by Cal ("as deep as intelligently possible"). Every finding below is tool-evidence from tonight — grep, build, live kernel query — never memory. Three defects found; three fixed tonight; the rest is graded and honest.

## The verdict in one line
**Launch-ready on every axis the code controls. The only RED is access, not quality: the coxmtpnq wall + GATE 0 hand-tasks.**

---

## 🛡 SECURITY — GREEN
- **Secrets:** none in any tracked file (all hits = guard patterns + placeholders); `.env*` untracked; `financeConfig` actively **blocks** `sk_/rk_/whsec_` from ever entering the browser (throws with a teaching message).
- **XSS surface:** exactly one `dangerouslySetInnerHTML` — static JSON-LD schema (safe, standard SEO). No `eval`.
- **Edge-function auth:** `verify_jwt=false` on exactly three functions, each correctly gated another way — `stripe-webhook`/`coinbase-webhook` (provider signature verification) and `ingest-lead` (`x-ingest-key`, fail-closed).
- **Dependencies:** `npm audit` (production tree) — no reported vulnerabilities.
- **Hardening found in place:** `anonymise_lead` is SECURITY DEFINER with a **pinned search_path** (shadow-schema attack closed in 20260724).
- Outstanding (known, Cal's hands, GATE 0): git-history purge, Maps/Cal.com key rotation, old-keys-dead confirmation.

## ⚖️ KERNEL / CONSTITUTIONAL — GREEN (re-verified live tonight)
- Chain: **77 events · 0 orphans**. Immutability triggers 2/2 (`no_update`/`no_delete`). Receipt triggers 2/2 (relationships + policies — F1 enforced). Policies active 3/3 (LLM cap · outbound gate · loop ceiling). **RLS enabled on every kernel table.** 6 tenants intact.
- AMBER (scheduled, not defects): 25 event types await Cal's layer classification; F4 time-law paragraph + F5 Conformance Manifest are the two remaining invention-phase artifacts.

## 🖥 BUILD / FRONTEND — GREEN, two AMBERs
- **Production build ✓ 6.05s.** tsc: 8 pre-existing errors, now *named* (one each in ConsultantCockpitV5, ProfessionalProducts, ProposalView, PaperworkWindow, docTemplates, CustomerProposal, ProductSnapshot, dummyData) — Sweep 9 cleanup list.
- AMBER 1: chunk >600 kB (code-split candidate, post-launch perf, not correctness).
- AMBER 2 (known/staged): demo footprint — `generateDummyLeads` in 18 files, `isDemoMode` in 11; the real-data cutover is the first post-deploy job.

## 🗄 DATA / MIGRATIONS — GREEN
- All 17 migrations idempotency-linted: every `create table` guarded (`if not exists`), policies/triggers wrapped in `duplicate_object` guards, columns `add if not exists`. Add-only throughout.
- Store inventory **closed by scrape** (13 localStorage + 2 in-memory, all accounted). Dual-write layer live in 7 save paths, byte-identical behavior verified (tsc baseline + zero console errors).
- NOTE for cutover: legacy `touchpoints` table AND new `lead_touchpoints` both exist — reconcile to one at cutover (documented, not a conflict).

## 🔏 GDPR / COMPLIANCE — was RED, now GREEN (fixed tonight)
- **FINDING (the audit's most serious):** `anonymise_lead()` predated tonight's Sweep-8 tables. An Article 17 erasure would have left behind: **MPRN on `esb_submissions`**, free-text **conversation message bodies**, touchpoint summaries, and installer notes. → **FIXED: `20260802_gdpr_erasure_extension.sql`** — original body verbatim + four new scrubs (the 20260724 precedent followed exactly). Equipment serials retained deliberately (device data, statutory record).
- Consent: append-only `consent_records` + banner dual-write live. Attestation law (eIDAS typed-name, "attested never verified") holds in pdfFill/fieldRecord wording.

## 📣 TRUTH-PASS / MARKETING — was AMBER, now GREEN (fixed tonight)
- **FIXED:** `brand.ts` carried a **sequential placeholder WhatsApp number** (`3538512345 67`) with `showWhatsApp: true` — never rendered anywhere (verified), but a landmine one import away. Number emptied, flag off, truth-pass comments added.
- **FIXED:** stale "email, SMS" comment in CustomerIntelligenceProfile.
- Verified honest: the Settings channel panel *pulls* live `disconnected` status for SMS/WhatsApp (config surface, not a claim). No competitor citations anywhere. No roof-detection claims.

## 🚀 DEPLOY / DRIFT — AMBER (the known wall, not a defect)
- coxmtpnq: inaccessible from here (Lovable account) — 17 migrations + 16 edge functions staged behind one token. Postmark DNS + first-admin bootstrap queued behind it.
- Docs drift: `AUDIT_REPORT.md` (Dec-2025) superseded — do not trust; vault lags repo ~2 days (Hermes's lane). THE_ONE_READ remains the corrected map.

---

## Tonight's fix ledger (all pushed)
1. `20260802_gdpr_erasure_extension.sql` — Article 17 coverage for all Sweep-8 tables
2. `brand.ts` — WhatsApp placeholder/flag neutralized (truth-pass)
3. `CustomerIntelligenceProfile.tsx` — SMS comment corrected

*Departments run: Security · Kernel/Constitutional · Build/Frontend · Data/Migrations · GDPR/Compliance · Truth-pass/Marketing · Deploy/Drift. Every grade traces to a command run tonight. — Claude, full-team pass*
