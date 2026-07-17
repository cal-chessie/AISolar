/**
 * Professional Proposal Template
 *
 * Replaces the old `pdfExport.ts` screen-grab approach. This generates a clean,
 * branded, paginated HTML proposal that can be:
 *   1. Rendered in-app for preview
 *   2. Opened in a new window for printing (Ctrl+P → Save as PDF)
 *   3. Server-rendered to PDF via a headless browser edge function (future)
 *
 * Design principles:
 *   - Print-first CSS (@page rules, page breaks, no scroll)
 *   - Branded header/footer on every page
 *   - Financial tables that don't break across pages
 *   - System diagram block (SVG placeholder for now, swap for real CAD later)
 *   - Signature block at the end
 *   - No emojis, no `value` HTML elements (real semantic markup)
 */

import { brand } from '@/config/brand';

export interface ProposalData {
  proposalId: string;
  proposalDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  mprn: string;
  // System
  systemSizeKw: number;
  panelCount: number;
  panelModel: string;
  inverterModel: string;
  batteryModel: string | null;
  batteryCapacityKwh: number | null;
  roofType: string;
  roofOrientation: string;
  roofPitch: number;
  shading: string;
  // Energy
  annualKwhUsage: number;
  annualProductionKwh: number;
  solarOffsetPct: number;
  selfConsumptionPct: number;
  // Financials
  grossCost: number;
  seaiGrant: number;
  netCost: number;
  annualSavings: number;
  paybackYears: number;
  twentyYearSavings: number;
  co2TonnesPerYear: number;
  // Optional
  consultantName?: string;
  consultantPhone?: string;
  consultantEmail?: string;
  validUntil?: string;
}

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat('en-IE').format(n);
const date = (s: string) => new Date(s).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });

export function generateProposalHTML(d: ProposalData): string {
  const validUntil = d.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Solar Proposal — ${escapeHtml(d.customerName)} — ${brand.name}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  ${PROPOSAL_CSS}
</style>
</head>
<body>
  ${generateCoverPage(d, validUntil)}
  ${generateSystemDesignPage(d)}
  ${generateFinancialPage(d, validUntil)}
  ${generateTermsPage(d)}
</body>
</html>`;
}

function generateCoverPage(d: ProposalData, validUntil: string): string {
  return `
<section class="page cover">
  <header class="brand-bar">
    <div class="brand-mark">${brand.name}</div>
    <div class="brand-tag">${brand.tagline}</div>
  </header>

  <div class="cover-body">
    <div class="cover-eyebrow">Solar PV Proposal</div>
    <h1 class="cover-title">Your Solar Investment Plan</h1>
    <div class="cover-subtitle">Prepared for ${escapeHtml(d.customerName)}</div>

    <div class="cover-meta">
      <div><span class="meta-label">Proposal #</span><span class="meta-value">${d.proposalId}</span></div>
      <div><span class="meta-label">Date</span><span class="meta-value">${date(d.proposalDate)}</span></div>
      <div><span class="meta-label">Valid until</span><span class="meta-value">${date(validUntil)}</span></div>
      <div><span class="meta-label">System size</span><span class="meta-value">${d.systemSizeKw} kWp</span></div>
      <div><span class="meta-label">Annual savings</span><span class="meta-value">${eur(d.annualSavings)}</span></div>
      <div><span class="meta-label">Payback</span><span class="meta-value">${d.paybackYears} years</span></div>
    </div>

    <div class="cover-summary">
      <p>This proposal details a ${d.systemSizeKw} kWp solar PV system for your property at
      ${escapeHtml(d.customerAddress)}. Based on your ${num(d.annualKwhUsage)} kWh annual
      consumption and our site survey, the system will generate approximately
      ${num(d.annualProductionKwh)} kWh per year, offsetting ${d.solarOffsetPct}% of your
      electricity usage and saving you ${eur(d.annualSavings)} annually.</p>
    </div>
  </div>

  <footer class="page-footer">
    <span>${brand.name} · ${brand.contact.phoneDisplay} · ${brand.contact.email}</span>
    <span>Proposal ${d.proposalId} · Page 1 of 4</span>
  </footer>
</section>`;
}

function generateSystemDesignPage(d: ProposalData): string {
  return `
<section class="page">
  <header class="brand-bar slim">
    <div class="brand-mark">${brand.name}</div>
    <div class="page-name">System Design</div>
  </header>

  <h2 class="section-title">2. System Design</h2>

  <div class="two-col">
    <div class="col">
      <h3>Roof Assessment</h3>
      <table class="spec-table">
        <tr><td>Roof type</td><td>${escapeHtml(d.roofType)}</td></tr>
        <tr><td>Orientation</td><td>${escapeHtml(d.roofOrientation)}</td></tr>
        <tr><td>Pitch</td><td>${d.roofPitch}°</td></tr>
        <tr><td>Shading</td><td>${escapeHtml(d.shading)}</td></tr>
        <tr><td>MPRN</td><td>${d.mprn}</td></tr>
      </table>
    </div>
    <div class="col">
      <h3>System Specification</h3>
      <table class="spec-table">
        <tr><td>System size</td><td>${d.systemSizeKw} kWp</td></tr>
        <tr><td>Panel count</td><td>${d.panelCount} × ${escapeHtml(d.panelModel)}</td></tr>
        <tr><td>Inverter</td><td>${escapeHtml(d.inverterModel)}</td></tr>
        ${d.batteryModel ? `<tr><td>Battery storage</td><td>${escapeHtml(d.batteryModel)}</td></tr>` : ''}
        <tr><td>Estimated annual yield</td><td>${num(d.annualProductionKwh)} kWh</td></tr>
        <tr><td>Self-consumption rate</td><td>${Math.round(d.selfConsumptionPct * 100)}%</td></tr>
      </table>
    </div>
  </div>

  <h3 class="sub-title">System Layout</h3>
  <div class="diagram-block">
    <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" aria-label="Roof layout diagram">
      <rect x="0" y="20" width="600" height="160" fill="#f1f5f9" stroke="#cbd5e1" />
      <text x="300" y="50" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#475569">South-facing roof · ${d.panelCount} panels in 2 rows</text>
      ${Array.from({ length: Math.min(d.panelCount, 14) }).map((_, i) => {
        const row = Math.floor(i / 7);
        const col = i % 7;
        const x = 60 + col * 70;
        const y = 80 + row * 50;
        return `<rect x="${x}" y="${y}" width="60" height="40" fill="#1e3a8a" stroke="#fff" stroke-width="2" rx="2" />`;
      }).join('')}
      ${d.panelCount > 14 ? `<text x="300" y="180" text-anchor="middle" font-size="11" fill="#64748b">+ ${d.panelCount - 14} additional panels (diagram truncated)</text>` : ''}
    </svg>
  </div>

  <h3 class="sub-title">Energy Production Profile</h3>
  <table class="data-table">
    <thead>
      <tr><th>Month</th><th>Est. production (kWh)</th><th>Your usage (kWh)</th><th>Offset</th></tr>
    </thead>
    <tbody>
      ${generateMonthlyProduction(d).map(m => `
        <tr>
          <td>${m.month}</td>
          <td>${num(m.production)}</td>
          <td>${num(m.usage)}</td>
          <td>${m.offset}%</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr><td>Total</td><td>${num(d.annualProductionKwh)}</td><td>${num(d.annualKwhUsage)}</td><td>${d.solarOffsetPct}%</td></tr>
    </tfoot>
  </table>

  <footer class="page-footer">
    <span>${brand.name}</span>
    <span>Proposal ${d.proposalId} · Page 2 of 4</span>
  </footer>
</section>`;
}

function generateMonthlyProduction(d: ProposalData) {
  // Ireland monthly distribution (rough approximation)
  const monthlyShare = [3.5, 4.5, 7.5, 9.5, 12.5, 12.0, 11.5, 10.5, 8.5, 7.0, 6.5, 6.5];
  const monthlyUsage = d.annualKwhUsage / 12;
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, i) => {
    const production = Math.round(d.annualProductionKwh * monthlyShare[i] / 100);
    return {
      month,
      production,
      usage: Math.round(monthlyUsage),
      offset: Math.min(100, Math.round((production / monthlyUsage) * 100)),
    };
  });
}

function generateFinancialPage(d: ProposalData, _validUntil: string): string {
  return `
<section class="page">
  <header class="brand-bar slim">
    <div class="brand-mark">${brand.name}</div>
    <div class="page-name">Investment & Savings</div>
  </header>

  <h2 class="section-title">3. Investment & Savings</h2>

  <div class="financial-summary">
    <div class="summary-card primary">
      <div class="summary-label">Net investment</div>
      <div class="summary-value">${eur(d.netCost)}</div>
      <div class="summary-note">After ${eur(d.seaiGrant)} SEAI grant</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Annual savings</div>
      <div class="summary-value">${eur(d.annualSavings)}</div>
      <div class="summary-note">Year 1, indexed to inflation</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Payback period</div>
      <div class="summary-value">${d.paybackYears} yrs</div>
      <div class="summary-note">Excluding resale value uplift</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">20-year savings</div>
      <div class="summary-value">${eur(d.twentyYearSavings)}</div>
      <div class="summary-note">Net of install cost</div>
    </div>
  </div>

  <h3 class="sub-title">Cost Breakdown</h3>
  <table class="data-table financial">
    <tbody>
      <tr><td>Solar panels (${d.panelCount} × ${escapeHtml(d.panelModel)})</td><td class="num">${eur(Math.round(d.grossCost * 0.45))}</td></tr>
      <tr><td>Inverter (${escapeHtml(d.inverterModel)})</td><td class="num">${eur(Math.round(d.grossCost * 0.18))}</td></tr>
      ${d.batteryModel ? `<tr><td>Battery (${escapeHtml(d.batteryModel)})</td><td class="num">${eur(Math.round(d.grossCost * 0.22))}</td></tr>` : ''}
      <tr><td>Mounting, cabling, and protection</td><td class="num">${eur(Math.round(d.grossCost * 0.10))}</td></tr>
      <tr><td>Installation labour (RECI certified)</td><td class="num">${eur(Math.round(d.grossCost * 0.05))}</td></tr>
      <tr class="subtotal"><td>Gross cost</td><td class="num">${eur(d.grossCost)}</td></tr>
      <tr class="grant"><td>SEAI Solar Electricity Grant</td><td class="num">−${eur(d.seaiGrant)}</td></tr>
      <tr class="total"><td>Net investment</td><td class="num">${eur(d.netCost)}</td></tr>
    </tbody>
  </table>

  <h3 class="sub-title">20-Year Cashflow Projection</h3>
  <table class="data-table">
    <thead>
      <tr><th>Year</th><th>Annual savings</th><th>Cumulative savings</th><th>Cumulative net</th></tr>
    </thead>
    <tbody>
      ${Array.from({ length: 20 }).map((_, i) => {
        const year = i + 1;
        const inflatedSavings = Math.round(d.annualSavings * Math.pow(1.03, i));
        const cumulative = inflatedSavings * year;
        const net = cumulative - d.netCost;
        const highlight = year === Math.ceil(d.paybackYears) ? ' class="highlight-row"' : '';
        return `<tr${highlight}><td>Year ${year}</td><td>${eur(inflatedSavings)}</td><td>${eur(cumulative)}</td><td>${eur(net)}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="footnote">Assumes 3% annual electricity price inflation. Actual savings will vary with consumption patterns, weather, and tariff changes. Micro-gen export tariff currently €0.14/kWh (ESB Networks, 2026).</p>

  <footer class="page-footer">
    <span>${brand.name}</span>
    <span>Proposal ${d.proposalId} · Page 3 of 4</span>
  </footer>
</section>`;
}

function generateTermsPage(d: ProposalData): string {
  return `
<section class="page">
  <header class="brand-bar slim">
    <div class="brand-mark">${brand.name}</div>
    <div class="page-name">Acceptance</div>
  </header>

  <h2 class="section-title">4. Terms & Acceptance</h2>

  <h3 class="sub-title">What's included</h3>
  <ul class="terms-list">
    <li>Supply and installation of ${d.panelCount} × ${escapeHtml(d.panelModel)} solar panels</li>
    <li>${escapeHtml(d.inverterModel)} inverter with 10-year manufacturer warranty</li>
    ${d.batteryModel ? `<li>${escapeHtml(d.batteryModel)} battery storage with 10-year warranty</li>` : ''}
    <li>All mounting, DC/AC cabling, and electrical protection (RCBOs, surge protection)</li>
    <li>RECI-certified electrical sign-off and Safe Electric Ireland registration</li>
    <li>SEAI grant paperwork preparation and submission</li>
    <li>Commissioning, system handover, and customer training (1 hour on-site)</li>
    <li>10-year workmanship warranty + 25-year panel performance guarantee</li>
  </ul>

  <h3 class="sub-title">Payment schedule</h3>
  <table class="data-table">
    <tbody>
      <tr><td>Deposit (30%) — due on contract signing</td><td class="num">${eur(Math.round(d.netCost * 0.3))}</td></tr>
      <tr><td>Balance (70%) — due on commissioning and handover</td><td class="num">${eur(d.netCost - Math.round(d.netCost * 0.3))}</td></tr>
      <tr class="total"><td>Total</td><td class="num">${eur(d.netCost)}</td></tr>
    </tbody>
  </table>

  <h3 class="sub-title">Installation timeline</h3>
  <p>Installation will be scheduled within 4–6 weeks of deposit payment, subject to weather and
  material availability. Typical install duration: 1–2 days for residential systems up to 6 kWp,
  2–3 days for larger systems.</p>

  <h3 class="sub-title">Acceptance</h3>
  <div class="signature-block">
    <div class="signature-row">
      <div class="signature-col">
        <div class="signature-line"></div>
        <div class="signature-label">${escapeHtml(d.customerName)} (Customer)</div>
        <div class="signature-date">Date: _______________</div>
      </div>
      <div class="signature-col">
        <div class="signature-line"></div>
        <div class="signature-label">${escapeHtml(d.consultantName || brand.name)} (${brand.name})</div>
        <div class="signature-date">Date: _______________</div>
      </div>
    </div>
  </div>

  <div class="contact-block">
    <h3 class="sub-title">Contact us</h3>
    <p>${brand.name} · ${brand.contact.phoneDisplay} · ${brand.contact.email}</p>
    <p>${d.consultantName ? `Your consultant: ${escapeHtml(d.consultantName)}` : ''} ${d.consultantPhone ? `· ${d.consultantPhone}` : ''}</p>
  </div>

  <footer class="page-footer">
    <span>${brand.name} · CRO #123456 · SEAI Registered · RECI Certified</span>
    <span>Proposal ${d.proposalId} · Page 4 of 4</span>
  </footer>
</section>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!));
}

const PROPOSAL_CSS = `
  @page {
    size: A4;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #fff;
    font-size: 11pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 20mm 22mm;
    margin: 0 auto;
    page-break-after: always;
    position: relative;
    background: #fff;
  }
  .page:last-child { page-break-after: auto; }

  /* Brand bar */
  .brand-bar {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 12pt;
    border-bottom: 2pt solid #059669;
    margin-bottom: 24pt;
  }
  .brand-bar.slim { padding-bottom: 8pt; margin-bottom: 18pt; }
  .brand-mark {
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #059669;
  }
  .brand-tag { font-size: 9pt; color: #64748b; }
  .page-name { font-size: 11pt; font-weight: 600; color: #334155; }

  /* Cover */
  .cover { display: flex; flex-direction: column; }
  .cover-body { flex: 1; }
  .cover-eyebrow {
    font-size: 10pt; font-weight: 600; color: #059669;
    text-transform: uppercase; letter-spacing: 0.1em;
    margin-top: 60pt;
  }
  .cover-title {
    font-size: 36pt; font-weight: 700; letter-spacing: -0.02em;
    margin-top: 12pt; color: #0f172a; line-height: 1.1;
  }
  .cover-subtitle {
    font-size: 14pt; color: #475569; margin-top: 16pt;
  }
  .cover-meta {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 12pt 32pt; margin-top: 36pt; padding: 18pt 24pt;
    background: #f8fafc; border-left: 3pt solid #059669;
  }
  .cover-meta > div { display: flex; flex-direction: column; }
  .meta-label {
    font-size: 8pt; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .meta-value { font-size: 13pt; font-weight: 600; color: #0f172a; margin-top: 2pt; }
  .cover-summary {
    margin-top: 32pt; padding: 18pt 0; font-size: 11pt;
    color: #334155; line-height: 1.6;
  }

  /* Section + tables */
  .section-title {
    font-size: 18pt; font-weight: 700; color: #0f172a;
    margin-bottom: 14pt; padding-bottom: 6pt;
    border-bottom: 1pt solid #e2e8f0;
  }
  .sub-title {
    font-size: 12pt; font-weight: 600; color: #1e293b;
    margin-top: 16pt; margin-bottom: 8pt;
  }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24pt; }
  .spec-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .spec-table td { padding: 5pt 0; border-bottom: 1pt solid #f1f5f9; }
  .spec-table td:first-child { color: #64748b; width: 50%; }
  .spec-table td:last-child { font-weight: 600; color: #0f172a; }

  .data-table {
    width: 100%; border-collapse: collapse; font-size: 10pt;
    margin-top: 8pt;
  }
  .data-table th {
    text-align: left; padding: 8pt 6pt; font-weight: 600;
    background: #f8fafc; border-bottom: 2pt solid #e2e8f0;
    color: #1e293b;
  }
  .data-table td {
    padding: 6pt; border-bottom: 1pt solid #f1f5f9;
  }
  .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .data-table tfoot td {
    font-weight: 700; padding-top: 10pt; border-top: 2pt solid #e2e8f0;
    border-bottom: none;
  }
  .data-table .subtotal td { font-weight: 600; border-top: 1pt solid #cbd5e1; }
  .data-table .grant td { color: #059669; }
  .data-table .total td {
    font-size: 12pt; font-weight: 700;
    border-top: 2pt solid #0f172a; padding-top: 8pt;
  }
  .data-table .highlight-row { background: #ecfdf5; }

  /* Diagram */
  .diagram-block {
    margin-top: 12pt; padding: 16pt; background: #f8fafc;
    border-radius: 4pt; text-align: center;
  }

  /* Financial summary cards */
  .financial-summary {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12pt;
    margin: 14pt 0 24pt;
  }
  .summary-card {
    padding: 14pt; background: #f8fafc; border-radius: 6pt;
    border-left: 3pt solid #cbd5e1;
  }
  .summary-card.primary {
    background: #ecfdf5; border-left-color: #059669;
  }
  .summary-label {
    font-size: 8pt; color: #64748b; text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .summary-value {
    font-size: 18pt; font-weight: 700; color: #0f172a;
    margin-top: 4pt; line-height: 1.1;
  }
  .summary-note { font-size: 8pt; color: #64748b; margin-top: 4pt; }

  /* Terms */
  .terms-list { padding-left: 18pt; font-size: 10pt; line-height: 1.7; }
  .terms-list li { margin-bottom: 4pt; color: #334155; }
  .footnote { font-size: 8pt; color: #64748b; margin-top: 8pt; font-style: italic; }

  /* Signature */
  .signature-block {
    margin-top: 24pt; padding: 18pt; background: #f8fafc; border-radius: 4pt;
  }
  .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 32pt; }
  .signature-col { display: flex; flex-direction: column; }
  .signature-line { border-bottom: 1pt solid #0f172a; height: 30pt; }
  .signature-label {
    margin-top: 6pt; font-size: 9pt; font-weight: 600; color: #1e293b;
  }
  .signature-date { font-size: 9pt; color: #64748b; margin-top: 2pt; }

  .contact-block {
    margin-top: 24pt; padding-top: 14pt; border-top: 1pt solid #e2e8f0;
    font-size: 10pt; color: #475569;
  }

  /* Footer */
  .page-footer {
    position: absolute; bottom: 10mm; left: 20mm; right: 20mm;
    display: flex; justify-content: space-between;
    font-size: 8pt; color: #94a3b8;
    padding-top: 6pt; border-top: 1pt solid #e2e8f0;
  }

  @media print {
    body { background: #fff; }
    .page { margin: 0; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 20pt 0; }
    .page { box-shadow: 0 4pt 20pt rgba(0,0,0,0.1); margin-bottom: 20pt; }
  }
`;
