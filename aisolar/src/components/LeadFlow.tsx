/**
 * LeadFlow — the consultant's single linear pipeline.
 *
 * This replaces ALL the scattered consultant dashboards. One flow:
 *
 *   1. Estimate  — bill-extracted estimate details + Eircode lookup → satellite map
 *   2. Survey    — roof data capture (the REAL SiteSurveyForm, properly accessible)
 *   3. Design    — OpenSolar-style panel layout on satellite image + gear selection
 *   4. Proposal  — finance packages, AI-assisted pricing, professional output
 *   5. Send      — review + send to customer
 *
 * The consultant sees a progress stepper at the top. Each step flows into the next.
 * No tabs. No dashboards. Just the flow.
 *
 * Hot lead markers are just badges on the lead header, not separate sections.
 */

import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft, ArrowRight, MapPin, Calendar, Sun, Zap, FileText,
  CheckCircle2, Flame, Star, Phone, Mail, Navigation, ChevronRight,
  PoundSterling, Calculator, Sparkles, Bot, Home, Camera, Plus, Minus,
  Shield, Clock, TrendingUp, Award, CreditCard, Percent, Info,
  Send, MessageSquare,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { calculateSEAI } from '@/lib/seaiPipeline';
import { calculateSystemEstimate, PIPELINE_STAGES, getStage } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { toast } from 'sonner';
import { SpinnerSkeleton } from '@/components/ui/SuspenseFallbacks';

// Use the REAL SiteSurveyForm — not a stripped-down version
const SiteSurveyForm = lazy(() => import('@/components/SiteSurveyForm'));

const eurFmt = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type FlowStep = 'estimate' | 'survey' | 'design' | 'proposal' | 'send';

const STEPS: Array<{ id: FlowStep; label: string; icon: typeof MapPin }> = [
  { id: 'estimate', label: 'Estimate', icon: Calculator },
  { id: 'survey', label: 'Survey', icon: Home },
  { id: 'design', label: 'Design', icon: Sun },
  { id: 'proposal', label: 'Proposal', icon: FileText },
  { id: 'send', label: 'Send', icon: Send },
];

export default function LeadFlow({ leadId: leadIdProp }: { leadId?: string }) {
  const navigate = useNavigate();
  const params = useParams<{ leadId: string }>();
  const routeLeadId = leadIdProp ?? params.leadId;
  const [lead, setLead] = useState<DummyLead>(() => {
    const leads = generateDummyLeads();
    if (routeLeadId) {
      const found = leads.find(l => l.id === routeLeadId);
      if (found) return found;
    }
    return leads.find(l => l.proposal) || leads[6];
  });
  const [step, setStep] = useState<FlowStep>('estimate');
  const [eircode, setEircode] = useState('');
  const [address, setAddress] = useState(lead.address || '');
  const [showMap, setShowMap] = useState(false);
  const [surveyBooked, setSurveyBooked] = useState<{ slot: string } | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const [surveyData, setSurveyData] = useState<Record<string, any>>({});
  const [designData, setDesignData] = useState({
    panelCount: lead.proposal?.panel_count || 14,
    panelModel: lead.proposal?.panel_model || 'Longi Hi-MO 6 435W',
    inverterModel: lead.proposal?.inverter_model || 'SolarEdge SE5K',
    batteryModel: lead.proposal?.battery_model || '',
    includeBattery: !!lead.proposal?.battery_model,
    batterySize: lead.survey?.confirmed_battery_kwh || 5,
    roofOrientation: lead.survey?.roof_orientation || 'south',
    roofPitch: lead.survey?.roof_pitch || 30,
  });
  const [financeOption, setFinanceOption] = useState<'cash' | 'finance' | 'lease'>('cash');
  const [depositPct, setDepositPct] = useState(30);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  // Calculate estimate from bill data
  const estimate = useMemo(() => {
    return calculateSystemEstimate({
      monthlyBill: lead.monthly_bill,
      annualKwh: lead.annual_kwh,
    });
  }, [lead]);

  // Calculate SEAI from design data
  const seai = useMemo(() => {
    return calculateSEAI({
      systemSizeKw: designData.panelCount * 0.435, // 435W panels
      propertyType: 'domestic',
      installType: 'retrofit',
      annualKwhUsage: lead.annual_kwh || estimate.annualKwh,
      annualProductionKwh: designData.panelCount * 0.435 * 950,
      selfConsumptionPct: 0.7,
      netCost: estimate.netCost,
    });
  }, [designData, lead, estimate]);

  const grossCost = designData.panelCount * 145 + 1450 + (designData.includeBattery ? designData.batterySize * 1200 : 0) + 800; // panels + inverter + battery + mounting/labour
  const seaiGrant = seai.solarElectricityGrant;
  const netCost = grossCost - seaiGrant;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/consultant')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm truncate">{lead.name}</span>
              {lead.score > 80 && (
                <Badge className="text-[11px] h-4 px-1 bg-red-500 text-white">
                  <Flame className="h-2 w-2 mr-0.5" /> Hot
                </Badge>
              )}
              <Badge variant="outline" className="text-[11px] h-4 px-1">
                {getStage(lead.workflow_stage).label}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {lead.address || 'No address yet'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-2" asChild>
              <a href={`tel:${lead.phone}`}><Phone className="h-4 w-4" /></a>
            </Button>
            <Button variant="ghost" size="sm" className="p-2" asChild>
              <a href={`mailto:${lead.email}`}><Mail className="h-4 w-4" /></a>
            </Button>
            <DarkModeToggle />
          </div>
        </div>

        {/* Progress stepper */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isDone = i < stepIndex;
              const isActive = i === stepIndex;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => i <= stepIndex && setStep(s.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-emerald-600 text-white' :
                      isDone ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                      'text-muted-foreground'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${i < stepIndex ? 'bg-emerald-400' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
        <AnimatePresence mode="wait">
          {/* === STEP 1: ESTIMATE === */}
          {step === 'estimate' && (
            <motion.div key="estimate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Left: Estimate details */}
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-emerald-600" /> Estimate from bill
                      </h2>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Monthly bill</span>
                          <span className="font-semibold">€{lead.monthly_bill}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Annual kWh</span>
                          <span className="font-semibold">{lead.annual_kwh?.toLocaleString() || estimate.annualKwh.toLocaleString()} kWh</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">MPRN</span>
                          <span className="font-mono text-xs">{lead.mprn || 'Not extracted'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                          <span className="text-muted-foreground">Recommended system</span>
                          <span className="font-bold text-blue-700 dark:text-blue-300">{estimate.systemSizeKw} kWp</span>
                        </div>
                        <div className="flex justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                          <span className="text-muted-foreground">Annual savings</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">{eurFmt(estimate.annualSavings)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Payback</span>
                          <span className="font-semibold">{estimate.paybackYears} years</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">20-year savings</span>
                          <span className="font-semibold">{eurFmt(estimate.twentyYearSavings)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-violet-50 dark:bg-violet-950/30 rounded">
                          <span className="text-muted-foreground">SEAI grant</span>
                          <span className="font-bold text-violet-700 dark:text-violet-300">{eurFmt(1800)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Eircode lookup */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600" /> Property location
                      </h3>
                      <Label className="text-xs">Eircode</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="e.g. D04 X2C1"
                          value={eircode}
                          onChange={e => setEircode(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                          maxLength={8}
                        />
                        <Button onClick={() => setShowMap(true)} disabled={!eircode}>
                          <MapPin className="h-4 w-4 mr-1" /> View
                        </Button>
                      </div>
                      {address && (
                        <p className="text-xs text-muted-foreground mt-2">{address}</p>
                      )}
                      {showMap && (
                        <div className="mt-3">
                          <SatelliteMap eircode={eircode} address={address} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Calendar booking */}
                <div className="space-y-4">
                  <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-600" /> Book site survey
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        The estimate is ready. Next step is a site survey to confirm roof details and finalize the system design.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Tomorrow 10:00', 'Tomorrow 14:00', 'Wed 10:00', 'Wed 14:00', 'Thu 10:00', 'Thu 14:00'].map(slot => {
                          const isSelected = surveyBooked?.slot === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => setSurveyBooked({ slot })}
                              className={`p-2 border rounded-lg text-xs hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left ${isSelected ? 'border-amber-500 bg-amber-100 dark:bg-amber-950/40 font-medium' : ''}`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        className="w-full mt-3 bg-amber-600 transition-colors hover:bg-amber-700"
                        disabled={!surveyBooked}
                        onClick={() => {
                          if (!surveyBooked) return;
                          toast.success(`Site survey booked for ${surveyBooked.slot}`, {
                            description: `Survey Scheduler Agent will confirm with ${lead.name}.`,
                          });
                          // Advance to survey step after a brief moment
                          setTimeout(() => setStep('survey'), 600);
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" /> {surveyBooked ? `Book ${surveyBooked.slot}` : 'Select a slot above'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-violet-600" /> AI Coach
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Based on €{lead.monthly_bill}/mo bill, this is a high-value lead. Lead with the SEAI grant + monthly savings.
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="p-2 bg-background rounded border-l-2 border-violet-400">
                          <strong>Script:</strong> "With your {estimate.systemSizeKw}kWp system, you'll save {eurFmt(estimate.annualSavings)}/year and the SEAI covers {eurFmt(1800)}. Payback in {estimate.paybackYears} years."
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Next button */}
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep('survey')} className="bg-emerald-600 transition-colors hover:bg-emerald-700 h-12 px-6">
                  Continue to survey <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* === STEP 2: SURVEY — uses the REAL SiteSurveyForm === */}
          {step === 'survey' && (
            <motion.div key="survey" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Suspense fallback={<SpinnerSkeleton label="Loading survey form…" />}>
                <SiteSurveyForm
                  leadId={lead.id}
                  onCreateProposal={(surveyData, leadData) => {
                    setSurveyData(surveyData);
                    setStep('design');
                  }}
                />
              </Suspense>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep('estimate')} className="h-12">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to estimate
                </Button>
              </div>
            </motion.div>
          )}

          {/* === STEP 3: DESIGN === */}
          {step === 'design' && (
            <motion.div key="design" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <DesignStep
                lead={lead}
                designData={designData}
                setDesignData={setDesignData}
                estimate={estimate}
              />
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep('survey')} className="h-12">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep('proposal')} className="bg-emerald-600 transition-colors hover:bg-emerald-700 h-12 px-6">
                  Continue to proposal <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* === STEP 4: PROPOSAL === */}
          {step === 'proposal' && (
            <motion.div key="proposal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ProposalStep
                lead={lead}
                designData={designData}
                grossCost={grossCost}
                seaiGrant={seaiGrant}
                netCost={netCost}
                estimate={estimate}
                financeOption={financeOption}
                setFinanceOption={setFinanceOption}
                depositPct={depositPct}
                setDepositPct={setDepositPct}
              />
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep('design')} className="h-12">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep('send')} className="bg-emerald-600 transition-colors hover:bg-emerald-700 h-12 px-6">
                  Review & send <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* === STEP 5: SEND === */}
          {step === 'send' && (
            <motion.div key="send" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SendStep lead={lead} designData={designData} netCost={netCost} seaiGrant={seaiGrant} financeOption={financeOption} depositPct={depositPct} proposalSent={proposalSent} />
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep('proposal')} className="h-12" disabled={proposalSent}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                {proposalSent ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/consultant`)} className="h-12">
                      <MessageSquare className="h-4 w-4 mr-2" /> Back to inbox
                    </Button>
                    <Button onClick={() => navigate('/owner')} className="h-12 bg-emerald-600 transition-colors hover:bg-emerald-700">
                      View in pipeline <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="bg-emerald-600 transition-colors hover:bg-emerald-700 h-12 px-6"
                    onClick={() => {
                      setProposalSent(true);
                      toast.success('Proposal sent to customer', {
                        description: `${lead.name} will receive an email + SMS. Follow-Up Agent will check in, in 3 days.`,
                      });
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" /> Send proposal to customer
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============= SATELLITE MAP =============
function SatelliteMap({ eircode, address }: { eircode: string; address: string }) {
  // Use OSM satellite tiles (free, no token needed)
  // In production: use Mapbox satellite layer with token
  const dublinCenter = { lat: 53.3498, lng: -6.2603 };
  const bbox = `${dublinCenter.lng - 0.01},${dublinCenter.lat - 0.005},${dublinCenter.lng + 0.01},${dublinCenter.lat + 0.005}`;
  const satelliteUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${dublinCenter.lat},${dublinCenter.lng}`;

  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/10] bg-muted relative">
        <iframe
          title="Property satellite view"
          src={satelliteUrl}
          className="w-full h-full border-0"
          loading="lazy"
        />
        {/* Overlay badge */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur">
          <MapPin className="h-3 w-3 inline mr-1" />
          {eircode || address || 'Property location'}
        </div>
      </div>
      <CardContent className="p-2 text-xs text-center text-muted-foreground">
        © OpenStreetMap · In production: Mapbox satellite with panel overlay
      </CardContent>
    </Card>
  );
}

// ============= SURVEY STEP =============
function SurveyStep({ lead, eircode, address, onDataCollected }: {
  lead: DummyLead;
  eircode: string;
  address: string;
  onDataCollected: (data: Record<string, any>) => void;
}) {
  const [data, setData] = useState({
    roof_type: lead.survey?.roof_type || '',
    roof_condition: '',
    roof_orientation: lead.survey?.roof_orientation || 'south',
    roof_pitch: String(lead.survey?.roof_pitch || 30),
    roof_material: '',
    shading: lead.survey?.shading || 'none',
    nearby_obstructions: '',
    property_storeys: '2',
    property_type: 'residential',
    electrical_panel_capacity: '',
    meter_location: '',
    grid_connection_type: 'single_phase',
    customer_priorities: '',
    battery_interest: false,
    ev_charger: false,
    hot_water_diverter: false,
    existing_solar: false,
    access_notes: '',
    installation_notes: '',
  });

  const update = (field: string, value: any) => {
    setData(prev => {
      const next = { ...prev, [field]: value };
      onDataCollected(next);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Home className="h-5 w-5 text-indigo-600" /> Site survey
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Capture roof details, electrical setup, and customer preferences. This data flows directly into the proposal.</p>
      </div>

      {/* Satellite view for reference */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" /> Property overview
          </h3>
          <SatelliteMap eircode={eircode || lead.mprn} address={address || lead.address} />
        </CardContent>
      </Card>

      {/* Roof details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Roof details</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Roof type *</Label>
              <select value={data.roof_type} onChange={e => update('roof_type', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="">Select…</option>
                <option value="concrete_tile">Concrete tile</option>
                <option value="slate">Slate</option>
                <option value="flat">Flat (membrane)</option>
                <option value="metal">Metal</option>
                <option value="thatch">Thatch</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Roof condition</Label>
              <select value={data.roof_condition} onChange={e => update('roof_condition', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="">Select…</option>
                <option value="excellent">Excellent (new)</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor (needs repair first)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Orientation</Label>
              <select value={data.roof_orientation} onChange={e => update('roof_orientation', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="south">South (ideal)</option>
                <option value="south_east">South-east</option>
                <option value="south_west">South-west</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north">North (not recommended)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Roof pitch (degrees)</Label>
              <Input type="number" value={data.roof_pitch} onChange={e => update('roof_pitch', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Shading</Label>
              <select value={data.shading} onChange={e => update('shading', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="none">No shading (ideal)</option>
                <option value="light">Light shading</option>
                <option value="moderate">Moderate shading</option>
                <option value="heavy">Heavy shading (not suitable)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Property storeys</Label>
              <select value={data.property_storeys} onChange={e => update('property_storeys', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="1">Single storey (bungalow)</option>
                <option value="2">Two storey (house)</option>
                <option value="3">Three storey</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Electrical */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Electrical setup</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Main fuse / panel capacity</Label>
              <Input placeholder="e.g. 100A" value={data.electrical_panel_capacity} onChange={e => update('electrical_panel_capacity', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Meter location</Label>
              <Input placeholder="e.g. Hallway cupboard" value={data.meter_location} onChange={e => update('meter_location', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Grid connection</Label>
              <select value={data.grid_connection_type} onChange={e => update('grid_connection_type', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="single_phase">Single phase (domestic)</option>
                <option value="three_phase">Three phase</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer preferences */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Customer preferences</h3>
          <div className="space-y-2">
            {[
              { key: 'battery_interest', label: 'Interested in battery storage' },
              { key: 'ev_charger', label: 'Has / wants EV charger' },
              { key: 'hot_water_diverter', label: 'Wants hot water diverter' },
              { key: 'existing_solar', label: 'Already has solar (partial)' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data[item.key as keyof typeof data] as boolean}
                  onChange={e => update(item.key, e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3">
            <Label className="text-xs">Customer priorities / notes</Label>
            <textarea
              placeholder="e.g. wants to future-proof for EV, concerned about payback period, interested in maximum self-consumption…"
              value={data.customer_priorities}
              onChange={e => update('customer_priorities', e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= DESIGN STEP (OpenSolar-style) =============
function DesignStep({ lead, designData, setDesignData, estimate }: {
  lead: DummyLead;
  designData: any;
  setDesignData: (data: any) => void;
  estimate: any;
}) {
  const update = (field: string, value: any) => {
    setDesignData({ ...designData, [field]: value });
  };

  const systemSizeKw = (designData.panelCount * 0.435).toFixed(1);
  const annualProduction = Math.round(Number(systemSizeKw) * 950);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-600" /> System design
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Lay out panels on the roof, select gear, and size the system.</p>
      </div>

      {/* Satellite + panel layout (OpenSolar-style) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-600" /> Roof layout designer
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Satellite view with panel overlay. Use + / − to adjust panel count. In production: Mapbox satellite + roof polygon detection + drag-to-position panels.
          </p>
          <div className="relative aspect-[16/10] rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700">
            {/* Real satellite tiles via OSM */}
            <iframe
              title="Roof satellite view"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=-6.27,53.34,-6.25,53.36&layer=mapnik&marker=53.35,-6.26`}
              className="absolute inset-0 w-full h-full"
              style={{ filter: 'contrast(1.1) brightness(0.9)' }}
              loading="lazy"
            />
            {/* Panel overlay grid — positioned over the "roof" area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-blue-600/20 border-2 border-blue-500/50 rounded-lg p-2 pointer-events-auto" style={{ width: '60%', height: '50%' }}>
                <div className="grid h-full gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(designData.panelCount))}, 1fr)` }}>
                  {Array.from({ length: designData.panelCount }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-blue-600/80 border border-blue-300/50 rounded-sm flex items-center justify-center text-[7px] text-white font-bold hover:bg-blue-500 cursor-pointer transition-colors"
                      onClick={() => update('panelCount', Math.max(4, designData.panelCount - 1))}
                      title={`Panel ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Controls */}
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <button
                onClick={() => update('panelCount', designData.panelCount + 1)}
                className="bg-white/90 transition-colors hover:bg-white text-slate-900 rounded-md p-1.5 shadow-lg text-xs font-bold"
                title="Add panel"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => update('panelCount', Math.max(4, designData.panelCount - 1))}
                className="bg-white/90 transition-colors hover:bg-white text-slate-900 rounded-md p-1.5 shadow-lg text-xs font-bold"
                title="Remove panel"
              >
                <Minus className="h-3 w-3" />
              </button>
            </div>
            {/* Orientation indicator */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded backdrop-blur z-10">
              <span className="font-bold">N ↑</span> · Orientation: {designData.roofOrientation}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {designData.panelCount} panels · {systemSizeKw} kWp · {annualProduction.toLocaleString()} kWh/yr
            </span>
            <span className="text-emerald-600 font-medium">
              {Math.round((annualProduction / (lead.annual_kwh || estimate.annualKwh)) * 100)}% of usage covered
            </span>
          </div>
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-800 dark:text-amber-300">
            <Info className="h-3 w-3 inline mr-1" />
            In production: Mapbox satellite layer + automated roof detection + drag-to-position panels + 3D pitch rendering (like OpenSolar).
          </div>
        </CardContent>
      </Card>

      {/* Gear selection */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" /> Gear selection
          </h3>
          <div className="space-y-3">
            {/* Panels */}
            <div>
              <Label className="text-xs">Solar panels</Label>
              <select value={designData.panelModel} onChange={e => update('panelModel', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="Longi Hi-MO 6 435W">Longi Hi-MO 6 435W — €145/panel</option>
                <option value="Jinko Tiger Neo 415W">Jinko Tiger Neo 415W — €138/panel</option>
                <option value="Trina Vertex S+ 420W">Trina Vertex S+ 420W — €142/panel</option>
              </select>
            </div>
            {/* Inverter */}
            <div>
              <Label className="text-xs">Inverter</Label>
              <select value={designData.inverterModel} onChange={e => update('inverterModel', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                <option value="SolarEdge SE5K">SolarEdge SE5K — €1,450</option>
                <option value="Huawei SUN2000-6KTL-L1">Huawei SUN2000-6KTL — €1,280</option>
                <option value="Fronius Primo 8.6-1">Fronius Primo 8.6 — €1,850</option>
              </select>
            </div>
            {/* Battery */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Battery storage</Label>
                <input
                  type="checkbox"
                  checked={designData.includeBattery}
                  onChange={e => update('includeBattery', e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
              </div>
              {designData.includeBattery && (
                <select value={designData.batteryModel} onChange={e => update('batteryModel', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="Tesla Powerwall 3 (13.5kWh)">Tesla Powerwall 3 (13.5kWh) — €7,200</option>
                  <option value="SolarEdge Home Battery 5kWh">SolarEdge Home Battery 5kWh — €2,800</option>
                  <option value="Huawei LUNA2000-5-S0 (5kWh)">Huawei LUNA2000 5kWh — €2,600</option>
                </select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI suggestion */}
      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-600" /> AI design suggestion
          </h3>
          <p className="text-xs text-muted-foreground">
            Based on {lead.annual_kwh?.toLocaleString() || estimate.annualKwh.toLocaleString()} kWh annual usage
            and {designData.roofOrientation} roof:
          </p>
          <div className="mt-2 p-2 bg-background rounded text-xs space-y-1">
            <div>✓ {designData.panelCount} panels ({systemSizeKw} kWp) covers {Math.round((annualProduction / (lead.annual_kwh || estimate.annualKwh)) * 100)}% of usage</div>
            <div>✓ {designData.includeBattery ? 'Battery included — good for self-consumption' : 'Consider adding battery for 70%+ self-consumption'}</div>
            <div>✓ {designData.roofOrientation === 'south' ? 'South-facing — optimal' : 'Consider optimisers for non-south orientation'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= PROPOSAL STEP (finance + packages) =============
function ProposalStep({ lead, designData, grossCost, seaiGrant, netCost, estimate, financeOption, setFinanceOption, depositPct, setDepositPct }: {
  lead: DummyLead;
  designData: any;
  grossCost: number;
  seaiGrant: number;
  netCost: number;
  estimate: any;
  financeOption: 'cash' | 'finance' | 'lease';
  setFinanceOption: (v: 'cash' | 'finance' | 'lease') => void;
  depositPct: number;
  setDepositPct: (v: number) => void;
}) {
  const depositAmount = Math.round(netCost * (depositPct / 100));
  const balanceAmount = netCost - depositAmount;

  // Finance calc (3.9% APR over 10 years)
  const financeMonthly = financeOption === 'finance' ? Math.round((netCost * 1.21) / 120) : 0; // ~21% total interest over 10yr
  const annualSavings = estimate.annualSavings;
  const netMonthlyPosition = financeOption === 'finance' ? annualSavings / 12 - financeMonthly : annualSavings / 12;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" /> Proposal & financing
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Choose payment structure, review costs, and prepare the professional proposal.</p>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Cost breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span>{designData.panelCount} × {designData.panelModel}</span>
              <span className="font-semibold">{eurFmt(designData.panelCount * 145)}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span>{designData.inverterModel}</span>
              <span className="font-semibold">{eurFmt(1450)}</span>
            </div>
            {designData.includeBattery && (
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span>{designData.batteryModel}</span>
                <span className="font-semibold">{eurFmt(designData.batterySize * 1200)}</span>
              </div>
            )}
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span>Mounting + cabling + labour</span>
              <span className="font-semibold">{eurFmt(800)}</span>
            </div>
            <div className="flex justify-between p-2 border-t-2 font-bold">
              <span>Gross cost</span>
              <span>{eurFmt(grossCost)}</span>
            </div>
            <div className="flex justify-between p-2 bg-violet-50 dark:bg-violet-950/30 rounded text-violet-700 dark:text-violet-300">
              <span>SEAI grant</span>
              <span className="font-semibold">−{eurFmt(seaiGrant)}</span>
            </div>
            <div className="flex justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-lg font-bold text-emerald-700 dark:text-emerald-300">
              <span>Net cost</span>
              <span>{eurFmt(netCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finance options */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" /> Payment options
          </h3>
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              { id: 'cash', label: 'Pay cash', desc: 'Full payment on completion', icon: PoundSterling },
              { id: 'finance', label: 'Finance (HEUL)', desc: '3.9% APR · 10 years', icon: Percent },
              { id: 'lease', label: 'Solar lease', desc: 'Pay from savings', icon: TrendingUp },
            ].map(opt => {
              const Icon = opt.icon;
              const isSelected = financeOption === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setFinanceOption(opt.id as 'cash' | 'finance' | 'lease')}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected ? 'border-blue-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-border hover:border-blue-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Deposit slider */}
          {financeOption !== 'lease' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Deposit: {depositPct}%</Label>
                <span className="text-sm font-bold">{eurFmt(depositAmount)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={depositPct}
                onChange={e => setDepositPct(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Balance: {eurFmt(balanceAmount)}</span>
                <span>Due on completion</span>
              </div>
            </div>
          )}

          {/* Finance breakdown */}
          {financeOption === 'finance' && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Monthly payment</div>
                  <div className="font-bold text-lg">{eurFmt(financeMonthly)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Monthly savings</div>
                  <div className="font-bold text-lg text-emerald-600">{eurFmt(annualSavings / 12)}</div>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <div className="text-xs text-muted-foreground">Net monthly position</div>
                  <div className={`font-bold text-lg ${netMonthlyPosition > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netMonthlyPosition > 0 ? '+' : ''}{eurFmt(netMonthlyPosition)}/month
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {netMonthlyPosition > 0
                      ? 'Customer is cashflow positive from month one!'
                      : 'Customer pays slightly more monthly but owns the system'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings summary */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Savings summary
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Annual savings</div>
              <div className="font-bold text-lg text-emerald-700 dark:text-emerald-300">{eurFmt(annualSavings)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Payback</div>
              <div className="font-bold text-lg">{estimate.paybackYears} yrs</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">20-year savings</div>
              <div className="font-bold text-lg">{eurFmt(estimate.twentyYearSavings)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI pricing suggestion */}
      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-600" /> AI pricing coach
          </h3>
          <div className="text-xs space-y-1">
            <div className="p-2 bg-background rounded border-l-2 border-violet-400">
              <strong>Margin:</strong> {Math.round(((netCost - grossCost + seaiGrant) / netCost) * 100)}% (healthy — industry avg is 18-22%)
            </div>
            <div className="p-2 bg-background rounded border-l-2 border-violet-400">
              <strong>Objection handler:</strong> If customer says "too expensive" → offer the finance option. {eurFmt(annualSavings / 12)}/mo savings vs {eurFmt(financeMonthly)}/mo payment = cashflow positive from month 1.
            </div>
            <div className="p-2 bg-background rounded border-l-2 border-violet-400">
              <strong>Closing tip:</strong> Lead with the SEAI grant ({eurFmt(seaiGrant)}) — it's "free money" that makes the decision feel urgent (grant rates may change).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= SEND STEP =============
function SendStep({ lead, designData, netCost, seaiGrant, financeOption, depositPct, proposalSent }: {
  lead: DummyLead;
  designData: any;
  netCost: number;
  seaiGrant: number;
  financeOption: string;
  depositPct: number;
  proposalSent?: boolean;
}) {
  if (proposalSent) {
    return (
      <Card className="border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="p-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-600 mb-3 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Proposal sent to {lead.name}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            An email with the proposal link has been sent to {lead.email}. The Follow-Up Agent will check in automatically, in 3 days, if they don't respond.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-full border">
            <Bot className="h-3 w-3 text-violet-600" />
            Follow-Up Agent scheduled · 3 days
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Send className="h-5 w-5 text-emerald-600" /> Review & send
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Final review before sending the professional proposal to {lead.name}.</p>
      </div>

      {/* Summary card */}
      <Card className="border-emerald-300 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">System</h3>
              <div className="text-xs space-y-1">
                <div>{designData.panelCount} × {designData.panelModel}</div>
                <div>Inverter: {designData.inverterModel}</div>
                {designData.includeBattery && <div>Battery: {designData.batteryModel}</div>}
                <div>System size: {(designData.panelCount * 0.435).toFixed(1)} kWp</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Financials</h3>
              <div className="text-xs space-y-1">
                <div>Net cost: <strong>{eurFmt(netCost)}</strong></div>
                <div>SEAI grant: {eurFmt(seaiGrant)}</div>
                <div>Payment: {financeOption === 'cash' ? 'Cash' : financeOption === 'finance' ? 'Finance (3.9% APR)' : 'Lease'}</div>
                <div>Deposit: {depositPct}% ({eurFmt(netCost * depositPct / 100)})</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional proposal preview */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" /> Professional proposal
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            4-page branded PDF: Cover page · System design + roof layout · Investment & savings (20-year cashflow) · Terms & acceptance
          </p>
          <div className="aspect-[210/297] max-w-xs mx-auto bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-800 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-xs font-bold mb-1">{brand.name}</div>
              <div className="text-[11px] text-muted-foreground">Solar Investment Plan</div>
              <div className="text-[11px] text-muted-foreground mt-2">Prepared for {lead.name}</div>
              <div className="text-[11px] text-muted-foreground">{(designData.panelCount * 0.435).toFixed(1)} kWp · {eurFmt(netCost)}</div>
              <FileText className="h-8 w-8 text-emerald-400 mx-auto mt-3" />
            </div>
          </div>
          <Button variant="outline" className="w-full mt-3">
            <FileText className="h-4 w-4 mr-2" /> Preview full proposal
          </Button>
        </CardContent>
      </Card>

      {/* Send options */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Send to customer</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">Email proposal link to {lead.email}</span>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <input type="checkbox" className="h-4 w-4 rounded" />
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">SMS notification to {lead.phone}</span>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">Auto-follow up in 3 days if no response</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
