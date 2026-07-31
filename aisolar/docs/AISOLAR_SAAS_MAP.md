# AISolar — the SaaS Map (the walk-through link tree)
### The working map of every page and surface. 30 Jul 2026.

## What we are about to do
The constitution is frozen and the kernel is sealed — the *truth layer* is done. Now we turn to **AISolar,
Domain 001: the proof that the whole model works in the real world.** The task is not to redesign it — it is
to **finish** it. We walk every page and surface of the SaaS, one at a time, hand in hand, and close the gap
between what the app *shows* and what it *does*: every faked send becomes a real send; every local-only state
becomes a persisted record; every stored interpretation that belongs on the event chain moves there; every
demo shortcut comes out. We complete the **Sweep 8** wiring, harden to the **Sweep 9** bar, and hold the
**truth-pass** on every line — no SMS/WhatsApp/roof-detection claims, grant *tracks-never-submits*,
field capture *attested-never-verified*. This document is the map we walk: every surface, its real state, and
what it needs to be finished and honest. When we reach the end of it, AISolar is complete, verifiable, and
ready to be **admitted above the kernel — never inside it.**

**How we use it:** top to bottom, surface by surface. For each, we confirm what's real, wire what's faked
(from `SWEEP8_DB_WIRING.md`), harden it, truth-pass it, and tick it. Nothing skipped.
**Legend:** ✅ real · ⏳ partial · ⬜ to wire · ⛔ gate. Cross-refs are Sweep-8 item IDs.

---
## Layer 0 · Public / Marketing — the storefront *(truth-pass only, no backend)*
| Route | Surface | Purpose | State + to-finish |
|-------|---------|---------|-------------------|
| `/` `/aios` | [`AiosPage`](../src/pages/AiosPage.tsx) | AIOS parent landing | ✅ · copy accuracy + new snapshots (9.2), per-page meta |
| `/aisolar` | [`AISolarLanding`](../src/pages/AISolarLanding.tsx) | the AISolar offer | ✅ · same |
| `/aiteam` | [`AiTeamPage`](../src/pages/AiTeamPageV2.tsx) | AITeam offer (green) | ⬜ verify built-to-standard (9.4) |
| `/pricing` | [`PricingPage`](../src/pages/PricingPage.tsx) | €197/€497/€997/custom | ✅ · confirm current tiers |
| `/agents` | [`AgentsPage`](../src/pages/AgentsPage.tsx) | public agent transparency | ✅ · text = `agents.ts` (feeds it) |
| `/docs` `/about` `/faq` `/blog` `/blog/:slug` `/privacy` `/terms` | Docs, AboutUs, FAQ, Blog, BlogArticle, Privacy, Terms | static | ✅ · truth-pass + blog depth (9.2) |

## Layer 1 · Capture / Front Door — the funnel entry
| Route | Surface | Purpose | State + to-finish |
|-------|---------|---------|-------------------|
| `/start` `/upload` | [`StartAnalysis`](../src/pages/StartAnalysis.tsx) | bill upload/manual → estimate → book | ⬜ **A2 — booking must CREATE a lead via `ingest-lead` → `LeadCreated`.** *highest-leverage: everything downstream waits on a lead existing.* |
| `/calculator` `/embed` | [`ROICalculator`](../src/pages/ROICalculator.tsx) / CalculatorWidget | ROI + tenant-branded embed | ⏳ **A7** — posts to `ingest-lead` ✓; drawn-array carry-through onto the lead open |

## Layer 2 · Auth / Onboarding — *launch-critical, the funnel's other end*
| Route | Surface | Purpose | State + to-finish |
|-------|---------|---------|-------------------|
| `/auth` `/get-started` | [`AuthPage`](../src/pages/AuthPage.tsx) | signup / login | ⬜ **A1** — signup + first-admin bootstrap (`AUTH_RUNBOOK`) |
| `/onboarding` | [`OnboardingMode`](../src/pages/OnboardingMode.tsx) | tenant provisioning | ⬜ **A1** — create boundary + `RoleGranted` + choose role |

## Layer 3 · The Workbench — the four role surfaces
### 3a · Owner — `/owner` → [`OwnerCockpit`](../src/components/owner/OwnerCockpit.tsx) *(1122 lines)*
Sub-surfaces: **Agents** (`AgentWindow` ×10 + `SchedulingTransparency`) · **Finance** (`FinanceWindow`) ·
**Analytics** (`AnalyticsDashboard`) · **Settings** (`SystemSettingsV2`) · **Compliance** (`PaperworkWindow`).
State: ✅ demo-honest + click-tested (27–30 Jul). ⬜ to wire: FinanceWindow deposit link → `create-checkout`;
Consultant/Installer invites → auth invite + `grant_role`; PaperworkWindow release-pack; Help-us-improve →
`feedback`; products → table; Analytics/agent-impact → real `agent_runs` queries; **A4/A5** settings + ai_config persist.

### 3b · Consultant — `/consultant` → [`ConsultantCockpitV5`](../src/components/ConsultantCockpitV5.tsx) *(955)*  ·  `/lead-flow` → [`LeadFlow`](../src/components/LeadFlow.tsx) *(1274)*
Pipeline + inbox + the lead's journey. Inside LeadFlow: [`DesignStudio`](../src/components/leadflow/DesignStudio.tsx) *(767)* → [`ProposalView`](../src/components/ProposalView.tsx) *(473)* → [`EstimateView`](../src/components/EstimateView.tsx).
State ⬜ to wire: `handleSendReply`→`touchpoints`+Postmark+Realtime; `advanceLeadStage`→`workflow_stage`(+`StageTransitioned`);
`saveLeadForm`→`leads`; chat chips (book survey / request photos / send proposal / deposit link); **ProposalView GateCheck**
= the human send (draft→sent, email+magic-link, both-ends); **DesignStudio persist** (geometry/strings → the lead, append-only versions); the **0.70 self-consumption kill** (drafter stores `selfConsumptionFromOccupancy()`).

### 3c · Installer (AIField) — `/installer` `/job` → [`JobViewV2`](../src/components/installer/JobViewV2.tsx) *(1407)*
Staged checklist → commissioning serials (triple-check) → handover (4 certs + the **ESB Submission Pack**) → signature.
State: ✅ NC6 self-completion + ESB pack built + pdf-verified. ⬜ to wire: photos → storage + `install_evidence`;
serials → `installed_equipment` (`InverterConnected`); signature hash on the record (`SignOffCaptured`); start-job → real notify;
mismatch → office before NC6. *(Attested, never verified.)*

### 3d · Customer — `/my-projects` → [`CustomerPortalV2`](../src/components/customer/CustomerPortalV2.tsx) *(524)*  ·  `/p/:leadId` → [`CustomerProposal`](../src/components/customer/CustomerProposal.tsx) *(561)*
State ⬜ to wire: Ask-AI → **guardrailed** LLM (9.0 / L4) + persist + notify consultant; callback → record + notify;
documents view/download → signed URLs; **Pay** → `create-checkout`; **Sign** → e-sign; PreSurveySnaps → storage;
`onAccept`→`ProposalAccepted`, `onPayDeposit`→`DepositPaid` (kernel emit). GDPR: consent → `ConsentCaptured`.

## Layer 4 · Agent Console — `/agent-console` → `AIConfig` / `AgentTraining`
⬜ **A5** — per-agent model + cost-cap UI → `ai_config` (server cap exists; the UI persist doesn't).

---
## Cross-cutting laws — touch every surface above
`L1` both-ends notify · `L2` numbers-through-spine (0.70 kill) · `L4`/`9.0` AI guardrail (no cross-tenant leak) ·
`L5` white-label (`useTenantBrand`) · `L6`/`D2` kernel emit (`kernelVocabulary`) · **A9 demo-OFF in prod** ·
**A10 remove dummy data** (`generateDummyLeads` — 12/18 files, count TBC) · RLS per-POV isolation proof.

## Gates (block the finish line)
- **GATE 0** — RLS advisories, Maps/Cal.com keys, git-history purge, deploy + bootstrap + smoke. *(Cal's hands, ~60%.)*
- **GATE B** — no prod migration until OA/GRIDS/COMH aligned. **Every kernel-touching change parks here.**

---
*The walk starts at Layer 0 and ends at the gates. Each surface: confirm real → wire fakes → harden → truth-pass → tick.*
