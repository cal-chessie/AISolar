import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ESBFormNC6Props {
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
    panel_count?: number;
    panel_type?: string;
    inverter_type?: string;
    battery_storage?: boolean;
    battery_capacity_kwh?: number;
  };
  installerData?: {
    name?: string;
    phone?: string;
    email?: string;
    safe_electric_reg?: string;
  };
}

export default function ESBFormNC6({ leadId, leadData, proposalData, installerData }: ESBFormNC6Props) {
  // Section 1: Customer Details
  const [customerName, setCustomerName] = useState(leadData?.name || '');
  const [siteAddress, setSiteAddress] = useState(leadData?.address || '');
  const [mprn, setMprn] = useState(leadData?.mprn || '');
  const [customerPhone, setCustomerPhone] = useState(leadData?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(leadData?.email || '');
  const [eircode, setEircode] = useState('');

  // Section 2: Installer Details
  const [installerName, setInstallerName] = useState(installerData?.name || '');
  const [installerPhone, setInstallerPhone] = useState(installerData?.phone || '');
  const [installerEmail, setInstallerEmail] = useState(installerData?.email || '');
  const [safeElectricReg, setSafeElectricReg] = useState(installerData?.safe_electric_reg || '');

  // Section 3: Connection Details
  const [connectionType, setConnectionType] = useState('single_phase');
  const [connectionCapacity, setConnectionCapacity] = useState('25');
  const [exportLimiting, setExportLimiting] = useState(false);
  const [exportLimitValue, setExportLimitValue] = useState('');

  // Section 4: Generator Details
  const [energySource] = useState('Solar Photovoltaic');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [ratedPowerKw, setRatedPowerKw] = useState(proposalData?.system_size_kw?.toString() || '');
  const [numberOfUnits, setNumberOfUnits] = useState(proposalData?.panel_count?.toString() || '');
  const [totalCapacityKwp, setTotalCapacityKwp] = useState(proposalData?.system_size_kw?.toString() || '');
  const [inverterManufacturer, setInverterManufacturer] = useState('');
  const [inverterModel, setInverterModel] = useState(proposalData?.inverter_type || '');
  const [inverterRatingKva, setInverterRatingKva] = useState('');
  const [batteryIncluded, setBatteryIncluded] = useState(proposalData?.battery_storage || false);
  const [batteryManufacturer, setBatteryManufacturer] = useState('');
  const [batteryModel, setBatteryModel] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState(proposalData?.battery_capacity_kwh?.toString() || '');

  // Section 5: Declaration
  const [installationDate, setInstallationDate] = useState('');
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);

  // Try to load product details
  useEffect(() => {
    const loadProducts = async () => {
      if (!proposalData?.panel_type) return;
      const { data } = await supabase
        .from('solar_products')
        .select('manufacturer, model, power_rating')
        .eq('product_type', 'panel')
        .limit(1);
      if (data?.[0]) {
        setManufacturer(data[0].manufacturer);
        setModel(data[0].model);
      }
    };
    loadProducts();
  }, [proposalData?.panel_type]);

  const getCompletionStatus = () => {
    const required = [customerName, siteAddress, mprn, installerName, safeElectricReg, ratedPowerKw, totalCapacityKwp];
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
  <title>ESB Networks - Form NC6 Microgeneration Notification</title>
  <style>
    @media print { body { margin: 0; } @page { size: A4; margin: 15mm; } }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; max-width: 210mm; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #00539F; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { color: #00539F; font-size: 18px; margin: 0; }
    .header h2 { color: #666; font-size: 13px; margin: 5px 0 0; font-weight: normal; }
    .logo-text { font-size: 22px; font-weight: bold; color: #00539F; letter-spacing: 1px; }
    .section { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; }
    .section-title { font-size: 13px; font-weight: bold; color: #00539F; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .row { display: flex; margin-bottom: 6px; }
    .label { width: 180px; font-weight: bold; font-size: 10px; color: #555; }
    .value { flex: 1; border-bottom: 1px dotted #ccc; padding-bottom: 2px; min-height: 16px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; margin-right: 6px; vertical-align: middle; text-align: center; line-height: 14px; font-size: 10px; }
    .checked { background: #00539F; color: white; }
    .declaration { background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 10px; margin-top: 10px; }
    .sig-line { border-bottom: 1px solid #333; width: 250px; display: inline-block; height: 30px; margin-top: 20px; }
    .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-text">ESB Networks</div>
    <h1>FORM NC6</h1>
    <h2>MICROGENERATION NOTIFICATION</h2>
  </div>

  <div class="section">
    <div class="section-title">SECTION 1: CUSTOMER / SITE DETAILS</div>
    <div class="row"><span class="label">Customer Name:</span><span class="value">${customerName}</span></div>
    <div class="row"><span class="label">Site Address:</span><span class="value">${siteAddress}</span></div>
    <div class="row"><span class="label">Eircode:</span><span class="value">${eircode}</span></div>
    <div class="two-col">
      <div class="row"><span class="label">MPRN:</span><span class="value">${mprn}</span></div>
      <div class="row"><span class="label">Phone:</span><span class="value">${customerPhone}</span></div>
    </div>
    <div class="row"><span class="label">Email:</span><span class="value">${customerEmail}</span></div>
  </div>

  <div class="section">
    <div class="section-title">SECTION 2: INSTALLER / CONSULTANT DETAILS</div>
    <div class="row"><span class="label">Installer Name:</span><span class="value">${installerName}</span></div>
    <div class="row"><span class="label">Safe Electric Reg No:</span><span class="value">${safeElectricReg}</span></div>
    <div class="two-col">
      <div class="row"><span class="label">Phone:</span><span class="value">${installerPhone}</span></div>
      <div class="row"><span class="label">Email:</span><span class="value">${installerEmail}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">SECTION 3: MICROGENERATION INTERFACE / CONNECTION DETAILS</div>
    <div class="two-col">
      <div class="row"><span class="label">Connection Type:</span><span class="value">${connectionType === 'single_phase' ? 'Single Phase (230V)' : 'Three Phase (400V)'}</span></div>
      <div class="row"><span class="label">Connection Capacity:</span><span class="value">${connectionCapacity} A</span></div>
    </div>
    <div class="row">
      <span class="label">Export Limiting:</span>
      <span class="value">
        <span class="checkbox ${exportLimiting ? 'checked' : ''}">${exportLimiting ? '✓' : ''}</span> Yes
        <span class="checkbox ${!exportLimiting ? 'checked' : ''}">${!exportLimiting ? '✓' : ''}</span> No
        ${exportLimiting && exportLimitValue ? ` — Limited to ${exportLimitValue} kW` : ''}
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">SECTION 4: MICROGENERATOR DETAILS</div>
    <div class="row"><span class="label">Energy Source:</span><span class="value">${energySource}</span></div>
    <div class="two-col">
      <div class="row"><span class="label">Panel Manufacturer:</span><span class="value">${manufacturer}</span></div>
      <div class="row"><span class="label">Panel Model:</span><span class="value">${model}</span></div>
    </div>
    <div class="two-col">
      <div class="row"><span class="label">Number of Panels:</span><span class="value">${numberOfUnits}</span></div>
      <div class="row"><span class="label">Total Capacity (kWp):</span><span class="value">${totalCapacityKwp}</span></div>
    </div>
    <div class="row"><span class="label">Rated Power Output (kW):</span><span class="value">${ratedPowerKw}</span></div>
    
    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd;">
      <div class="two-col">
        <div class="row"><span class="label">Inverter Manufacturer:</span><span class="value">${inverterManufacturer}</span></div>
        <div class="row"><span class="label">Inverter Model:</span><span class="value">${inverterModel}</span></div>
      </div>
      <div class="row"><span class="label">Inverter Rating (kVA):</span><span class="value">${inverterRatingKva}</span></div>
    </div>

    ${batteryIncluded ? `
    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd;">
      <div class="row"><span class="label">Battery Storage:</span><span class="value">Yes</span></div>
      <div class="two-col">
        <div class="row"><span class="label">Battery Manufacturer:</span><span class="value">${batteryManufacturer}</span></div>
        <div class="row"><span class="label">Battery Model:</span><span class="value">${batteryModel}</span></div>
      </div>
      <div class="row"><span class="label">Battery Capacity (kWh):</span><span class="value">${batteryCapacity}</span></div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">SECTION 5: DECLARATION</div>
    <div class="declaration">
      <p>I hereby declare that the microgeneration installation described above has been installed in accordance with:</p>
      <ul>
        <li>EN 50549-1 (Requirements for generating plants to be connected in parallel with distribution networks)</li>
        <li>I.S. 10101 (National Rules for Electrical Installations - ET 101)</li>
        <li>ESB Networks requirements for microgeneration connections</li>
      </ul>
      <p>The installation has been tested and commissioned and is safe to operate in parallel with the ESB Networks distribution system.</p>
    </div>
    <div class="row" style="margin-top: 10px;"><span class="label">Installation Date:</span><span class="value">${installationDate}</span></div>
    <div style="margin-top: 15px;">
      <div class="row"><span class="label">Installer Signature:</span><span class="sig-line"></span></div>
      <div class="row" style="margin-top: 10px;"><span class="label">Date:</span><span class="sig-line" style="width: 150px;"></span></div>
    </div>
  </div>

  <div class="footer">
    ESB Networks DAC — Form NC6 Microgeneration Notification — Generated ${new Date().toLocaleDateString('en-IE')}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">ESB NC6 — Microgeneration Notification</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {isComplete ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
            {status.filled}/{status.total} required
          </Badge>
          <Button size="sm" onClick={generatePDF}>
            <Printer className="h-4 w-4 mr-1" />
            Download / Print
          </Button>
        </div>
      </div>

      {/* Section 1: Customer Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Section 1: Customer / Site Details</CardTitle>
          <CardDescription>Auto-filled from lead data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer Name *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">MPRN (11 digits) *</Label>
              <Input value={mprn} onChange={e => setMprn(e.target.value)} placeholder="e.g. 10012345678" maxLength={11} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Site Address *</Label>
            <Input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Eircode</Label>
              <Input value={eircode} onChange={e => setEircode(e.target.value)} placeholder="e.g. D01 AB12" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Installer Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Section 2: Installer / Consultant Details</CardTitle>
          <CardDescription>Auto-filled from assigned installer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Installer Name *</Label>
              <Input value={installerName} onChange={e => setInstallerName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Safe Electric Registration No. *</Label>
              <Input value={safeElectricReg} onChange={e => setSafeElectricReg(e.target.value)} placeholder="SE-XXXXX" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={installerPhone} onChange={e => setInstallerPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={installerEmail} onChange={e => setInstallerEmail(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Connection Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Section 3: Connection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Connection Type</Label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_phase">Single Phase (230V) — max 25A / ~6kVA</SelectItem>
                  <SelectItem value="three_phase">Three Phase (400V) — max 16A / ~11kVA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Connection Capacity (Amps)</Label>
              <Input value={connectionCapacity} onChange={e => setConnectionCapacity(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={exportLimiting} onCheckedChange={setExportLimiting} />
            <Label className="text-xs">Export Limiting Required</Label>
            {exportLimiting && (
              <div className="flex items-center gap-2">
                <Input className="w-24" value={exportLimitValue} onChange={e => setExportLimitValue(e.target.value)} placeholder="kW" />
                <span className="text-xs text-muted-foreground">kW limit</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Generator Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Section 4: Microgenerator Details</CardTitle>
          <CardDescription>Auto-filled from proposal & product catalog</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Energy Source</Label>
              <Input value={energySource} disabled className="bg-muted" />
            </div>
            <div>
              <Label className="text-xs">Total Capacity (kWp) *</Label>
              <Input value={totalCapacityKwp} onChange={e => setTotalCapacityKwp(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Rated Power (kW) *</Label>
              <Input value={ratedPowerKw} onChange={e => setRatedPowerKw(e.target.value)} />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Panel Details</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Manufacturer</Label>
              <Input value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Number of Panels</Label>
              <Input value={numberOfUnits} onChange={e => setNumberOfUnits(e.target.value)} />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Inverter Details</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Inverter Manufacturer</Label>
              <Input value={inverterManufacturer} onChange={e => setInverterManufacturer(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Inverter Model</Label>
              <Input value={inverterModel} onChange={e => setInverterModel(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Inverter Rating (kVA)</Label>
              <Input value={inverterRatingKva} onChange={e => setInverterRatingKva(e.target.value)} />
            </div>
          </div>
          {batteryIncluded && (
            <>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Battery Storage</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Battery Manufacturer</Label>
                  <Input value={batteryManufacturer} onChange={e => setBatteryManufacturer(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Battery Model</Label>
                  <Input value={batteryModel} onChange={e => setBatteryModel(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Battery Capacity (kWh)</Label>
                  <Input value={batteryCapacity} onChange={e => setBatteryCapacity(e.target.value)} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Declaration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Section 5: Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground space-y-1">
            <p>I hereby declare that the microgeneration installation described above has been installed in accordance with:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>EN 50549-1 (Requirements for generating plants connected to distribution networks)</li>
              <li>I.S. 10101 (National Rules for Electrical Installations — ET 101)</li>
              <li>ESB Networks requirements for microgeneration connections</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Installation Date</Label>
              <Input type="date" value={installationDate} onChange={e => setInstallationDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={complianceConfirmed} onCheckedChange={setComplianceConfirmed} />
              <Label className="text-xs">Confirm compliance with above standards</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
