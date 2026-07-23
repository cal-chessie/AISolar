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

type EsbForm = 'NC6' | 'NC7';

/** Per-form {page,x,y,size?} maps for true in-box overlay. Empty until the
 *  calibration pass; fill these and mode 2 switches on automatically. */
const OVERLAY_MAPS: Record<EsbForm, Array<{ field: string; page: number; x: number; y: number; size?: number }>> = {
  NC6: [],
  NC7: [],
};

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

  const map = OVERLAY_MAPS[form];
  if (map.length > 0) {
    // Mode 2 — calibrated in-box overlay
    const data = Object.fromEntries(collect(lead));
    const pages = doc.getPages();
    for (const m of map) {
      const v = data[m.field];
      if (v && !v.startsWith('(')) pages[m.page]?.drawText(v, { x: m.x, y: m.y, size: m.size ?? 9, font });
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
