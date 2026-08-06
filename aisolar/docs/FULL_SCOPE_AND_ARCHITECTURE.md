# AISolar — FULL SCOPE & ARCHITECTURE

### The whole system mapped, for designing a **Browser Automation agent**.
> Written 30 Jul 2026 by Claude (wingman), tool-verified on disk — routes from `App.tsx`,
> agents from `agent-drain/index.ts`, functions from `supabase/functions/`, migrations from
> `supabase/migrations/`, external touchpoints grepped from source. Where a claim is
> *design intent* not yet built, it says so. Companion to `THE_ONE_READ.md` (the estate map)
> and `SWEEP8_DB_WIRING.md` (the deploy ledger). **This doc's job: give you everything you
> need to scope an agent that drives a browser to do the steps that have no API.**

---

## 0 · WHY THIS DOC EXISTS — the one-line thesis

AISolar automates the whole solar-install pipeline **up to the government/utility walls that
have no API**. ESB Networks (the grid operator) killed email submission and offers **no API —
portal only**. SEAI (the grant body) and the BER assessor step are the same shape. Every
other integration already has an API and is wired. **So the last mile is a browser problem,
not a data problem** — the data is ready (this session built the sealed submission pack that
IS the payload). A Browser Automation agent is the missing actuator that carries that payload
through the portals a human currently hand-keys.

---

## 1 · WHAT AISOLAR IS

**One true sentence (the truth-pass canonical):** *AISolar is an Irish solar-installer
operating system; it reads the day/night split from the customer's bill and runs the pipeline
bill → survey → proposal → SEAI grant → install → customer portal on a 10-agent runtime, with
the human approving every outward send.*

- **Business model:** per-tenant SaaS (each installer = one tenant/workbench). Pricing
  €197/€497/€997/custom + €97/seat. Sits on the **AIOS constitutional kernel** (a *separate*
  Supabase project = the switchboard). AISolar is **Domain 001** — the proof domain.
- **NOT true (never claim):** SMS/WhatsApp, roof detection as fact. Satellite (Google Solar)
  is context only. Grant agent **tracks**, does not submit. These are truth-pass law.

### The stack (verified from `package.json` + function runtimes)

| Layer | Tech |
|---|---|
| Language | **TypeScript end-to-end** (frontend + Deno edge functions) |
| Frontend | React 18 · Vite · React Router v6 · Tailwind + shadcn/ui (Radix) · TanStack Query · framer-motion · recharts · **pdf-lib + pdfjs-dist** (the paperwork engine) · Google Maps + Solar API · zod · react-hook-form |
| Hosting (FE) | Static SPA on **Vercel** (`vercel.json`) |
| Backend | **Supabase**: Postgres + Auth + Storage + **Edge Functions (Deno)** + **pg_cron** |
| Kernel | Separate Supabase project (`vythuqax…`) — event switchboard, cross-tenant routing |
| AI | **OpenRouter** (free-tier daily cap; deterministic handlers today, LLM optional) |
| Email | **Postmark** (`_shared/email.ts`) |
| Maps | **Google Solar/Geocoding API** (server-only, `solar-roof` fn) |
| Payments | **Stripe** + **Coinbase** (crypto) checkout + webhooks |
| Tenant Supabase | `coxmtpnq…` (AISolar tenant DB — **deploy-gated, GATE 0/B**) |

---

## 2 · THE ARCHITECTURE MAP

```
                          ┌───────────────────────────────────────────────┐
   PUBLIC WEB             │            AISolar SPA (Vercel, static)         │
   (bill upload,          │  marketing · /start bill door · /calculator     │
   calculator)  ─────────▶│  /embed widget · POV cockpits (owner/consultant │
                          │  /installer/customer) · paperwork engine (pdf)  │
                          └───────┬───────────────────────────┬─────────────┘
                                  │ supabase-js (RLS)          │ public edge (x-key)
                                  ▼                            ▼
              ┌───────────────────────────────┐   ┌──────────────────────────────┐
              │  Supabase (tenant coxmtpnq)   │   │   Edge Functions (Deno)       │
              │  Postgres + Auth + Storage    │   │  ingest-lead · extract-bill   │
              │  + pg_cron                    │◀──│  agent-drain · create-checkout│
              │                               │   │  solar-roof · send-* (Postmark)│
              │  leads → lead_intake → survey │   │  stripe/coinbase-webhook       │
              │  → proposals → paperwork →    │   └───────────────┬───────────────┘
              │  installs → portal            │                   │ external APIs
              │  + agent_queue + agent_actions│                   ▼
              └───────────────┬───────────────┘   ┌──────────────────────────────┐
                              │ kernel emits       │  Postmark · Google Solar ·    │
                              ▼                     │  Stripe · Coinbase            │
              ┌───────────────────────────────┐   └──────────────────────────────┘
              │  AIOS KERNEL (Supabase vythuqax)│
              │  event switchboard · routing   │   ┌══════════════════════════════┐
              │  · cross-tenant transfer       │   ║  NO API — PORTAL ONLY (WALLS) ║
              └───────────────────────────────┘   ║  ESB Networks NC6/NC7 submit  ║
                                                   ║  SEAI grant portal            ║
                    ⇐ THE BROWSER AUTOMATION       ║  BER assessor handoff         ║
                       AGENT LIVES HERE ⇒          ╚══════════════════════════════╝
```

### 2.1 · Frontend surfaces (routes, by POV lane) — from `src/App.tsx`

| Lane | Routes | Component | Purpose |
|---|---|---|---|
| **Public** | `/` `/aios` `/aisolar` `/aiteam` `/pricing` `/docs` `/agents` `/about` `/faq` `/blog` `/privacy` `/terms` | marketing | truth-pass static; no backend |
| **Front door** | `/start` `/upload` | `StartAnalysis` | bill upload → 21-pt estimate + satellite → book |
| **Lead capture** | `/calculator` `/embed` | `ROICalculator` / `CalculatorWidget` | embeddable tenant-branded calc → `ingest-lead` |
| **Auth/onboard** | `/auth` `/get-started` `/onboarding` | `AuthPage` / `OnboardingMode` | signup + tenant provisioning (⬜ A1) |
| **Owner** | `/owner` | `OwnerCockpit` (+Agents/Finance/Analytics/Settings) | tenant admin; agent config; **Settings = RECI/VAT/company** (feeds NC6) |
| **Consultant** | `/consultant` `/lead-flow` | `ConsultantCockpitV5` / `LeadFlow` | pipeline, chat, proposals |
| **Installer** | `/installer` `/job/:leadId` | `InstallerPortalV5` / **`JobViewV2`** | AIField: schedule, commissioning gate, **handover + ESB pack** |
| **Customer** | `/my-projects` `/p/:leadId` | `CustomerPortalV2` / `ProposalPage` | portal docs, proposal accept |
| **Agent console** | `/agent-console` | `AgentFoundation` / `AIConfig` | per-agent model + cost-cap UI (⬜ A5) |

POV gating: `ProtectedRoute roles={…}` exists; **demo mode bypasses it** (A9, launch-critical).

### 2.2 · Backend — Edge Functions (Deno) — from `supabase/functions/`

| Function | Role | External API |
|---|---|---|
| `ingest-lead` | public door for website/calculator leads (`x-ingest-key`, fail-closed, 24h dedupe) | — |
| `extract-bill-data` | 21-field bill extraction → persists to `lead_intake` | (LLM optional) |
| **`agent-drain`** | **the runtime** — drains `agent_queue`, runs handlers, chains stages | OpenRouter |
| `solar-roof` | roof auto-detect "receptionist" (key server-side) | **Google Solar/Geocode** |
| `create-checkout` / `stripe-webhook` | card payment | **Stripe** |
| `create-crypto-checkout` / `coinbase-webhook` | crypto payment | **Coinbase** |
| `send-notification` / `-digest` / `send-survey-notification` / `send-proposal-accepted` / `send-payment-reminder` / `send-follow-up-digest` | all outward email | **Postmark** (`_shared/email.ts`) |
| `expert-chat` | in-app assistant | OpenRouter |

### 2.3 · The agent runtime — from `agent-drain/index.ts`

Agents run **only** through `agent-drain` (queue + `pg_cron` drain — never inline). The
handler registry (verified):

```
lead_intake → survey_scheduler → proposal_drafter → follow_up
grant_submitter · install_coordinator
```

- **Deterministic today** (not LLM-gated). Chain advances by `workflow_stage` + DB triggers
  (`trg_enqueue_stage_agent`): e.g. `lead_intake` sets stage `intake_complete`, which enqueues
  `survey_scheduler`, etc.
- **`status: "draft"` on proposals — never auto-send.** Human approves every outward action.
- **`grant_submitter` TRACKS, does not submit** (truth-pass). ← *this is a browser-automation
  candidate: it could become a real SEAI portal driver.*
- The "10 agents" marketing count includes the customer-facing/reporting agents on top of these
  6 runtime handlers.

### 2.4 · The data spine (pipeline) — migrations `20260718…20260727`

```
leads ──▶ lead_intake ──▶ survey ──▶ proposals ──▶ paperwork(NC5/6/7) ──▶ installs ──▶ portal
  │  (21-field bill: rates, MPRN, day/night, tariff…)         │
  │                                                            └─ paperwork_engine (20260727)
  └─ agent_queue / agent_actions (the runtime's audit log)
```

Key migrations: `agent_foundation`, `v3_agent_runtime`, `rls_lockdown`, `website_ingest`,
`survey_handoff`, `role_management`, `bill_extract_complete` (+GDPR anonymise fix),
`survey_occupancy`, `survey_product_picks`, **`paperwork_engine`**.

### 2.5 · The paperwork / compliance engine (the automation payload factory)

This is what feeds a browser agent. Lives in `src/lib/`:

| File | What |
|---|---|
| **`pdfFill.ts`** | Fills the official ESB PDFs. **NC6** = flat PDF (0 fillable fields) → **coordinate-overlay** via pdf-lib `drawText`. NC5 = true AcroForm (531 fields). `collect(lead)` = the single source of every value. `nc6Completeness(lead)` = the readiness gate. **`buildSubmissionPack(lead)`** = the sealed 14-page pack (this session). |
| **`fieldRecord.ts`** | The AIField→forms bridge. `SerialState` (what the crew ATTESTED at the commissioning gate) + `CertRecord` (RECI/DoW/type-test/SLD real files). Storage today: `localStorage jobview_v2_<id>`; Sweep 8 → `installed_equipment`/`install_evidence` tables. **This contract is the table shape.** |
| `companyCompliance.ts` | Owner→Settings: RECI number, company mobile/email/address (feeds the installer block on NC6). `localStorage aisolar_company_compliance`. |
| `seaiPipeline.ts` / `leadIntake.ts` | grant maths (rates in one place, per-tenant). |
| `scripts/pdf-probe.mjs` / `pdf-verify.mjs` | calibration + the **overlap-gate** that fails if drawn text collides with ESB's own text (regulator-safety check). |

---

## 3 · THE INTEGRATION BOUNDARY — every external surface (the automation targets)

**This is the table to design the agent around.** "Has API?" is the deciding column.

| Surface | Has API? | Current state | Browser-automation opportunity |
|---|---|---|---|
| **ESB Networks — NC6/NC7 microgen connection** | **❌ NO. Portal only** (they *stopped* email over data-entry errors) | The sealed **submission pack is built** (payload ready). Human hand-keys it into the portal. | **★ THE PRIZE.** Agent logs into ESB portal, re-keys from the pack's Portal Entry Sheet, uploads the 4 attachments, submits. |
| **SEAI grant portal** | ❌ Portal only | `grant_submitter` agent **tracks**, does not submit (truth-pass). Grant maths computed. | **★ Second target.** Agent files the grant application on the SEAI portal from the tracked data. |
| **BER assessor handoff** | ❌ Manual/email | DoW routes to BER "on completion" (copy honest; real send = Sweep 8 X1) | Agent could book/submit to the assessor portal or send the structured pack. |
| **Postmark (email)** | ✅ API | Wired (`_shared/email.ts`) — real sends where authorised | none needed (API) |
| **Google Solar / Geocoding** | ✅ API | Wired server-side (`solar-roof`, key IP-restricted) | none needed (API) |
| **Stripe / Coinbase** | ✅ API | Wired (checkout + webhooks) | none needed (API) |
| **OpenRouter (LLM)** | ✅ API | Wired (free-tier cap) | none needed (API) |

**Conclusion:** exactly **three** surfaces are browser-automation shaped — **ESB, SEAI, BER** —
and they are precisely the government/utility walls. Everything else is already API-wired.

---

## 4 · WHERE THE BROWSER AUTOMATION AGENT PLUGS IN

### 4.1 · The payload is already built (this session)
`buildSubmissionPack(lead)` produces a **14-page sealed PDF**: manifest/checklist cover →
filled NC6 → **Portal Entry Sheet (every value top-to-bottom for error-free re-keying)** → 4
required attachments (RECI, DoW, type-test, SLD) → attestation + SHA-256 seal. **The Portal
Entry Sheet is literally the agent's input script** — it was designed for a human re-keying;
an agent reads the same ordered field list.

### 4.2 · The laws the agent MUST honor (non-negotiable — these are constitutional)
1. **Draft-never-send / human-in-the-loop.** No outward submit without the human's approval.
   The whole platform already works this way (`status:"draft"`, "approving every send"). An
   ESB/SEAI submit is the highest-stakes send — it must be **staged for one-click human
   confirm**, never fired autonomously. *(This aligns with the app's own approvals UX.)*
2. **Truth-pass.** The agent must never record "submitted/accepted" it didn't observe. It
   records what it *did* (form filled, on screen, awaiting confirm) — mirror `agent_actions`
   honesty. No fabricated ESB reference numbers.
3. **Attestation law.** The NC6 signature is the *named installer's* typed name (eIDAS simple
   e-signature). The agent carries that attestation; it does not manufacture one.
4. **GATE B / no-autonomy-until-aligned.** Agents are not deployed to prod until GATE 0 (keys)
   + GATE B (OA/GRIDS/COMH alignment) close. A browser agent that acts on the real ESB portal
   is a *live external action* — it sits behind the same gate, plus its own approval.
5. **Credentials boundary.** ESB/SEAI portal logins are the tenant-installer's own. The agent
   must use per-tenant stored creds (vaulted, never in code) with the installer's consent —
   this is a real portal acting as them. **Design this as delegated, consented access.**

### 4.3 · Where it sits architecturally (recommended pattern)
- **Not** inside `agent-drain` (that's Deno edge, deterministic, no browser). A browser agent
  needs a **headless-browser runtime** (Playwright/Puppeteer) in a worker with a display —
  a *separate service* that `agent-drain` (or the human) hands a job to.
- Proposed flow: installer marks job ready → pack built → **a `portal_submitter` job is
  enqueued** (mirrors `grant_submitter`) → the browser-agent service picks it up → drives the
  ESB portal to the **final confirm screen** → **pauses for human one-click approve** → on
  approve, submits → writes the real ESB reference back to `paperwork`/`agent_actions`.
- Store per-portal **recipes** (selectors + field order keyed to the Portal Entry Sheet) so a
  portal redesign is a recipe update, not a code rewrite — same spirit as the NC6
  `FORM_INTEGRITY` brittleness guard (which already warns if ESB revise the *form*).
- **Observability:** every step screenshotted + logged to `agent_actions` (the app already has
  per-agent transparency windows — extend that surface to show the browser agent's run).

### 4.4 · What to build (scoping checklist for you)
- [ ] Decide: **delegated portal login** model (how installers grant/store ESB + SEAI creds).
- [ ] Choose the browser runtime host (Playwright worker; where it runs vs Supabase).
- [ ] Recipe format for ESB NC6 submit (map each Portal Entry Sheet field → selector).
- [ ] The **human-confirm gate** UI (stage at final screen; one-click approve; screenshot proof).
- [ ] Write-back: real ESB/SEAI reference → `paperwork` + `agent_actions` + customer portal.
- [ ] The `portal_submitter` queue job + how `agent-drain`/AIField enqueues it.
- [ ] SEAI + BER recipes (phase 2) once ESB is proven.

---

## 5 · WORK LOG — THIS SESSION (30 Jul, tool-verified)

1. **Installer inbox unified with the consultant's** — one centralised conversation record
   (frontend built; real persistence = Sweep 8). `SWEEP8_DB_WIRING.md §"29 Jul additions"`.
2. **Per-agent transparency windows** — every agent gets the scheduling agent's window
   (frontend live). Owner scheduling transparency surface.
3. **Sweep 8 hardened + full app audit** — every `App.tsx` route walked; coverage matrix;
   named gaps **A1–A11** (auth/tenant, front-door lead creation, LeadFlow sends, settings
   persistence, ai-config, gdpr, calculator carry-through, POV gating, remove-dummy-data,
   tier entitlements). Surfaced the **demo-mode-hides-POV-gates** finding.
4. **NC6 self-completion to regulator grade** — the dominant thread. NC6 is a **flat PDF**
   (0 fillable fields) → coordinate-overlay (~43 placements, pages 1–3) via `pdf-lib`.
   Field-by-field audit closed with Cal: §1 customer, §2 MPRN/Eircode/first-connection,
   §3 installer landline/mobile/email, §4 new-install tick, §5/§5A fitted unit + rated
   current (captured, not derived) + type-test cert ref, Table-1 seven protection Y's,
   typed eIDAS signature + date. Pages 4–5 correctly BLANK (pre-2022 legacy branches).
   Verified: `node scripts/pdf-verify.mjs` overlap-gate clear + `nc6Completeness` gate.
5. **Eircodes added** to dummy Dublin addresses (flows to `extracted_eircode`).
6. **ErrorBoundary hard-reload button** — owner-views "all in error" was **HMR corruption**
   (stale dev modules), not a code regression; owned that yesterday's "permanent fix" was a
   server restart. Hard reload clears it; prod is static, immune.
7. **★ THE ESB SUBMISSION PACK — steps 1–12** ("biggest selling point"). Full ledger in
   `SWEEP8_DB_WIRING.md §"THE ESB SUBMISSION PACK"`. Client-side **done + browser-verified**:
   real cert files (#2), type-test (#5), portal entry sheet (#6), multi-unit-ready (#7),
   brittleness guard (#8), **SLD attachment (#9)**, **manifest/checklist cover (#10)**,
   **attestation + SHA-256 audit trail (#11)**, **tamper-evident metadata seal (#12)**.
   Deploy-gated (Sweep 8): DB persistence (#1), DoW→BER real send (#3), pack→customer (#4).
   Proof: 14-page pack builds clean, renders READY (green) and INCOMPLETE (amber, never
   fabricates the attester) — screenshots in session.
8. **Strategy answers** captured to `FOUNDER_NOTES.md` / `HANDOVER_ANSWER.md`: OA/CDT/kernel
   valuation, autonomy-if-emails+DB-connected, single-product-offer (start→grant), financing,
   7-day trial + card billing.

Files this session: `pdfFill.ts`, `fieldRecord.ts`, `JobViewV2.tsx`, `companyCompliance.ts`,
`dummyData.ts`, `ErrorBoundary.tsx`, `scripts/pdf-verify.mjs`, + docs.

## 6 · WORK LOG — PREVIOUS SESSIONS (from the estate docs + memory + git)

- **AIField IA settled + built (28–29 Jul):** 4 tabs (Today/Schedule/Routing/Inbox),
  ClientHub keystone, shared inbox+coach with consultant. `AIFIELD_IA.md`,
  `AIFIELD_BUILD_PLAN.md`. Retired `InstallRunner`, ported serial + triple-check +
  signature canvas into `JobViewV2` commissioning gate.
- **Compliance backlog:** NC5 (AcroForm, done), NC6 (overlay, this session), NC7/NC8
  (autonomous + editable + manual-fill). `COMPLIANCE_CHAIN_DESIGN.md`,
  `COMPLIANCE_DATA_CAPTURE.md`, `PAPERWORK_PRODUCT_BRIEF.md`.
- **Pipeline autonomy (22–24 Jul):** bill front door `/start`; survey_scheduler +
  install_coordinator send real Postmark; grant agent tracks (not submits);
  extract-bill-data 21-field persist + GDPR anonymise fix. `PIPELINE_AUTONOMY_AUDIT.md`.
- **Website ingest:** `ingest-lead` public door; websites point at it; calculator widget
  posts to it. `WEBSITE_INTEGRATION.md`.
- **Agent runtime (18 Jul):** `agent_foundation` + `v3_agent_runtime` + `rls_lockdown` +
  `role_management` migrations; queue + drain + pg_cron.
- **Sweep 7.1** (SEO/technical layer: crawler files, JSON-LD, FAQ). `SWEEP_7.1.md`.
- **Brand/marketing:** family colour system (blue AIOS / red AISolar / green AITeam / yellow
  accent) — supersedes monochrome. Truth-pass sweep removed SMS/"email+SMS" claims.
- **Kernel:** live + proven (routing, first cross-tenant transfer); harness v2, outbound
  executor, approvals UI, agent-gate — all built, awaiting GATE 0 flip.

## 7 · GATES & WHAT'S NOT BUILT (honest, from `THE_ONE_READ.md`)

| Gate | What | Owner | State |
|---|---|---|---|
| **GATE 0** | RLS advisories `fix_all_41`, Maps/Cal.com key rotation, old-keys-dead, git-history purge, deploy fns + bootstrap SQL + smoke | **Cal's hands** (runbooks ready) | ~60% |
| **GATE B** | OA/GRIDS/COMH alignment before ANY prod migration | **Cal** | OPEN (harder than 0) |
| Postmark DNS | per-brand sender signatures | Cal | OPEN |
| Legal numbers | CRO/VAT/RECI into Settings | Cal | OPEN — blocks NC6 at scale |
| Stream-3 split | installer-vs-referrer % | Cal | OPEN — blocks billing code |

**Not built (launch-critical):** A1 auth/tenant provisioning, A2 front-door lead creation
(booking must birth a lead — everything downstream waits on it), A9 real POV gating (demo
bypasses), A10 remove dummy-data path from prod. **Deploy-gated:** all DB persistence for the
field record + inbox + scheduling (Sweep 8, needs `coxmtpnq` access).

## 8 · FILE INDEX (where to look)

- **Estate map:** `docs/THE_ONE_READ.md` · **Deploy ledger:** `docs/SWEEP8_DB_WIRING.md`
- **Paperwork engine:** `src/lib/pdfFill.ts`, `src/lib/fieldRecord.ts`,
  `src/lib/companyCompliance.ts`, `scripts/pdf-{probe,verify}.mjs`
- **Installer/AIField:** `src/components/installer/JobViewV2.tsx`, `docs/AIFIELD_*.md`
- **Runtime:** `supabase/functions/agent-drain/index.ts`, `supabase/functions/_shared/email.ts`
- **Compliance spec:** `docs/COMPLIANCE_CHAIN_DESIGN.md`, `docs/COMPLIANCE_DATA_CAPTURE.md`,
  `docs/PAPERWORK_PRODUCT_BRIEF.md`
- **Strategy/founder:** `docs/FOUNDER_NOTES.md`, `docs/HANDOVER_ANSWER.md`,
  `docs/PRE_LAUNCH_HANDOVER.md`, `docs/READINESS_AND_MOAT.md`
- **Sweep 9 (smooth/harden):** `docs/SWEEP9_NOTES.md`, `docs/SWEEP9_TEAMS.md`

---

**Skills used:** aisolar-frontend, renewably-repo-workflow. **Standing orders honored:**
truth-pass (no fabricated integrations), no push without Cal's yes, great notes.
