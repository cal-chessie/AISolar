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

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Home, Shield, Wifi, FileText, PenLine, Sun, Cloud, CloudRain, Wind,
  User, ClipboardList, X, Star, Truck, ListChecks, Award,
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

// ============= TAB DEFINITIONS =============
type TabId = 'overview' | 'pre_install' | 'roof' | 'electrical' | 'commissioning' | 'handover';

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
  { id: 'serial_numbers_recorded', label: 'All serial numbers recorded', done: false, notes: '' },
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
  handover: [
    { id: 'photo_handover_pack', label: 'Handover pack given to customer', description: 'Photo of the documents folder handed to customer', uploaded: false },
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
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = (updates: Partial<{
    preInstall: ToggleItem[]; roof: ToggleItem[]; electrical: ToggleItem[];
    commissioning: ToggleItem[]; handover: ToggleItem[];
    photos: Record<TabId, PhotoItem[]>; signature: string | null;
  }>) => {
    const data = {
      preInstall, roof, electrical, commissioning, handover, photos, signature,
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
    commissioning: commissioning.every(t => t.done),
    handover: handover.every(t => t.done) && !!signature,
  };

  const overallComplete = Object.values(phaseCompletion).every(Boolean);
  const overallProgress = Math.round(((togglesDone / allToggles.length) * 0.6 + (photosUploaded / photosRequired) * 0.4) * 100);

  const proposal = lead.proposal;
  const survey = lead.survey;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header with completion status */}
      <header className={`border-b sticky top-0 z-30 ${overallComplete ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-background/95 backdrop-blur'}`}>
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
            <Badge className="bg-emerald-600 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
            </Badge>
          ) : (
            <div className="text-right">
              <div className="text-sm font-bold">{overallProgress}%</div>
              <div className="text-[10px] text-muted-foreground">complete</div>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className={`h-full transition-all ${overallComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      {/* Tab navigation — horizontal scroll on mobile, full on desktop */}
      <nav className="border-b bg-background sticky top-[57px] z-20">
        <div className="flex overflow-x-auto px-2 py-2 gap-1 scrollbar-thin">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const phaseDone = tab.id !== 'overview' && phaseCompletion[tab.id as keyof typeof phaseCompletion];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                  isActive
                    ? 'bg-amber-600 text-white'
                    : phaseDone
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {phaseDone && <CheckCircle2 className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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
                description="Power up, verify production, set up monitoring apps, record serials."
                items={commissioning}
                photos={photos.commissioning}
                onToggle={(id, updates) => updateToggle('commissioning', id, updates)}
                onPhoto={(id, uploaded) => updatePhoto('commissioning', id, uploaded)}
                onComplete={() => setActiveTab('handover')}
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
          </motion.div>
        </AnimatePresence>
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
        <Card className="border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <div className="font-bold text-emerald-800 dark:text-emerald-300">All checks complete</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400">Ready to mark job complete. Customer has signed, all photos uploaded.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <div className="font-bold text-amber-800 dark:text-amber-300">Job in progress</div>
              <div className="text-xs text-amber-700 dark:text-amber-400">Work through each tab in order. Don't skip checks — they prevent call-backs.</div>
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
              <Card key={phase.id} className={done ? 'border-emerald-400' : ''}>
                <CardContent className="p-3 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${done ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <div className="text-[10px] font-medium leading-tight">{phase.label}</div>
                  {done ? (
                    <Badge variant="outline" className="mt-1 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-2 w-2 mr-0.5" /> Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-[9px] bg-muted">Pending</Badge>
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
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-600" /> Site notes (from survey)
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
              <Sun className="h-4 w-4 text-amber-600" /> System being installed
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
                <div className="font-medium text-emerald-600">{eur(proposal.seai_grant)}</div>
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
              <Sun className="h-4 w-4 text-amber-500" />
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
          <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ Safe for roof work
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= CHECKLIST TAB (used for pre-install, roof, electrical, commissioning) =============
function ChecklistTab({ title, description, items, photos, onToggle, onPhoto, onComplete }: {
  title: string;
  description: string;
  items: ToggleItem[];
  photos: PhotoItem[];
  onToggle: (id: string, updates: Partial<ToggleItem>) => void;
  onPhoto: (id: string, uploaded: boolean) => void;
  onComplete: () => void;
}) {
  const allDone = items.every(t => t.done) && photos.every(p => p.uploaded);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {/* Phase completion banner */}
      {allDone ? (
        <Card className="border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Phase complete — move to next tab</span>
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
                  {item.done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
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
                  <div className={`p-2 rounded-lg ${photo.uploaded ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-muted'}`}>
                    {photo.uploaded ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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

      {/* Next button */}
      <Button
        onClick={onComplete}
        disabled={!allDone}
        className="w-full h-12 bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
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
  const [showPad, setShowPad] = useState(false);
  const allDone = items.every(t => t.done) && photos.every(p => p.uploaded) && !!signature;

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
                        <div className="text-xs text-emerald-700 mt-1">Signed · {new Date().toLocaleString('en-IE')}</div>
                        <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => setShowPad(true)}>Re-sign</Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setShowPad(true)} className="bg-emerald-600 hover:bg-emerald-700">
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
                <div className={`p-2 rounded-lg ${photo.uploaded ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-muted'}`}>
                  {photo.uploaded ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
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

      {/* Completion status */}
      {overallComplete ? (
        <Card className="border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-6 text-center">
            {jobCompleted ? (
              <>
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-600 mb-3 shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">Job complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  PostInstall Agent notified. Warranty docs + review request scheduled for {lead.name}. Returning to installer portal…
                </p>
              </>
            ) : (
              <>
                <Award className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg">Ready to mark complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All checks done, all photos uploaded, customer signed. Click below to finalize — PostInstall Agent will send warranty docs + schedule a review request.
                </p>
                <Button
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 w-full h-12"
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
          {!allDone ? 'Complete all handover checks + signature + photos to finish' : 'Ready to complete'}
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-background w-full max-w-md rounded-2xl p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Customer signature</h3>
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
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
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={save}>
            Save signature
          </Button>
        </div>
      </div>
    </div>
  );
}
