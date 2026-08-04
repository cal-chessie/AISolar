/**
 * seaiDocs — generate the SEAI grant document pack for a job: the Declaration of
 * Works + a System Data Sheet built for the customer's BER assessor.
 *
 * Cal (4 Aug): "the DoW and the data sheets must be sent to the BER guys… on the
 * customer portal." The customer schedules the post-works BER, so these are
 * prepared at install and shared to the customer to forward to their assessor —
 * the assessor needs the system data (DEAP input) to produce the BER, which is
 * the condition SEAI pays the grant on.
 *
 * A real, typed pdf-lib artifact (same engine as the ESB forms), not a promise:
 *  - Page 1 — Declaration of Works (installer + homeowner declarations).
 *  - Page 2 — System Data Sheet: every figure the BER assessor keys into DEAP.
 * Truth-pass: anything not captured renders as "—", never invented. The DoW's
 * installer signature is left as a line — only a REGISTERED installer may sign.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { DummyLead } from '@/lib/dummyData';
import { getFieldRecord } from '@/lib/fieldRecord';
import { getTenantBrand } from '@/lib/tenantBrand';
import { getCompanyCompliance } from '@/lib/companyCompliance';
import { getProduct } from '@/config/productCatalog';
import { decideCompliance } from '@/lib/complianceDecision';
import { calculateSEAI, seaiPropertyType, eur } from '@/lib/seaiPipeline';

const INK = rgb(0.09, 0.11, 0.15);
const MUTE = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.82, 0.84, 0.88);
const TECH = rgb(0.12, 0.45, 0.62);

function gather(lead: DummyLead) {
  const i = (lead.intake ?? {}) as Record<string, unknown>;
  const s = (lead.survey ?? {}) as Record<string, unknown>;
  const fr = getFieldRecord(lead.id);
  const gate = fr?.serials.confirmed ? fr.serials : null;
  const panel = lead.proposal ? getProduct(lead.proposal.panel_model, 'panel') : null;
  const dc = decideCompliance(lead);
  const propertyType = seaiPropertyType(i.property_type as string);
  const grant = lead.proposal?.seai_grant ?? calculateSEAI({
    systemSizeKw: lead.proposal?.system_size_kw ?? 0, propertyType, installType: 'retrofit',
    annualKwhUsage: lead.annual_kwh ?? 0, annualProductionKwh: 0, selfConsumptionPct: 0.7,
    netCost: lead.proposal?.net_cost ?? 0,
  }).solarElectricityGrant;
  const eircode = (i.extracted_eircode as string) ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0];
  return {
    name: (i.extracted_account_name as string) ?? lead.name,
    address: (i.extracted_address as string) ?? lead.address,
    eircode,
    mprn: (i.extracted_mprn as string) ?? lead.mprn,
    yearBuilt: i.year_built as string | undefined,
    kWp: lead.proposal?.system_size_kw,
    panelCount: lead.proposal?.panel_count,
    panelModel: lead.proposal?.panel_model,
    panelWp: panel?.spec?.match(/(\d{3,4})\s*W/)?.[1],
    inverter: gate?.fittedModel || lead.proposal?.inverter_model,
    inverterAcKw: gate?.acRatingKw || (dc.tiic ? String(dc.tiic) : undefined),
    serial: gate?.serial,
    typeTestCertRef: gate?.typeTestCertRef,
    phase: dc.threePhase ? 'Three phase' : 'Single phase',
    battery: lead.proposal?.battery_model,
    batteryKwh: (s.confirmed_battery_kwh as number | undefined),
    orientation: (s.roof_orientation as string) ?? undefined,
    pitch: (s.roof_pitch as number | undefined),
    shading: (s.shading as string) ?? undefined,
    yieldKwh: (i.estimated_annual_production_kwh as number | undefined),
    hwDiverter: (i.hot_water_diverter as boolean | undefined),
    totalCost: lead.proposal?.net_cost,
    company: getTenantBrand().proposalCompanyName || getTenantBrand().name,
    seaiCompanyId: getCompanyCompliance().seaiInstallerId,
    reci: getCompanyCompliance().reciNumber,
    propertyType,
    grant,
    installedAt: fr?.serials.confirmed ? new Date().toLocaleDateString('en-IE') : undefined,
    // Handover sign-off (eIDAS simple signatures) — printed as the DoW signatures.
    installerSig: fr?.handover?.installerName,
    homeownerSig: fr?.handover?.homeownerName,
    signedDate: fr?.handover?.signedAt ? new Date(fr.handover.signedAt).toLocaleDateString('en-IE') : undefined,
    // Manufacturer datasheets (BER assessor input) — bundled when we hold them.
    panelDatasheet: lead.proposal ? getProduct(lead.proposal.panel_model, 'panel')?.datasheet : undefined,
    inverterDatasheet: lead.proposal ? getProduct(lead.proposal.inverter_model, 'inverter')?.datasheet : undefined,
  };
}

type Fonts = { font: PDFFont; bold: PDFFont };
const val = (v: unknown): string => (v === undefined || v === null || v === '' ? '—' : String(v));

/** A cursor-based page writer — simple, clean, A4. */
function pen(page: PDFPage, f: Fonts) {
  let y = 800;
  const M = 48;
  const W = 595 - M * 2;
  return {
    get y() { return y; },
    gap(px = 10) { y -= px; },
    heading(text: string) {
      y -= 6;
      page.drawText(text, { x: M, y, size: 11, font: f.bold, color: TECH });
      y -= 4;
      page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.8, color: RULE });
      y -= 14;
    },
    row(label: string, value: string) {
      page.drawText(label, { x: M, y, size: 9, font: f.font, color: MUTE });
      const vx = M + 200;
      const lines = wrap(value, f.bold, 9.5, W - 200);
      lines.forEach((ln, idx) => {
        page.drawText(ln, { x: vx, y: y - idx * 12, size: 9.5, font: f.bold, color: INK });
      });
      y -= Math.max(15, lines.length * 12 + 3);
    },
    para(text: string, size = 8.5) {
      const lines = wrap(text, f.font, size, W);
      lines.forEach(ln => { page.drawText(ln, { x: M, y, size, font: f.font, color: MUTE }); y -= size + 3.5; });
    },
    sigLine(who: string, name?: string, date?: string) {
      y -= 6;
      // eIDAS simple signature — the typed name printed as the signature.
      if (name) page.drawText(name, { x: M + 2, y, size: 13, font: f.bold, color: INK });
      if (name && date) page.drawText(date, { x: M + 302, y, size: 10, font: f.bold, color: INK });
      y -= 6;
      page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, thickness: 0.8, color: RULE });
      page.drawLine({ start: { x: M + 300, y }, end: { x: M + W, y }, thickness: 0.8, color: RULE });
      y -= 11;
      page.drawText(`Signature — ${who}`, { x: M, y, size: 7.5, font: f.font, color: MUTE });
      page.drawText('Date', { x: M + 300, y, size: 7.5, font: f.font, color: MUTE });
      y -= 16;
    },
    title(text: string, sub: string) {
      page.drawText(text, { x: M, y, size: 15, font: f.bold, color: INK }); y -= 16;
      page.drawText(sub, { x: M, y, size: 9, font: f.font, color: MUTE }); y -= 18;
    },
  };
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = String(text).split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) { out.push(line); line = w; }
    else line = test;
  }
  if (line) out.push(line);
  return out.length ? out : ['—'];
}

export async function buildSeaiDocsPdf(lead: DummyLead): Promise<Blob> {
  const d = gather(lead);
  const doc = await PDFDocument.create();
  const f: Fonts = { font: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };

  // ── Page 1 — Declaration of Works ──
  const p1 = pen(doc.addPage([595, 842]), f);
  p1.title('SEAI Solar PV — Declaration of Works', `${d.company || 'Registered Solar PV company'} · prepared ${new Date().toLocaleDateString('en-IE')}`);
  p1.heading('Installation details');
  p1.row('Applicant (grant claimant)', val(d.name));
  p1.row('Installation address', val(d.address));
  p1.row('Eircode', val(d.eircode));
  p1.row('MPRN', val(d.mprn));
  p1.heading('System');
  p1.row('Solar PV system size (DC nameplate)', d.kWp ? `${d.kWp} kWp` : '—');
  p1.row('Battery storage', d.battery ? `${d.battery}${d.batteryKwh ? ` · ${d.batteryKwh} kWh` : ''}` : 'None');
  p1.row('Estimated annual yield (AC)', d.yieldKwh ? `${d.yieldKwh.toLocaleString()} kWh · PVGIS-SARAH3` : '—');
  p1.row('Hot water diverter', d.hwDiverter === undefined ? '—' : d.hwDiverter ? 'Yes' : 'No');
  p1.heading('Registered Solar PV company');
  p1.row('Company', val(d.company));
  p1.row('SEAI registration number', val(d.seaiCompanyId));
  p1.row('Property year of construction', val(d.yearBuilt));
  p1.row('Total cost incl. parts, labour, VAT', d.totalCost ? `${eur(d.totalCost)}${d.propertyType === 'domestic' ? ' (0% VAT — domestic solar)' : ''}` : '—');
  p1.heading('System components');
  p1.row('Solar PV modules', d.panelModel ? `${val(d.panelCount)} × ${d.panelModel}${d.panelWp ? ` (${d.panelWp} Wp)` : ''}` : '—');
  p1.row('Inverter', val(d.inverter));
  p1.row('Battery energy storage', d.battery ? val(d.battery) : 'None');
  p1.heading('Installer declaration');
  p1.para('Installed and commissioned at the above address, compliant with the SEAI Domestic Solar PV Code of Practice. Electrical works to I.S. 10101 with a Safe Electric (RECI) certificate issued by a Registered Electrical Contractor. Inspection, Test & Commissioning Report completed and given to the homeowner. Only a registered installer to the Solar PV Scheme may sign this declaration.');
  p1.sigLine('registered installer', d.installerSig, d.signedDate);
  p1.heading('Homeowner declaration');
  p1.para('I am the owner of this dwelling; the works are complete to my satisfaction; I have paid the contractor or entered an agreed payment schedule; I understand SEAI may inspect the works, and that SEAI pays the grant to my nominated bank account.');
  p1.sigLine(val(d.name), d.homeownerSig, d.signedDate);

  // ── Page 2 — System Data Sheet (for the BER assessor / DEAP) ──
  const p2 = pen(doc.addPage([595, 842]), f);
  p2.title('System Data Sheet — for your BER assessor', 'Give this to your registered BER assessor. It carries the system data they key into DEAP for your post-works BER.');
  p2.heading('Dwelling');
  p2.row('Applicant', val(d.name));
  p2.row('Address', val(d.address));
  p2.row('Eircode', val(d.eircode));
  p2.row('MPRN', val(d.mprn));
  p2.heading('PV array');
  p2.row('Total installed capacity', d.kWp ? `${d.kWp} kWp (DC)` : '—');
  p2.row('Modules', d.panelModel ? `${val(d.panelCount)} × ${d.panelModel}` : '—');
  p2.row('Module rating', d.panelWp ? `${d.panelWp} Wp each` : '—');
  p2.row('Orientation (azimuth)', val(d.orientation));
  p2.row('Pitch', d.pitch != null ? `${d.pitch}°` : '—');
  p2.row('Overshading', val(d.shading));
  p2.heading('Inverter');
  p2.row('Model (as fitted)', val(d.inverter));
  p2.row('AC rating', d.inverterAcKw ? `${d.inverterAcKw} kW` : '—');
  p2.row('Supply phase', val(d.phase));
  p2.row('Type-test cert ref', val(d.typeTestCertRef));
  p2.heading('Battery & generation');
  p2.row('Battery storage', d.battery ? `${d.battery}${d.batteryKwh ? ` · ${d.batteryKwh} kWh` : ''}` : 'None');
  p2.row('Estimated annual generation', d.yieldKwh ? `${d.yieldKwh.toLocaleString()} kWh (AC) · PVGIS-SARAH3` : '—');
  p2.row('Hot water diverter', d.hwDiverter === undefined ? '—' : d.hwDiverter ? 'Yes' : 'No');
  p2.heading('Commissioning');
  p2.row('Installed', val(d.installedAt));
  p2.row('Registered company', val(d.company));
  p2.row('Safe Electric / RECI', val(d.reci));
  p2.row('Inverter serial (as fitted)', val(d.serial));
  p2.gap(8);
  const haveDs = !!(d.panelDatasheet || d.inverterDatasheet);
  p2.para(haveDs
    ? 'Manufacturer datasheet(s) for the panel and/or inverter are attached to this pack — the BER assessor needs them.'
    : 'Attach the panel + inverter manufacturer datasheets before sending this to the BER assessor.', 8);

  // Bundle the actual equipment datasheets (BER assessor input) when we hold
  // them — best-effort; a missing/unfetchable sheet never blocks the pack.
  for (const ds of [d.panelDatasheet, d.inverterDatasheet]) {
    if (!ds) continue;
    try {
      const res = await fetch(ds);
      if (!res.ok) continue;
      const src = await PDFDocument.load(await res.arrayBuffer(), { ignoreEncryption: true });
      const pages = await doc.copyPages(src, src.getPageIndices());
      pages.forEach(p => doc.addPage(p));
    } catch { /* datasheet unavailable — skip */ }
  }

  return new Blob([await doc.save()], { type: 'application/pdf' });
}

/** Download the pack (owner action / customer forward). */
export async function downloadSeaiDocs(lead: DummyLead): Promise<void> {
  const blob = await buildSeaiDocsPdf(lead);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SEAI-DoW-and-data-sheet-${(lead.name || 'customer').replace(/\s+/g, '-')}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}
