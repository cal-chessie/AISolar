/**
 * JobView V2 — tabbed, not scrolling.
 *
 * Tabs take the installer through what actually matters, in order:
 *   1. Overview — customer snapshot, site notes, BOM summary, completion status
 *   2. Pre-install — electrical checks (toggles)
 *   3. Roof — mounting + panel install (toggles + named photos)
 *   4. Electrical — isolators, SPD, cabling (toggles + named photos)
 *   5. Commissioning — monitoring setup, serial numbers (toggles + named photos)
 *   6. Handover — customer walkthrough, signature, final photo
 *
 * Each tab shows:
 *   - Toggle checklist with the EXACT items the installer needs
 *   - Named photos (each photo tells you what to photograph)
 *   - Notes field per item
 *   - Phase completion status
 *
 * Overall completion status at the top — green when everything's done.
 * No scrolling for days. Click a tab → see that phase → done → next tab.
 */

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft, MapPin, Phone, Calendar, Clock, Navigation, Camera,
  Package, CheckCircle2, AlertTriangle, ChevronRight, Zap, Wrench,
  Home, Shield, Wifi, FileText, PenLine, Sun, Cloud, CloudRain, Wind, Upload,
  User, ClipboardList, X, Star, Truck, ListChecks, Award, Cpu,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// ============= TOGGLE ITEM TYPES =============
interface ToggleItem {
  id: string;
  label: string;
  done: boolean;
  notes: string;
}

interface PhotoItem {
  id: string;
  label: string;       // e.g. "Main fuse board"
  description: string; // e.g. "Photo of the consumer unit showing fuse rating"
  uploaded: boolean;
  // In production: storage URL
}

// Serials + the triple check (ported from InstallRunner, 28 Jul — the moat).
// What's ACTUALLY on the wall, confirmed at the gate. Feeds NC6 §5 + the
// warranty pack at Sweep 8. The note is part of the record
// (COMPLIANCE_CHAIN_DESIGN §4, layer 3) — a mismatch can never clear silently.
interface SerialState {
  fittedModel: string;      // inverter model AS FITTED (off the rating plate)
  serial: string;           // inverter serial number
  confirmed: boolean;       // installer confirmed every digit at the gate
  mismatchFlagged: boolean; // fitted ≠ proposal — recorded, never cleared silently
  note: string;             // why — rides with the job record on a mismatch
}
const DEFAULT_SERIALS: SerialState = { fittedModel: '', serial: '', confirmed: false, mismatchFlagged: false, note: '' };

// ============= TAB DEFINITIONS =============
type TabId = 'overview' | 'pre_install' | 'roof' | 'electrical' | 'commissioning' | 'handover';

// Family accent per phase — the icon carries the colour (like the owner rail),
// so the job reads as the family pack, not a grey checklist (Cal, item 24).
const PHASE_TINT: Record<string, string> = {
  overview: 'text-foreground',
  pre_install: 'text-tech',
  roof: 'text-doc-contract',
  electrical: 'text-pop',
  commissioning: 'text-doc-proposal',
  handover: 'text-doc-deposit',
};

const TABS: Array<{ id: TabId; label: string; icon: typeof Home; shortLabel: string }> = [
  { id: 'overview', label: 'Overview', icon: ClipboardList, shortLabel: 'Overview' },
  { id: 'pre_install', label: 'Pre-install checks', icon: Shield, shortLabel: 'Pre-install' },
  { id: 'roof', label: 'Roof work', icon: Home, shortLabel: 'Roof' },
  { id: 'electrical', label: 'Electrical', icon: Zap, shortLabel: 'Electrical' },
  { id: 'commissioning', label: 'Commissioning', icon: Wifi, shortLabel: 'Commission' },
  { id: 'handover', label: 'Handover', icon: PenLine, shortLabel: 'Handover' },
];

// ============= DEFAULT CHECKLIST ITEMS =============
const DEFAULT_PRE_INSTALL: ToggleItem[] = [
  { id: 'isolator_installed', label: 'Isolator Installed', done: false, notes: '' },
  { id: 'export_limiter_required', label: 'Export Limiter Required', done: false, notes: '' },
  { id: 'rcd_present_tested', label: 'RCD Present & Tested', done: false, notes: '' },
  { id: 'earth_bond_confirmed', label: 'Earth Bond Confirmed', done: false, notes: '' },
];

const DEFAULT_ROOF: ToggleItem[] = [
  { id: 'panels_installed', label: 'Panels Installed', done: false, notes: '' },
  { id: 'roof_tiles_secure', label: 'Roof Tiles Secure', done: false, notes: '' },
  { id: 'flashing_installed', label: 'Flashing Installed', done: false, notes: '' },
  { id: 'cable_routing_complete', label: 'Cable Routing Complete', done: false, notes: '' },
  { id: 'weatherproofing_complete', label: 'Weatherproofing Complete', done: false, notes: '' },
];

const DEFAULT_ELECTRICAL: ToggleItem[] = [
  { id: 'inverter_installed', label: 'Inverter Installed', done: false, notes: '' },
  { id: 'battery_installed', label: 'Battery Installed', done: false, notes: '' },
  { id: 'dc_cable_run', label: 'DC cabling run (roof to inverter)', done: false, notes: '' },
  { id: 'ac_cable_run', label: 'AC cabling run (inverter to CU)', done: false, notes: '' },
  { id: 'dc_isolator', label: 'DC isolator installed', done: false, notes: '' },
  { id: 'ac_isolator', label: 'AC isolator installed', done: false, notes: '' },
  { id: 'spd_installed', label: 'Type 2 SPD installed', done: false, notes: '' },
  { id: 'labelling_complete', label: 'All circuits labelled (RECI)', done: false, notes: '' },
];

const DEFAULT_COMMISSIONING: ToggleItem[] = [
  { id: 'monitoring_online', label: 'Monitoring Online', done: false, notes: '' },
  { id: 'customer_app_setup', label: 'Customer App Setup', done: false, notes: '' },
  { id: 'myenergi_setup', label: 'MyEnergi Setup', done: false, notes: '' },
  // 'serial_numbers_recorded' checkbox retired 28 Jul — superseded by the real
  // serial capture + triple check (SerialState / CommissioningSerials below).
  { id: 'production_verified', label: 'Production verified (kW output confirmed)', done: false, notes: '' },
];

const DEFAULT_HANDOVER: ToggleItem[] = [
  { id: 'customer_walkthrough', label: 'Customer walkthrough complete', done: false, notes: '' },
  { id: 'handover_pack_given', label: 'Handover pack given (warranty, manual, SEAI docs)', done: false, notes: '' },
  { id: 'emergency_shutdown_explained', label: 'Emergency shutdown procedure explained', done: false, notes: '' },
  { id: 'customer_signature', label: 'Customer signature obtained', done: false, notes: '' },
];

// ============= NAMED PHOTOS =============
const DEFAULT_PHOTOS: Record<TabId, PhotoItem[]> = {
  overview: [],
  pre_install: [
    { id: 'photo_arrival', label: 'Property front (arrival)', description: 'Photo showing the property from the street, confirming you\'ve arrived', uploaded: false },
    { id: 'photo_fuse_board', label: 'Main fuse board', description: 'Photo of the consumer unit showing fuse rating and existing RCDs', uploaded: false },
    { id: 'photo_earth_bond', label: 'Earth bonding (gas/water)', description: 'Photo of earth bonding clamps on gas and water pipes', uploaded: false },
  ],
  roof: [
    { id: 'photo_roof_before', label: 'Roof before work starts', description: 'Photo of the roof from ground level, showing original state', uploaded: false },
    { id: 'photo_mounting', label: 'Mounting rails installed', description: 'Photo showing rails + roof hooks in place before panels', uploaded: false },
    { id: 'photo_panels', label: 'Completed panel array', description: 'Photo of all panels mounted, from roof level', uploaded: false },
    { id: 'photo_weatherproofing', label: 'Weatherproofing / flashing', description: 'Close-up of flashing and weatherproofing around roof penetrations', uploaded: false },
  ],
  electrical: [
    { id: 'photo_inverter', label: 'Inverter installed', description: 'Photo of inverter mounted in final location', uploaded: false },
    { id: 'photo_battery', label: 'Battery installed', description: 'Photo of battery in final location (if applicable)', uploaded: false },
    { id: 'photo_isolators', label: 'DC + AC isolators', description: 'Photo showing both isolators clearly labelled', uploaded: false },
    { id: 'photo_spd', label: 'Type 2 SPD in consumer unit', description: 'Photo of surge protection device installed in CU', uploaded: false },
    { id: 'photo_labelling', label: 'Circuit labelling', description: 'Photo showing all labels (DC+, DC-, AC, isolators)', uploaded: false },
  ],
  commissioning: [
    { id: 'photo_inverter_screen', label: 'Inverter screen showing production', description: 'Photo of inverter display confirming it\'s producing power', uploaded: false },
    { id: 'photo_monitoring_app', label: 'Monitoring app on customer phone', description: 'Screenshot/photo of monitoring app showing data flowing', uploaded: false },
    { id: 'photo_serial_numbers', label: 'Serial numbers (panels + inverter + battery)', description: 'Photo of serial number labels — needed for SEAI + warranty', uploaded: false },
  ],
  // Cal 2026-07-21: dropped the "photo of the documents folder" — it proves
  // nothing and costs the installer a step at the busiest moment. The signature
  // is the actual proof of handover. The final array shot stays: it's the
  // warranty/SEAI record and the customer's own before/after.
  handover: [
    { id: 'photo_final_array', label: 'Final photo of completed install', description: 'Photo of the full array from ground level, install complete', uploaded: false },
  ],
};

export default function JobViewV2() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    if (leadId) {
      const found = leads.find(l => l.id === leadId);
      if (found) return found;
    }
    return leads.find(l => l.proposal && l.assignment) || leads[8];
  });
  const [jobCompleted, setJobCompleted] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Checklist state — persisted to localStorage
  const [preInstall, setPreInstall] = useState<ToggleItem[]>(DEFAULT_PRE_INSTALL);
  const [roof, setRoof] = useState<ToggleItem[]>(DEFAULT_ROOF);
  const [electrical, setElectrical] = useState<ToggleItem[]>(DEFAULT_ELECTRICAL);
  const [commissioning, setCommissioning] = useState<ToggleItem[]>(DEFAULT_COMMISSIONING);
  const [handover, setHandover] = useState<ToggleItem[]>(DEFAULT_HANDOVER);
  const [photos, setPhotos] = useState<Record<TabId, PhotoItem[]>>(DEFAULT_PHOTOS);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [serials, setSerials] = useState<SerialState>(DEFAULT_SERIALS);

  const storageKey = `jobview_v2_${lead.id}`;

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.preInstall) setPreInstall(data.preInstall);
        if (data.roof) setRoof(data.roof);
        if (data.electrical) setElectrical(data.electrical);
        if (data.commissioning) setCommissioning(data.commissioning);
        if (data.handover) setHandover(data.handover);
        if (data.photos) setPhotos(data.photos);
        if (data.signature) setSignature(data.signature);
        if (data.serials) setSerials({ ...DEFAULT_SERIALS, ...data.serials });
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = (updates: Partial<{
    preInstall: ToggleItem[]; roof: ToggleItem[]; electrical: ToggleItem[];
    commissioning: ToggleItem[]; handover: ToggleItem[];
    photos: Record<TabId, PhotoItem[]>; signature: string | null;
    serials: SerialState;
  }>) => {
    const data = {
      preInstall, roof, electrical, commissioning, handover, photos, signature, serials,
      ...updates,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch { /* ignore */ }
  };

  const updateToggle = (phase: 'preInstall' | 'roof' | 'electrical' | 'commissioning' | 'handover', id: string, updates: Partial<ToggleItem>) => {
    const setters = { preInstall: setPreInstall, roof: setRoof, electrical: setElectrical, commissioning: setCommissioning, handover: setHandover };
    const current = { preInstall, roof, electrical, commissioning, handover };
    const newList = current[phase].map(item => item.id === id ? { ...item, ...updates } : item);
    setters[phase](newList);
    persist({ [phase]: newList } as any);
  };

  const updatePhoto = (tab: TabId, id: string, uploaded: boolean) => {
    const newList = photos[tab].map(p => p.id === id ? { ...p, uploaded } : p);
    const newPhotos = { ...photos, [tab]: newList };
    setPhotos(newPhotos);
    persist({ photos: newPhotos });
  };

  // Completion calculations
  const allToggles = [...preInstall, ...roof, ...electrical, ...commissioning, ...handover];
  const togglesDone = allToggles.filter(t => t.done).length;
  const allPhotos = Object.values(photos).flat();
  const photosUploaded = allPhotos.filter(p => p.uploaded).length;
  const photosRequired = allPhotos.length;

  const phaseCompletion = {
    pre_install: preInstall.every(t => t.done),
    roof: roof.every(t => t.done),
    electrical: electrical.every(t => t.done),
    // Commissioning needs the serial confirmed at the gate — the triple check
    // is the moat, not an optional extra.
    commissioning: commissioning.every(t => t.done) && serials.confirmed,
    handover: handover.every(t => t.done) && !!signature,
  };

  const overallComplete = Object.values(phaseCompletion).every(Boolean);
  const overallProgress = Math.round(((togglesDone / allToggles.length) * 0.6 + (photosUploaded / photosRequired) * 0.4) * 100);

  const proposal = lead.proposal;
  const survey = lead.survey;

  return (
    // data-density="comfortable": THE fix for Cal's "sizing is the worst part".
    // The field app was silently running desktop density (36px controls); this
    // opts the whole job view into 44px+ targets, bigger text for outdoor
    // legibility, and roomier rows — gloves, roofs, one hand free.
    <div data-density="comfortable" className="min-h-dvh bg-background">
      {/* Sticky header with completion status */}
      <header className={`border-b sticky top-0 z-30 ${overallComplete ? 'bg-primary/10 dark:bg-primary/10' : 'bg-background/95 backdrop-blur'}`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/installer')} className="p-2" aria-label="Back to installer portal">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{lead.name}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {lead.address.split(',').slice(-2).join(',').trim()}
            </div>
          </div>
          {/* Completion status badge */}
          {overallComplete ? (
            <Badge className="bg-primary text-primary-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
            </Badge>
          ) : (
            <div className="text-right">
              <div className="text-sm font-bold">{overallProgress}%</div>
              <div className="text-[11px] text-muted-foreground">complete</div>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className={`h-full transition-all ${overallComplete ? 'bg-primary' : 'bg-primary/70'}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      {/* Tab navigation — Cal 2026-07-21: was a 244px-overflowing scroll strip,
          so Handover sat off-screen and had to be swiped to. Now a 3x2 grid on
          phones (every phase reachable without scrolling) and one row on
          tablet/desktop. */}
      <nav className="border-b bg-background sticky top-[57px] z-20">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap px-2 py-2 gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const phaseDone = tab.id !== 'overview' && phaseCompletion[tab.id as keyof typeof phaseCompletion];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3 h-control rounded-control text-sm font-medium cursor-pointer border transition-colors duration-instant ${
                  isActive
                    ? 'bg-foreground text-background border-foreground'
                    : phaseDone
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`size-4 shrink-0 ${isActive ? '' : phaseDone ? 'text-doc-deposit' : PHASE_TINT[tab.id] ?? ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden truncate">{tab.shortLabel}</span>
                {phaseDone && <CheckCircle2 className="size-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-4 pb-20">
        {/* FIFTH AnimatePresence freeze site — same bug as installer tabs,
            LeadFlow, routes, consultant tabs. Tabs switch instantly. */}
        <div key={activeTab}
          >
            {activeTab === 'overview' && (
              <OverviewTab lead={lead} phaseCompletion={phaseCompletion} overallComplete={overallComplete} />
            )}
            {activeTab === 'pre_install' && (
              <ChecklistTab
                title="Pre-install electrical checks"
                description="Verify the existing electrical installation before starting work."
                items={preInstall}
                photos={photos.pre_install}
                onToggle={(id, updates) => updateToggle('preInstall', id, updates)}
                onPhoto={(id, uploaded) => updatePhoto('pre_install', id, uploaded)}
                onComplete={() => setActiveTab('roof')}
              />
            )}
            {activeTab === 'roof' && (
              <ChecklistTab
                title="Roof work"
                description="Mounting rails, panels, weatherproofing. Take a photo at each stage."
                items={roof}
                photos={photos.roof}
                onToggle={(id, updates) => updateToggle('roof', id, updates)}
                onPhoto={(id, uploaded) => updatePhoto('roof', id, uploaded)}
                onComplete={() => setActiveTab('electrical')}
              />
            )}
            {activeTab === 'electrical' && (
              <ChecklistTab
                title="Electrical installation"
                description="Inverter, battery, cabling, isolators, SPD, labelling."
                items={electrical}
                photos={photos.electrical}
                onToggle={(id, updates) => updateToggle('electrical', id, updates)}
                onPhoto={(id, uploaded) => updatePhoto('electrical', id, uploaded)}
                onComplete={() => setActiveTab('commissioning')}
              />
            )}
            {activeTab === 'commissioning' && (
              <ChecklistTab
                title="Commissioning & monitoring"
                description="Power up, verify production, set up monitoring apps, capture the serials off the plate."
                items={commissioning}
                photos={photos.commissioning}
                onToggle={(id, updates) => updateToggle('commissioning', id, updates)}
                onPhoto={(id, uploaded) => updatePhoto('commissioning', id, uploaded)}
                onComplete={() => setActiveTab('handover')}
                extra={
                  <CommissioningSerials
                    serials={serials}
                    specifiedInverter={proposal?.inverter_model || 'SolaX X1-Hybrid-5.0 G4'}
                    onChange={(updates) => {
                      const next = { ...serials, ...updates };
                      setSerials(next);
                      persist({ serials: next });
                    }}
                  />
                }
                extraDone={serials.confirmed}
              />
            )}
            {activeTab === 'handover' && (
              <HandoverTab
                items={handover}
                photos={photos.handover}
                signature={signature}
                onToggle={(id, updates) => updateToggle('handover', id, updates)}
                onPhoto={(id, uploaded) => updatePhoto('handover', id, uploaded)}
                onSignature={(sig) => { setSignature(sig); persist({ signature: sig }); }}
                overallComplete={overallComplete}
                lead={lead}
                jobCompleted={jobCompleted}
                onMarkJobComplete={() => {
                  setJobCompleted(true);
                  toast.success('Job marked complete', {
                    description: `PostInstall Agent will send warranty docs + schedule a review request for ${lead.name} in 7 days.`,
                  });
                  setTimeout(() => navigate('/installer'), 1800);
                }}
              />
            )}
          </div>
      </main>
    </div>
  );
}

// ============= OVERVIEW TAB =============
function OverviewTab({ lead, phaseCompletion, overallComplete }: {
  lead: DummyLead;
  phaseCompletion: Record<string, boolean>;
  overallComplete: boolean;
}) {
  const proposal = lead.proposal;
  const survey = lead.survey;
  const phases = [
    { id: 'pre_install', label: 'Pre-install checks', icon: Shield },
    { id: 'roof', label: 'Roof work', icon: Home },
    { id: 'electrical', label: 'Electrical', icon: Zap },
    { id: 'commissioning', label: 'Commissioning', icon: Wifi },
    { id: 'handover', label: 'Handover', icon: PenLine },
  ];

  return (
    <div className="space-y-4">
      {/* Completion status banner */}
      {overallComplete ? (
        <Card className="border-primary/40 bg-primary/10 dark:bg-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <div className="font-bold text-primary dark:text-primary">All checks complete</div>
              <div className="text-xs text-primary dark:text-primary">Ready to mark job complete. Customer has signed, all photos uploaded.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Guidance, not a warning — calm/neutral, never amber (Cal's rule:
        // yellow is reserved for pending/warning states only).
        <Card className="border-border bg-muted/40">
          <CardContent className="p-4 flex items-center gap-3">
            <ListChecks className="h-7 w-7 text-muted-foreground shrink-0" />
            <div>
              <div className="font-semibold text-sm">Work through each tab in order</div>
              <div className="text-xs text-muted-foreground">Don't skip the checks — they're what prevent call-backs.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase completion grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">Phase status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {phases.map(phase => {
            const done = phaseCompletion[phase.id];
            const Icon = phase.icon;
            return (
              <Card key={phase.id} className={done ? 'border-primary/40' : ''}>
                <CardContent className="p-3 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${done ? 'text-doc-deposit' : PHASE_TINT[phase.id] ?? 'text-muted-foreground'}`} />
                  <div className="text-[11px] font-medium leading-tight">{phase.label}</div>
                  {done ? (
                    <Badge variant="outline" className="mt-1 text-[11px] bg-primary/10 text-primary border-primary/40">
                      <CheckCircle2 className="h-2 w-2 mr-0.5" /> Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-[11px] bg-muted">Pending</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Customer snapshot */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Customer
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-medium">{lead.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="font-medium">{lead.phone}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Address</div>
              <div className="font-medium">{lead.address}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">MPRN</div>
              <div className="font-medium font-mono">{lead.mprn}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Install date</div>
              <div className="font-medium">{lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE') : 'TBD'}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${lead.phone}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lead.address)}`} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-3 w-3 mr-1" /> Directions
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Site notes from survey (read-only snapshot, not the survey questions) */}
      {survey && (
        <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Site notes (from survey)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Roof type</div>
                <div className="font-medium">{survey.roof_type}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Orientation</div>
                <div className="font-medium">{survey.roof_orientation}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pitch</div>
                <div className="font-medium">{survey.roof_pitch}°</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Shading</div>
                <div className="font-medium capitalize">{survey.shading}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Available area</div>
                <div className="font-medium">{survey.available_area_m2}m²</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Battery</div>
                <div className="font-medium">{survey.confirmed_battery_kwh ? `${survey.confirmed_battery_kwh}kWh` : 'None'}</div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-background/60 rounded text-xs">
              <strong>Surveyor notes:</strong> {survey.roof_type} roof, {survey.shading} shading. {survey.confirmed_battery_kwh ? `Battery: ${survey.confirmed_battery_kwh}kWh.` : 'No battery.'} Inverter type: {survey.confirmed_inverter_type}.
            </div>
          </CardContent>
        </Card>
      )}

      {/* System summary */}
      {proposal && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" /> System being installed
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">System size</div>
                <div className="font-bold text-lg">{proposal.system_size_kw} kWp</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Panels</div>
                <div className="font-medium">{proposal.panel_count} × {proposal.panel_model}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Inverter</div>
                <div className="font-medium">{proposal.inverter_model}</div>
              </div>
              {proposal.battery_model && (
                <div>
                  <div className="text-xs text-muted-foreground">Battery</div>
                  <div className="font-medium">{proposal.battery_model}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Net cost</div>
                <div className="font-medium">{eur(proposal.net_cost)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">SEAI grant</div>
                <div className="font-medium text-primary">{eur(proposal.seai_grant)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weather */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Cloud className="h-4 w-4" /> Weather
          </h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span>18°C</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-muted-foreground" />
              <span>10% rain</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <span>12 km/h SW</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-primary dark:text-primary">
            ✓ Safe for roof work
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= CHECKLIST TAB (used for pre-install, roof, electrical, commissioning) =============
function ChecklistTab({ title, description, items, photos, onToggle, onPhoto, onComplete, extra, extraDone = true }: {
  title: string;
  description: string;
  items: ToggleItem[];
  photos: PhotoItem[];
  onToggle: (id: string, updates: Partial<ToggleItem>) => void;
  onPhoto: (id: string, uploaded: boolean) => void;
  onComplete: () => void;
  /** Phase-specific section (e.g. commissioning's serial triple check). */
  extra?: ReactNode;
  /** Gate the phase on the extra section (defaults open when no extra). */
  extraDone?: boolean;
}) {
  const allDone = items.every(t => t.done) && photos.every(p => p.uploaded) && extraDone;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {/* Phase completion banner */}
      {allDone ? (
        <Card className="border-primary/40 bg-primary/10 dark:bg-primary/10">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary dark:text-primary">Phase complete — move to next tab</span>
          </CardContent>
        </Card>
      ) : (
        <div className="text-xs text-muted-foreground">
          {items.filter(t => t.done).length}/{items.length} checks done · {photos.filter(p => p.uploaded).length}/{photos.length} photos uploaded
        </div>
      )}

      {/* Toggle checklist */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Checklist
            </h3>
          </div>
          <div className="divide-y">
            {items.map(item => (
              <div key={item.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={item.done}
                    onCheckedChange={(v) => onToggle(item.id, { done: v })}
                  />
                  <Label className={`text-sm font-medium flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </Label>
                  {item.done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <Input
                  placeholder="Add note (e.g. '100A main fuse', 'earth bond at gas meter')"
                  value={item.notes}
                  onChange={e => onToggle(item.id, { notes: e.target.value })}
                  className="mt-2 h-8 text-xs"
                  disabled={!item.done}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Named photos */}
      {photos.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" /> Required photos
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Each photo tells you exactly what to capture. Needed for SEAI + warranty.</p>
            </div>
            <div className="divide-y">
              {photos.map(photo => (
                <div key={photo.id} className="p-3 flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${photo.uploaded ? 'bg-primary/10 dark:bg-primary/10' : 'bg-muted'}`}>
                    {photo.uploaded ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{photo.label}</div>
                    <div className="text-xs text-muted-foreground">{photo.description}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={photo.uploaded ? "outline" : "default"}
                    className="h-8 text-xs"
                    onClick={() => onPhoto(photo.id, !photo.uploaded)}
                  >
                    {photo.uploaded ? 'Retake' : 'Capture'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase-specific section (commissioning: the serial triple check) */}
      {extra}

      {/* Next button */}
      <Button
        onClick={onComplete}
        disabled={!allDone}
        className="w-full h-12 bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {allDone ? (
          <>Phase complete — next <ChevronRight className="h-4 w-4 ml-1" /></>
        ) : (
          <>Complete all checks + photos to continue</>
        )}
      </Button>
    </div>
  );
}

// ============= COMMISSIONING SERIALS — THE TRIPLE CHECK =============
// Ported from InstallRunner (28 Jul, the moat): the machine captures what was
// fitted → cross-checks it against what the proposal specified → the installer
// confirms at the gate, with a note when they don't match. The note is part of
// the record (COMPLIANCE_CHAIN_DESIGN §4 layer 3). A substituted inverter makes
// the NC6 describe kit that isn't on the roof — and a kW change can flip
// NC6 → NC7, which needs ESB pre-approval. Nothing clears silently.
// Sweep 8 wires: fitted model + serial → installed_equipment → pdfFill; the
// mismatch flag → office notification BEFORE any NC6 generates.
function CommissioningSerials({ serials, specifiedInverter, onChange }: {
  serials: SerialState;
  specifiedInverter: string;
  onChange: (updates: Partial<SerialState>) => void;
}) {
  const modelsAgree = serials.fittedModel.trim() !== '' &&
    serials.fittedModel.trim().toLowerCase() === specifiedInverter.trim().toLowerCase();
  const mismatch = serials.fittedModel.trim() !== '' && !modelsAgree;
  // A mismatch cannot be confirmed without the why — the note IS the record.
  const canConfirm = serials.serial.trim() !== '' && serials.fittedModel.trim() !== '' && (!mismatch || serials.note.trim() !== '');

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-tech" /> Serials off the van — the triple check
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Feeds NC6 §5 + the warranty pack. Captured once, off the rating plate.</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Inverter model AS FITTED (off the rating plate)</Label>
          <Input
            value={serials.fittedModel}
            onChange={e => onChange({ fittedModel: e.target.value, confirmed: false })}
            placeholder={specifiedInverter}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Inverter serial number</Label>
          <Input
            value={serials.serial}
            onChange={e => onChange({ serial: e.target.value, confirmed: false })}
            placeholder="e.g. XB5012345678"
            className="mt-1 font-mono"
          />
        </div>
        {serials.fittedModel.trim() !== '' && (modelsAgree ? (
          <div className="rounded-control border border-doc-deposit/40 bg-doc-deposit/10 p-2.5 text-xs">
            <p className="font-semibold text-doc-deposit flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Matches the proposal</p>
            <p className="text-muted-foreground mt-0.5">Proposal specified <strong className="text-foreground">{specifiedInverter}</strong>. NC6 §5 and the protection table will describe what's actually on the wall.</p>
          </div>
        ) : (
          <div className="rounded-control border border-pop/40 bg-pop-subtle p-2.5 text-xs space-y-2">
            <p className="font-semibold text-pop flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Doesn't match the proposal</p>
            <p className="text-muted-foreground">Proposal specified <strong className="text-foreground">{specifiedInverter}</strong>. A substituted inverter makes the NC6 describe kit that isn't on the roof — and a kW change can flip NC6 → NC7, which needs ESB pre-approval. Nothing clears silently.</p>
            <div>
              <Label className="text-xs text-muted-foreground">Why — the note rides with the record (required)</Label>
              <Textarea
                value={serials.note}
                onChange={e => onChange({ note: e.target.value })}
                placeholder='e.g. "SE5K unavailable, fitted SE6K with customer agreement"'
                className="mt-1 min-h-16 text-sm"
              />
            </div>
          </div>
        ))}
        {serials.confirmed ? (
          <div className={`rounded-control border p-2.5 text-xs font-medium flex items-center gap-1.5 ${serials.mismatchFlagged ? 'border-pop/40 bg-pop-subtle text-pop' : 'border-doc-deposit/40 bg-doc-deposit/10 text-doc-deposit'}`}>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {serials.mismatchFlagged
              ? 'Recorded as fitted — substitution flagged, note filed with the job record'
              : 'Confirmed at the gate — every digit checked by you'}
          </div>
        ) : (
          <Button
            disabled={!canConfirm}
            onClick={() => {
              onChange({ confirmed: true, mismatchFlagged: mismatch });
              toast.success(mismatch ? 'Recorded as fitted — substitution flagged' : 'Serial confirmed — matches the proposal', {
                description: mismatch
                  ? 'Flag + note ride with the job record.'
                  : 'Every digit confirmed by you at the gate.',
              });
            }}
            className={`w-full h-11 text-sm font-semibold text-white disabled:opacity-40 ${mismatch ? 'bg-pop hover:bg-pop/90' : 'bg-tech hover:bg-tech/90'}`}
          >
            {mismatch ? 'Record as fitted + flag it' : 'I confirm every digit'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============= HANDOVER TAB =============
function HandoverTab({ items, photos, signature, onToggle, onPhoto, onSignature, overallComplete, lead, jobCompleted, onMarkJobComplete }: {
  items: ToggleItem[];
  photos: PhotoItem[];
  signature: string | null;
  onToggle: (id: string, updates: Partial<ToggleItem>) => void;
  onPhoto: (id: string, uploaded: boolean) => void;
  onSignature: (sig: string) => void;
  overallComplete: boolean;
  lead: DummyLead;
  jobCompleted?: boolean;
  onMarkJobComplete?: () => void;
}) {
  // Cal's gate: no certs, no job-complete
  const [certs, setCerts] = useState<{ reci?: string; dow?: string }>({});
  const certsDone = !!certs.reci && !!certs.dow;
  const [showPad, setShowPad] = useState(false);
  const allDone = items.every(t => t.done) && photos.every(p => p.uploaded) && !!signature;

  // Escape closes the signature pad
  useEffect(() => {
    if (!showPad) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPad(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPad]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Customer handover</h2>
        <p className="text-sm text-muted-foreground mt-1">Walk customer through the system, get their signature, take final photos.</p>
      </div>

      {/* Checklist */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {items.map(item => (
              <div key={item.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={item.done}
                    onCheckedChange={(v) => onToggle(item.id, { done: v })}
                  />
                  <Label className={`text-sm font-medium flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </Label>
                </div>
                {item.id === 'customer_signature' && (
                  <div className="mt-2 pl-11">
                    {signature ? (
                      <div>
                        <img src={signature} alt="Customer signature" className="border rounded bg-white p-2 max-h-24 w-auto" />
                        <div className="text-xs text-primary mt-1">Signed · {new Date().toLocaleString('en-IE')}</div>
                        <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => setShowPad(true)}>Re-sign</Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setShowPad(true)} className="bg-primary transition-colors hover:bg-primary">
                        <PenLine className="h-3 w-3 mr-1" /> Get signature
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" /> Required photos
            </h3>
          </div>
          <div className="divide-y">
            {photos.map(photo => (
              <div key={photo.id} className="p-3 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${photo.uploaded ? 'bg-primary/10 dark:bg-primary/10' : 'bg-muted'}`}>
                  {photo.uploaded ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{photo.label}</div>
                  <div className="text-xs text-muted-foreground">{photo.description}</div>
                </div>
                <Button
                  size="sm"
                  variant={photo.uploaded ? "outline" : "default"}
                  className="h-8 text-xs"
                  onClick={() => onPhoto(photo.id, !photo.uploaded)}
                >
                  {photo.uploaded ? 'Retake' : 'Capture'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* THE CERT GATE (Cal): the electrical guy cannot end the job until his
          signed certs are uploaded. RECI cert is I.S. 10101 — signed by the
          Registered Electrical Contractor, uploaded, never generated. */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-doc-contract" /> Certs — required to finish</h3>
          <p className="text-xs text-muted-foreground mb-3">Both go straight into {lead.name.split(' ')[0]}'s paperwork pack. The Declaration of Works auto-sends to the BER assessor.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {([['reci', 'Safe Electric (RECI) certificate'], ['dow', 'Signed Declaration of Works']] as const).map(([id, label]) => (
              <label key={id} className={`flex items-center gap-2.5 p-3 rounded-control border cursor-pointer transition-colors ${certs[id] ? 'border-doc-deposit/40 bg-doc-deposit/5' : 'border-dashed border-border hover:bg-muted/40'}`}>
                <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) { setCerts(c => ({ ...c, [id]: e.target.files![0].name })); toast.success(`${label} filed`, { description: id === 'dow' ? 'Sent to the BER assessor + filed in the paperwork pack.' : 'Filed in the paperwork pack.' }); } }} />
                {certs[id] ? <CheckCircle2 className="h-4 w-4 text-doc-deposit shrink-0" /> : <Upload className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{label}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{certs[id] ?? 'Photo or PDF — tap to upload'}</span>
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completion status */}
      {overallComplete && certsDone ? (
        <Card className="border-primary/40 bg-primary/10 dark:bg-primary/10">
          <CardContent className="p-6 text-center">
            {jobCompleted ? (
              <>
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary mb-3 shadow-lg shadow-card">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">Job complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  PostInstall Agent notified. Warranty docs + review request scheduled for {lead.name}. Returning to installer portal…
                </p>
              </>
            ) : (
              <>
                <Award className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg">Ready to mark complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All checks done, all photos uploaded, customer signed. Click below to finalize — PostInstall Agent will send warranty docs + schedule a review request.
                </p>
                <Button
                  className="mt-4 bg-primary transition-colors hover:bg-primary w-full h-12"
                  onClick={onMarkJobComplete}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark job complete
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 bg-muted/30 rounded-lg text-center text-xs text-muted-foreground">
          {!allDone ? 'Complete all handover checks + signature + photos to finish'
            : !certsDone ? 'Upload the RECI cert + signed Declaration of Works above — the job cannot be ended without them'
            : 'Ready to complete'}
        </div>
      )}

      {/* Signature pad modal */}
      {showPad && (
        <SignaturePad
          customerName={lead.name}
          onSave={(sig) => { onSignature(sig); onToggle('customer_signature', { done: true }); setShowPad(false); }}
          onCancel={() => setShowPad(false)}
        />
      )}
    </div>
  );
}

// ============= SIGNATURE PAD =============
function SignaturePad({ customerName, onSave, onCancel }: {
  customerName: string;
  onSave: (sig: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const { x, y } = getCoords(e);
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Signature pad for ${customerName}`}
    >
      <div className="bg-background w-full max-w-md rounded-2xl p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Customer signature</h3>
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close signature pad"><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          I, {customerName}, confirm the solar installation is complete, commissioned, and I've been shown how to use the monitoring app.
        </p>
        <canvas
          ref={canvasRef}
          className="w-full h-48 border-2 border-border rounded-lg bg-white touch-none cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerLeave={stopDraw}
          width={400}
          height={200}
        />
        <div className="flex gap-2 mt-3">
          <Button variant="outline" className="flex-1" onClick={clear}>Clear</Button>
          <Button className="flex-1 bg-primary transition-colors hover:bg-primary" onClick={save}>
            Save signature
          </Button>
        </div>
      </div>
    </div>
  );
}
