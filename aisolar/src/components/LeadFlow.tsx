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
// The send step embeds the REAL customer artifact as a live preview
import CustomerProposal from '@/components/customer/CustomerProposal';

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
  // Cal: consultant discretion on the final price — referral/advertising
  // ("marketing budget") discounts up to 15% without the owner. The discount
  // is priced as marketing spend, not margin leak: it buys the reviews,
  // referrals and signage that close the next job.
  const [discountPct, setDiscountPct] = useState(0);
  const [discountReason, setDiscountReason] = useState('Referral programme');
  // Cal: everything is automated, but mistakes must be editable. Edit mode
  // makes the bill inputs writable and the estimate recomputes live.
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [billOverride, setBillOverride] = useState<{ monthlyBill: string; annualKwh: string }>({
    monthlyBill: String(lead.monthly_bill ?? ''),
    annualKwh: String(lead.annual_kwh ?? ''),
  });

  const stepIndex = STEPS.findIndex(s => s.id === step);

  // Calculate estimate from bill data (overrides win when the consultant edits)
  const estimate = useMemo(() => {
    const mb = parseFloat(billOverride.monthlyBill);
    const kwh = parseFloat(billOverride.annualKwh);
    return calculateSystemEstimate({
      monthlyBill: isFinite(mb) ? mb : lead.monthly_bill,
      annualKwh: isFinite(kwh) && kwh > 0 ? kwh : lead.annual_kwh,
    });
  }, [lead, billOverride]);

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
  const listNet = grossCost - seaiGrant;
  const netCost = Math.round(listNet * (1 - discountPct / 100));

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
                    // Cal: never block the consultant — free movement through
                    // every stage. We can gate specific stages after launch if
                    // it proves necessary.
                    onClick={() => setStep(s.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-primary text-white' :
                      isDone ? 'bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary' :
                      'text-muted-foreground'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
          {/* === STEP 1: ESTIMATE === */}
          {step === 'estimate' && (
            <div key="estimate">
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Left: Estimate details */}
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" /> Estimate from bill
                        <button
                          type="button"
                          onClick={() => setEditingEstimate(v => !v)}
                          className={`ml-auto text-xs font-medium rounded-control px-2.5 py-1 border transition-colors ${editingEstimate ? 'border-tech bg-tech/10 text-tech' : 'border-border text-muted-foreground hover:bg-muted'}`}
                        >
                          {editingEstimate ? 'Done' : 'Edit'}
                        </button>
                      </h2>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Monthly bill</span>
                          {editingEstimate ? (
                            <span className="flex items-center gap-1 font-semibold">€
                              <input inputMode="decimal" value={billOverride.monthlyBill}
                                onChange={e => setBillOverride(o => ({ ...o, monthlyBill: e.target.value }))}
                                className="w-20 h-7 rounded border border-tech/40 bg-background px-1.5 text-right tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-tech/30" />
                            </span>
                          ) : (
                            <span className="font-semibold">€{billOverride.monthlyBill || lead.monthly_bill}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Annual kWh</span>
                          {editingEstimate ? (
                            <span className="flex items-center gap-1 font-semibold">
                              <input inputMode="numeric" value={billOverride.annualKwh}
                                onChange={e => setBillOverride(o => ({ ...o, annualKwh: e.target.value }))}
                                className="w-24 h-7 rounded border border-tech/40 bg-background px-1.5 text-right tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-tech/30" /> kWh
                            </span>
                          ) : (
                            <span className="font-semibold">{estimate.annualKwh.toLocaleString()} kWh</span>
                          )}
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">MPRN</span>
                          <span className="font-mono text-xs">{lead.mprn || 'Not extracted'}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-primary/10 dark:bg-primary/10 rounded">
                          <span className="text-muted-foreground">Recommended system</span>
                          <span className="font-bold text-primary dark:text-primary">{estimate.systemSizeKw} kWp</span>
                        </div>
                        <div className="flex justify-between p-2 bg-primary/10 dark:bg-primary/10 rounded">
                          <span className="text-muted-foreground">Annual savings</span>
                          <span className="font-bold text-primary dark:text-primary">{eurFmt(estimate.annualSavings)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">Payback</span>
                          <span className="font-semibold">{estimate.paybackYears} years</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">20-year savings</span>
                          <span className="font-semibold">{eurFmt(estimate.twentyYearSavings)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-primary/10 dark:bg-primary/10 rounded">
                          <span className="text-muted-foreground">SEAI grant</span>
                          <span className="font-bold text-primary dark:text-primary">{eurFmt(1800)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Eircode lookup */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> Property location
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
                  <Card className="border-pop/30 bg-pop/[0.04]">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Book site survey
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
                              className={`p-2 border rounded-lg text-xs hover:border-pop/50 hover:bg-pop/5 transition-colors text-left ${isSelected ? 'border-pop bg-pop/10 font-medium' : 'border-border'}`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        className="w-full mt-3 bg-pop text-pop-foreground transition-colors hover:bg-pop/90"
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

                  <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" /> AI Coach
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Based on €{lead.monthly_bill}/mo bill, this is a high-value lead. Lead with the SEAI grant + monthly savings.
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="p-2 bg-background rounded border-l-2 border-primary/40">
                          <strong>Script:</strong> "With your {estimate.systemSizeKw}kWp system, you'll save {eurFmt(estimate.annualSavings)}/year and the SEAI covers {eurFmt(1800)}. Payback in {estimate.paybackYears} years."
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Next button */}
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep('survey')} className="bg-primary transition-colors hover:bg-primary h-12 px-6">
                  Continue to survey <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 2: SURVEY — uses the REAL SiteSurveyForm === */}
          {step === 'survey' && (
            <div key="survey">
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
            </div>
          )}

          {/* === STEP 3: DESIGN === */}
          {step === 'design' && (
            <div key="design">
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
                <Button onClick={() => setStep('proposal')} className="bg-primary transition-colors hover:bg-primary h-12 px-6">
                  Continue to proposal <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 4: PROPOSAL === */}
          {step === 'proposal' && (
            <div key="proposal">
              <ProposalStep
                lead={lead}
                designData={designData}
                grossCost={grossCost}
                seaiGrant={seaiGrant}
                netCost={netCost}
                listNet={listNet}
                discountPct={discountPct}
                setDiscountPct={setDiscountPct}
                discountReason={discountReason}
                setDiscountReason={setDiscountReason}
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
                <Button onClick={() => setStep('send')} className="bg-primary transition-colors hover:bg-primary h-12 px-6">
                  Review & send <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 5: SEND === */}
          {step === 'send' && (
            <div key="send">
              <SendStep lead={lead} designData={designData} netCost={netCost} listNet={listNet} discountPct={discountPct} discountReason={discountReason} seaiGrant={seaiGrant} financeOption={financeOption} depositPct={depositPct} setDepositPct={setDepositPct} proposalSent={proposalSent} />
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep('proposal')} className="h-12" disabled={proposalSent}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                {proposalSent ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/consultant`)} className="h-12">
                      <MessageSquare className="h-4 w-4 mr-2" /> Back to inbox
                    </Button>
                    <Button onClick={() => navigate('/owner')} className="h-12 bg-primary transition-colors hover:bg-primary">
                      View in pipeline <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="bg-primary transition-colors hover:bg-primary h-12 px-6"
                    onClick={() => {
                      setProposalSent(true);
                      toast.success('Proposal sent to customer', {
                        description: `${lead.name} will receive it by email. Follow-Up Agent checks in after 3 days.`,
                      });
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" /> Send proposal to customer
                  </Button>
                )}
              </div>
            </div>
          )}
      </main>
    </div>
  );
}

// ============= SATELLITE MAP =============
function SatelliteMap({ eircode, address }: { eircode: string; address: string }) {
  // Google satellite keyed to the ACTUAL eircode (or address) — eircodes
  // geocode natively on Google, which OSM can't do. Same proven embed as the
  // homeowner front door (/start).
  const q = eircode || address;
  const satelliteUrl = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=k&z=19&output=embed`;

  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/10] bg-muted relative">
        {q ? (
          <iframe
            title="Property satellite view"
            src={satelliteUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
            Enter an Eircode to see the roof
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur">
          <MapPin className="h-3 w-3 inline mr-1 text-tech" />
          {q || 'Property location'}
        </div>
      </div>
      <CardContent className="p-2 text-xs text-center text-muted-foreground">
        Satellite imagery · exact panel layout confirmed at the survey
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
          <Home className="h-5 w-5 text-primary" /> Site survey
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Capture roof details, electrical setup, and customer preferences. This data flows directly into the proposal.</p>
      </div>

      {/* Satellite view for reference */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Property overview
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
          <Sun className="h-5 w-5 text-muted-foreground" /> System design
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Lay out panels on the roof, select gear, and size the system.</p>
      </div>

      {/* Satellite + panel layout (OpenSolar-style) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" /> Roof layout designer
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Satellite view of the property. Use + / − to adjust panel count. In production: Mapbox satellite imagery + drag-to-position panels (panel counts come from bill + survey, not an auto roof-scan).
          </p>
          <div className="relative aspect-[16/10] rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700">
            {/* Google satellite keyed to the property */}
            <iframe
              title="Roof satellite view"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(eircode || address || 'Dublin')}&t=k&z=20&output=embed`}
              className="absolute inset-0 w-full h-full"
              style={{ filter: 'contrast(1.1) brightness(0.9)' }}
              loading="lazy"
            />
            {/* Panel overlay grid — positioned over the "roof" area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-primary border-2 border-primary/40 rounded-lg p-2 pointer-events-auto" style={{ width: '60%', height: '50%' }}>
                <div className="grid h-full gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(designData.panelCount))}, 1fr)` }}>
                  {Array.from({ length: designData.panelCount }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-primary border border-primary/40 rounded-sm flex items-center justify-center text-[7px] text-white font-bold hover:bg-primary cursor-pointer transition-colors"
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
            <span className="text-primary font-medium">
              {Math.round((annualProduction / (lead.annual_kwh || estimate.annualKwh)) * 100)}% of usage covered
            </span>
          </div>
          <div className="mt-2 p-2 bg-muted/40 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            In production: Mapbox satellite imagery + drag-to-position panels. Roof dimensions come from the site survey (more accurate than a satellite scan); auto roof-detection is a post-launch maybe, gated on Google Solar API coverage in Ireland.
          </div>
        </CardContent>
      </Card>

      {/* Gear selection */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Gear selection
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
      <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> AI design suggestion
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
function ProposalStep({ lead, designData, grossCost, seaiGrant, netCost, listNet, estimate, financeOption, setFinanceOption, depositPct, setDepositPct, discountPct, setDiscountPct, discountReason, setDiscountReason }: {
  lead: DummyLead;
  designData: any;
  grossCost: number;
  seaiGrant: number;
  netCost: number;
  listNet: number;
  discountPct: number;
  setDiscountPct: (n: number) => void;
  discountReason: string;
  setDiscountReason: (r: string) => void;
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
          <FileText className="h-5 w-5 text-primary" /> Proposal & financing
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
            <div className="flex justify-between p-2 bg-primary/10 dark:bg-primary/10 rounded text-primary dark:text-primary">
              <span>SEAI grant</span>
              <span className="font-semibold">−{eurFmt(seaiGrant)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between p-2 bg-doc-deposit/10 rounded text-doc-deposit">
                <span>{discountReason} — {discountPct}%</span>
                <span className="font-semibold">−{eurFmt(listNet - netCost)}</span>
              </div>
            )}
            <div className="flex justify-between p-2 bg-primary/10 dark:bg-primary/10 rounded text-lg font-bold text-primary dark:text-primary">
              <span>{discountPct > 0 ? 'Final price' : 'Net cost'}</span>
              <span>{eurFmt(netCost)}</span>
            </div>
          </div>

          {/* Consultant's discretion (Cal): the marketing-budget discount.
              Capped at 15% — above that is the owner's call, by design. */}
          <div className="mt-3 p-3 rounded-[10px] bg-muted/40">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">Your discretion</span>
              <span className="text-2xs text-muted-foreground">up to 15% — above that is the owner's call</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[0, 5, 10, 15].map(d => (
                <button key={d} onClick={() => setDiscountPct(d)}
                  className={`h-8 px-3 rounded-[8px] text-xs font-medium border transition-colors ${discountPct === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                  {d === 0 ? 'List price' : `−${d}%`}
                </button>
              ))}
              {discountPct > 0 && (
                <select value={discountReason} onChange={e => setDiscountReason(e.target.value)}
                  className="h-8 px-2 rounded-[8px] text-xs bg-card border border-border">
                  <option>Referral programme</option>
                  <option>Advertising participation</option>
                  <option>Review + signage</option>
                  <option>Competitive match</option>
                </select>
              )}
            </div>
            {discountPct > 0 && (
              <p className="text-2xs text-muted-foreground mt-1.5">
                Priced as marketing spend: {eurFmt(listNet - netCost)} buys the {discountReason.toLowerCase()} that closes the next job. Shows on the proposal as "{discountReason}".
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Finance options */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Payment options
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
                    isSelected ? 'border-primary/40 bg-primary/10 dark:bg-primary/10' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
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
            <div className="mt-4 p-3 bg-primary/10 dark:bg-primary/10 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Monthly payment</div>
                  <div className="font-bold text-lg">{eurFmt(financeMonthly)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Monthly savings</div>
                  <div className="font-bold text-lg text-primary">{eurFmt(annualSavings / 12)}</div>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <div className="text-xs text-muted-foreground">Net monthly position</div>
                  <div className={`font-bold text-lg ${netMonthlyPosition > 0 ? 'text-primary' : 'text-red-600'}`}>
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
      <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Savings summary
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Annual savings</div>
              <div className="font-bold text-lg text-primary dark:text-primary">{eurFmt(annualSavings)}</div>
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
      <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> AI pricing coach
          </h3>
          <div className="text-xs space-y-1">
            <div className="p-2 bg-background rounded border-l-2 border-primary/40">
              <strong>Margin:</strong> {Math.round(((netCost - grossCost + seaiGrant) / netCost) * 100)}% (healthy — industry avg is 18-22%)
            </div>
            <div className="p-2 bg-background rounded border-l-2 border-primary/40">
              <strong>Objection handler:</strong> If customer says "too expensive" → offer the finance option. {eurFmt(annualSavings / 12)}/mo savings vs {eurFmt(financeMonthly)}/mo payment = cashflow positive from month 1.
            </div>
            <div className="p-2 bg-background rounded border-l-2 border-primary/40">
              <strong>Closing tip:</strong> Lead with the SEAI grant ({eurFmt(seaiGrant)}) — it's "free money" that makes the decision feel urgent (grant rates may change).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= SEND STEP =============
function SendStep({ lead, designData, netCost, listNet, discountPct, discountReason, seaiGrant, financeOption, depositPct, setDepositPct, proposalSent }: {
  lead: DummyLead;
  designData: any;
  netCost: number;
  listNet: number;
  discountPct: number;
  discountReason: string;
  seaiGrant: number;
  financeOption: string;
  depositPct: number;
  setDepositPct: (n: number) => void;
  proposalSent?: boolean;
}) {
  if (proposalSent) {
    return (
      <Card className="border-primary/40 bg-primary/10 dark:bg-primary/10">
        <CardContent className="p-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary mb-3 shadow-lg shadow-card">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Proposal sent to {lead.name}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            An email with the proposal link has been sent to {lead.email}. The Follow-Up Agent will check in automatically, in 3 days, if they don't respond.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-full border">
            <Bot className="h-3 w-3 text-primary" />
            Follow-Up Agent scheduled · 3 days
          </div>
        </CardContent>
      </Card>
    );
  }

  // The star of the send screen: the ACTUAL artifact the customer opens,
  // built live from the design + pricing the consultant just chose — not a
  // dashed placeholder of a PDF that doesn't exist yet.
  const estimate = calculateSystemEstimate({ monthlyBill: lead.monthly_bill, annualKwh: lead.annual_kwh });
  const previewLead: DummyLead = {
    ...lead,
    workflow_stage: 'proposal_drafted',
    invoice: undefined,
    proposal: {
      id: lead.proposal?.id ?? 'DRAFT',
      status: 'draft',
      system_size_kw: +(designData.panelCount * 0.435).toFixed(1),
      panel_count: designData.panelCount,
      panel_model: designData.panelModel,
      inverter_model: designData.inverterModel,
      battery_model: designData.includeBattery ? designData.batteryModel : null,
      gross_cost: netCost + seaiGrant,
      seai_grant: seaiGrant,
      net_cost: netCost,
      annual_savings: lead.proposal?.annual_savings ?? estimate.annualSavings,
      payback_years: lead.proposal?.payback_years ?? estimate.paybackYears,
      twenty_year_savings: lead.proposal?.twenty_year_savings ?? estimate.twentyYearSavings,
    },
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" /> Review & send
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is exactly what {lead.name.split(' ')[0]} opens — their bill read back to them, the gear, the money at their rates. Scroll it the way they will.
        </p>
      </div>

      {/* Slim deal strip */}
      <div className="rounded-[16px] bg-card shadow-card p-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span><strong>{(designData.panelCount * 0.435).toFixed(1)} kWp</strong> · {designData.panelCount} × {designData.panelModel}</span>
        {designData.includeBattery && <span>Battery: {designData.batteryModel}</span>}
        <span>Net <strong>{eurFmt(netCost)}</strong> after {eurFmt(seaiGrant)} grant{discountPct > 0 && <span className="text-doc-deposit"> − {discountPct}% {discountReason.toLowerCase()}</span>}</span>
        {/* The LAST GATE (Cal): payment linkage rides the proposal but the
            consultant can still adjust the deposit here, before send. */}
        <span className="inline-flex items-center gap-1.5">
          {financeOption === 'cash' ? 'Cash' : financeOption === 'finance' ? 'Finance (3.9% APR)' : 'Lease'} ·
          <input type="number" min={10} max={50} value={depositPct}
            onChange={e => setDepositPct(Math.max(10, Math.min(50, Number(e.target.value))))}
            className="w-12 h-6 px-1 rounded-[6px] border border-border bg-card text-xs tabular-nums text-center" />
          % deposit ({eurFmt(netCost * depositPct / 100)}) — the deposit link on the proposal uses this
        </span>
      </div>

      {/* The customer's window — live, full document, framed in the proposal colour */}
      <div className="rounded-[16px] bg-card shadow-card overflow-hidden border-t-4 border-t-doc-proposal">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <FileText className="size-4 text-doc-proposal" />
          <span className="text-sm font-semibold">Their proposal, exactly as they'll see it</span>
          <span className="ml-auto text-2xs text-muted-foreground">live preview · scroll to review</span>
        </div>
        <div className="max-h-[560px] overflow-y-auto bg-background">
          {/* pointer-events off inside: the consultant reviews here, the
              customer accepts on their own link — no accidental Accept clicks */}
          <div className="pointer-events-none select-none">
            <CustomerProposal lead={previewLead} />
          </div>
        </div>
      </div>

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
              <span className="text-sm flex-1">Portal notification to {lead.name.split(' ')[0]} (SMS arrives with Twilio at launch)</span>
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
