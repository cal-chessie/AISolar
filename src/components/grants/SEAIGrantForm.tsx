import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, CheckCircle, AlertCircle, Award, ExternalLink } from 'lucide-react';

interface SEAIGrantFormProps {
  leadId: string;
  leadData?: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    mprn?: string;
  };
  proposalData?: {
    system_size_kw?: number;
    net_cost?: number;
    seai_grant?: number;
    property_type?: string;
  };
  installerCompanyName?: string;
}

export default function SEAIGrantForm({ leadId, leadData, proposalData, installerCompanyName }: SEAIGrantFormProps) {
  // Applicant Details
  const [applicantName, setApplicantName] = useState(leadData?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(leadData?.email || '');
  const [applicantPhone, setApplicantPhone] = useState(leadData?.phone || '');
  const [applicantAddress, setApplicantAddress] = useState(leadData?.address || '');

  // MPRN & Address
  const [mprn, setMprn] = useState(leadData?.mprn || '');
  const [eircode, setEircode] = useState('');
  const [county, setCounty] = useState('');

  // Installation Details
  const [systemSizeKwp, setSystemSizeKwp] = useState(proposalData?.system_size_kw?.toString() || '');
  const [companyName, setCompanyName] = useState(installerCompanyName || '');
  const [yearBuilt, setYearBuilt] = useState('');
  const [yearOccupied, setYearOccupied] = useState('');

  // Payment Details
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Calculated grant
  const sizeKw = parseFloat(systemSizeKwp) || 0;
  const calculatedGrant = proposalData?.seai_grant || Math.min(
    sizeKw <= 2 ? sizeKw * 900 : 1800,
    1800
  );

  const getCompletionStatus = () => {
    const required = [applicantName, applicantEmail, mprn, systemSizeKwp, companyName, yearBuilt];
    const filled = required.filter(v => v && v.trim() !== '');
    return { filled: filled.length, total: required.length };
  };

  const status = getCompletionStatus();
  const isComplete = status.filled === status.total;

  const generatePDF = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SEAI Solar PV Grant Application — Pre-filled Form</title>
  <style>
    @media print { body { margin: 0; } @page { size: A4; margin: 15mm; } }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; max-width: 210mm; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #00843D; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { color: #00843D; font-size: 18px; margin: 0; }
    .header h2 { color: #666; font-size: 13px; margin: 5px 0 0; font-weight: normal; }
    .logo-text { font-size: 22px; font-weight: bold; color: #00843D; }
    .section { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; }
    .section-title { font-size: 13px; font-weight: bold; color: #00843D; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .row { display: flex; margin-bottom: 6px; }
    .label { width: 200px; font-weight: bold; font-size: 10px; color: #555; }
    .value { flex: 1; border-bottom: 1px dotted #ccc; padding-bottom: 2px; min-height: 16px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grant-box { background: #e8f5e9; border: 2px solid #00843D; border-radius: 8px; padding: 15px; text-align: center; margin: 10px 0; }
    .grant-amount { font-size: 28px; font-weight: bold; color: #00843D; }
    .note { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px; font-size: 10px; margin-top: 10px; }
    .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-text">SEAI</div>
    <h1>Solar PV Grant Application</h1>
    <h2>Microgeneration Support Scheme — Pre-filled Summary</h2>
  </div>

  <div class="grant-box">
    <div style="font-size: 12px; color: #555;">Estimated Grant Amount</div>
    <div class="grant-amount">€${calculatedGrant.toLocaleString()}</div>
    <div style="font-size: 10px; color: #777;">System Size: ${systemSizeKwp} kWp</div>
  </div>

  <div class="section">
    <div class="section-title">APPLICANT DETAILS</div>
    <div class="row"><span class="label">Full Name:</span><span class="value">${applicantName}</span></div>
    <div class="row"><span class="label">Email:</span><span class="value">${applicantEmail}</span></div>
    <div class="two-col">
      <div class="row"><span class="label">Phone:</span><span class="value">${applicantPhone}</span></div>
      <div class="row"><span class="label">Eircode:</span><span class="value">${eircode}</span></div>
    </div>
    <div class="row"><span class="label">Address:</span><span class="value">${applicantAddress}</span></div>
    <div class="row"><span class="label">County:</span><span class="value">${county}</span></div>
  </div>

  <div class="section">
    <div class="section-title">MPRN & PROPERTY</div>
    <div class="row"><span class="label">MPRN (11 digits):</span><span class="value">${mprn}</span></div>
    <div class="two-col">
      <div class="row"><span class="label">Year House Built:</span><span class="value">${yearBuilt}</span></div>
      <div class="row"><span class="label">Year First Occupied:</span><span class="value">${yearOccupied}</span></div>
    </div>
    <div class="note">
      <strong>Note:</strong> Property must have been built and occupied before 1st January 2021 to qualify for this grant.
    </div>
  </div>

  <div class="section">
    <div class="section-title">INSTALLATION DETAILS</div>
    <div class="two-col">
      <div class="row"><span class="label">System Size (kWp):</span><span class="value">${systemSizeKwp}</span></div>
      <div class="row"><span class="label">Estimated Grant:</span><span class="value">€${calculatedGrant.toLocaleString()}</span></div>
    </div>
    <div class="row"><span class="label">SEAI-Registered Company:</span><span class="value">${companyName}</span></div>
    <div class="note">
      <strong>Important:</strong> The SEAI will only pay for the system size specified in this application. Ensure the kWp value matches your proposal exactly.
    </div>
  </div>

  <div class="section">
    <div class="section-title">PAYMENT DETAILS</div>
    <div class="row"><span class="label">Account Holder Name:</span><span class="value">${accountHolderName}</span></div>
    <div class="two-col">
      <div class="row"><span class="label">IBAN:</span><span class="value">${iban}</span></div>
      <div class="row"><span class="label">BIC:</span><span class="value">${bic}</span></div>
    </div>
    <div class="note">
      <strong>Note:</strong> The bank account must be in the same name as the applicant. Grant payment will be made to this account after installation is verified.
    </div>
  </div>

  <div class="section">
    <div class="section-title">NEXT STEPS</div>
    <ol style="font-size: 10px; padding-left: 20px; line-height: 1.6;">
      <li>Submit this application online at <strong>mgen.seai.ie</strong></li>
      <li>SEAI will issue a Letter of Offer (valid for 8 months)</li>
      <li>Have your solar PV system installed by the registered company</li>
      <li>Your installer submits a Declaration of Works to SEAI</li>
      <li>SEAI verifies the installation and pays the grant to your bank account</li>
    </ol>
  </div>

  <div class="footer">
    SEAI Solar PV Grant Application — Pre-filled Summary — Generated ${new Date().toLocaleDateString('en-IE')}<br/>
    Submit online at <strong>mgen.seai.ie</strong> — This document is for reference only and must be submitted via the SEAI portal.
  </div>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-lg">SEAI Solar PV Grant Application</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {isComplete ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
            {status.filled}/{status.total} required
          </Badge>
          <Button size="sm" variant="outline" asChild>
            <a href="https://mgen.seai.ie/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              SEAI Portal
            </a>
          </Button>
          <Button size="sm" onClick={generatePDF}>
            <Printer className="h-4 w-4 mr-1" />
            Download / Print
          </Button>
        </div>
      </div>

      {/* Grant Amount */}
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Estimated SEAI Grant</p>
            <p className="text-3xl font-bold text-green-600">€{calculatedGrant.toLocaleString()}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>System: {systemSizeKwp || '—'} kWp</p>
            <p>Net cost after grant: €{((proposalData?.net_cost || 0)).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Applicant Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Applicant Details</CardTitle>
          <CardDescription>Auto-filled from lead data — must match bank account name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input value={applicantName} onChange={e => setApplicantName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Eircode</Label>
              <Input value={eircode} onChange={e => setEircode(e.target.value)} placeholder="e.g. D01 AB12" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={applicantAddress} onChange={e => setApplicantAddress(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">County</Label>
              <Input value={county} onChange={e => setCounty(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MPRN & Property */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">MPRN & Property Details</CardTitle>
          <CardDescription>MPRN auto-fills address on the SEAI portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">MPRN (11 digits) *</Label>
            <Input value={mprn} onChange={e => setMprn(e.target.value)} placeholder="e.g. 10012345678" maxLength={11} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Year House Built *</Label>
              <Input value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} placeholder="e.g. 1998" maxLength={4} />
            </div>
            <div>
              <Label className="text-xs">Year First Occupied</Label>
              <Input value={yearOccupied} onChange={e => setYearOccupied(e.target.value)} placeholder="e.g. 1999" maxLength={4} />
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-xs text-amber-800 dark:text-amber-200">
            Property must have been built and occupied before 1st January 2021 to qualify.
          </div>
        </CardContent>
      </Card>

      {/* Installation Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Installation Details</CardTitle>
          <CardDescription>Auto-filled from proposal — system size must match exactly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">System Size (kWp) * — between 0.1 and 11.0</Label>
              <Input value={systemSizeKwp} onChange={e => setSystemSizeKwp(e.target.value)} placeholder="e.g. 4.5" />
            </div>
            <div>
              <Label className="text-xs">SEAI-Registered Company *</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Search company on SEAI portal" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Payment Details</CardTitle>
          <CardDescription>Bank account must be in applicant's name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Account Holder Name</Label>
            <Input value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="Must match applicant name" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">IBAN</Label>
              <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="IE29AIBK93115212345678" />
            </div>
            <div>
              <Label className="text-xs">BIC</Label>
              <Input value={bic} onChange={e => setBic(e.target.value)} placeholder="e.g. AIBKIE2D" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={termsAccepted} onCheckedChange={setTermsAccepted} />
            <Label className="text-xs">I agree to the SEAI Terms & Conditions</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} />
            <Label className="text-xs">I accept the SEAI Privacy Policy</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
