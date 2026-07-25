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
  { field: 'Customer name', page: 0, x: 110, y: 495 },
  { field: 'Installation address', page: 0, x: 110, y: 472 },
  { field: 'Phone', page: 0, x: 315, y: 454 },
  { field: 'Email', page: 0, x: 75, y: 414 },
  { field: 'MPRN', page: 0, x: 215, y: 332 },
  { field: 'Eircode', page: 0, x: 402, y: 332 },
  { field: 'Installer company', page: 0, x: 110, y: 194 },
  { field: 'Installer RECI no.', page: 0, x: 110, y: 171 },
  { field: 'Inverter make/model', page: 1, x: 390, y: 457, size: 8 },
  { field: 'Inverter rating (kW)', page: 1, x: 390, y: 441 },
  { field: 'Total DC capacity (kWp)', page: 1, x: 390, y: 389 },
  { field: 'Battery', page: 1, x: 390, y: 363, size: 8 },
];

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

const FORM = process.argv[2] === 'nc7' ? 'nc7' : 'nc6';
const MAP = FORM === 'nc7' ? NC7 : NC6;
const PAGES = FORM === 'nc7' ? [1] : [1, 2];

const src = fs.readFileSync(`public/forms/esbn-form-${FORM}.pdf`);
const doc = await PDFDocument.load(src, { ignoreEncryption: true });
const font = await doc.embedFont(StandardFonts.Helvetica);
const pages = doc.getPages();

for (const m of MAP) {
  const v = SAMPLE[m.field];
  if (!v) continue;
  pages[m.page]?.drawText(v, { x: m.x, y: m.y, size: m.size ?? 10, font, color: rgb(0, 0, 0.85) });
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
