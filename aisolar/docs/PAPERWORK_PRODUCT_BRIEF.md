# The Paperwork Engine — standalone product brief (Cal's side quest, 28 Jul)
> "If no lead ever passed through and no bill was read — what would it take
> for one product to write the NC6/NC7 + grant file for itself?"

> **⭐ SUPERSEDED for CURRENT STATE → see [`PAPERWORK_AUDIT.md`](PAPERWORK_AUDIT.md) (1 Aug).** This brief is the
> *vision/product* framing and still stands. The **build state** (what's done vs open) is now the audit: the engine —
> NC6/NC7 fill + calibration, NC5 AcroForm, the sealed submission pack, `decideCompliance` routing, `nc6Completeness`
> gate — is **built (✅ SUPERSEDED)**. Open/⚠️ items live in the audit: the `tenant_settings` CHECK bug (company block +
> pricing rejected), doc-id vocab mismatch, `lead_documents` never inserted (Sweep 8), NC8 overlay, and the
> VERIFY-BEFORE-LIVE ESB-policy flags. Read the audit for truth; read this for the why.

## The answer: it already ~exists inside AISolar. Extraction, not invention.
Composition (all built): Company & compliance settings (RECI/CRO/SEAI IDs) +
product records (type-test, ratings) + ONE manual job form (survey's
phone-mode pattern: customer, MPRN, Eircode, phase) + commissioning capture
(fitted/serial/AC kW/export + triple check) + `complianceDecision` (which
form) + `pdfFill` (the render) + grant tracker + the evidence pack. No
agents. No funnel. Software + automation only.

## Why it sells alone
- The pain is priced: **€300–400/job of paperwork** (the wholesaler's own number).
- Every installer needs it even if they never want an autonomous business.
- **The conversational opener + doorway**: buy the paperwork engine → one
  upsell from AIField → the OS. Fits the ladder as the entry tier; tier
  lock-off applies.
- Nobody else in Ireland automates NC6/NC7 + grant end-to-end. Deep, local,
  dull, defensible — the moat in its purest form.

## Shape (when we lift it)
One screen in, three artifacts out: job entered/imported → commissioning
attested → NC6/NC7 + DoW + grant file complete themselves. White-label,
per-tenant. Working name TBD by Cal — not christened here.

_Filed for the offer-ladder session. Skills used: stop-slop._
