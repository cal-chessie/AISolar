/**
 * JobView — the single scrollable page an installer sees for ONE job.
 *
 * Replaces the scattered 6-tab approach. Everything in the right order:
 *
 *   1. Sticky job header (customer, address, time, system size, contact)
 *   2. BOM checklist (collapsible — load van in the morning)
 *   3. Site notes from survey (roof type, orientation, shading, special instructions)
 *   4. Install steps — the actual checklist:
 *      a. Pre-install electrical checks (main fuse, RCD, earth bond)
 *      b. Roof work (panels, mounting, weather check)
 *      c. Inverter + battery installation
 *      d. Electrical connections (isolators, SPD, cabling)
 *      e. Commissioning + monitoring setup (WiFi, app registration)
 *      f. Customer handover (walkthrough, signature, monitoring login)
 *   5. Photo capture at each stage
 *   6. Completion + handover sign-off
 *
 * Mobile-first. One scroll. No tab-hopping.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, MapPin, Phone, Calendar, Clock, Navigation, Camera,
  Package, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Zap, Wrench, Home, Shield, Wifi, FileText, PenLine, Sun,
  Cloud, CloudRain, Truck, User, ClipboardList, Upload, X,
  Video, MessageSquare, Star,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// ============= BOM TYPES =============
interface BOMItem {
  id: string;
  category: string;
  item: string;
  qty: number;
  unit: string;
  location: string;
  loaded: boolean;
  critical: boolean;
}

// ============= INSTALL STEP TYPES =============
interface InstallStep {
  id: string;
  phase: 'pre_install' | 'roof' | 'inverter' | 'electrical' | 'commissioning' | 'handover';
  title: string;
  description: string;
  done: boolean;
  photoRequired: boolean;
  photoUploaded: boolean;
  notes: string;
}

const PHASE_META = {
  pre_install: { label: 'Pre-install checks', icon: Shield, color: 'blue' },
  roof: { label: 'Roof work', icon: Home, color: 'amber' },
  inverter: { label: 'Inverter + battery', icon: Zap, color: 'violet' },
  electrical: { label: 'Electrical', icon: Wrench, color: 'orange' },
  commissioning: { label: 'Commissioning + monitoring', icon: Wifi, color: 'emerald' },
  handover: { label: 'Customer handover', icon: PenLine, color: 'green' },
} as const;

// ============= GENERATE BOM FROM LEAD =============
function generateBOM(lead: DummyLead): BOMItem[] {
  const p = lead.proposal;
  if (!p) return [];
  return [
    { id: 'panels', category: 'Panels', item: `${p.panel_count} × ${p.panel_model}`, qty: p.panel_count, unit: 'pcs', location: 'A1-A24', loaded: false, critical: true },
    { id: 'inverter', category: 'Inverter', item: p.inverter_model, qty: 1, unit: 'pcs', location: 'B3', loaded: false, critical: true },
    ...(p.battery_model ? [{ id: 'battery', category: 'Battery', item: p.battery_model, qty: 1, unit: 'pcs', location: 'C2 (forklift)', loaded: false, critical: true }] : []),
    { id: 'rails', category: 'Mounting', item: 'Mounting rails (1.6m)', qty: Math.ceil(p.panel_count * 0.23), unit: 'pcs', location: 'D1-D8', loaded: false, critical: true },
    { id: 'clamps', category: 'Mounting', item: 'Mid + end clamps', qty: p.panel_count * 2, unit: 'pcs', location: 'B7', loaded: false, critical: true },
    { id: 'roof_hooks', category: 'Mounting', item: 'Roof hooks', qty: Math.ceil(p.panel_count * 0.4), unit: 'pcs', location: 'B5/B6', loaded: false, critical: true },
    { id: 'dc_cable', category: 'Electrical', item: 'DC cable (6mm²)', qty: Math.ceil(8 + p.panel_count * 1.2), unit: 'm', location: 'E2', loaded: false, critical: true },
    { id: 'ac_cable', category: 'Electrical', item: 'AC cable (T&E 4mm²)', qty: 15, unit: 'm', location: 'E3', loaded: false, critical: true },
    { id: 'isolators', category: 'Electrical', item: 'DC + AC isolators', qty: 2, unit: 'pcs', location: 'F1', loaded: false, critical: true },
    { id: 'spd', category: 'Electrical', item: 'Type 2 SPD', qty: 1, unit: 'pcs', location: 'F2', loaded: false, critical: true },
    { id: 'harness', category: 'Safety', item: 'Fall arrest harness', qty: 2, unit: 'pcs', location: 'Van', loaded: false, critical: true },
    { id: 'drill', category: 'Tools', item: 'Impact driver + batteries', qty: 1, unit: 'pcs', location: 'Van', loaded: false, critical: true },
  ];
}

// ============= GENERATE INSTALL STEPS =============
function generateInstallSteps(lead: DummyLead): InstallStep[] {
  const hasBattery = !!lead.proposal?.battery_model;
  return [
    // Pre-install
    { id: 'arrive', phase: 'pre_install', title: 'Mark arrival on site', description: 'Confirm you\'ve arrived. Photo of property front.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'customer_brief', phase: 'pre_install', title: 'Brief customer', description: 'Walk customer through plan, confirm access, ask them to be available for handover.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'main_fuse', phase: 'pre_install', title: 'Check main fuse size', description: 'Note main fuse rating (60A/80A/100A). Photo of fuse board.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'rcd_test', phase: 'pre_install', title: 'Test existing RCD', description: 'Verify RCD trips correctly before starting work.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'earth_bond', phase: 'pre_install', title: 'Confirm earth bonding', description: 'Check gas/water earth bonds are intact.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    // Roof
    { id: 'weather_check', phase: 'roof', title: 'Weather check', description: 'Confirm safe to work at height (no rain, wind < 30km/h).', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'roof_access', phase: 'roof', title: 'Set up roof access + edge protection', description: 'Ladder secured, harness attached, edge protection in place.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'mounting', phase: 'roof', title: 'Install mounting rails + roof hooks', description: `${lead.survey?.roof_type || 'Tile'} roof, ${lead.survey?.roof_orientation || 'south'} facing, ${lead.survey?.roof_pitch || 30}° pitch.`, done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'panels', phase: 'roof', title: 'Mount solar panels', description: `${lead.proposal?.panel_count || 0} panels. Photo of completed array.`, done: false, photoRequired: true, photoUploaded: false, notes: '' },
    // Inverter + battery
    { id: 'inverter_mount', phase: 'inverter', title: 'Mount inverter', description: `${lead.proposal?.inverter_model || 'Inverter'} in agreed location (garage/utility). Photo.`, done: false, photoRequired: true, photoUploaded: false, notes: '' },
    ...(hasBattery ? [{ id: 'battery_install', phase: 'inverter' as const, title: 'Install battery', description: `${lead.proposal?.battery_model}. 2-person lift (130kg). Photo.`, done: false, photoRequired: true, photoUploaded: false, notes: '' }] : []),
    // Electrical
    { id: 'dc_cable', phase: 'electrical', title: 'Run DC cabling', description: 'From roof array to inverter. UV-resistant, correctly rated.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'ac_cable', phase: 'electrical', title: 'Run AC cabling', description: 'From inverter to consumer unit / dedicated AC isolator.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'isolators', phase: 'electrical', title: 'Install DC + AC isolators', description: 'DC isolator near array, AC isolator near inverter.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'spd', phase: 'electrical', title: 'Install Type 2 SPD', description: 'Surge protection device in consumer unit. RECI requirement.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'labelling', phase: 'electrical', title: 'Label all circuits', description: 'DC+, DC-, AC, isolator labels per RECI requirements.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    // Commissioning
    { id: 'power_up', phase: 'commissioning', title: 'Power up system', description: 'Close DC isolator, then AC. Check inverter boots correctly.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'commissioning_test', phase: 'commissioning', title: 'Commissioning test', description: 'Verify production, check for faults, record serial numbers.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'monitoring_wifi', phase: 'commissioning', title: 'Connect inverter to WiFi', description: 'Connect to customer\'s WiFi. Verify data flowing to monitoring platform.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'monitoring_register', phase: 'commissioning', title: 'Register on monitoring platform', description: 'Create customer account on manufacturer portal (SolarEdge/Fronius/etc).', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'serial_numbers', phase: 'commissioning', title: 'Record all serial numbers', description: 'Panels, inverter, battery. Needed for SEAI + warranty.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    // Handover
    { id: 'customer_walkthrough', phase: 'handover', title: 'Customer walkthrough', description: 'Show customer: how to read inverter, monitoring app, emergency shutdown procedure.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'app_login', phase: 'handover', title: 'Set up monitoring app on customer phone', description: 'Download app, log in, verify they can see production data.', done: false, photoRequired: false, photoUploaded: false, notes: '' },
    { id: 'handover_pack', phase: 'handover', title: 'Give handover pack to customer', description: 'Warranty docs, SEAI paperwork, user manual, emergency contacts.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'customer_signature', phase: 'handover', title: 'Get customer signature on handover form', description: 'Confirms install complete, system commissioned, customer satisfied.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
    { id: 'final_photo', phase: 'handover', title: 'Final photo of completed install', description: 'Photo of full array from ground level.', done: false, photoRequired: true, photoUploaded: false, notes: '' },
  ];
}

export default function JobView({ leadId }: { leadId?: string }) {
  const navigate = useNavigate();
  const [lead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    return leads.find(l => l.proposal && l.assignment) || leads[8]; // install_scheduled lead
  });

  const [bom, setBOM] = useState<BOMItem[]>(() => generateBOM(lead));
  const [steps, setSteps] = useState<InstallStep[]>(() => generateInstallSteps(lead));
  const [bomExpanded, setBOMExpanded] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  // Persist to localStorage
  const storageKey = `jobview_${lead.id}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.bom) setBOM(data.bom);
        if (data.steps) setSteps(data.steps);
        if (data.signature) setSignatureData(data.signature);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = (newBOM: BOMItem[], newSteps: InstallStep[], sig: string | null) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ bom: newBOM, steps: newSteps, signature: sig }));
    } catch { /* ignore */ }
  };

  const updateBOMItem = (id: string, loaded: boolean) => {
    const newBOM = bom.map(b => b.id === id ? { ...b, loaded } : b);
    setBOM(newBOM);
    persist(newBOM, steps, signatureData);
  };

  const updateStep = (id: string, updates: Partial<InstallStep>) => {
    const newSteps = steps.map(s => s.id === id ? { ...s, ...updates } : s);
    setSteps(newSteps);
    persist(bom, newSteps, signatureData);
  };

  // Progress calculations
  const bomLoaded = bom.filter(b => b.loaded).length;
  const bomCriticalLoaded = bom.filter(b => b.critical && b.loaded).length;
  const bomCriticalTotal = bom.filter(b => b.critical).length;
  const stepsDone = steps.filter(s => s.done).length;
  const stepsTotal = steps.length;
  const photosUploaded = steps.filter(s => s.photoUploaded).length;
  const photosRequired = steps.filter(s => s.photoRequired).length;

  const overallProgress = Math.round(((bomLoaded / Math.max(1, bom.length)) * 0.3 + (stepsDone / stepsTotal) * 0.7) * 100);

  const survey = lead.survey;
  const proposal = lead.proposal;

  // Group steps by phase
  const stepsByPhase = useMemo(() => {
    const groups: Record<string, InstallStep[]> = {};
    steps.forEach(s => {
      if (!groups[s.phase]) groups[s.phase] = [];
      groups[s.phase].push(s);
    });
    return groups;
  }, [steps]);

  const handleSignatureSave = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL();
    setSignatureData(data);
    setShowSignature(false);
    // Mark the signature step as done
    updateStep('customer_signature', { done: true, photoUploaded: true, notes: 'Signed by customer' });
    persist(bom, steps, data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/20 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      {/* Sticky header */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/installer-v3')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate">{lead.name}</div>
            <div className="text-xs text-muted-foreground truncate">{lead.address}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-sm">{proposal?.system_size_kw} kWp</div>
            <div className="text-[10px] text-muted-foreground">{proposal?.panel_count} panels</div>
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      <main className="pb-20 max-w-2xl mx-auto">
        {/* Job summary */}
        <section className="px-4 py-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Date</div>
                    <div className="font-medium">{lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">ETA</div>
                    <div className="font-medium">8:00 - 9:00 AM</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Customer</div>
                    <div className="font-medium text-xs">{lead.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Directions</div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lead.address)}`} target="_blank" rel="noopener noreferrer" className="font-medium text-xs text-blue-600 hover:underline">Open in Maps</a>
                  </div>
                </div>
              </div>
              {/* Weather */}
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg flex items-center gap-2 text-xs">
                <Cloud className="h-4 w-4 text-amber-600" />
                <span>18°C · Partly cloudy · Wind 12km/h SW · Safe for roof work</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* === SECTION 1: BOM (collapsible) === */}
        <section className="px-4">
          <Card>
            <button
              onClick={() => setBOMExpanded(!bomExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bomCriticalLoaded === bomCriticalTotal ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-amber-100 dark:bg-amber-950/40'}`}>
                  <Package className={`h-5 w-5 ${bomCriticalLoaded === bomCriticalTotal ? 'text-emerald-700' : 'text-amber-700'}`} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Bill of Materials</div>
                  <div className="text-xs text-muted-foreground">
                    {bomLoaded}/{bom.length} loaded · {bomCriticalLoaded}/{bomCriticalTotal} critical
                  </div>
                </div>
              </div>
              {bomExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {bomExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <CardContent className="p-0 pt-0">
                    <div className="divide-y border-t">
                      {bom.map(item => (
                        <div key={item.id} className="p-3 flex items-center gap-3">
                          <Checkbox
                            checked={item.loaded}
                            onCheckedChange={(v) => updateBOMItem(item.id, v === true)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${item.loaded ? 'line-through text-muted-foreground' : ''}`}>
                              {item.qty} × {item.item}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.location}</div>
                          </div>
                          {item.critical && !item.loaded && (
                            <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200">Critical</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </section>

        {/* === SECTION 2: SITE NOTES FROM SURVEY === */}
        {survey && (
          <section className="px-4 mt-4">
            <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-semibold text-sm">Site notes (from survey)</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Roof type:</span> <span className="font-medium">{survey.roof_type}</span></div>
                  <div><span className="text-muted-foreground">Orientation:</span> <span className="font-medium">{survey.roof_orientation}</span></div>
                  <div><span className="text-muted-foreground">Pitch:</span> <span className="font-medium">{survey.roof_pitch}°</span></div>
                  <div><span className="text-muted-foreground">Shading:</span> <span className="font-medium">{survey.shading}</span></div>
                  <div><span className="text-muted-foreground">Area:</span> <span className="font-medium">{survey.available_area_m2}m²</span></div>
                  <div><span className="text-muted-foreground">Battery:</span> <span className="font-medium">{survey.confirmed_battery_kwh ? `${survey.confirmed_battery_kwh}kWh` : 'None'}</span></div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* === SECTION 3: INSTALL STEPS (the main event) === */}
        <section className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-600" />
              Installation steps
            </h2>
            <div className="text-right">
              <div className="text-sm font-bold">{stepsDone}/{stepsTotal}</div>
              <div className="text-[10px] text-muted-foreground">done</div>
            </div>
          </div>

          {/* Photo progress */}
          <div className="mb-3 p-2 bg-muted/30 rounded-lg flex items-center gap-2 text-xs">
            <Camera className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Photos: {photosUploaded}/{photosRequired} uploaded</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden ml-2">
              <div className="h-full bg-blue-500" style={{ width: `${(photosUploaded / Math.max(1, photosRequired)) * 100}%` }} />
            </div>
          </div>

          {/* Steps grouped by phase */}
          {Object.entries(stepsByPhase).map(([phase, phaseSteps]) => {
            const meta = PHASE_META[phase as keyof typeof PHASE_META];
            const Icon = meta.icon;
            const phaseDone = phaseSteps.every(s => s.done);
            return (
              <Card key={phase} className={`mb-3 ${phaseDone ? 'border-emerald-300 dark:border-emerald-800' : ''}`}>
                <CardContent className="p-0">
                  {/* Phase header */}
                  <div className={`p-3 flex items-center gap-2 border-b ${phaseDone ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                    <div className={`p-1.5 rounded bg-${meta.color}-100 dark:bg-${meta.color}-950/40`}>
                      <Icon className={`h-4 w-4 text-${meta.color}-700 dark:text-${meta.color}-300`} />
                    </div>
                    <h3 className="font-semibold text-sm flex-1">{meta.label}</h3>
                    {phaseDone && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    <Badge variant="outline" className="text-[10px]">
                      {phaseSteps.filter(s => s.done).length}/{phaseSteps.length}
                    </Badge>
                  </div>
                  {/* Steps */}
                  <div className="divide-y">
                    {phaseSteps.map(step => (
                      <div key={step.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={step.done}
                            onCheckedChange={(v) => updateStep(step.id, { done: v === true })}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                              {step.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                            {step.photoRequired && (
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={step.photoUploaded ? "outline" : "default"}
                                  className="h-7 text-xs"
                                  onClick={() => updateStep(step.id, { photoUploaded: !step.photoUploaded })}
                                >
                                  {step.photoUploaded ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Photo uploaded</>
                                  ) : (
                                    <><Camera className="h-3 w-3 mr-1" /> Take photo</>
                                  )}
                                </Button>
                                {step.photoRequired && !step.photoUploaded && (
                                  <span className="text-[10px] text-amber-600">Required</span>
                                )}
                              </div>
                            )}
                            <Input
                              placeholder="Add note…"
                              value={step.notes}
                              onChange={e => updateStep(step.id, { notes: e.target.value })}
                              className="mt-2 h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* === SECTION 4: HANDOVER === */}
        <section className="px-4 mt-4">
          <Card className={`border-2 ${signatureData ? 'border-emerald-400' : 'border-dashed border-amber-300 dark:border-amber-800'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">Customer handover signature</h3>
              </div>
              {signatureData ? (
                <div>
                  <img src={signatureData} alt="Customer signature" className="border rounded bg-white p-2 max-h-32 w-auto" />
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Signed · {new Date().toLocaleString('en-IE')}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setShowSignature(true)}>
                    Re-sign
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Get customer signature to confirm install complete + system handed over.
                  </p>
                  <Button onClick={() => setShowSignature(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <PenLine className="h-4 w-4 mr-2" /> Get signature
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* === SECTION 5: COMPLETE === */}
        <section className="px-4 mt-4">
          {overallProgress === 100 ? (
            <Card className="border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg">Job complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All steps done, all photos uploaded, customer signed. PostInstall Agent will send warranty docs + schedule review request.
                </p>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark job complete
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg text-center text-xs text-muted-foreground">
              {overallProgress}% complete · {stepsTotal - stepsDone} steps remaining · {photosRequired - photosUploaded} photos needed
            </div>
          )}
        </section>
      </main>

      {/* Signature pad modal */}
      {showSignature && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSignature(false)}>
          <div className="bg-background w-full max-w-md rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Customer signature</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSignature(false)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              I confirm the solar installation is complete, commissioned, and I've been shown how to use the monitoring app.
            </p>
            <canvas
              ref={signatureCanvasRef}
              className="w-full h-48 border-2 border-border rounded-lg bg-white touch-none"
              style={{ touchAction: 'none' }}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                const canvas = signatureCanvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}>Clear</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSignatureSave}>
                Save signature
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
