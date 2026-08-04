/**
 * pdfFill — pre-filled ESB paperwork, from the record to a PDF.
 *
 * Cal: "make it so the new customer info slots right in from the automatic
 * data we capture from 21 on the electric bill to the end."
 *
 * REALITY: ESB ship the NC6/NC7 as FLAT PDFs (zero form fields — verified),
 * which is why installers hand-write them. Two modes:
 *
 *  1. DATA APPENDIX (live now): the official form, untouched, with an
 *     appended typed page carrying every captured field — bill read, survey,
 *     design, tenant — laid out A4-clean. The installer transcribes or
 *     staples; nothing is ever mis-placed on ESB's own pages.
 *  2. COORDINATE OVERLAY (calibrated + verified): OVERLAY_MAPS below take
 *     {page,x,y} per field and draw straight into the form's boxes.
 *     Coordinates are MEASURED, not guessed — scripts/pdf-probe.mjs dumps each
 *     ESB label's baseline, scripts/pdf-verify.mjs draws the values and fails on
 *     overlap with ESB's own wording. 30 Jul full-coverage pass: 35/35 NC6
 *     placements clear (pages 1–3 incl. §4 route tick, §5 unit column, §5A,
 *     Table 1 confirm column, installer block) + 9/9 NC7; ticks additionally
 *     verified VISUALLY inside their boxes on the rendered form. NC6 pages 4–5
 *     are the pre-2022 legacy sections — BLANK BY DESIGN for new installs.
 *     Rerun probe + verify + a visual pass when ESB revise a form.
 *
 * Signatures: eIDAS "simple electronic signature" — the drawn signature
 * (the pad already in the app) placed as an image + the kernel's append-only
 * event as the audit trail (who/when). Valid for these documents under the
 * E-Commerce Act 2000/eIDAS; QES not required. RECI certs are NEVER filled
 * or signed here — Safe Electric issues those.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { DummyLead } from '@/lib/dummyData';
import { getFieldRecord } from '@/lib/fieldRecord';
import { getTenantBrand } from '@/lib/tenantBrand';
import { getCompanyCompliance } from '@/lib/companyCompliance';
import { brand } from '@/config/brand';
import { decideCompliance } from '@/lib/complianceDecision';
import { sealSubmission, recordDocument } from '@/lib/paperTrail';

type EsbForm = 'NC6' | 'NC7' | 'NC8' | 'NC5';

/**
 * Per-form {page,x,y,size?} maps for true in-box overlay.
 *
 * CALIBRATION METHOD — reproducible, not eyeballed:
 *   node scripts/pdf-probe.mjs public/forms/esbn-form-nc6.pdf <page>
 * dumps every label with its exact baseline {x,y} in PDF user space. pdf.js and
 * pdf-lib share a bottom-left origin, so a probed y drops straight in here.
 * Values sit on the SAME baseline as their label, starting just right of where
 * the label ends (label x + width + a few pt of gap).
 */
const OVERLAY_MAPS: Record<EsbForm, Array<{ field: string; page: number; x: number; y: number; size?: number; bold?: boolean; maxW?: number }>> = {
  // NC6 — 595x842pt, 6 pages. Page 1 sections 1–3, page 2 section 5 table.
  // Re-verified 25 Jul 2026 against probed label positions; two coordinates
  // from the first pass were wrong and are corrected below.
  NC6: [
    // § 1 Customer's full name and site address (free block, y 460–515)
    // comb pitch = the box cell width; size bumped so the letters fill the cells.
    { field: 'Customer name', page: 0, x: 110, y: 494, size: 12, bold: true, maxW: 425 },
    { field: 'Installation address', page: 0, x: 110, y: 471, size: 12, bold: true, maxW: 425 },
    // FIX: was x=492,y=442 — nowhere near the label. "Mobile number:" sits at
    // x=235 w=73 (ends 308) on baseline y=454, so the value goes at x=315.
    { field: 'Phone', page: 0, x: 315, y: 454, size: 12, bold: true, maxW: 130 },
    // "Email:" is x=40 w=28 (ends 68) on baseline y=414.
    { field: 'Email', page: 0, x: 75, y: 416, size: 12, bold: true, maxW: 460 },
    // FIX: was x=350,y=336 — that lands on top of the "Eircode:" label (x=358).
    // "Please provide 11 digit MPRN no:" is x=40 w=167 (ends 207) at y=332.
    { field: 'MPRN', page: 0, x: 215, y: 331, size: 13, bold: true, maxW: 110 },
    // NEW: "Eircode:" x=358 w=39 (ends 397) at y=332.
    { field: 'Eircode', page: 0, x: 402, y: 331, size: 13, bold: true, maxW: 90 },
    // § 3 Installer/Consultant details — same block offset as § 1 (header y=217)
    { field: 'Installer company', page: 0, x: 110, y: 193, size: 12, bold: true, maxW: 425 },
    { field: 'Installer RECI no.', page: 0, x: 110, y: 170, size: 12, bold: true, maxW: 425 },
    // § 5 Microgeneration details, page 2. "New Installation" Unit 1 column:
    // the 1PH/3PH pair for new-unit-1 sits at x=390/433, so the column reads
    // from x≈390. Row baselines probed off their labels.
    { field: 'Inverter make/model', page: 1, x: 390, y: 457, size: 7 },
    { field: 'Inverter rating (kW)', page: 1, x: 390, y: 441 },
    { field: 'Total DC capacity (kWp)', page: 1, x: 390, y: 389 },
    { field: 'Battery', page: 1, x: 390, y: 363, size: 8 },
    // ── FULL-COVERAGE EXTENSION (30 Jul) — pages 1–3 of 6. Probed via
    //    scripts/pdf-probe.mjs + the §4 box column pixel-scanned at x≈552;
    //    every placement gated by scripts/pdf-verify.mjs (overlap-fail) and a
    //    visual pass of the filled form. Pages 4–5 are the PRE-2022 legacy
    //    sections (5B/5C + Table 2) — for a NEW install they stay BLANK by
    //    design; filling them would be wrong. Page 6 has no fields.
    // § 2 (page 1): "Is this the first Microgenerator connection...?" Yes/No —
    // "Yes" ends x375 y294, "No" ends x416. Tick the confirmed answer only.
    { field: 'First connection yes', page: 0, x: 381, y: 291, size: 13, bold: true },
    { field: 'First connection no', page: 0, x: 421, y: 291, size: 13, bold: true },
    // § 3 correspondence (page 1): Landline x40, Mobile x235, Email x40 (y131)
    { field: 'Installer landline', page: 0, x: 95, y: 152, size: 12, bold: true, maxW: 125 },
    { field: 'Installer mobile', page: 0, x: 315, y: 152, size: 12, bold: true, maxW: 210 },
    { field: 'Installer email', page: 0, x: 80, y: 132, size: 12, bold: true, maxW: 455 },
    // § 4 (page 2): route boxes at right margin x≈552 — NC6 here is always the
    // NEW-microgen notification (option A). B/C are legacy — never ticked.
    { field: 'New install tick', page: 1, x: 549, y: 721, size: 13, bold: true },
    // § 5 "New Installation / Unit 1" column
    { field: 'Energy source', page: 1, x: 395, y: 495 },
    { field: 'Manufacturer', page: 1, x: 390, y: 472, size: 8 },
    { field: 'Rated current (A)', page: 1, x: 390, y: 420, size: 8 },
    { field: '1PH tick', page: 1, x: 416, y: 523, size: 12, bold: true },
    { field: '3PH tick', page: 1, x: 459, y: 523, size: 12, bold: true },
    { field: 'Type test yes tick', page: 1, x: 418, y: 317, size: 12, bold: true },
    { field: 'Settings yes tick', page: 1, x: 418, y: 270, size: 12, bold: true },
    // § 5A (page 2, bottom) — comb rows + cert ref + phase tick
    { field: '5A manufacturer', page: 1, x: 200, y: 168, size: 9 },
    { field: '5A model', page: 1, x: 105, y: 149, size: 7 },
    { field: '5A cert ref', page: 1, x: 330, y: 130, size: 8 },
    { field: '5A single tick', page: 1, x: 184, y: 87, size: 12, bold: true },
    { field: '5A three tick', page: 1, x: 240, y: 87, size: 12, bold: true },
    // Page 3 — TABLE 1 "Confirm Settings Applied (Y/N)" column + Installer
    // Details + the signature/date. The Y is drawn ONLY from the installer's
    // protectionConfirmed attestation. Signature = the named installer's TYPED
    // name (eIDAS simple e-signature, Cal 30 Jul) — backed by the drawn pad +
    // the kernel audit trail. VERIFY-BEFORE-LIVE: confirm ESB accept a typed
    // e-signature vs wet ink on the NC6 (policy read) — until then a wet sign
    // is the fallback and the pack says so.
    { field: 'Protection confirm 1', page: 2, x: 505, y: 724, size: 11, bold: true },
    { field: 'Protection confirm 2', page: 2, x: 505, y: 709, size: 11, bold: true },
    { field: 'Protection confirm 3', page: 2, x: 505, y: 694, size: 11, bold: true },
    { field: 'Protection confirm 4', page: 2, x: 505, y: 679, size: 11, bold: true },
    { field: 'Protection confirm 5', page: 2, x: 505, y: 663, size: 11, bold: true },
    { field: 'Protection confirm 6', page: 2, x: 505, y: 648, size: 11, bold: true },
    { field: 'Protection confirm 7', page: 2, x: 505, y: 596, size: 11, bold: true },
    { field: 'Installer name', page: 2, x: 118, y: 288, size: 9 },
    { field: 'Installer SafeElectric no.', page: 2, x: 437, y: 288, size: 9 },
    { field: 'Installer mobile', page: 2, x: 135, y: 273, size: 9 },
    { field: 'Installer email', page: 2, x: 372, y: 273, size: 8 },
    { field: 'Installer address', page: 2, x: 192, y: 257, size: 7 },
    { field: 'Installer signature', page: 2, x: 118, y: 221, size: 10 },
    { field: 'Signature date', page: 2, x: 88, y: 205, size: 9 },
  ],
  // NC7 — 595x842pt. Page 1 is a COMB form: each field is a row of individual
  // character boxes, so the value must sit ON the row's baseline or it reads
  // half a box out. Baselines re-probed 25 Jul 2026 and snapped; the first
  // pass was 2–15pt high on several rows (Site address 2 was 15pt out).
  // ESB want BLOCK CAPITALS — values are uppercased at draw time.
  NC7: [
    { field: 'Customer name', page: 0, x: 100, y: 633 },      // comb row x=38 w=522
    { field: 'Installation address', page: 0, x: 100, y: 605 },
    { field: 'Address line 2', page: 0, x: 100, y: 588 },     // was 590
    { field: 'Eircode', page: 0, x: 468, y: 588 },            // NEW — comb x=464 w=97
    { field: 'Phone', page: 0, x: 132, y: 554 },              // was 555; comb x=95 w=131
    { field: 'Email', page: 0, x: 140, y: 536 },              // was 540; comb x=63
    { field: 'Contact person', page: 0, x: 138, y: 500 },     // was 505; comb x=96
    { field: 'Site address 1', page: 0, x: 100, y: 459 },     // was 452; comb x=38 w=177
    { field: 'Site address 2', page: 0, x: 100, y: 442 },     // was 427 — 15pt out
  ],
  NC8: [], NC5: [],
};

/** NC5 is ESB's ONE genuinely fillable form (531 AcroForm fields, verified).
 *  True programmatic fill — field name -> value from the record. */
function nc5AcroMap(lead: DummyLead): Record<string, string> {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const p = lead.proposal;
  const addr = (((i.extracted_address as string) ?? lead.address) || '').split(',').map(x => x.trim());
  return {
    'Applicant name': (i.extracted_account_name as string) ?? lead.name,
    'Applicant address line 1': addr[0] ?? '',
    'Applicant address line 2': addr.slice(1).join(', '),
    'Telephone number': lead.phone ?? '',
    'Email address': lead.email ?? '',
    'Contact person': (i.extracted_account_name as string) ?? lead.name,
    'Site name and address line 1': addr[0] ?? '',
    'Site name and address line 2': addr.slice(1, 3).join(', '),
    'Eircode': ((i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0]) ?? '',
    'MEC required': p ? String(p.system_size_kw) : '',
    'Unit 1 Installed Generation Capacity': p ? String(p.system_size_kw) : '',
    'Total generation units inverters': p ? '1' : '',
  };
}

function collect(lead: DummyLead): Array<[string, string]> {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const p = lead.proposal;
  const threePhase = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');

  // THE FIELD RECORD WINS. What the crew attested at the commissioning gate
  // (fitted model, serial, AC rating, export setting — all off the plate)
  // overrides what the proposal designed. A statutory form must describe the
  // kit ON THE ROOF; the proposal is the fallback and is labelled as such.
  // Wrong-number rule: better honestly-missing (amber on the appendix) than a
  // designed value masquerading as a commissioned one — the old code put the
  // DC kWp in the AC-rating box and a hardcoded 'full export' in the
  // limitation box. Both lies are dead.
  const fr = getFieldRecord(lead.id);
  const gate = fr?.serials.confirmed ? fr.serials : null;

  // Company-level facts come from Owner → Settings (companyCompliance store) —
  // the RECI/SafeElectric number is a REAL captured value or an honest
  // placeholder, never a silent blank (A4 closed 30 Jul).
  const cc = getCompanyCompliance();
  const maker = ((gate?.fittedModel || p?.inverter_model || '').split(' ')[0] || '').trim();
  const installerName = lead.assignment?.installer_name;
  const signedOff = !!gate; // the commissioning gate is confirmed

  const rows: Array<[string, string | undefined | null]> = [
    ['Customer name', (i.extracted_account_name as string) ?? lead.name],
    ['Installation address', (i.extracted_address as string) ?? lead.address],
    ['Eircode', (i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0]],
    ['MPRN', (i.extracted_mprn as string) ?? lead.mprn],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Supply type', threePhase ? 'Three phase' : 'Single phase'],
    ['First connection', gate?.firstConnection === 'yes' ? 'Yes - first microgenerator at these premises'
      : gate?.firstConnection === 'no' ? 'No - awaiting ESB confirmation before connection'
      : '( confirm at commissioning )'],
    ['Inverter make/model', gate?.fittedModel || (p?.inverter_model ? `${p.inverter_model} ( as designed — confirm at commissioning )` : undefined)],
    ['Inverter serial', gate?.serial || '( captured at commissioning )'],
    ['Inverter rating (kW)', gate?.acRatingKw ? `${gate.acRatingKw}` : '( off the plate at commissioning )'],
    // "as per Type Test" — the CERTIFIED figure off the datasheet, entered by
    // the installer at the gate. Never derived (a derived amp is not a
    // type-test value).
    ['Rated current (A)', gate?.ratedCurrentA ? `${gate.ratedCurrentA}` : '( from the type-test cert at commissioning )'],
    ['Panels', p ? `${p.panel_count} x ${p.panel_model}` : undefined],
    ['Total DC capacity (kWp)', p ? String(p.system_size_kw) : undefined],
    ['Battery', p?.battery_model ?? 'None'],
    ['Export limitation', gate?.exportLimit || '( set + recorded at commissioning )'],
    ...(gate?.mismatchFlagged ? [['Fitted vs proposal', 'SUBSTITUTION RECORDED — installer note on the job record'] as [string, string]] : []),
    ['Manufacturer', maker || undefined],
    ['Energy source', 'P (Solar PV)'],
    ['5A cert ref', gate?.typeTestCertRef || '( type-test cert reference at commissioning )'],
    ['Installer company', getTenantBrand().proposalCompanyName || brand.legal.tradingName],
    ['Installer RECI no.', cc.reciNumber || '( Owner -> Settings -> RECI number )'],
    ['Installer name', installerName],
    ['Installer landline', cc.companyLandline],
    ['Installer mobile', cc.companyMobile],
    ['Installer email', cc.companyEmail],
    ['Installer address', cc.registeredAddress],
    // eIDAS simple e-signature: the named installer's OWN typed name, drawn only
    // once they've attested at the gate. Backed by the drawn pad + audit trail.
    ['Installer signature', (signedOff && installerName) ? installerName : undefined],
    ['Signature date', signedOff ? new Date().toLocaleDateString('en-IE') : undefined],
    ['Protection settings (EN 50549-1)', gate?.protectionConfirmed
      ? 'Table 1 applied & verified - Y (attested by the named installer)'
      : '( attested at the commissioning gate )'],
  ];
  return rows.map(([k, v]) => [k, v && String(v).trim() ? String(v) : '( not captured yet )']);
}

/** NC7 submissions bundle the whole family (per ESB's process page):
 *  main form + NC7-01 installation confirmation + NC7-02 ELS test +
 *  NC7-03 manufacturer's ELS declaration. NC6 is a single form. */
const FORM_PARTS: Record<EsbForm, string[]> = {
  NC6: ['/forms/esbn-form-nc6.pdf'],
  NC8: ['/forms/esbn-form-nc8.pdf'],
  NC5: ['/forms/esbn-form-nc5.pdf'],
  NC7: [
    '/forms/esbn-form-nc7.pdf',
    '/forms/esbn-nc7-01-installation-confirmation.pdf',
    '/forms/esbn-nc7-02-els-test.pdf',
    '/forms/esbn-nc7-03-els-declaration.pdf',
  ],
};

/**
 * nc6Completeness — the regulator gate. Lists every item still blocking a
 * filable NC6 (missing = blockers; the hand signature is ALWAYS separate and
 * never counted — it is the named installer's, on paper). `ready` means: print
 * it, sign it, send it.
 */
export function nc6Completeness(lead: DummyLead): { ready: boolean; missing: string[] } {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const cc = getCompanyCompliance();
  const fr = getFieldRecord(lead.id);
  const gate = fr?.serials.confirmed ? fr.serials : null;
  const missing: string[] = [];
  if (!(((i.extracted_mprn as string) ?? lead.mprn) || '').trim()) missing.push('MPRN');
  if (!cc.reciNumber) missing.push('SafeElectric/RECI no. (Owner -> Settings)');
  if (!cc.registeredAddress) missing.push('Installer address (Owner -> Settings)');
  if (!cc.companyEmail) missing.push('Installer email (Owner -> Settings)');
  if (!cc.companyMobile) missing.push('Installer mobile (Owner -> Settings)');
  if (!lead.assignment?.installer_name) missing.push('Named installer (assignment)');
  if (!gate) missing.push('Commissioning gate - serials confirmed on site');
  else {
    if (!gate.protectionConfirmed) missing.push('EN 50549-1 Table 1 settings attested');
    if (!gate.ratedCurrentA.trim()) missing.push('Rated current off the type-test cert (§5)');
    if (!gate.typeTestCertRef.trim()) missing.push('Type-test cert reference (§5A)');
    if (!gate.firstConnection) missing.push('First-connection Yes/No (§2)');
  }
  return { ready: missing.length === 0, missing };
}

// Brittleness guard (#8): the overlay coordinates are pinned to THESE exact ESB
// PDFs. If ESB revise a form its byte length + page count change and every
// coordinate is suspect — warn LOUDLY so nobody files a mis-placed form.
// Recalibrate via scripts/pdf-probe.mjs + pdf-verify.mjs, then update here.
const FORM_INTEGRITY: Partial<Record<EsbForm, { bytes: number; pages: number }>> = {
  NC6: { bytes: 240733, pages: 6 }, // sha256 12b: 821a5a321216430a (30 Jul 2026)
};
let integrityWarned = false;
function assertFormIntegrity(form: EsbForm, bytes: ArrayBuffer, doc: PDFDocument) {
  const exp = FORM_INTEGRITY[form];
  if (!exp || integrityWarned) return;
  if (bytes.byteLength !== exp.bytes || doc.getPageCount() !== exp.pages) {
    integrityWarned = true;
    console.warn(`[pdfFill] ${form} looks REVISED by ESB (bytes ${bytes.byteLength}≠${exp.bytes} or pages ${doc.getPageCount()}≠${exp.pages}). Overlay coordinates are no longer trustworthy — recalibrate (probe+verify) before filing.`);
    try { (window as { __esbFormRevised?: string }).__esbFormRevised = form; } catch { /* noop */ }
  }
}

/** Official form(s) + typed data appendix → returns a Blob for download. */
export async function fillEsbForm(lead: DummyLead, form: EsbForm): Promise<Blob> {
  const [first, ...rest] = FORM_PARTS[form];
  const bytes = await fetch(first).then(r => r.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  assertFormIntegrity(form, bytes, doc);
  for (const partUrl of rest) {
    const partBytes = await fetch(partUrl).then(r => r.arrayBuffer());
    const part = await PDFDocument.load(partBytes, { ignoreEncryption: true });
    const pages = await doc.copyPages(part, part.getPageIndices());
    pages.forEach(pg => doc.addPage(pg));
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // NC5: true AcroForm fill — the fields exist, so the record types itself in
  if (form === 'NC5') {
    const acro = doc.getForm();
    for (const [name, value] of Object.entries(nc5AcroMap(lead))) {
      if (!value) continue;
      try { acro.getTextField(name).setText(value); } catch { /* field renamed in a future revision — data page still carries it */ }
    }
  }

  const map = OVERLAY_MAPS[form];
  if (map.length > 0) {
    // Mode 2 — calibrated in-box overlay (BLOCK CAPITALS, per the form)
    const base = Object.fromEntries(collect(lead));
    const addr = (base['Installation address'] ?? '').split(',').map(x => x.trim());
    const data: Record<string, string> = {
      ...base,
      // NC6 has ONE long address comb row; NC7 splits across two
      'Installation address': form === 'NC6' ? (base['Installation address'] ?? '') : (addr[0] ?? ''),
      'Address line 2': addr.slice(1).join(', '),
      'Contact person': base['Customer name'],
      'Site address 1': addr[0] ?? '',
      'Site address 2': addr.slice(1).join(', '),
    };
    // NC6 ticks + attested-only values. The law: a tick that ATTESTS something
    // (type-test, Table 1 settings) is drawn ONLY from the installer's
    // protectionConfirmed at the commissioning gate; design facts (phase,
    // energy source, the new-install route) draw from the record. Empty string
    // = not drawn.
    if (form === 'NC6') {
      const frT = getFieldRecord(lead.id);
      const gateT = frT?.serials.confirmed ? frT.serials : null;
      const attested = !!gateT?.protectionConfirmed;
      const threePhaseT = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');
      const makerT = ((gateT?.fittedModel || lead.proposal?.inverter_model || '').split(' ')[0] || '').trim();
      Object.assign(data, {
        // Page-3 installer block: SafeElectric = the RECI number (same store).
        // Carries the '(' placeholder when unset → never drawn half-filled.
        'Installer SafeElectric no.': base['Installer RECI no.'] ?? '',
        // § 2 first-connection: tick the confirmed answer only (blank until set).
        'First connection yes': gateT?.firstConnection === 'yes' ? 'X' : '',
        'First connection no': gateT?.firstConnection === 'no' ? 'X' : '',
        'New install tick': 'X',
        'Energy source': lead.proposal ? 'P' : '',
        'Manufacturer': gateT ? makerT : '',        // statutory column: as-fitted only
        '1PH tick': threePhaseT ? '' : 'X',
        '3PH tick': threePhaseT ? 'X' : '',
        'Type test yes tick': attested ? 'X' : '',
        'Settings yes tick': attested ? 'X' : '',
        '5A manufacturer': gateT ? makerT : '',
        '5A model': data['Inverter make/model'] ?? '', // carries the '(' guard pre-gate
        '5A single tick': threePhaseT ? '' : 'X',
        '5A three tick': threePhaseT ? 'X' : '',
        ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(n => [`Protection confirm ${n}`, attested ? 'Y' : ''])),
      });
    }
    const pages = doc.getPages();
    for (const m of map) {
      const v = data[m.field];
      // Never draw a placeholder OR a designed-fallback into a statutory box —
      // the official page carries only captured/attested values; anything
      // provisional lives on the appendix, labelled. (Any '(' marks it.)
      if (!v || v.includes('(')) continue;
      const pg = pages[m.page];
      if (!pg) continue;
      const text = v.toUpperCase();
      const size = m.size ?? 10;
      // The §1/§3 free-text rows read weak in thin small Helvetica (Cal 4 Aug:
      // "hard to read… numbers too small"). Bold + a bump makes them legible and
      // clearly in the box row, without the per-cell drift a guessed comb pitch
      // caused. `maxW` shrinks a long value (a full address) to stay in the row.
      const useFont = m.bold ? bold : font;
      let sz = size;
      if (m.maxW) {
        const w = useFont.widthOfTextAtSize(text, sz);
        if (w > m.maxW) sz = Math.max(7, sz * (m.maxW / w));
      }
      pg.drawText(text, { x: m.x, y: m.y, size: sz, font: useFont });
    }
  }

  // Mode 1 — always append the typed data page (harmless alongside overlay)
  const page = doc.addPage([595, 842]);
  let y = 790;
  page.drawText(`${form} - PREPARED DATA (attach to the official form)`, { x: 40, y, size: 13, font: bold });
  y -= 18;
  page.drawText(`${lead.name} - prepared ${new Date().toLocaleDateString('en-IE')} - from the AISolar record (bill read -> survey -> design)`, { x: 40, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  // The regulator gate, printed ON the artifact: filable or not, and why.
  if (form === 'NC6') {
    const c = nc6Completeness(lead);
    y -= 14;
    const status = c.ready
      ? 'STATUS: READY TO FILE - print, sign & date by hand (never machine-signed)'
      : `STATUS: INCOMPLETE - ${c.missing.join(' | ')}`;
    page.drawText(status.slice(0, 118), { x: 40, y, size: 8, font: bold, color: c.ready ? rgb(0, 0.45, 0.2) : rgb(0.7, 0.45, 0) });
  }
  y -= 24;
  for (const [k, v] of collect(lead)) {
    page.drawText(k, { x: 40, y, size: 9, font: bold });
    page.drawText(v, { x: 240, y, size: 9, font, color: v.startsWith('(') ? rgb(0.7, 0.5, 0) : rgb(0, 0, 0) });
    y -= 16;
  }
  y -= 10;
  page.drawText('Signatures: signed by the account holder / Safe Electric installer - never machine-signed.', { x: 40, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

  const out = await doc.save();
  return new Blob([out], { type: 'application/pdf' });
}

export async function downloadEsbForm(lead: DummyLead, form: EsbForm) {
  const blob = await fillEsbForm(lead, form);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${form}-${lead.name.replace(/\s+/g, '-')}-prepared.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1] ?? '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** SHA-256 of the exact filled-NC6 bytes — the tamper-evident seal (#11/#12).
 *  Browser-side (crypto.subtle); the pack builder only ever runs in the app. */
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * buildSubmissionPack — THE selling point. ONE sealed PDF the installer takes to
 * the ESB portal, in order:
 *   (10) MANIFEST / checklist cover — what's in the pack + what's still
 *        outstanding, seen at a glance BEFORE the portal is opened.
 *   (1)  the filled official NC6 (overlay + prepared-data appendix).
 *   (2)  the ESB PORTAL ENTRY SHEET — every real value, top-to-bottom, for
 *        error-free re-keying (ESB killed email over data-entry mistakes; this
 *        eliminates them — the wedge).
 *   (3/9) the attachments ESB require bundled: Safe Electric (RECI) cert, signed
 *        Declaration of Works, inverter type-test cert, and the single-line
 *        diagram (SLD).
 *   (11) ATTESTATION & AUDIT TRAIL — who attested, when, eIDAS simple-signature
 *        note, and a SHA-256 seal of the exact filled-NC6 bytes.
 *   (12) tamper-evident PDF metadata (Title/Author/Subject/Keywords/Producer)
 *        carrying MPRN + RECI + the NC6 seal. Overlay values are drawn onto the
 *        content stream (not editable form fields), so the filed form can't be
 *        silently re-typed.
 * Client-side today; DB persistence + real submission/notify are Sweep 8 (M1-M3, X1).
 */
export interface SealedPack { blob: Blob; sha256: string; pageCount: number; mprn: string; installer: string; reciNo: string; }

export async function buildSubmissionPack(lead: DummyLead): Promise<SealedPack> {
  const nc6Bytes = await (await fillEsbForm(lead, 'NC6')).arrayBuffer();
  const nc6Hash = await sha256Hex(nc6Bytes);            // (11)(12) seal of the filled NC6
  const doc = await PDFDocument.load(nc6Bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const c = nc6Completeness(lead);
  const fr = getFieldRecord(lead.id);
  const base = Object.fromEntries(collect(lead));
  const real = (k: string) => { const v = base[k]; return v && !String(v).startsWith('(') ? String(v) : ''; };
  const mprn = real('MPRN'), installer = real('Installer name'), reciNo = real('Installer RECI no.');

  // (3/9) the attachments ESB require bundled with the NC6.
  const certs: Array<[string, import('@/lib/fieldRecord').CertFile | undefined]> = [
    ['Safe Electric (RECI) certificate', fr?.certs.reci],
    ['Signed Declaration of Works (-> BER assessor)', fr?.certs.dow],
    ['Inverter type-test certificate', fr?.certs.typeTest],
    ['Single-line diagram (SLD)', fr?.certs.sld],
  ];

  // (10) MANIFEST / completeness cover — inserted as page 1, the front of the
  // pack. The installer sees what's in the pack and what's still outstanding
  // BEFORE opening the portal: the anti-rejection wedge, made visible.
  const cover = doc.insertPage(0, [595, 842]);
  let cy = 800;
  cover.drawText('ESB SUBMISSION PACK - CONTENTS & CHECKLIST', { x: 40, y: cy, size: 15, font: bold }); cy -= 20;
  cover.drawText(`${lead.name}${mprn ? '   MPRN ' + mprn : ''}`, { x: 40, y: cy, size: 10, font }); cy -= 14;
  cover.drawText(`Prepared ${new Date().toLocaleString('en-IE')}${installer ? '   ' + installer : ''}${reciNo ? '   Safe Electric ' + reciNo : ''}`, { x: 40, y: cy, size: 8, font, color: rgb(0.4, 0.4, 0.4) }); cy -= 22;
  cover.drawText(c.ready ? 'STATUS: READY TO FILE' : 'STATUS: INCOMPLETE - see outstanding below', { x: 40, y: cy, size: 11, font: bold, color: c.ready ? rgb(0, 0.45, 0.2) : rgb(0.7, 0.45, 0) }); cy -= 26;

  cover.drawText('IN THIS PACK', { x: 40, y: cy, size: 10, font: bold }); cy -= 16;
  const rows: Array<[string, boolean]> = [
    ['NC6 microgeneration form - filled, ready to sign', c.ready],
    ['ESB portal entry sheet - every value to re-key', true],
    ...certs.map(([label, cert]) => [label, !!cert?.dataUrl] as [string, boolean]),
  ];
  for (const [label, ok] of rows) {
    cover.drawText(ok ? '[ok]' : '[  ]', { x: 40, y: cy, size: 9, font: bold, color: ok ? rgb(0, 0.45, 0.2) : rgb(0.75, 0.2, 0.2) });
    cover.drawText(label, { x: 74, y: cy, size: 9, font, color: ok ? rgb(0, 0, 0) : rgb(0.5, 0.5, 0.5) });
    cy -= 15;
  }
  cy -= 12;

  const outstanding = [
    ...c.missing,
    ...certs.filter(([, cert]) => !cert?.dataUrl).map(([label]) => `Attach: ${label}`),
  ];
  cover.drawText('OUTSTANDING BEFORE YOU FILE', { x: 40, y: cy, size: 10, font: bold }); cy -= 16;
  if (outstanding.length === 0) {
    cover.drawText('Nothing - the pack is complete. Sign & date the NC6 by hand, then submit on the ESB portal.', { x: 40, y: cy, size: 9, font, color: rgb(0, 0.45, 0.2) });
  } else {
    for (const item of outstanding.slice(0, 14)) {
      cover.drawText('-', { x: 40, y: cy, size: 9, font: bold, color: rgb(0.7, 0.45, 0) });
      cover.drawText(String(item).slice(0, 92), { x: 52, y: cy, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      cy -= 15;
    }
  }
  cover.drawText(`NC6 seal (SHA-256): ${nc6Hash.slice(0, 40)}...`, { x: 40, y: 38, size: 7, font, color: rgb(0.5, 0.5, 0.5) });

  // (2) the portal entry sheet
  const sheet = doc.addPage([595, 842]);
  let y = 800;
  sheet.drawText('ESB PORTAL ENTRY SHEET - NC6 Microgeneration', { x: 40, y, size: 14, font: bold }); y -= 18;
  sheet.drawText(`${lead.name} - copy top to bottom into the ESB Networks portal`, { x: 40, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) }); y -= 16;
  sheet.drawText(c.ready ? 'STATUS: READY TO SUBMIT' : `STATUS: INCOMPLETE - ${c.missing.join(' | ')}`.slice(0, 118), { x: 40, y, size: 9, font: bold, color: c.ready ? rgb(0, 0.45, 0.2) : rgb(0.7, 0.45, 0) }); y -= 22;
  for (const [k, v] of collect(lead)) {
    if (!v || String(v).startsWith('(')) continue; // real values only — no placeholders in the portal sheet
    sheet.drawText(k, { x: 40, y, size: 9, font: bold });
    sheet.drawText(String(v).slice(0, 60), { x: 250, y, size: 9, font });
    y -= 15;
  }

  // (3/9) bundle the captured certs — each on its own page (image) or spliced in (PDF)
  for (const [label, cert] of certs) {
    if (!cert?.dataUrl) continue;
    try {
      if (cert.kind === 'pdf') {
        const part = await PDFDocument.load(dataUrlToBytes(cert.dataUrl), { ignoreEncryption: true });
        (await doc.copyPages(part, part.getPageIndices())).forEach(pg => doc.addPage(pg));
      } else {
        const b = dataUrlToBytes(cert.dataUrl);
        const img = /image\/png/i.test(cert.dataUrl) ? await doc.embedPng(b) : await doc.embedJpg(b);
        const pg = doc.addPage([595, 842]);
        pg.drawText(label.toUpperCase(), { x: 40, y: 805, size: 11, font: bold });
        const s = Math.min(515 / img.width, 720 / img.height);
        pg.drawImage(img, { x: 40, y: 780 - img.height * s, width: img.width * s, height: img.height * s });
      }
    } catch { /* a corrupt upload never breaks the pack */ }
  }

  // (11) ATTESTATION & AUDIT TRAIL — eIDAS simple-signature provenance + hash seal.
  const att = doc.addPage([595, 842]);
  let ay = 800;
  att.drawText('ATTESTATION & AUDIT TRAIL', { x: 40, y: ay, size: 14, font: bold }); ay -= 22;
  const wrap = (t: string, color = rgb(0.25, 0.25, 0.25), size = 9) => {
    for (const line of t.match(/.{1,96}(\s|$)/g) ?? [t]) { att.drawText(line.trim(), { x: 40, y: ay, size, font, color }); ay -= 13; }
  };
  wrap('This NC6 was prepared from the AISolar field record (bill read -> survey -> design -> commissioning gate). Every value on the official form was captured from a document or ATTESTED on site by the named Safe Electric installer at the gate - never machine-verified.');
  ay -= 6;
  const line = (k: string, v: string) => { att.drawText(k, { x: 40, y: ay, size: 9, font: bold }); att.drawText(v || '-', { x: 220, y: ay, size: 9, font }); ay -= 15; };
  line('Installer (attesting)', installer);
  line('Safe Electric (RECI) no.', reciNo);
  line('Customer / site', real('Customer name') || lead.name);
  line('MPRN', mprn);
  line('Prepared (Europe/Dublin)', new Date().toLocaleString('en-IE'));
  ay -= 8;
  att.drawText('Filled NC6 SHA-256 seal:', { x: 40, y: ay, size: 9, font: bold }); ay -= 14;
  att.drawText(nc6Hash.slice(0, 32), { x: 40, y: ay, size: 9, font, color: rgb(0.15, 0.15, 0.5) }); ay -= 13;
  att.drawText(nc6Hash.slice(32), { x: 40, y: ay, size: 9, font, color: rgb(0.15, 0.15, 0.5) }); ay -= 20;
  wrap('Signature: the NC6 carries the installer\'s typed name as a simple electronic signature (eIDAS Art. 3(10) - a typed name with intent to sign). Where a wet signature is required, print, sign and date the NC6 by hand before filing.', rgb(0.4, 0.4, 0.4), 8);
  ay -= 4;
  wrap('This pack was generated by AISolar. The seal above fixes the exact NC6 bytes in this pack - any later change to the form changes the hash.', rgb(0.4, 0.4, 0.4), 8);

  // (12) tamper-evident metadata seal. NOTE: pdf-lib owns Producer/Creator and
  // re-stamps them on save() (verified — updateMetadata:false doesn't change it),
  // so the seal lives in Subject + Keywords (which survive) and, human-readable,
  // on the cover + attestation pages.
  doc.setTitle(`ESB NC6 submission pack - ${lead.name}${mprn ? ' - MPRN ' + mprn : ''}`);
  doc.setAuthor(installer || 'AISolar');
  doc.setSubject(`ESB Networks NC6 microgeneration connection - submission pack - NC6 seal ${nc6Hash.slice(0, 16)}`);
  doc.setKeywords(['NC6', 'ESB Networks', 'microgeneration', mprn, reciNo, `seal:${nc6Hash.slice(0, 16)}`, 'AISolar'].filter(Boolean));
  doc.setCreationDate(new Date());

  const blob = new Blob([await doc.save()], { type: 'application/pdf' });
  return { blob, sha256: nc6Hash, pageCount: doc.getPageCount(), mprn, installer, reciNo };
}

export async function downloadSubmissionPack(lead: DummyLead) {
  const pack = await buildSubmissionPack(lead);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(pack.blob);
  a.download = `ESB-submission-pack-${lead.name.replace(/\s+/g, '-')}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);

  // SEAL THE SUBMISSION — one esb_submissions row per sealed pack, with the seal
  // + the completeness snapshot at this moment. Demo-safe (no-op signed-out);
  // esb_reference stays NULL until a REAL portal submission (truth-pass).
  const c = nc6Completeness(lead);
  const esbForm = decideCompliance(lead).esbForm.toLowerCase() as 'nc6' | 'nc7' | 'nc8';
  await sealSubmission(lead.id, {
    form: esbForm, packSha256: pack.sha256, pageCount: pack.pageCount,
    mprn: pack.mprn || undefined, installerName: pack.installer || undefined, reciNumber: pack.reciNo || undefined,
    completenessReady: c.ready, missing: c.missing,
  });
  // The sealed NC6 pack is itself a pack document — record it with its seal.
  await recordDocument(lead.id, 'nc6', { status: c.ready ? 'complete' : 'prepared', sha256: pack.sha256, source: 'installer' });
}
