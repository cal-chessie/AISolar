# Compliance data capture — where every missing field comes from

_Running punch-list for the final pass. Started 25 Jul 2026._

The NC6/NC7 overlay now fills correctly (verified). What stops a form going out
is **missing inputs**, and several have nowhere to be entered today. This maps
every field to the screen that should own it.

**Rule of thumb:** capture each fact once, at the moment it's naturally known, in
the place the person who knows it already works. Nothing typed twice.

---

## A · Owner → Settings → **"Company & compliance"** (new section, set once)

These are true for every job, so they belong to the company, not the form.
Today `brand.legal` has the keys but they're **empty strings** and there is no UI
to fill them — `SystemSettingsV2` only exposes integration credentials.

| Field | Used by | Today |
|---|---|---|
| **Safe Electric / RECI contractor number** | NC6 §3, NC7, RECI cert | `brand.legal.reciNumber` = `''` — no UI |
| CRO number | DoW, invoices | `companyNumber` = `''` |
| VAT number | invoices | `vatNumber` = `''` |
| SEAI registered installer ID | SEAI grant application | `seaiCompanyId` — flagged "needs Cal's number" in docTemplates |
| Registered address | all forms | present |
| Company landline + email | NC6 §3 correspondence | contact exists, not wired to forms |

**Build:** a "Company & compliance" card in Settings, above integrations. Every
field feeds `esbReadiness()` so filling it visibly clears blockers on live jobs.

---

## B · Owner → Installers → **add/edit installer** (per person)

Installer records are currently `{ id, name, skills }`. NC6 §3 wants the
*correspondence details of the installer*, so the person needs contactable
fields of their own.

| Field | Why |
|---|---|
| **Mobile + email** | NC6 §3 installer correspondence; also how the crew gets job notifications |
| **Individual Safe Electric reg** (if they hold one) | some crews sign under their own reg, not the company's |
| Registration expiry date | so an expired installer can't be assigned to a job — catch it at assignment, not at filing |
| Qualification / cert uploads | the RECI cert is an upload today with no home to upload it *to* |

**Build:** extend the add-installer form. Expiry should surface as a warning on
the installer list and block assignment when lapsed.

---

## C · Products → **per equipment model** (set once per product)

The NC6 §5 table wants numbers that live with the equipment, not the job.
`productCatalog` has `spec` and an optional `datasheet` — that's it.

| Field | Used by |
|---|---|
| **Rated current (Amps)** | NC6 §5 — "not to exceed 25A single phase / 16A per phase three phase" |
| **Type test certificate ref + PDF** | NC6 §4/§5 — "attaching the Type Test Certificate for each inverter" |
| Manufacturer, split from model | NC6 §5 has separate "Manufacturer" and "Model" rows; we hold one combined string |
| Energy source code (`P` for PV) | NC6 §5 row — derivable, just needs stating |
| Inverter capacity (kVA) vs kW | the form asks kVA; we hold kW |

**Build:** extend the product record. These are entered once per model and then
every job using that inverter fills itself.

---

## D · Installer app → **at commissioning** (per job) — Cal's photo-scan idea

Crews already photograph the equipment plates. Point the same extraction we use
on bills at those photos and the serials capture themselves.

| Field | Why it matters |
|---|---|
| **Panel serial numbers** | warranty claims, and proof of what was actually fitted |
| **Inverter serial + model confirmation** | the form must describe what's ON the roof, not what was quoted |
| Fitted-vs-specified diff | if the crew substituted a model, the NC6 is wrong unless it's caught here |

**Build:** photo → OCR the manufacturer/model/serial off the plate → pre-fill,
crew confirms. Same pattern as the 21-point bill read, pointed at equipment.
This is the one that makes the compliance pack self-assembling.

---

## E · Bill read / survey → **already captured, but gapping**

| Field | State |
|---|---|
| **Eircode** | extractor supports it; frequently empty → currently the #1 NC6 blocker after RECI |
| Supply phase | derived by `decideCompliance` from the survey — fine, but only if a survey exists |
| **"Is this the first microgenerator at these premises?" (Y/N)** | NC6 §2 asks it. **Captured nowhere.** Add to the survey |
| Customer landline (as well as mobile) | NC6 §1 has both boxes |

---

## F · Still unmapped on the form itself

Known, deliberately not yet placed on the overlay:

- **NC6 page 3 protection settings table** — per-parameter trip settings with a
  "Confirm Settings Applied (Y/N)" column. Values are standard per inverter
  model, so this should come from the product record (§C) once type-test data
  is held.
- **NC6 §2 first-microgen Yes/No tick** — needs the field from §E first.
- **NC7 MEC/MIC** and the export-limitation detail.
- **Signature placement** — the drawn-signature pad exists in JobViewV2; the
  eIDAS approach is noted in `pdfFill.ts` but no signature is placed on a form
  yet.

---

## Suggested order

1. **§A Company & compliance in Settings** — smallest change, unblocks every job
   at once (RECI is currently blocking *all* of them).
2. **§E Eircode + first-microgen** — the other live blockers.
3. **§B installer contact + reg** — needed before real crews are assigned.
4. **§C product type-test + rated current** — unblocks NC6 §5 and page 3.
5. **§D photo-scan serials** — the big one; makes the pack self-assembling.

_Add to this list as more gaps surface. Every item here is a field that today
stops a form being submitted._
