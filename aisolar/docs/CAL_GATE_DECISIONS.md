# CAL'S GATE — decisions only you can make

One-page tick list. **Nothing here is coding.** Each item is a yes/no from you.
When every box is ticked, the squad proceeds Sprint 2 → you run the deploy gate → smoke test → live.

---

## A · A1 AUTH / ONBOARDING — the only build blocker

The signup→tenant door is waiting on **your** TS functions. Pick ONE:

- [ ] **I'm dropping my own auth functions into RAW** → squad reconciles A1 to them (your functions win)
- [ ] **"BUILD WITHOUT"** → squad builds A1 from `ONBOARDING_SPEC.md` slot ④: signup → tenant auto-created → 7-day trial → first-admin bootstrap

> Until you pick, Sprint 2B's first item is a question mark, not a task.

---

## B · STATUTORY FLAGS — Cal's yes required (launch blockers the moment you go live)

**1. ESB micro-gen bands**
Code uses 6/11 kW. The rule is 25 A/phase = **5.75 kVA single-phase / 11.04 kVA three-phase**. We under-file at exactly 5.75–6.0 kW single-phase.
- [ ] **YES** — NC pack submits the correct kVA band → ship
- [ ] **NO** — fix the band math before live
- *Check: open an NC pack, does it show the right kVA?*

**2. Typed e-signature on NC6**
- [ ] **YES** — pack states "print, sign & date by hand" (wet-ink fallback) → ship
- [ ] **NO** — wait for ESB confirmation of typed sig

**3. NDMG + ACA commercial grant figures**
- [ ] **YES** — match the current SEAI PDF → ship
- [ ] **NO** — re-pull SEAI numbers before any commercial proposal shows them

---

## C · RLS FLOOR — written, correct, NOT yet applied to live V5

The cross-tenant bleed fix (`20260802_rls_floor_extension.sql` + `20260802_tenant_settings_pricing_key.sql`) is in your pushed branch and the SQL is sound. It has **not** been run against live V5 yet.

- [ ] **I'll run `supabase db push` at the deploy gate** (applies both migrations)
- *Until pushed, live V5 still has the 5 loose tables (tenant_settings / conversation_messages / sources / products / feedback) open to any signed-in user of any tenant.*

---

## DONE WHEN
**A** picked · **B** all three yes/no'd · **C** push scheduled → squad clears Sprint 2 → your deploy gate → smoke test → cohort comes in.
