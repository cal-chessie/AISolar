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
 *  2. COORDINATE OVERLAY (calibration queued): OVERLAY_MAPS below take
 *     {page,x,y} per field and draw straight into the form's boxes. Filling
 *     the maps is a render-verify loop per form revision — precision work,
 *     done once per form, then every job fills itself.
 *
 * Signatures: eIDAS "simple electronic signature" — the drawn signature
 * (the pad already in the app) placed as an image + the kernel's append-only
 * event as the audit trail (who/when). Valid for these documents under the
 * E-Commerce Act 2000/eIDAS; QES not required. RECI certs are NEVER filled
 * or signed here — Safe Electric issues those.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { DummyLead } from '@/lib/dummyData';
import { getTenantBrand } from '@/lib/tenantBrand';
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
    { field: 'Inverter make/model', page: 1, x: 390, y: 457, size: 8 },
    { field: 'Inverter rating (kW)', page: 1, x: 390, y: 441 },
    { field: 'Total DC capacity (kWp)', page: 1, x: 390, y: 389 },
    { field: 'Battery', page: 1, x: 390, y: 363, size: 8 },
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
  const rows: Array<[string, string | undefined | null]> = [
    ['Customer name', (i.extracted_account_name as string) ?? lead.name],
    ['Installation address', (i.extracted_address as string) ?? lead.address],
    ['Eircode', (i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0]],
    ['MPRN', (i.extracted_mprn as string) ?? lead.mprn],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Supply type', threePhase ? 'Three phase' : 'Single phase'],
    ['Inverter make/model', p?.inverter_model],
    ['Inverter rating (kW)', p ? String(p.system_size_kw) : undefined],
    ['Panels', p ? `${p.panel_count} x ${p.panel_model}` : undefined],
    ['Total DC capacity (kWp)', p ? String(p.system_size_kw) : undefined],
    ['Battery', p?.battery_model ?? 'None'],
    ['Export limitation', 'None — full export'],
    ['Installer company', getTenantBrand().proposalCompanyName || brand.legal.tradingName],
    ['Installer RECI no.', brand.legal.reciNumber || '( Settings - RECI number )'],
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
    const pages = doc.getPages();
    for (const m of map) {
      const v = data[m.field];
      if (v && !v.startsWith('(')) pages[m.page]?.drawText(v.toUpperCase(), { x: m.x, y: m.y, size: m.size ?? 10, font });
    }
  }

  // Mode 1 — always append the typed data page (harmless alongside overlay)
  const page = doc.addPage([595, 842]);
  let y = 790;
  page.drawText(`${form} - PREPARED DATA (attach to the official form)`, { x: 40, y, size: 13, font: bold });
  y -= 18;
  page.drawText(`${lead.name} - prepared ${new Date().toLocaleDateString('en-IE')} - from the AISolar record (bill read -> survey -> design)`, { x: 40, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
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
