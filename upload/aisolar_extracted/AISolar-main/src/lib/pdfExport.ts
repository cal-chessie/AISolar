// PDF Export utility for proposals
// Uses browser print functionality for maximum compatibility

export interface ProposalPDFData {
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  systemSizeKw?: number;
  panelCount?: number;
  panelType?: string;
  inverterType?: string;
  batteryCapacityKwh?: number;
  systemCost?: number;
  seaiGrant?: number;
  netCost?: number;
  monthlySavings?: number;
  paybackPeriodYears?: number;
  estimatedAnnualProductionKwh?: number;
  energyOffsetPercentage?: number;
  createdAt: string;
  proposalId: string;
}

export function generateProposalHTML(data: ProposalPDFData): string {
  const formatCurrency = (value?: number) => 
    value ? `€${value.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

  const formatNumber = (value?: number, suffix = '') => 
    value ? `${value.toLocaleString('en-IE')}${suffix}` : 'N/A';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Solar Proposal - ${data.customerName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #10b981;
        }
        .header h1 {
          color: #10b981;
          font-size: 28px;
          margin-bottom: 8px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #10b981;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .info-item {
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .info-item label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        .info-item value {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .highlight-box {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          margin: 30px 0;
        }
        .highlight-box h2 {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .highlight-box p {
          opacity: 0.9;
        }
        .savings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 20px;
        }
        .savings-item {
          text-align: center;
          padding: 16px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
        }
        .savings-item value {
          display: block;
          font-size: 24px;
          font-weight: bold;
        }
        .savings-item label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .disclaimer {
          margin-top: 30px;
          padding: 16px;
          background: #fef3c7;
          border-radius: 8px;
          font-size: 12px;
          color: #92400e;
        }
        @media print {
          body { padding: 20px; }
          .highlight-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>☀️ Solar Energy Proposal</h1>
        <p>Prepared for ${data.customerName} | ${new Date(data.createdAt).toLocaleDateString('en-IE')}</p>
        <p style="font-size: 11px; color: #999;">Proposal ID: ${data.proposalId}</p>
      </div>

      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Name</label>
            <value>${data.customerName}</value>
          </div>
          <div class="info-item">
            <label>Email</label>
            <value>${data.customerEmail}</value>
          </div>
          ${data.customerAddress ? `
          <div class="info-item" style="grid-column: span 2;">
            <label>Address</label>
            <value>${data.customerAddress}</value>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">System Specifications</div>
        <div class="info-grid">
          <div class="info-item">
            <label>System Size</label>
            <value>${formatNumber(data.systemSizeKw, ' kW')}</value>
          </div>
          <div class="info-item">
            <label>Panel Count</label>
            <value>${formatNumber(data.panelCount, ' panels')}</value>
          </div>
          <div class="info-item">
            <label>Panel Type</label>
            <value>${data.panelType || 'To be confirmed'}</value>
          </div>
          <div class="info-item">
            <label>Inverter</label>
            <value>${data.inverterType || 'To be confirmed'}</value>
          </div>
          ${data.batteryCapacityKwh ? `
          <div class="info-item" style="grid-column: span 2;">
            <label>Battery Storage</label>
            <value>${formatNumber(data.batteryCapacityKwh, ' kWh')}</value>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="highlight-box">
        <h2>${formatCurrency(data.netCost)}</h2>
        <p>Your Investment (after SEAI grant)</p>
        <div class="savings-grid">
          <div class="savings-item">
            <value>${formatCurrency(data.monthlySavings)}</value>
            <label>Monthly Savings</label>
          </div>
          <div class="savings-item">
            <value>${formatNumber(data.paybackPeriodYears, ' years')}</value>
            <label>Payback Period</label>
          </div>
          <div class="savings-item">
            <value>${formatNumber(data.energyOffsetPercentage, '%')}</value>
            <label>Energy Offset</label>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Financial Breakdown</div>
        <div class="info-grid">
          <div class="info-item">
            <label>System Cost</label>
            <value>${formatCurrency(data.systemCost)}</value>
          </div>
          <div class="info-item">
            <label>SEAI Grant</label>
            <value style="color: #10b981;">-${formatCurrency(data.seaiGrant)}</value>
          </div>
          <div class="info-item">
            <label>Net Cost</label>
            <value>${formatCurrency(data.netCost)}</value>
          </div>
          <div class="info-item">
            <label>Est. Annual Production</label>
            <value>${formatNumber(data.estimatedAnnualProductionKwh, ' kWh')}</value>
          </div>
        </div>
      </div>

      <div class="disclaimer">
        <strong>Important:</strong> This proposal is an estimate based on the information provided. Final costs may vary based on site survey findings and equipment availability. SEAI grant amounts are subject to eligibility criteria and approval. All prices include VAT where applicable.
      </div>

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString('en-IE', { dateStyle: 'full' })}</p>
        <p>This proposal is valid for 30 days from the date of issue.</p>
      </div>
    </body>
    </html>
  `;
}

export function exportProposalToPDF(data: ProposalPDFData): void {
  const html = generateProposalHTML(data);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function downloadProposalAsHTML(data: ProposalPDFData): void {
  const html = generateProposalHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `proposal-${data.customerName.replace(/\s+/g, '-').toLowerCase()}-${data.proposalId.slice(0, 8)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
