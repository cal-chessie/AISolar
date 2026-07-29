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
import { DEFAULT_SERIALS, type SerialState } from '@/lib/fieldRecord';
import { esbFormForAcKw, inverterAcKw, type EsbFormChoice } from '@/lib/complianceDecision';
import { monitoringAppForModel, commissioningSteps, systemLiveEmail } from '@/lib/monitoringHandoff';
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

// Serials + the triple check (the moat): SerialState lives in lib/fieldRecord
// — ONE contract shared with pdfFill (the NC forms read the roof, not the
// proposal) and with Sweep 8's installed_equipment tables.

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

  // The second job of the triple check: if the FITTED AC rating crosses an
  // ESB band, the form itself flips (NC6→NC7 needs pre-approval). Computed
  // live off the plate rating so the crew learns ON THE ROOF, not at filing.
  const threePhaseSupply = /three/i.test(survey?.confirmed_inverter_type ?? '');
  const designedForm = esbFormForAcKw(inverterAcKw(lead), threePhaseSupply);
  const fittedKwNum = parseFloat(serials.acRatingKw);
  const fittedForm = Number.isFinite(fittedKwNum) && fittedKwNum > 0
    ? esbFormForAcKw(fittedKwNum, threePhaseSupply) : null;
  const formFlip = fittedForm && fittedForm !== designedForm
    ? { from: designedForm, to: fittedForm } : null;

  return (
    // data-density="comfortable": THE fix for Cal's "sizing is the worst part".
    // The field app was silently running desktop density (36px controls); this
    // opts the whole job view into 44px+ targets, bigger text for outdoor
    // legibility, and roomier rows — gloves, roofs, one hand free.
    <div data-density="comfortable" className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Job header — the SAME full-bleed shell as the installer portal */}
      <header className={`border-b flex-shrink-0 ${overallComplete ? 'bg-doc-deposit/10 dark:bg-doc-deposit/10' : 'bg-background'}`}>
        <div className="px-4 lg:px-6 py-3 flex items-center gap-3">
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
          {/* Completion status badge — done reads doc-deposit (family "signed off") */}
          {overallComplete ? (
            <Badge className="bg-doc-deposit text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
            </Badge>
          ) : (
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums">{overallProgress}%</div>
              <div className="text-[11px] text-muted-foreground">complete</div>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className={`h-full transition-all ${overallComplete ? 'bg-doc-deposit' : 'bg-primary/70'}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      {/* Body: the desktop PHASE RAIL (the click-through, vertical stepper) +
          the active phase. Full-bleed — no more centred tablet column. */}
      <div className="flex-1 min-h-0 flex">
        <aside className="hidden lg:flex lg:flex-col w-[288px] shrink-0 border-r bg-muted/20 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">This install</div>
            <dl className="mt-2 space-y-1.5 text-sm">
              {proposal && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">System</dt>
                  <dd className="font-medium">{proposal.system_size_kw}kWp · {proposal.panel_count} panels</dd>
                </div>
              )}
              {lead.assignment?.scheduled_date && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Install day</dt>
                  <dd className="font-medium">{new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}</dd>
                </div>
              )}
            </dl>
          </div>
          <PhaseStepper activeTab={activeTab} phaseCompletion={phaseCompletion} onSelect={setActiveTab} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Mobile phase tabs (the rail is desktop-only) — 3×2 grid, all reachable */}
          <nav className="lg:hidden border-b bg-background flex-shrink-0">
            <div className="grid grid-cols-3 px-2 py-2 gap-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const phaseDone = tab.id !== 'overview' && phaseCompletion[tab.id as keyof typeof phaseCompletion];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'step' : undefined}
                    className={`flex items-center justify-center gap-1.5 px-2 h-control rounded-control text-sm font-medium cursor-pointer border transition-colors duration-instant ${
                      isActive
                        ? 'bg-foreground text-background border-foreground'
                        : phaseDone
                        ? 'bg-doc-deposit/10 text-doc-deposit border-doc-deposit/20'
                        : 'text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${isActive ? '' : phaseDone ? 'text-doc-deposit' : PHASE_TINT[tab.id] ?? ''}`} />
                    <span className="truncate">{tab.shortLabel}</span>
                    {phaseDone && <CheckCircle2 className="size-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 lg:py-6 pb-24">
            {/* readable measure for checklists; the rail fills the left so the
                page reads full-bleed, not a floating centred card */}
            <div key={activeTab} className="max-w-3xl">
            {activeTab === 'overview' && (
              <OverviewTab lead={lead} overallComplete={overallComplete} onBegin={() => setActiveTab('pre_install')} />
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
                  <>
                    <CommissioningSerials
                      serials={serials}
                      specifiedInverter={proposal?.inverter_model || 'SolaX X1-Hybrid-5.0 G4'}
                      formFlip={formFlip}
                      onChange={(updates) => {
                        const next = { ...serials, ...updates };
                        setSerials(next);
                        persist({ serials: next });
                      }}
                    />
                    {serials.confirmed && <MonitoringHandoff fittedModel={serials.fittedModel} customerName={lead.name} />}
                  </>
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
      </div>
    </div>
  );
}

/* PhaseStepper — the vertical click-through in the desktop rail. Where you are,
 * what's done (doc-deposit ticks), what's next. Family-tinted per phase. */
function PhaseStepper({ activeTab, phaseCompletion, onSelect }: {
  activeTab: TabId;
  phaseCompletion: Record<string, boolean>;
  onSelect: (t: TabId) => void;
}) {
  return (
    <nav className="p-3 space-y-1" aria-label="Install phases">
      {TABS.map((tab, i) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const done = tab.id !== 'overview' && phaseCompletion[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            aria-current={isActive ? 'step' : undefined}
            className={`w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-medium text-left transition-colors ${
              isActive ? 'bg-foreground text-background'
              : done ? 'text-foreground hover:bg-muted'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className={`grid place-items-center size-6 rounded-full shrink-0 ${isActive ? 'bg-background/20' : done ? 'bg-doc-deposit/15' : 'bg-muted'}`}>
              {done ? <CheckCircle2 className="size-4 text-doc-deposit" /> : <Icon className={`size-4 ${isActive ? '' : PHASE_TINT[tab.id] ?? ''}`} />}
            </span>
            <span className="flex-1 truncate">{tab.label}</span>
            <span className={`text-2xs tabular-nums ${isActive ? 'text-background/60' : 'text-muted-foreground/60'}`}>{i + 1}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ============= OVERVIEW TAB =============
function OverviewTab({ lead, overallComplete, onBegin }: {
  lead: DummyLead;
  overallComplete: boolean;
  onBegin: () => void;
}) {
  const proposal = lead.proposal;
  const survey = lead.survey;

  return (
    <div className="space-y-4">
      {/* Completion status banner */}
      {overallComplete ? (
        <Card className="border-doc-deposit/40 bg-doc-deposit/10 dark:bg-doc-deposit/10">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-doc-deposit" />
            <div>
              <div className="font-bold text-doc-deposit dark:text-doc-deposit">All checks complete</div>
              <div className="text-xs text-doc-deposit dark:text-doc-deposit">Ready to mark job complete. Customer has signed, all photos uploaded.</div>
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

      {/* Job context — two columns on desktop so the page uses the full width
          (no more centred tablet column). */}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
      {/* SUBTRACTION (Cal, 28 Jul — "why would I see my header twice?"):
          the phase grid is GONE (the tab strip already carries every phase +
          its done-tick) and name/address are GONE from this card (the sticky
          header owns them). What remains is only what the header DOESN'T say. */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Job essentials
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="font-medium">{lead.phone}</div>
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
        <Card className="border-tech/30 dark:border-tech/30 bg-tech/5 dark:bg-tech/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-tech" /> Site notes (from survey)
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
                <div className="font-medium text-doc-deposit">{eur(proposal.seai_grant)}</div>
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
          <div className="mt-2 text-xs text-doc-deposit dark:text-doc-deposit">
            ✓ Safe for roof work
          </div>
        </CardContent>
      </Card>
      </div>

      {/* The click-through starts here — the rail (desktop) tracks the rest */}
      {!overallComplete && (
        <div className="pt-1">
          <Button size="lg" className="h-control px-6" onClick={onBegin}>
            Begin — Pre-install checks <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <p className="mt-2 text-2xs text-muted-foreground">Six phases, in order — the rail on the left tracks where you are.</p>
        </div>
      )}
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
        <Card className="border-doc-deposit/40 bg-doc-deposit/10 dark:bg-doc-deposit/10">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-doc-deposit" />
            <span className="text-sm font-medium text-doc-deposit dark:text-doc-deposit">Phase complete — move to next tab</span>
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
                  {item.done && <CheckCircle2 className="h-4 w-4 text-doc-deposit" />}
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
                  <div className={`p-2 rounded-lg ${photo.uploaded ? 'bg-doc-deposit/10 dark:bg-doc-deposit/10' : 'bg-muted'}`}>
                    {photo.uploaded ? (
                      <CheckCircle2 className="h-4 w-4 text-doc-deposit" />
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
function CommissioningSerials({ serials, specifiedInverter, formFlip, onChange }: {
  serials: SerialState;
  specifiedInverter: string;
  /** Set when the FITTED AC rating crosses an ESB band vs the design. */
  formFlip: { from: EsbFormChoice; to: EsbFormChoice } | null;
  onChange: (updates: Partial<SerialState>) => void;
}) {
  const modelsAgree = serials.fittedModel.trim() !== '' &&
    serials.fittedModel.trim().toLowerCase() === specifiedInverter.trim().toLowerCase();
  const mismatch = serials.fittedModel.trim() !== '' && !modelsAgree;
  // Everything the NC6 §5 wants comes off the plate the installer is looking
  // at, captured ONCE, here: model + serial + AC rating + export setting.
  // A mismatch cannot be confirmed without the why — the note IS the record.
  const canConfirm = serials.serial.trim() !== '' && serials.fittedModel.trim() !== ''
    && serials.acRatingKw.trim() !== '' && serials.exportLimit.trim() !== ''
    && (!mismatch || serials.note.trim() !== '');

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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Inverter serial number</Label>
            <Input
              value={serials.serial}
              onChange={e => onChange({ serial: e.target.value, confirmed: false })}
              placeholder="e.g. XB5012345678"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">AC rating (kW) — off the plate</Label>
            <Input
              value={serials.acRatingKw}
              onChange={e => onChange({ acRatingKw: e.target.value.replace(/[^0-9.]/g, ''), confirmed: false })}
              placeholder="e.g. 5.0"
              inputMode="decimal"
              className="mt-1 font-mono"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Export limitation — as commissioned</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(['None — full export', 'Limited'] as const).map(opt => {
              const active = opt === 'Limited'
                ? serials.exportLimit.startsWith('Limited')
                : serials.exportLimit === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange({ exportLimit: opt === 'Limited' ? 'Limited to ' : opt, confirmed: false })}
                  className={`h-10 rounded-control border text-xs font-medium transition-colors ${active ? 'border-tech bg-tech/10 text-tech' : 'border-border hover:bg-muted text-muted-foreground'}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {serials.exportLimit.startsWith('Limited') && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={serials.exportLimit.replace(/^Limited to /, '').replace(/ kW$/, '')}
                onChange={e => onChange({ exportLimit: `Limited to ${e.target.value.replace(/[^0-9.]/g, '')} kW`, confirmed: false })}
                placeholder="e.g. 6"
                inputMode="decimal"
                className="font-mono"
              />
              <span className="text-xs text-muted-foreground shrink-0">kW export limit</span>
            </div>
          )}
        </div>
        {formFlip && (
          <div className="rounded-control border-2 border-pop bg-pop-subtle p-3 text-xs space-y-1">
            <p className="font-bold text-pop flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> This rating changes the ESB form: {formFlip.from} → {formFlip.to}</p>
            <p className="text-muted-foreground">The fitted unit's AC rating crosses an ESB band. {formFlip.to === 'NC7' ? 'NC7 needs ESB pre-approval — STOP and call the office before commissioning this unit.' : 'Confirm the correct form with the office before commissioning.'} Recorded either way — nothing clears silently.</p>
          </div>
        )}
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
                <div className={`p-2 rounded-lg ${photo.uploaded ? 'bg-doc-deposit/10 dark:bg-doc-deposit/10' : 'bg-muted'}`}>
                  {photo.uploaded ? <CheckCircle2 className="h-4 w-4 text-doc-deposit" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
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

// ============= MONITORING HANDOFF — THE TROJAN HORSE =============
// Appears the moment the plate is confirmed: the coach knows the FITTED unit
// (never the proposal's), walks the drill for THAT inverter, and stages the
// customer's one-tap handoff to the RIGHT app. At VPP, their app becomes OUR
// app — same handoff, our door. Email SENDS at Sweep 8; preview is honest.
function MonitoringHandoff({ fittedModel, customerName }: { fittedModel: string; customerName: string }) {
  const [showEmail, setShowEmail] = useState(false);
  const app = monitoringAppForModel(fittedModel);
  const steps = commissioningSteps(app, fittedModel);
  const first = customerName.split(' ')[0];
  const email = systemLiveEmail({
    customerFirst: first, fittedModel, app,
    installerCompany: brand.legal.tradingName || 'your installer',
  });

  return (
    <Card className="border-tech/40">
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4 text-tech" /> AI Coach — commission the {app.brand} you just fitted
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            The coach reads the plate you confirmed: this is a <strong className="text-foreground">{fittedModel}</strong>, so {first}'s app is <strong className="text-foreground">{app.appName}</strong>. Run the drill:
          </p>
        </div>
        <ol className="space-y-1.5">
          {steps.map((s, n) => (
            <li key={n} className="flex gap-2.5 text-xs">
              <span className="size-5 rounded-full bg-tech/10 text-tech font-semibold grid place-items-center shrink-0">{n + 1}</span>
              <span className="text-muted-foreground pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        {app.ios && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-9 text-xs" asChild>
              <a href={app.ios} target="_blank" rel="noopener noreferrer">{app.appName} — iPhone</a>
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-9 text-xs" asChild>
              <a href={app.android} target="_blank" rel="noopener noreferrer">{app.appName} — Android</a>
            </Button>
          </div>
        )}
        <div className="rounded-control border border-border p-2.5">
          <button className="w-full flex items-center justify-between text-xs font-medium" onClick={() => setShowEmail(v => !v)}>
            <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-tech" /> "{email.subject}" — the live email, drafted</span>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showEmail ? 'rotate-90' : ''}`} />
          </button>
          {showEmail && (
            <div className="mt-2 space-y-2">
              <pre className="text-2xs whitespace-pre-wrap font-sans text-muted-foreground bg-muted/40 rounded p-2.5">{email.body}</pre>
              <p className="text-2xs text-muted-foreground">
                Draft only — sending wires at launch (Postmark, both ends notified). SEAI wording ships after verification.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
