/**
 * pdf-verify — draw the overlay values onto the real ESB form, then read the
 * result back and check every value actually landed clear of ESB's own text.
 *
 * This is the half of calibration that stops a wrong coordinate reaching ESB:
 * a misplaced value is worse than a blank box.
 *
 *   node scripts/pdf-verify.mjs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

// Mirrors OVERLAY_MAPS.NC6 in src/lib/pdfFill.ts
const NC6 = [
  { field: 'Customer name', page: 0, x: 110, y: 494, size: 12, bold: true, maxW: 425 },
  { field: 'Installation address', page: 0, x: 110, y: 471, size: 11, bold: true, maxW: 425 },
  { field: 'Phone', page: 0, x: 315, y: 454 },
  { field: 'Email', page: 0, x: 75, y: 413, size: 11, bold: true, maxW: 460 },
  { field: 'MPRN', page: 0, x: 215, y: 331, size: 12, bold: true, maxW: 110 },
  { field: 'Eircode', page: 0, x: 402, y: 332 },
  { field: 'Installer company', page: 0, x: 110, y: 193, size: 12, bold: true, maxW: 425 },
  { field: 'Installer RECI no.', page: 0, x: 110, y: 170, size: 12, bold: true, maxW: 425 },
  { field: 'Inverter make/model', page: 1, x: 390, y: 457, size: 7 },
  { field: 'Inverter rating (kW)', page: 1, x: 390, y: 441 },
  { field: 'Total DC capacity (kWp)', page: 1, x: 390, y: 389 },
  { field: 'Battery', page: 1, x: 390, y: 363, size: 8 },
  // Full-coverage extension (30 Jul) — mirrors OVERLAY_MAPS.NC6 in pdfFill.ts
  { field: 'Installer landline', page: 0, x: 95, y: 152, size: 11, bold: true, maxW: 125 },
  { field: 'Installer email', page: 0, x: 80, y: 130, size: 10, bold: true, maxW: 455 },
  { field: 'New install tick', page: 1, x: 549, y: 721, size: 11 },
  { field: 'Energy source', page: 1, x: 395, y: 495 },
  { field: 'Manufacturer', page: 1, x: 390, y: 472, size: 8 },
  { field: '1PH tick', page: 1, x: 416, y: 523 },
  { field: 'Type test yes tick', page: 1, x: 418, y: 317 },
  { field: 'Settings yes tick', page: 1, x: 418, y: 270 },
  { field: '5A manufacturer', page: 1, x: 200, y: 168, size: 9 },
  { field: '5A model', page: 1, x: 105, y: 149, size: 7 },
  { field: '5A single tick', page: 1, x: 184, y: 87 },
  { field: 'First connection yes', page: 0, x: 381, y: 291, size: 11 },
  { field: 'Installer mobile', page: 0, x: 315, y: 152, size: 11, bold: true, maxW: 210 },
  { field: 'Rated current (A)', page: 1, x: 390, y: 420, size: 8 },
  { field: '5A cert ref', page: 1, x: 330, y: 130, size: 8 },
  { field: 'Installer mobile', page: 2, x: 135, y: 273, size: 9 },
  { field: 'Installer signature', page: 2, x: 118, y: 221, size: 10 },
  { field: 'Signature date', page: 2, x: 88, y: 205, size: 9 },
  { field: 'Protection confirm 1', page: 2, x: 505, y: 724, size: 9 },
  { field: 'Protection confirm 2', page: 2, x: 505, y: 709, size: 9 },
  { field: 'Protection confirm 3', page: 2, x: 505, y: 694, size: 9 },
  { field: 'Protection confirm 4', page: 2, x: 505, y: 679, size: 9 },
  { field: 'Protection confirm 5', page: 2, x: 505, y: 663, size: 9 },
  { field: 'Protection confirm 6', page: 2, x: 505, y: 648, size: 9 },
  { field: 'Protection confirm 7', page: 2, x: 505, y: 596, size: 9 },
  { field: 'Installer name', page: 2, x: 118, y: 288, size: 9 },
  { field: 'Installer SafeElectric no.', page: 2, x: 437, y: 288, size: 9 },
  { field: 'Installer email', page: 2, x: 372, y: 273, size: 8 },
  { field: 'Installer address', page: 2, x: 192, y: 257, size: 7 },
];
const SAMPLE_EXTRA = {
  'Installer landline': '01 555 0182',
  'Installer email': 'OFFICE@AISOLAR.IE',
  'New install tick': 'X',
  'Energy source': 'P',
  'Manufacturer': 'SOLAX',
  '1PH tick': 'X',
  'Type test yes tick': 'X',
  'Settings yes tick': 'X',
  '5A manufacturer': 'SOLAX',
  '5A model': 'SOLAX X1-HYBRID-5.0 G4',
  '5A single tick': 'X',
  'First connection yes': 'X',
  'Installer mobile': '086 555 0182',
  'Rated current (A)': '21.7',
  '5A cert ref': 'TUV-2318-EN50549',
  'Installer signature': 'LIAM MURPHY',
  'Signature date': '30/07/2026',
  'Protection confirm 1': 'Y', 'Protection confirm 2': 'Y', 'Protection confirm 3': 'Y',
  'Protection confirm 4': 'Y', 'Protection confirm 5': 'Y', 'Protection confirm 6': 'Y',
  'Protection confirm 7': 'Y',
  'Installer name': 'LIAM MURPHY',
  'Installer SafeElectric no.': 'RECI-30821',
  'Installer address': 'UNIT 4, CITYWEST BUSINESS CAMPUS, DUBLIN 24',
};

const SAMPLE = {
  'Customer name': 'JAMES WILSON',
  'Installation address': '18 MULBERRY LANE, DUNDRUM, DUBLIN 16',
  'Phone': '0851234567',
  'Email': 'JAMES@EXAMPLE.IE',
  'MPRN': '10000047514',
  'Eircode': 'D16 X4F7',
  'Installer company': 'AISOLAR',
  'Installer RECI no.': 'RECI-12345',
  'Inverter make/model': 'SOLAREDGE SE5K',
  'Inverter rating (kW)': '5',
  'Total DC capacity (kWp)': '10',
  'Battery': 'NONE',
};

const NC7 = [
  { field: 'Customer name', page: 0, x: 100, y: 633 },
  { field: 'Installation address', page: 0, x: 100, y: 605 },
  { field: 'Address line 2', page: 0, x: 100, y: 588 },
  { field: 'Eircode', page: 0, x: 468, y: 588 },
  { field: 'Phone', page: 0, x: 132, y: 554 },
  { field: 'Email', page: 0, x: 140, y: 536 },
  { field: 'Contact person', page: 0, x: 138, y: 500 },
  { field: 'Site address 1', page: 0, x: 100, y: 459 },
  { field: 'Site address 2', page: 0, x: 100, y: 442 },
];
SAMPLE['Address line 2'] = 'DUNDRUM, DUBLIN 16';
SAMPLE['Contact person'] = 'JAMES WILSON';
SAMPLE['Site address 1'] = '18 MULBERRY LANE';
SAMPLE['Site address 2'] = 'DUNDRUM, DUBLIN 16';
Object.assign(SAMPLE, SAMPLE_EXTRA);

const FORM = process.argv[2] === 'nc7' ? 'nc7' : 'nc6';
const MAP = FORM === 'nc7' ? NC7 : NC6;
const PAGES = FORM === 'nc7' ? [1] : [1, 2, 3];

const src = fs.readFileSync(`public/forms/esbn-form-${FORM}.pdf`);
const doc = await PDFDocument.load(src, { ignoreEncryption: true });
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const pages = doc.getPages();

for (const m of MAP) {
  const v = SAMPLE[m.field];
  if (!v) continue;
  const pg = pages[m.page]; if (!pg) continue;
  const size = m.size ?? 10;
  const useFont = m.bold ? bold : font;
  let sz = size;
  if (m.maxW) { const w = useFont.widthOfTextAtSize(v, sz); if (w > m.maxW) sz = Math.max(7, sz * (m.maxW / w)); }
  pg.drawText(v, { x: m.x, y: m.y, size: sz, font: useFont, color: rgb(0, 0, 0.85) });
}
const out = await doc.save();
fs.writeFileSync(`/tmp/${FORM}-filled.pdf`, out);

// ── read it back and look for collisions ─────────────────────────────────────
const data = new Uint8Array(fs.readFileSync(`/tmp/${FORM}-filled.pdf`));
const d2 = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

let problems = 0;
for (const pageNo of PAGES) {
  const page = await d2.getPage(pageNo);
  const items = (await page.getTextContent()).items
    .filter(i => i.str.trim())
    .map(i => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width }));

  for (const m of MAP.filter(m => m.page === pageNo - 1)) {
    const val = SAMPLE[m.field];
    const mine = items.find(i => i.s.startsWith(val.slice(0, 12)) && Math.abs(i.y - m.y) < 2);
    if (!mine) { console.log(`✗ p${pageNo} ${m.field}: value not found where placed`); problems++; continue; }
    // anything of ESB's on the same baseline that we overlap horizontally?
    // NC7 page 1 is a COMB form: rows of empty character boxes drawn as
    // "I I I I". Landing on those is the POINT — they are the field, not a
    // collision. Only real ESB wording counts as a clash.
    const isComb = (s) => /^[I|i\s]+$/.test(s);
    const clash = items.find(i =>
      i !== mine &&
      !isComb(i.s) &&
      Math.abs(i.y - mine.y) < 5 &&
      i.x < mine.x + mine.w && i.x + i.w > mine.x &&
      !val.startsWith(i.s.slice(0, 6)));
    if (clash) {
      console.log(`✗ p${pageNo} ${m.field} @x=${m.x} OVERLAPS "${clash.s.slice(0, 34)}" (x=${Math.round(clash.x)}–${Math.round(clash.x + clash.w)})`);
      problems++;
    } else {
      console.log(`✓ p${pageNo} ${m.field.padEnd(24)} x=${m.x} y=${m.y}  clear`);
    }
  }
}
console.log(problems ? `\n${FORM.toUpperCase()}: ${problems} problem(s) — fix before this goes near ESB.` : `\n${FORM.toUpperCase()}: all placements clear. → /tmp/${FORM}-filled.pdf`);
