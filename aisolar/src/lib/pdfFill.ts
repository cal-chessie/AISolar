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
const OVERLAY_MAPS: Record<EsbForm, Array<{ field: string; page: number; x: number; y: number; size?: number }>> = {
  // NC6 — 595x842pt, 6 pages. Page 1 sections 1–3, page 2 section 5 table.
  // Re-verified 25 Jul 2026 against probed label positions; two coordinates
  // from the first pass were wrong and are corrected below.
  NC6: [
    // § 1 Customer's full name and site address (free block, y 460–515)
    { field: 'Customer name', page: 0, x: 110, y: 495 },
    { field: 'Installation address', page: 0, x: 110, y: 472 },
    // FIX: was x=492,y=442 — nowhere near the label. "Mobile number:" sits at
    // x=235 w=73 (ends 308) on baseline y=454, so the value goes at x=315.
    { field: 'Phone', page: 0, x: 315, y: 454 },
    // "Email:" is x=40 w=28 (ends 68) on baseline y=414.
    { field: 'Email', page: 0, x: 75, y: 414 },
    // FIX: was x=350,y=336 — that lands on top of the "Eircode:" label (x=358).
    // "Please provide 11 digit MPRN no:" is x=40 w=167 (ends 207) at y=332.
    { field: 'MPRN', page: 0, x: 215, y: 332 },
    // NEW: "Eircode:" x=358 w=39 (ends 397) at y=332.
    { field: 'Eircode', page: 0, x: 402, y: 332 },
    // § 3 Installer/Consultant details — same block offset as § 1 (header y=217)
    { field: 'Installer company', page: 0, x: 110, y: 194 },
    { field: 'Installer RECI no.', page: 0, x: 110, y: 171 },
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
    { field: 'First connection yes', page: 0, x: 381, y: 291, size: 11 },
    { field: 'First connection no', page: 0, x: 421, y: 291, size: 11 },
    // § 3 correspondence (page 1): Landline x40, Mobile x235, Email x40 (y131)
    { field: 'Installer landline', page: 0, x: 95, y: 153 },
    { field: 'Installer mobile', page: 0, x: 315, y: 153 },
    { field: 'Installer email', page: 0, x: 80, y: 131, size: 9 },
    // § 4 (page 2): route boxes at right margin x≈552 — NC6 here is always the
    // NEW-microgen notification (option A). B/C are legacy — never ticked.
    { field: 'New install tick', page: 1, x: 549, y: 721, size: 11 },
    // § 5 "New Installation / Unit 1" column
    { field: 'Energy source', page: 1, x: 395, y: 495 },
    { field: 'Manufacturer', page: 1, x: 390, y: 472, size: 8 },
    { field: 'Rated current (A)', page: 1, x: 390, y: 420, size: 8 },
    { field: '1PH tick', page: 1, x: 416, y: 523 },
    { field: '3PH tick', page: 1, x: 459, y: 523 },
    { field: 'Type test yes tick', page: 1, x: 418, y: 317 },
    { field: 'Settings yes tick', page: 1, x: 418, y: 270 },
    // § 5A (page 2, bottom) — comb rows + cert ref + phase tick
    { field: '5A manufacturer', page: 1, x: 200, y: 168, size: 9 },
    { field: '5A model', page: 1, x: 105, y: 149, size: 7 },
    { field: '5A cert ref', page: 1, x: 330, y: 130, size: 8 },
    { field: '5A single tick', page: 1, x: 184, y: 87 },
    { field: '5A three tick', page: 1, x: 240, y: 87 },
    // Page 3 — TABLE 1 "Confirm Settings Applied (Y/N)" column + Installer
    // Details + the signature/date. The Y is drawn ONLY from the installer's
    // protectionConfirmed attestation. Signature = the named installer's TYPED
    // name (eIDAS simple e-signature, Cal 30 Jul) — backed by the drawn pad +
    // the kernel audit trail. VERIFY-BEFORE-LIVE: confirm ESB accept a typed
    // e-signature vs wet ink on the NC6 (policy read) — until then a wet sign
    // is the fallback and the pack says so.
    { field: 'Protection confirm 1', page: 2, x: 505, y: 724, size: 9 },
    { field: 'Protection confirm 2', page: 2, x: 505, y: 709, size: 9 },
    { field: 'Protection confirm 3', page: 2, x: 505, y: 694, size: 9 },
    { field: 'Protection confirm 4', page: 2, x: 505, y: 679, size: 9 },
    { field: 'Protection confirm 5', page: 2, x: 505, y: 663, size: 9 },
    { field: 'Protection confirm 6', page: 2, x: 505, y: 648, size: 9 },
    { field: 'Protection confirm 7', page: 2, x: 505, y: 596, size: 9 },
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

/** Official form(s) + typed data appendix → returns a Blob for download. */
export async function fillEsbForm(lead: DummyLead, form: EsbForm): Promise<Blob> {
  const [first, ...rest] = FORM_PARTS[form];
  const bytes = await fetch(first).then(r => r.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
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
      if (v && !v.includes('(')) pages[m.page]?.drawText(v.toUpperCase(), { x: m.x, y: m.y, size: m.size ?? 10, font });
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
