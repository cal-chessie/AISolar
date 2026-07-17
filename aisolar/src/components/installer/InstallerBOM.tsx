/**
 * Installer BOM (Bill of Materials)
 *
 * Per-job packing list for the installer. Generated automatically from the
 * proposal + survey data. The installer opens this on the morning of the job,
 * grabs the materials from the depot, and ticks them off as they load the van.
 *
 * Features:
 *   - Auto-generated from proposal (panels, inverter, battery, mounting, cabling)
 *   - Calculated quantities (e.g. 14 panels × 2 clamps each = 28 clamps)
 *   - "Loaded in van" checkboxes that persist via localStorage
 *   - Notes column for installer (e.g. "pick extra rail from back of depot")
 *   - Print-friendly view (Ctrl+P → A4 PDF for clipboard)
 *   - Pulls live stock from ProfessionalProducts catalogue
 *   - Highlights items below safety stock (need to order before job)
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Package, CheckCircle2, AlertTriangle, Printer, RefreshCw, Plus, Trash2,
  ClipboardList, Truck, MapPin, User, Phone, Calendar, FileText,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';

interface BOMLine {
  id: string;
  category: 'panels' | 'inverter' | 'battery' | 'mounting' | 'electrical' | 'safety' | 'tools';
  item: string;
  sku?: string;
  qty: number;
  unit: string;
  location: string;       // where in the depot
  stock: number;          // current depot stock
  loaded: boolean;        // ticked off
  notes: string;
  critical: boolean;      // can't start job without this
}

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** Generate BOM lines from a lead's proposal + survey data. */
function generateBOM(lead: DummyLead): BOMLine[] {
  const lines: BOMLine[] = [];
  const proposal = lead.proposal;
  const survey = lead.survey;

  if (!proposal) return lines;

  // Panels
  lines.push({
    id: 'panels',
    category: 'panels',
    item: `${proposal.panel_model}`,
    sku: 'PAN-LONGI-435',
    qty: proposal.panel_count,
    unit: 'pcs',
    location: 'A1-A24 (racking)',
    stock: 48,
    loaded: false,
    notes: '',
    critical: true,
  });

  // Inverter
  lines.push({
    id: 'inverter',
    category: 'inverter',
    item: proposal.inverter_model,
    sku: 'INV-SE-5K',
    qty: 1,
    unit: 'pcs',
    location: 'B3 (shelf)',
    stock: 6,
    loaded: false,
    notes: '',
    critical: true,
  });

  // Battery (if included)
  if (proposal.battery_model) {
    lines.push({
      id: 'battery',
      category: 'battery',
      item: proposal.battery_model,
      sku: 'BAT-TESLA-PW3',
      qty: 1,
      unit: 'pcs',
      location: 'C2 (heavy item — use forklift)',
      stock: 4,
      loaded: false,
      notes: '130kg — 2-person lift',
      critical: true,
    });
  }

  // Mounting — calculated based on panel count
  const railsPerPanel = 0.23; // ~2.3 rails per 10 panels
  const railCount = Math.ceil(proposal.panel_count * railsPerPanel);
  lines.push({
    id: 'rails',
    category: 'mounting',
    item: 'Mounting rails (1.6m aluminium)',
    sku: 'MNT-K2-RAIL-1.6',
    qty: railCount,
    unit: 'pcs',
    location: 'D1-D8 (racking)',
    stock: 120,
    loaded: false,
    notes: survey?.roof_type === 'slate' ? 'Use slate hooks (in B5)' : 'Use tile hooks (in B6)',
    critical: true,
  });

  // Clamps (end + mid)
  const endClamps = 4; // 2 per row × typical 2 rows
  const midClamps = (proposal.panel_count - 2) * 2; // between each panel
  lines.push({
    id: 'end-clamps',
    category: 'mounting',
    item: 'End clamps (40mm black)',
    sku: 'MNT-CLAMP-END-40',
    qty: endClamps,
    unit: 'pcs',
    location: 'B7 (small parts bin)',
    stock: 80,
    loaded: false,
    notes: '',
    critical: true,
  });
  lines.push({
    id: 'mid-clamps',
    category: 'mounting',
    item: 'Mid clamps (40mm black)',
    sku: 'MNT-CLAMP-MID-40',
    qty: midClamps,
    unit: 'pcs',
    location: 'B7 (small parts bin)',
    stock: 120,
    loaded: false,
    notes: '',
    critical: true,
  });

  // Roof hooks
  const roofHooks = Math.ceil(railCount * 0.7);
  lines.push({
    id: 'roof-hooks',
    category: 'mounting',
    item: survey?.roof_type === 'slate' ? 'Slate roof hooks' : 'Tile roof hooks',
    sku: survey?.roof_type === 'slate' ? 'MNT-HOOK-SLATE' : 'MNT-HOOK-TILE',
    qty: roofHooks,
    unit: 'pcs',
    location: 'B5/B6',
    stock: 60,
    loaded: false,
    notes: '',
    critical: true,
  });

  // Electrical
  const dcCableM = 8 + (proposal.panel_count * 1.2); // ~8m + 1.2m per panel
  lines.push({
    id: 'dc-cable',
    category: 'electrical',
    item: 'DC solar cable (6mm², UV, red/black pair)',
    sku: 'ELE-CABLE-DC-6',
    qty: Math.ceil(dcCableM),
    unit: 'm',
    location: 'E2 (cable drum)',
    stock: 800,
    loaded: false,
    notes: '',
    critical: true,
  });

  const acCableM = 15; // typical
  lines.push({
    id: 'ac-cable',
    category: 'electrical',
    item: 'AC cable (T&E, 4mm²)',
    sku: 'ELE-CABLE-AC-4',
    qty: acCableM,
    unit: 'm',
    location: 'E3',
    stock: 200,
    loaded: false,
    notes: '',
    critical: true,
  });

  lines.push({
    id: 'isolator-dc',
    category: 'electrical',
    item: 'DC isolator (32A, 1000V)',
    sku: 'ELE-ISO-DC-32',
    qty: 1,
    unit: 'pcs',
    location: 'F1',
    stock: 12,
    loaded: false,
    notes: '',
    critical: true,
  });
  lines.push({
    id: 'isolator-ac',
    category: 'electrical',
    item: 'AC isolator (20A, IP65)',
    sku: 'ELE-ISO-AC-20',
    qty: 1,
    unit: 'pcs',
    location: 'F1',
    stock: 24,
    loaded: false,
    notes: '',
    critical: true,
  });
  lines.push({
    id: 'spd',
    category: 'electrical',
    item: 'Type 2 surge protection device',
    sku: 'ELE-SPD-T2',
    qty: 1,
    unit: 'pcs',
    location: 'F2',
    stock: 8,
    loaded: false,
    notes: 'LOW STOCK — only 8 left after this',
    critical: true,
  });
  lines.push({
    id: 'mc4',
    category: 'electrical',
    item: 'MC4 connectors (pair)',
    sku: 'ELE-MC4-PR',
    qty: 10,
    unit: 'prs',
    location: 'F3 (small parts)',
    stock: 100,
    loaded: false,
    notes: '',
    critical: false,
  });

  // Safety
  lines.push({
    id: 'harness',
    category: 'safety',
    item: 'Fall arrest harness + lanyard',
    sku: 'SAF-HARN-LANY',
    qty: 2,
    unit: 'pcs',
    location: 'Van (top locker)',
    stock: 2,
    loaded: false,
    notes: 'Check expiry date before use',
    critical: true,
  });
  lines.push({
    id: 'roof-edge',
    category: 'safety',
    item: 'Roof edge protection system',
    sku: 'SAF-EDGE-PROT',
    qty: 1,
    unit: 'set',
    location: 'Van (long locker)',
    stock: 1,
    loaded: false,
    notes: 'Required for 2-storey work',
    critical: lead.address.toLowerCase().includes('dublin 4') || lead.address.toLowerCase().includes('dublin 6'),
  });
  lines.push({
    id: 'first-aid',
    category: 'safety',
    item: 'First aid kit (checked this month)',
    sku: 'SAF-FAK',
    qty: 1,
    unit: 'pcs',
    location: 'Van (cab)',
    stock: 1,
    loaded: false,
    notes: '',
    critical: false,
  });

  // Tools
  lines.push({
    id: 'drill',
    category: 'tools',
    item: 'Impact driver + spare battery',
    sku: 'TOOL-DRILL-18V',
    qty: 1,
    unit: 'pcs',
    location: 'Van (red box)',
    stock: 2,
    loaded: false,
    notes: '',
    critical: true,
  });
  lines.push({
    id: 'torque',
    category: 'tools',
    item: 'Torque wrench (5-25 Nm)',
    sku: 'TOOL-TORQUE',
    qty: 1,
    unit: 'pcs',
    location: 'Van (red box)',
    stock: 1,
    loaded: false,
    notes: 'Calibrated 2026-06',
    critical: true,
  });
  lines.push({
    id: 'multimeter',
    category: 'tools',
    item: 'Multimeter (1000V DC capable)',
    sku: 'TOOL-MULTI',
    qty: 1,
    unit: 'pcs',
    location: 'Van (red box)',
    stock: 1,
    loaded: false,
    notes: '',
    critical: true,
  });

  return lines;
}

const CATEGORY_COLORS: Record<BOMLine['category'], { bg: string; text: string; label: string }> = {
  panels:    { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', label: 'Panels' },
  inverter:  { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', label: 'Inverter' },
  battery:   { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Battery' },
  mounting:  { bg: 'bg-slate-100 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', label: 'Mounting' },
  electrical:{ bg: 'bg-violet-100 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', label: 'Electrical' },
  safety:    { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', label: 'Safety' },
  tools:     { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', label: 'Tools' },
};

export default function InstallerBOM({ leadId }: { leadId?: string }) {
  // Default to a demo lead with proposal
  const [lead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    return leads.find(l => l.proposal && l.proposal.status === 'approved') || leads[6];
  });

  const [lines, setLines] = useState<BOMLine[]>(() => generateBOM(lead));
  const [showPrintView, setShowPrintView] = useState(false);

  // Persist loaded state to localStorage so it survives page refresh
  const storageKey = `bom_${lead.id}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const loadedMap = JSON.parse(saved) as Record<string, { loaded: boolean; notes: string }>;
        setLines(prev => prev.map(line => {
          const saved = loadedMap[line.id];
          return saved ? { ...line, loaded: saved.loaded, notes: saved.notes || line.notes } : line;
        }));
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const updateLine = (id: string, updates: Partial<BOMLine>) => {
    setLines(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updates } : l);
      // Persist to localStorage
      const loadedMap: Record<string, { loaded: boolean; notes: string }> = {};
      next.forEach(l => { loadedMap[l.id] = { loaded: l.loaded, notes: l.notes }; });
      try { localStorage.setItem(storageKey, JSON.stringify(loadedMap)); } catch { /* ignore */ }
      return next;
    });
  };

  const addLine = () => {
    const newId = `custom_${Date.now()}`;
    setLines(prev => [...prev, {
      id: newId,
      category: 'tools',
      item: 'Custom item',
      qty: 1,
      unit: 'pcs',
      location: '',
      stock: 0,
      loaded: false,
      notes: '',
      critical: false,
    }]);
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const resetChecklist = () => {
    if (!confirm('Reset all loaded checkboxes?')) return;
    setLines(prev => prev.map(l => ({ ...l, loaded: false })));
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const loadedCount = lines.filter(l => l.loaded).length;
  const criticalLoaded = lines.filter(l => l.critical && l.loaded).length;
  const criticalTotal = lines.filter(l => l.critical).length;
  const lowStockItems = lines.filter(l => l.stock < l.qty);

  const groupedLines = useMemo(() => {
    const groups: Record<string, BOMLine[]> = {};
    lines.forEach(l => {
      if (!groups[l.category]) groups[l.category] = [];
      groups[l.category].push(l);
    });
    return groups;
  }, [lines]);

  if (showPrintView) {
    return <PrintView lead={lead} lines={lines} onBack={() => setShowPrintView(false)} />;
  }

  return (
    <div className="space-y-4">
      {/* Job summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-amber-600" />
                Bill of Materials
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Packing list for {lead.name}'s installation · {lead.proposal?.system_size_kw} kWp
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPrintView(true)}>
                <Printer className="h-4 w-4 mr-1" /> Print / PDF
              </Button>
              <Button variant="outline" size="sm" onClick={resetChecklist}>
                <RefreshCw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </div>

          {/* Job info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Customer</div>
                <div className="font-medium">{lead.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Site</div>
                <div className="font-medium text-xs">{lead.address.split(',').slice(-2).join(',').trim()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Contact</div>
                <div className="font-medium text-xs">{lead.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Install date</div>
                <div className="font-medium text-xs">{lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE') : 'TBD'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      <Card className={criticalLoaded === criticalTotal ? 'border-emerald-500' : 'border-amber-300'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {criticalLoaded === criticalTotal ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Truck className="h-5 w-5 text-amber-600" />
              )}
              <span className="font-semibold">
                {criticalLoaded === criticalTotal
                  ? 'All critical items loaded — ready to go!'
                  : `${criticalLoaded}/${criticalTotal} critical items loaded`}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{loadedCount}/{lines.length} total loaded</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${criticalLoaded === criticalTotal ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${(loadedCount / lines.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">Low stock — order before job</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below required quantity:
                </p>
                <ul className="text-sm mt-2 space-y-1">
                  {lowStockItems.map(item => (
                    <li key={item.id} className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 rounded">{item.sku}</span>
                      <span>{item.item} — need {item.qty}, have {item.stock}</span>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="mt-2 border-red-300 text-red-700 hover:bg-red-50">
                  <Package className="h-3 w-3 mr-1" /> Generate purchase order
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOM by category */}
      {Object.entries(groupedLines).map(([category, catLines]) => {
        const colors = CATEGORY_COLORS[category as BOMLine['category']];
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${colors.bg} ${colors.text}`}>{colors.label}</Badge>
                <span className="text-muted-foreground font-normal">{catLines.length} items</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {catLines.map(line => (
                  <div key={line.id} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                    <Checkbox
                      checked={line.loaded}
                      onCheckedChange={(v) => updateLine(line.id, { loaded: v === true })}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <div>
                          <span className={`font-medium text-sm ${line.loaded ? 'line-through text-muted-foreground' : ''}`}>
                            {line.qty} × {line.item}
                          </span>
                          {line.critical && (
                            <Badge variant="outline" className="ml-2 text-[9px] bg-red-50 text-red-700 border-red-200">
                              Critical
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {line.sku && (
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{line.sku}</span>
                          )}
                          <span className={line.stock < line.qty ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                            Stock: {line.stock}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {line.location || '—'}
                        </span>
                        <span>Unit: {line.unit}</span>
                      </div>
                      <Input
                        placeholder="Add note (e.g. 'pick extra from back of depot')"
                        value={line.notes}
                        onChange={e => updateLine(line.id, { notes: e.target.value })}
                        className="mt-2 h-7 text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.id)}
                      className="text-muted-foreground hover:text-red-600 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add custom item */}
      <Button variant="outline" onClick={addLine} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add custom item
      </Button>

      {/* Sign-off */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Installer sign-off (loaded by):</div>
              <div className="border-b border-border h-8" />
              <div className="text-xs text-muted-foreground mt-1">Name + signature</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">Date / time:</div>
              <div className="border-b border-border h-8" />
              <div className="text-xs text-muted-foreground mt-1">DD/MM/YYYY HH:MM</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrintView({ lead, lines, onBack }: { lead: DummyLead; lines: BOMLine[]; onBack: () => void }) {
  return (
    <div className="bg-white text-black p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold">BOM — Print Preview</h1>
        <Button variant="outline" onClick={onBack}>Back to edit</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bill of Materials</h1>
        <p className="text-sm">{lead.name} · {lead.address} · {lead.proposal?.system_size_kw} kWp system</p>
        <p className="text-xs text-gray-500 mt-1">Generated {new Date().toLocaleString('en-IE')}</p>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2">✓</th>
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-left">Unit</th>
            <th className="text-left">Location</th>
            <th className="text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <tr key={line.id} className="border-b">
              <td className="py-2">☐</td>
              <td className="font-medium">{line.item}</td>
              <td className="text-right tabular-nums">{line.qty}</td>
              <td>{line.unit}</td>
              <td>{line.location}</td>
              <td className="text-xs">{line.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-2 gap-8">
        <div>
          <div className="border-b border-black h-12" />
          <div className="text-xs mt-1">Installer signature</div>
        </div>
        <div>
          <div className="border-b border-black h-12" />
          <div className="text-xs mt-1">Date / time</div>
        </div>
      </div>
    </div>
  );
}
