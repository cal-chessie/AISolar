# THE NETWORK RULING — tenant · brand · source · boundary, and the 32-county rollout
### 30 Jul 2026 · Claude's architecture ruling, commissioned by Cal ("i need you to tell me")
> Grounded on: the two OA docs (`OA CDT AI RWA M2M` + `AIOS Kernel`, read in full 30 Jul),
> `ORDINAL_KERNEL_REVIEW_CLAUDE_v1.md` v1.1 (the freeze + Boundary primitive), ARCH_SPINE's
> four-rubric split decision, the live kernel state (verified 20 Jul, re-accessible today),
> and the repo as it stands. Verdicts marked RIGHT / CORRECTION / DECISION-FOR-CAL.
> This ruling is the Gate B alignment artifact: when Cal ratifies it, the bridge opens.

---

## 0 · The one-sentence result

**Your network design is constitutionally sound — the confusion is only that four
different things have been sharing the word "tenant," and the kernel review already
minted the correct word: BOUNDARY.** Separate the four (boundary / app-tenant / brand /
source) and every question you asked answers itself — including Britain, including the
VPP, including the 100 sites.

---

## 1 · The 32-county logic — VERDICT: RIGHT (two corrections)

The shape: national brands generate demand → county brands capture it locally →
installers fulfil it under their own name. That is a two-sided network where you own
the demand side and franchise the supply side. It is right because:

- **Provenance is provable.** The kernel chain records lead origin immutably (origin
  never changes; custody moves by paired transfer events — live-proven 20 Jul, RI →
  Solar Roscommon in 1.4s, all events chain-signed). Provable provenance = enforceable
  royalty splits = the "payments never seen before" flywheel. The trust the 32 give you
  is repaid in receipts, not promises. No competitor can fake that trust layer.
- **The moat is distribution + data, not code.** 32 exclusive county relationships +
  every commissioned roof in the record. SaaS can be copied; a franchised county
  network with a hash-chained history cannot.

**CORRECTION 1 — exclusivity must be earnable and losable.** "Own their county" needs
performance floors (response SLA, close-rate window, compliance record — all already
measured by the app) and a reversion clause. Otherwise one dead installer padlocks a
county. The chain gives you the evidence to enforce this without argument.

**CORRECTION 2 — waves, not big-bang.** Offer grandfathered terms to all 32 now
(scarcity is real: one per county, first mover keeps it). Onboard 3 → 10 → 32.
Routing is proven at one county; ops (support, onboarding, migration QA) are not
proven at 32. The grandfather OFFER scales instantly; the ONBOARDING must not.

---

## 2 · Tenant vs brand — VERDICT: CORRECTION (the four-layer split)

"Each brand right now is a tenant" was the v1 scaffolding. The constitutional form,
using the kernel review's own primitive:

| Layer | What it is | Lives | Examples |
|---|---|---|---|
| **BOUNDARY** (kernel) | a party with custody — one chain each | kernel (`tenants` today, Boundary by law) | AIOS Platform · Renewable Ireland · Solar Ireland · Solar Roscommon (county unit) · Saunderson Solar Ltd |
| **APP TENANT** | the business account that logs in, owns app data, pays | AISolar DB | Saunderson's company — ONE login for his team |
| **BRAND** | a marketing identity — N per app tenant | AISolar DB (`brands`) | "Solar Roscommon" (licensed) + "Saunderson Solar" (his own) |
| **SOURCE** | a registered inbound door — N per brand, each with its own signed key | AISolar DB (`sources`) | solarroscommon.ie · sandersonsolar.ie · his 3rd site · an embed widget · a campaign |

**The law that was already yours:** the four lead dimensions — `tenant / owner / brand /
source` — never collapse. You wrote that before you asked this question. The v1 app
collapsed them because it served one tenant; Sweep 8 un-collapses them.

**The county unit is the durable boundary; the installer OPERATES it.** If Saunderson
ever leaves, Solar Roscommon (the franchise, its chain, its history) persists and a new
operator takes over. That operates-relationship is a kernel RELATIONSHIP — and this is
load-bearing: **your 32-installer network is the first real population of
`kernel.relationships`, the empty table the review named the missing middle of the
whole M2M chain (F1).** The franchise graph IS the authority graph. F1 (relationships
event-sourced: RelationshipAsserted/Revoked) is therefore not a someday-M2M item — it
is a rollout prerequisite, parked only behind Gate B.

**Two custody cases per installer (already priced in ARCH_SPINE's four rubrics):**
- Lead born on the COUNTY brand (solarroscommon.ie) → custody: county boundary →
  franchise economics (normal rubric 70/20/10).
- Lead born on the installer's OWN brand (sandersonsolar.ie) → custody: his boundary →
  SaaS economics (saas rubric ~20%+fee).
Same app tenant, same login, two custody contexts. The four dimensions carry it.

---

## 3 · Is AISolar a tenant or the platform? — VERDICT: NEITHER

- **AIOS is the platform.** The kernel + the constitutional stack. (Cal's instinct,
  confirmed: "make the aios the platform if anything / its the kernel really.")
- **AISolar is Domain 001 — an application.** Software is not a party; it holds no
  boundary, no chain, no identity. The businesses USING it are the parties. "Do not
  make AISolar the foundation. Make AISolar the first proof the foundation works."
- **The AIOS Platform steward boundary already exists in the kernel** — that's where
  platform-level custody sits. Nothing to add.

**Britain (the 10/20-year test, straight from the OA doc):** the kernel's final test is
*"a solar company, a hospital, a logistics company and a government registry can all
connect without changing the kernel — TCP/IP for trusted state."* Britain is that test
run for real: clone the AISolar **deployment** with a **jurisdiction pack** (UK grant
scheme swaps for SEAI; DNO G98/G99 swaps for ESB NC6/NC7; £; DNO map swaps for county
map) — **zero kernel changes.** If the Britain clone ever requires a kernel change, the
kernel has failed CDT and we fix the kernel's boundary, not bend it. Jurisdiction
becomes config, not code: `jurisdiction_packs` (forms + grants + currency + grid
operator glossary) is the app-side shape to build toward. Another vertical slots on the
same way: new domain ontology above the kernel, kernel untouched.

---

## 4 · The 100 marketing sites — VERDICT: one door, many keys (the standard)

**Marketing sites never become app deployments.** They stay static (cheap, fast,
SEO-dense) and post into ONE door. 100 sites = 100 static fronts + 1 ingest door + 0
extra app deployments. This is how it scales to 32 counties × N sites each.

**The integration standard (Cal asked: webhook / widget / login?):**
1. **Signed webhook POST → `ingest-lead`** (server-to-server) — EXISTS. Needs the
   upgrade below.
2. **Embed widget** (the tenant-branded calculator, `/embed`) — EXISTS. Drops into any
   site; posts to the same door.
3. **Hosted link** (`/start?src=…`) for zero-code sites — near-exists.
4. **Login/SSO for marketing sites: NO.** Brochure sites are anonymous demand
   generators, not authenticated actors. Authentication is for operators (app tenants)
   and, later at the M2M horizon, for machine counterparties via the Conformance
   Manifest — never for a landing page.

**The one build this needs — the SOURCE REGISTRY (Sweep 8 item):**
- `sources` table: `source_key → {app_tenant, boundary, brand, domain, label}`.
  Replaces the single `AISOLAR_TENANT_ID` env stamp (v1 single-tenant wiring).
- Each site/widget/campaign gets its own key → every lead is born carrying
  `{source, brand, owner-boundary}` — untampered provenance from the first byte.
- **Provenance on the intake card (the field Cal had in v1 and lost):** "Born:
  solarroscommon.ie · county brand · 14:02" + the 21-field bill extract attached. The
  data mostly exists (`ingest-lead` dedupes by email+brand already; extraction
  persists); the missing part is the sources table + the UI line.

**The flow, 32×:** solarroscommon.ie generates → lead born {source: solarroscommon.ie,
brand: Solar Roscommon, custody: county boundary} → kernel routes if born national →
installer's app fires the estimate under **Saunderson Solar's** details (installer is
the face — correct and stays) → sandersonsolar.ie submits the grant → every hop an
event on the chain.

---

## 5 · The stealth VPP — VERDICT: RIGHT, and stronger than you said

The OA doc's VPP reference model needs: House · Battery · Inverter · Owner ·
Aggregator · Grid · Market · Agent — in kernel primitives. Look at what the
commissioning gate already captures per install: **MPRN (grid identity) · inverter
serial + model (device identity) · AC rating (capability) · export limit (dispatch
envelope) · attested-by-named-installer (evidence + authority) · location.** That is a
VPP asset node record, produced as a *side effect of compliance paperwork*. Nobody
looking at "solar SaaS" sees that the boring NC6 layer is building a verified,
maintained, relationship-attached asset registry — and the 32 installers are the
physical service network a VPP operator needs and can't conjure.

**Guards (claims discipline):** (1) the DNO/grid_node axis is NOT yet on kernel
identities — the standing note says add before assets; that's now a real pre-VPP task,
not a someday. (2) Enode software-VPP phase precedes hardware. (3) NEVER market it.
Rung: hypothesis. The rails stay invisible until they're real.

---

## 6 · DECISION-FOR-CAL — the one fork only you can call

**App multi-tenancy model.** Today's app is wired one-tenant-per-deployment
(`AISOLAR_TENANT_ID` env). For 32→100s:

- **RECOMMENDED: ONE AISolar deployment, one DB, `tenant_id` + RLS isolation.**
  Industry standard to thousands of tenants. One migration run, one function deploy,
  one version — for everyone. The A9 RLS floor becomes launch-critical (it already
  was). Kernel keeps the boundaries; the app keeps the tenants.
- Rejected: per-tenant Supabase projects. 32 projects = every schema change ×32,
  every edge deploy ×32, drift guaranteed. That's how estates die. (Per-tenant
  isolation returns later as an enterprise SKU if ever needed, and Britain is its own
  deployment by jurisdiction, not by tenant.)

Ratify this and Sweep 8's true scope is fixed: tenant resolution moves from env var to
auth (JWT `app_metadata.tenant_id`), RLS by tenant on every table, the source registry,
brands table, provenance UI.

## 7 · The deployment path (constitutional grade, stealth, in order)

1. **GATE 0 closes** (Cal's hands: RLS advisories, key rotations, history purge,
   deploy + bootstrap + smoke — runbooks written).
2. **This ruling ratified = Gate B alignment done** (this document IS the alignment
   conversation, written down).
3. **Sweep 8 executes** against §6: multi-tenant floor + source registry + brands +
   provenance + the ESB-pack persistence migration (already written, re-verified
   against live in the audit).
4. **Kernel post-Gate-B hardening** (from the review, add-only): F1 relationships
   event-sourced (the franchise graph) · F2 event_types layer column · F3
   CommandIssued/Resolved · F4 time law · F5 Conformance Manifest v0.1 — then the
   pen goes down (freeze accepted).
5. **Wave 1: Roscommon end-to-end** (site → lead → estimate → grant → NC6 pack →
   receipt on chain). One county proves the whole rail.
6. **Waves 2–3: 10 → 32**, grandfather offer out to all counties on day one.

---

*Nothing here changes Cal's rulings; it executes them. The kernel stays neutral; the
franchise network becomes its first relationship graph; AISolar remains the proof.
Skills used: agent-frameworks (architecture), renewably-repo-workflow (notes law).*
