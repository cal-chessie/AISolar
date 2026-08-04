import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import RoofPhotoRead from '@/components/survey/RoofPhotoRead';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, FileText, ArrowRight, Info, MapPin, Zap, Users, Battery, Droplets, Car, Target, Home, Sun, Settings, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * SurveySection — the clean, family-toned card that every survey step is built
 * from (matches the step-1 Customer Info template Cal approved). A thin colour
 * edge + tinted icon give each section its identity; high-contrast content, no
 * faint disabled boxes.
 */
const SECTION_TONE: Record<string, { edge: string; chip: string; text: string }> = {
  tech:     { edge: 'bg-tech',                 chip: 'bg-tech-subtle',     text: 'text-tech' },
  deposit:  { edge: 'bg-doc-deposit',          chip: 'bg-doc-deposit/10',  text: 'text-doc-deposit' },
  proposal: { edge: 'bg-doc-proposal',         chip: 'bg-doc-proposal/10', text: 'text-doc-proposal' },
  pop:      { edge: 'bg-pop',                  chip: 'bg-pop-subtle',      text: 'text-pop' },
  neutral:  { edge: 'bg-muted-foreground/40',  chip: 'bg-muted',           text: 'text-muted-foreground' },
};
function SurveySection({ tone = 'neutral', icon, title, hint, children }: {
  tone?: keyof typeof SECTION_TONE; icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode;
}) {
  const t = SECTION_TONE[tone];
  return (
    <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card">
      <span className={`absolute left-0 top-0 h-full w-1 ${t.edge}`} aria-hidden />
      <div className="pl-5 pr-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 size-8 rounded-lg grid place-items-center [&>svg]:size-4 ${t.chip} ${t.text}`}>{icon}</span>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-body">{hint}</p>}
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}
import { validateSurveyCompletion, mapSurveyToProposal, calculateSurveyStatus } from '@/lib/surveyValidation';
import SurveyStepProgress, { SURVEY_STEPS } from '@/components/survey/SurveyStepProgress';
import GuidedPhotoCapture, { REQUIRED_PHOTOS } from '@/components/survey/GuidedPhotoCapture';
import BillReadPanel, { billReadFromIntake, billReadCells } from '@/components/bill/BillReadPanel';
import EircodeAddressLookup from '@/components/address/EircodeAddressLookup';
import { logActivity } from '@/lib/activityLog';
import { isDemoMode } from '@/lib/demoMode';
import { generateDummyLeads } from '@/lib/dummyData';
import { sendStageChangeNotification } from '@/lib/stageNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const surveySchema = z.object({
  // Property & energy info (key fields for proposals)
  property_type: z.string().optional().default('residential'),
  eircode: z.string().optional(),
  annual_consumption_kwh: z.string().optional(),
  current_tariff: z.string().optional(),
  // Phone / manual capture — when a lead calls in there is no bill to confirm,
  // so the consultant keys the bill-equivalents live on the call.
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  monthly_bill: z.string().optional(),
  day_night_meter: z.string().optional(),
  // Customer goals (moved to top)
  battery_storage: z.boolean().optional(),
  hot_water_diverter: z.boolean().optional(),
  ev_charger: z.boolean().optional(),
  customer_priorities: z.string().optional(),
  // Cal: these two questions decide the battery — occupancy sets the load,
  // daytime presence sets when it lands (out all day = evening peak = battery case)
  household_occupants: z.string().optional(),
  home_during_day: z.string().optional(),
  // Roof details
  roof_type: z.string().min(1, 'Roof type is required'),
  roof_condition: z.string().min(1, 'Roof condition is required'),
  roof_orientation: z.string().optional(),
  roof_pitch: z.string().optional(),
  roof_material: z.string().optional(),
  // Environmental
  shading_analysis: z.string().optional(),
  nearby_obstructions: z.string().optional(),
  // Electrical
  electrical_panel_capacity: z.string().optional(),
  meter_location: z.string().optional(),
  grid_connection_type: z.string().optional(),
  // Gear (panel / inverter / battery / count / size) is NOT captured here.
  // The Design Studio owns it, on the real roof. One source of truth.
  // Installation & logistics (merged)
  property_storeys: z.string().optional(),
  scaffolding_required: z.string().optional(),
  parking_situation: z.string().optional(),
  attic_access: z.string().optional(),
  access_notes: z.string().optional(),
  customer_availability: z.string().optional(),
  existing_solar: z.boolean().optional(),
  installation_notes: z.string().optional(),
  special_requirements: z.string().optional(),
  status: z.string().default('draft'),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SiteSurveyFormProps {
  leadId: string;
  onCreateProposal?: (surveyData: any, leadData: any) => void;
}

export default function SiteSurveyForm({ leadId, onCreateProposal }: SiteSurveyFormProps) {
  const [loading, setLoading] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; type: string; description: string }>>([]);
  const [currentStep, setCurrentStep] = useState(1);
  // Confirm step stays a clean read-only summary by default; Edit flips the
  // bill-derived fields to inputs so the consultant can correct any that are off.
  const [editingConfirm, setEditingConfirm] = useState(false);
  // Cal: "you should be able to edit ANYTHING" — Edit on the Confirm step opens
  // every bill field. Overrides layer on top of the extracted intake, so the
  // 21-point panel updates live as the consultant corrects the read.
  const [billEdits, setBillEdits] = useState<Record<string, unknown>>({});
  
  // Ref for scrolling to survey top
  const surveyContainerRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && currentStep < SURVEY_STEPS.length) {
        // Swipe left = next step
        setCurrentStep(prev => prev + 1);
      } else if (swipeDistance < 0 && currentStep > 1) {
        // Swipe right = previous step
        setCurrentStep(prev => prev - 1);
      }
    }
    
    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [currentStep]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      status: 'draft',
      property_type: 'residential',
      current_tariff: '0.35',
      existing_solar: false,
      battery_storage: false,
      hot_water_diverter: false,
      ev_charger: false,
    },
  });

  const formValues = watch();

  // Calculate completion status
  const completionStatus = validateSurveyCompletion(formValues, uploadedPhotos.length);

  const getCompletedSteps = () => {
    const completed: string[] = [];
    // Confirm: the usage seed is in (bill read or keyed on the call)
    if (formValues.annual_consumption_kwh || formValues.monthly_bill || leadData?.annual_kwh || leadData?.monthly_bill) {
      completed.push('confirm');
    }
    // Occupancy: the hero — both answers in
    if (completionStatus.sections.occupancy.complete) completed.push('occupancy');
    // Goal: any intent captured
    if (formValues.battery_storage || formValues.hot_water_diverter || formValues.ev_charger || formValues.customer_priorities) {
      completed.push('goal');
    }
    if (completionStatus.sections.roof.complete) completed.push('roof');
    if (completionStatus.sections.electrical.complete) completed.push('electrical');
    if (formValues.property_storeys || formValues.scaffolding_required) completed.push('installation');
    if (completionStatus.sections.photos.complete) completed.push('photos');
    return completed;
  };

  useEffect(() => {
    fetchExistingSurvey();
  }, [leadId]);

  // Scroll to the top of the survey on every step change. scrollIntoView proved
  // unreliable here (a smooth scroll got cancelled by the AnimatePresence remount
  // of key={currentStep}, and even instant did nothing against the page scroller),
  // so Next left you stranded mid-page. Do it after paint (rAF): reset the nearest
  // scrolling ancestor if there is one (the cockpit shell), otherwise scroll the
  // window to the survey top, offset to clear the sticky flow header.
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = surveyContainerRef.current;
      if (!el) return;
      // Reset every scrolling ancestor (the cockpit shell has one)…
      let scrolledAncestor = false;
      let node: HTMLElement | null = el.parentElement;
      while (node) {
        const oy = getComputedStyle(node).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
          node.scrollTop = 0;
          scrolledAncestor = true;
        }
        node = node.parentElement;
      }
      // …and if nothing internal scrolls (LeadFlow scrolls the page), reset the window.
      if (!scrolledAncestor) window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [currentStep]);

  const fetchExistingSurvey = async () => {
    // Demo mode: no live DB — hydrate from the demo lead set, silently. This
    // was the "old error that keeps popping up": every survey open fired a red
    // "Failed to load existing survey data" toast because the Supabase fetch
    // can't succeed against demo ids.
    if (isDemoMode()) {
      const demoLead = generateDummyLeads().find(l => l.id === leadId);
      if (demoLead) {
        setLeadData(demoLead);
        if (demoLead.annual_kwh) setValue('annual_consumption_kwh', String(demoLead.annual_kwh));
      }
      setFetchingData(false);
      return;
    }
    try {
      // Fetch lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (lead) {
        setLeadData(lead);
      }

      const { data, error } = await supabase
        .from('site_surveys')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setExistingSurvey(data);
        // Populate form with existing data
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
            if (['existing_solar', 'battery_storage', 'hot_water_diverter', 'ev_charger'].includes(key)) {
              setValue(key as any, Boolean(data[key]));
            } else {
              setValue(key as any, String(data[key]));
            }
          }
        });

        // Load existing photos
        const { data: photos } = await supabase
          .from('survey_photos')
          .select('*')
          .eq('survey_id', data.id);
        
        if (photos) {
          setUploadedPhotos(photos.map(p => ({
            url: p.photo_url,
            type: p.photo_type || 'other',
            description: p.description || '',
          })));
        }
      }
    } catch (error: any) {
      // A mount-time load failure is not the user's fault and they can't act
      // on it — this red toast fired on EVERY survey open in preview (Cal's
      // "old error that keeps popping up"). Log it, fall back to the demo
      // lead so the form is still usable, and stay quiet.
      console.warn('Survey fetch failed, using local fallback:', error?.message ?? error);
      const demoLead = generateDummyLeads().find(l => l.id === leadId);
      if (demoLead) {
        setLeadData(demoLead);
        if (demoLead.annual_kwh) setValue('annual_consumption_kwh', String(demoLead.annual_kwh));
      }
    } finally {
      setFetchingData(false);
    }
  };

  const onSubmit = async (data: SurveyFormData, shouldComplete: boolean = false) => {
    if (shouldComplete && !completionStatus.isComplete) {
      toast({
        title: 'Cannot Complete Survey',
        description: `Please fill in all required fields: ${completionStatus.missingFields.slice(0, 3).join(', ')}${completionStatus.missingFields.length > 3 ? '...' : ''}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    // Demo mode: no auth/DB — accept the save locally so the flow is walkable
    // (and the consultant can correct mistakes) without a red error toast.
    if (isDemoMode()) {
      setLoading(false);
      toast({ title: shouldComplete ? 'Survey completed (demo)' : 'Survey saved (demo)', description: 'Stored locally — connects to the live database at launch.' });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const autoStatus = calculateSurveyStatus(data, uploadedPhotos.length);
      const finalStatus = shouldComplete ? 'completed' : autoStatus;

      const surveyData = {
        lead_id: leadId,
        surveyor_id: user.id,
        roof_type: data.roof_type,
        roof_condition: data.roof_condition,
        roof_orientation: data.roof_orientation || null,
        roof_pitch: data.roof_pitch ? parseFloat(data.roof_pitch) : null,
        roof_material: data.roof_material || null,
        shading_analysis: data.shading_analysis || null,
        nearby_obstructions: data.nearby_obstructions || null,
        electrical_panel_capacity: data.electrical_panel_capacity || null,
        meter_location: data.meter_location || null,
        grid_connection_type: data.grid_connection_type || null,
        installation_notes: data.installation_notes || null,
        special_requirements: data.special_requirements || null,
        status: finalStatus,
        completed_at: finalStatus === 'completed' ? new Date().toISOString() : null,
        property_storeys: data.property_storeys ? parseInt(data.property_storeys) : null,
        scaffolding_required: data.scaffolding_required || null,
        parking_situation: data.parking_situation || null,
        attic_access: data.attic_access || null,
        access_notes: data.access_notes || null,
        customer_availability: data.customer_availability || null,
        existing_solar: data.existing_solar || false,
        household_occupants: data.household_occupants || null,
        home_during_day: data.home_during_day || null,
      };

      let surveyId;
      if (existingSurvey) {
        const { error } = await supabase
          .from('site_surveys')
          .update(surveyData)
          .eq('id', existingSurvey.id);
        if (error) throw error;
        surveyId = existingSurvey.id;
      } else {
        const { data: newSurvey, error } = await supabase
          .from('site_surveys')
          .insert([surveyData])
          .select()
          .single();
        if (error) throw error;
        surveyId = newSurvey.id;
        setExistingSurvey(newSurvey);
      }

      // Save photos to survey_photos table
      if (uploadedPhotos.length > 0 && surveyId) {
        await supabase
          .from('survey_photos')
          .delete()
          .eq('survey_id', surveyId);

        const photoInserts = uploadedPhotos.map(photo => ({
          survey_id: surveyId,
          photo_url: photo.url,
          photo_type: photo.type,
          description: photo.description,
        }));

        const { error: photoError } = await supabase
          .from('survey_photos')
          .insert(photoInserts);

        if (photoError) throw photoError;
      }

      // Phone / manual capture writes the bill-equivalents back onto the lead so
      // every downstream surface (estimate, drafter, proposal) reads the same figures.
      const leadPatch: Record<string, unknown> = {};
      if (data.contact_name) leadPatch.name = data.contact_name;
      if (data.contact_phone) leadPatch.phone = data.contact_phone;
      if (data.contact_email) leadPatch.email = data.contact_email;
      if (data.monthly_bill) leadPatch.monthly_bill = parseFloat(data.monthly_bill);
      if (data.annual_consumption_kwh) leadPatch.annual_kwh = parseInt(data.annual_consumption_kwh);
      if (Object.keys(leadPatch).length > 0) {
        await supabase.from('leads').update(leadPatch).eq('id', leadId);
      }

      // Update lead workflow stage
      if (finalStatus === 'completed') {
        await supabase
          .from('leads')
          .update({ workflow_stage: 'survey_complete' })
          .eq('id', leadId);
        
        await sendStageChangeNotification(leadId, leadData?.workflow_stage || 'new', 'survey_complete');
      } else if (finalStatus === 'in_progress') {
        await supabase
          .from('leads')
          .update({ workflow_stage: 'survey_in_progress' })
          .eq('id', leadId);
      }

      // Log activity
      if (finalStatus === 'completed') {
        await logActivity({
          leadId,
          actionType: 'survey_completed',
          description: `Site survey completed for ${leadData?.name || 'lead'}`,
          metadata: {
            roof_type: data.roof_type,
            occupancy: data.household_occupants,
            home_during_day: data.home_during_day,
          }
        });
      } else if (!existingSurvey) {
        await logActivity({
          leadId,
          actionType: 'survey_started',
          description: `Site survey started for ${leadData?.name || 'lead'}`
        });
      }

      toast({
        title: 'Success',
        description: `Site survey ${existingSurvey ? 'updated' : 'created'} successfully${finalStatus === 'completed' ? ' and marked as complete' : ''}`,
      });

      fetchExistingSurvey();
    } catch (error: any) {
      // No session / no reachable DB (preview, offline) — keep the work local
      // and say so calmly instead of a red failure the user can't fix.
      if (/Not authenticated|Failed to fetch|NetworkError/i.test(error?.message ?? '')) {
        toast({
          title: 'Saved locally',
          description: 'No live connection — your survey is kept in this session and syncs at launch.',
        });
      } else {
        console.error('Error saving survey:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to save survey',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAndCreateProposal = async () => {
    const formData = getValues();
    await onSubmit(formData, true);
    
    if (completionStatus.isComplete && onCreateProposal) {
      const proposalData = mapSurveyToProposal(formData, leadData);
      onCreateProposal(proposalData, leadData);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Photos are captured per stage (roof shots on the roof step, board shots on
  // the electrical step, etc.), all writing to the one uploadedPhotos list.
  const photoList = uploadedPhotos.map((p, i) => ({ id: `photo-${i}`, url: p.url, type: p.type }));
  const handlePhotos = (photos: Array<{ id: string; url: string; type: string }>) =>
    setUploadedPhotos(photos.map(p => ({ url: p.url, type: p.type, description: p.type })));

  // Step content components
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: { // The consultation starts here. Bill on file → confirm the read. Lead phoned in → key it live.
        const mergedIntake = { ...(leadData?.intake ?? {}), ...billEdits } as Record<string, unknown>;
        const bill = billReadFromIntake(mergedIntake, {
          monthlyBill: leadData?.monthly_bill,
          annualKwh: leadData?.annual_kwh,
          mprn: leadData?.mprn,
          accountName: leadData?.name,
          address: leadData?.address,
        });
        const hasBillRead = billReadCells(bill).length >= 4;
        const initials = (watch('contact_name') || leadData?.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('');
        return (
          <div className="space-y-3">
            {/* Who — read-only when the bill named them; live-editable on a phone-in.
                Blue (tech) left bar so the Confirm step wears the family colour too. */}
            <div className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card pl-5 pr-4 py-3">
              <span className="absolute left-0 top-0 h-full w-1 bg-tech" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="size-10 shrink-0 rounded-full bg-tech-subtle text-tech grid place-items-center text-sm font-semibold">
                  {initials}
                </span>
                {hasBillRead ? (
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{leadData?.name || 'Customer'}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {[leadData?.phone, leadData?.email].filter(Boolean).join('  ·  ') || 'No contact on file'}
                    </p>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm">New enquiry</h3>
                    <p className="text-xs text-muted-foreground">Key these as you talk them through it.</p>
                  </div>
                )}
              </div>
              {!hasBillRead && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <Label htmlFor="contact_name" className="text-xs">Name</Label>
                    <Input {...register('contact_name')} defaultValue={leadData?.name || ''} placeholder="Full name" className="w-full mt-1.5 h-control" />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone" className="text-xs">Phone</Label>
                    <Input {...register('contact_phone')} type="tel" inputMode="tel" defaultValue={leadData?.phone || ''} placeholder="08x xxx xxxx" className="w-full mt-1.5 h-control" />
                  </div>
                  <div>
                    <Label htmlFor="contact_email" className="text-xs">Email</Label>
                    <Input {...register('contact_email')} type="email" inputMode="email" defaultValue={leadData?.email || ''} placeholder="name@email.ie" className="w-full mt-1.5 h-control" />
                  </div>
                </div>
              )}
            </div>

            {hasBillRead ? (
              <>
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-xs text-muted-foreground">Confirm what the bill read. Fix anything off.</p>
                  <button type="button" onClick={() => setEditingConfirm(v => !v)}
                    className="text-xs font-medium text-tech hover:underline">
                    {editingConfirm ? 'Done' : 'Edit'}
                  </button>
                </div>
                {editingConfirm ? (
                  <SurveySection tone="tech" icon={<FileText />} title="Correct the read"
                    hint="Every field of the read, editable. Fix anything the AI got wrong — the panel updates as you type.">
                    {(() => {
                      const setBill = (k: string, v: unknown) => setBillEdits(prev => ({ ...prev, [k]: v }));
                      const num = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
                        setBill(k, e.target.value === '' ? null : parseFloat(e.target.value));
                      const txt = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
                        setBill(k, e.target.value === '' ? null : e.target.value);
                      const val = (k: string) => (mergedIntake[k] ?? '') as string | number;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div><Label className="text-xs">Supplier</Label>
                            <Input value={val('extracted_provider')} onChange={txt('extracted_provider')} placeholder="e.g. Electric Ireland" className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Tariff</Label>
                            <Input value={val('extracted_tariff_name')} onChange={txt('extracted_tariff_name')} placeholder="Tariff name" className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">MPRN</Label>
                            <Input value={val('extracted_mprn')} onChange={txt('extracted_mprn')} placeholder="10 0xx xxx xxx" className="w-full mt-1.5 h-control font-mono" /></div>
                          <div><Label className="text-xs">Account name</Label>
                            <Input value={val('extracted_account_name')} onChange={txt('extracted_account_name')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Monthly bill (€)</Label>
                            <Input type="number" inputMode="decimal" value={val('extracted_monthly_bill')} onChange={num('extracted_monthly_bill')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Annual usage (kWh)</Label>
                            <Input type="number" inputMode="numeric" value={val('extracted_annual_kwh')}
                              onChange={e => { num('extracted_annual_kwh')(e); setValue('annual_consumption_kwh', e.target.value); }} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Billed usage (kWh)</Label>
                            <Input type="number" inputMode="numeric" value={val('extracted_billing_period_kwh')} onChange={num('extracted_billing_period_kwh')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Day rate (€/kWh)</Label>
                            <Input type="number" step="0.01" inputMode="decimal" value={val('extracted_unit_rate')}
                              onChange={e => { num('extracted_unit_rate')(e); setValue('current_tariff', e.target.value); }} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Night rate (€/kWh)</Label>
                            <Input type="number" step="0.01" inputMode="decimal" value={val('extracted_night_rate')} onChange={num('extracted_night_rate')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Standing charge (€/day)</Label>
                            <Input type="number" step="0.01" inputMode="decimal" value={val('extracted_standing_charge')} onChange={num('extracted_standing_charge')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">VAT (%)</Label>
                            <Input type="number" inputMode="numeric" value={val('extracted_vat_rate')} onChange={num('extracted_vat_rate')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Meter</Label>
                            <Select value={mergedIntake['extracted_day_night_meter'] === true ? 'day_night' : mergedIntake['extracted_day_night_meter'] === false ? 'single' : undefined}
                              onValueChange={v => setBill('extracted_day_night_meter', v === 'day_night')}>
                              <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single rate</SelectItem>
                                <SelectItem value="day_night">Day / night</SelectItem>
                              </SelectContent>
                            </Select></div>
                          <div><Label className="text-xs">Day usage (kWh)</Label>
                            <Input type="number" inputMode="numeric" value={val('extracted_day_usage_kwh')} onChange={num('extracted_day_usage_kwh')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Night usage (kWh)</Label>
                            <Input type="number" inputMode="numeric" value={val('extracted_night_usage_kwh')} onChange={num('extracted_night_usage_kwh')} className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Billing period</Label>
                            <Input value={val('extracted_billing_period')} onChange={txt('extracted_billing_period')} placeholder="e.g. Bi-monthly" className="w-full mt-1.5 h-control" /></div>
                          <div><Label className="text-xs">Reading</Label>
                            <Select value={mergedIntake['extracted_estimated_reading'] === true ? 'estimated' : mergedIntake['extracted_estimated_reading'] === false ? 'actual' : undefined}
                              onValueChange={v => setBill('extracted_estimated_reading', v === 'estimated')}>
                              <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="actual">Actual read</SelectItem>
                                <SelectItem value="estimated">Estimated</SelectItem>
                              </SelectContent>
                            </Select></div>
                          <div><Label className="text-xs">Eircode</Label>
                            <Input value={val('extracted_eircode')} maxLength={8}
                              onChange={e => { const v = e.target.value.toUpperCase(); setBill('extracted_eircode', v || null); setValue('eircode', v); }}
                              placeholder="N91 XXXX" className="w-full mt-1.5 h-control font-mono uppercase" /></div>
                          <div><Label className="text-xs">Supply address</Label>
                            <Input value={val('extracted_address')} onChange={txt('extracted_address')} className="w-full mt-1.5 h-control" /></div>
                        </div>
                      );
                    })()}
                  </SurveySection>
                ) : (
                  <div className="relative overflow-hidden rounded-panel shadow-card">
                    <span className="absolute left-0 top-0 h-full w-1 bg-tech z-10" aria-hidden />
                    <BillReadPanel bill={bill} dense className="shadow-none rounded-none" />
                  </div>
                )}
                {/* Real bills miss the money-critical fields (rates live on page
                    2). Eircode is NOT asked here — the estimate captures it and
                    Edit has it (Cal: stop asking twice). */}
                {!editingConfirm && (bill.unitRate == null || !bill.annualKwh) && (
                  <SurveySection tone="pop" icon={<Info />} title="The bill didn't show these"
                    hint="Ask on the call or check page 2 of the bill. The money needs them.">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {bill.unitRate == null && (
                        <div>
                          <Label htmlFor="current_tariff" className="text-xs">Day rate (€/kWh)</Label>
                          <Input {...register('current_tariff')} type="number" step="0.01" inputMode="decimal" placeholder="0.35" className="w-full mt-1.5 h-control" />
                        </div>
                      )}
                      {!bill.annualKwh && (
                        <div>
                          <Label htmlFor="annual_consumption_kwh" className="text-xs">Annual usage (kWh)</Label>
                          <Input {...register('annual_consumption_kwh')} type="number" inputMode="numeric" placeholder="e.g. 4,500" className="w-full mt-1.5 h-control" />
                        </div>
                      )}
                    </div>
                  </SurveySection>
                )}
              </>
            ) : (
              <>
                <SurveySection tone="tech" icon={<Zap />} title="Their electricity, from the call"
                  hint="Ask for a recent bill figure. Either number seeds the estimate; both is better.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="monthly_bill" className="text-xs">Typical monthly bill (€)</Label>
                      <Input {...register('monthly_bill')} type="number" inputMode="decimal" placeholder="e.g. 180" className="w-full mt-1.5 h-control" />
                    </div>
                    <div>
                      <Label htmlFor="annual_consumption_kwh" className="text-xs">Annual usage (kWh)</Label>
                      <Input {...register('annual_consumption_kwh')} type="number" inputMode="numeric" placeholder="e.g. 4,500" className="w-full mt-1.5 h-control" />
                    </div>
                    <div>
                      <Label htmlFor="current_tariff" className="text-xs">Day rate (€/kWh)</Label>
                      <Input {...register('current_tariff')} type="number" step="0.01" inputMode="decimal" placeholder="0.35" className="w-full mt-1.5 h-control" />
                    </div>
                    <div>
                      <Label htmlFor="day_night_meter" className="text-xs">Meter</Label>
                      <Select onValueChange={(v) => setValue('day_night_meter', v)} value={watch('day_night_meter')}>
                        <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Single or day / night" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single rate</SelectItem>
                          <SelectItem value="day_night">Day / night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SurveySection>
                <SurveySection tone="tech" icon={<MapPin />} title="Where's the property?"
                  hint="Eircode fills the address and drops the pin. Grab it on the call.">
                  <EircodeAddressLookup
                    value={leadData?.address || ''}
                    onChange={(address) => {
                      if (!address || !leadData) return;
                      if (isDemoMode()) { setLeadData({ ...leadData, address }); return; }
                      supabase.from('leads').update({ address }).eq('id', leadId)
                        .then(() => setLeadData({ ...leadData, address }));
                    }}
                    showMap={true}
                  />
                </SurveySection>
              </>
            )}
          </div>
        );
      }

      case 2: // Occupancy — THE hero. Asked, not ticked. Drives self-consumption → savings.
        return (
          <div className="space-y-3">
            <SurveySection tone="deposit" icon={<Users />} title="Who's in the home, and who's around in the day?"
              hint="The single biggest lever on the savings. It sets how much solar gets used on the spot instead of exported.">
              {/* Building type sits here (not asked twice): it frames who is around in the day and picks the grant scheme */}
              <div className="mb-4">
                <Label className="text-xs">Building</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {[['residential', 'Home'], ['commercial', 'Commercial / farm']].map(([v, label]) => {
                    const active = (watch('property_type') || 'residential') === v;
                    return (
                      <button key={v} type="button" onClick={() => setValue('property_type', v)}
                        className={cn('h-control rounded-control text-sm font-medium border transition-colors',
                          active ? 'bg-doc-deposit/15 border-doc-deposit text-doc-deposit'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground')}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="household_occupants" className="text-xs">
                    {(watch('property_type') || 'residential') === 'commercial' ? 'People on site?' : 'How many people live here?'}
                  </Label>
                  <Select onValueChange={(v) => setValue('household_occupants', v)} value={watch('household_occupants')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['1', '2', '3', '4', '5+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="home_during_day" className="text-xs">Anyone home during the day?</Label>
                  <Select onValueChange={(v) => setValue('home_during_day', v)} value={watch('home_during_day')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="WFH? Kids? Retired?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usually">Yes, usually home (WFH / retired)</SelectItem>
                      <SelectItem value="mixed">Some days / part-time</SelectItem>
                      <SelectItem value="out">No, out at work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {watch('home_during_day') && (
                <p className="mt-2.5 text-xs leading-body text-doc-deposit bg-doc-deposit/10 rounded-control px-3 py-2">
                  {watch('home_during_day') === 'out'
                    ? 'Out all day, so the evening is the usage peak. A battery carries the day\'s sun to it. Strongest battery case.'
                    : watch('home_during_day') === 'usually'
                      ? 'Home through the day, so most of the solar is used on the spot. The panels do the heavy lifting. Lead with the yearly saving.'
                      : 'Home part of the day, so a good share is used directly. A battery is a fair add for evening cover.'}
                </p>
              )}
            </SurveySection>
          </div>
        );

      case 3: // The goal — the "why". Natural follow-on from occupancy.
        return (
          <div className="space-y-3">
            <SurveySection tone="deposit" icon={<Target />} title="What's the goal here?"
              hint="Cut the bill, charge an EV, hot water, batteries for backup. What matters to them.">
              <div className="space-y-2">
                {[
                  { key: 'battery_storage', icon: <Battery className="size-4 text-doc-deposit" />, label: 'Battery / backup', desc: "Hold the day's solar for the evening or an outage" },
                  { key: 'hot_water_diverter', icon: <Droplets className="size-4 text-tech" />, label: 'Hot-water diverter', desc: 'Eddi / iBoost, heats water with excess solar' },
                  { key: 'ev_charger', icon: <Car className="size-4 text-primary" />, label: 'EV charger', desc: 'Charge the car off the roof' },
                ].map(w => (
                  <label key={w.key} className="flex items-center gap-3 p-2.5 rounded-control border border-border hover:border-tech/40 transition-colors cursor-pointer">
                    {w.icon}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{w.label}</div>
                      <div className="text-2xs text-muted-foreground">{w.desc}</div>
                    </div>
                    <Switch checked={watch(w.key as keyof SurveyFormData) as boolean || false} onCheckedChange={c => setValue(w.key as keyof SurveyFormData, c)} />
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Label htmlFor="customer_priorities" className="text-xs">Anything else that matters to them?</Label>
                <Textarea {...register('customer_priorities')} rows={2} className="w-full mt-1.5"
                  placeholder="Savings, energy independence, carbon, backup during outages…" />
              </div>
            </SurveySection>
          </div>
        );

      case 4: // Roof + shading — "looking at the house". Roof + environmental merged.
        return (
          <div className="space-y-3">
            {/* SURVEY-PHOTO INTELLIGENCE — read the roof from a photo and fill
                the fields below; the surveyor confirms. (analyse-roof-photo) */}
            <RoofPhotoRead onApply={(f) => {
              if (f.orientation) setValue('roof_orientation', f.orientation);
              if (f.pitch) setValue('roof_pitch', f.pitch);
              if (f.shading) setValue('shading_analysis', f.shading);
              if (f.obstructions) setValue('nearby_obstructions', f.obstructions);
            }} />
            <SurveySection tone="tech" icon={<Home />} title="The roof">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="roof_type" className="text-xs">Roof type</Label>
                  <Select onValueChange={(v) => setValue('roof_type', v)} value={watch('roof_type')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Pitched / flat / mixed" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pitched">Pitched</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.roof_type && <p className="text-xs text-destructive mt-1">{errors.roof_type.message}</p>}
                </div>
                <div>
                  <Label htmlFor="roof_condition" className="text-xs">Condition</Label>
                  <Select onValueChange={(v) => setValue('roof_condition', v)} value={watch('roof_condition')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.roof_condition && <p className="text-xs text-destructive mt-1">{errors.roof_condition.message}</p>}
                </div>
                <div>
                  <Label htmlFor="roof_orientation" className="text-xs">Orientation</Label>
                  <Select onValueChange={(v) => setValue('roof_orientation', v)} value={watch('roof_orientation')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Which way it faces" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South">South</SelectItem>
                      <SelectItem value="South-East">South-East</SelectItem>
                      <SelectItem value="South-West">South-West</SelectItem>
                      <SelectItem value="East">East</SelectItem>
                      <SelectItem value="West">West</SelectItem>
                      <SelectItem value="North">North (not ideal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="roof_pitch" className="text-xs">Pitch (degrees)</Label>
                  <Input {...register('roof_pitch')} type="number" step="1" placeholder="e.g. 30" className="w-full mt-1.5 h-control" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="roof_material" className="text-xs">Material</Label>
                  <Select onValueChange={(v) => setValue('roof_material', v)} value={watch('roof_material')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Slate / tile / metal…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Concrete tiles">Concrete tiles</SelectItem>
                      <SelectItem value="Clay tiles">Clay tiles</SelectItem>
                      <SelectItem value="Slate">Slate</SelectItem>
                      <SelectItem value="Metal">Metal</SelectItem>
                      <SelectItem value="Felt/Membrane">Felt / membrane (flat)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SurveySection>

            <SurveySection tone="tech" icon={<Sun />} title="Shading & obstructions">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="shading_analysis" className="text-xs">Shading</Label>
                  <Select onValueChange={(v) => setValue('shading_analysis', v)} value={watch('shading_analysis')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="How much shade hits the roof" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">No shading</SelectItem>
                      <SelectItem value="Minimal">Minimal (early / late only)</SelectItem>
                      <SelectItem value="Partial">Partial (some hours)</SelectItem>
                      <SelectItem value="Significant">Significant (major obstruction)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nearby_obstructions" className="text-xs">Obstructions</Label>
                  <Textarea {...register('nearby_obstructions')} rows={2} className="w-full mt-1.5"
                    placeholder="Trees, chimneys, dormers, neighbouring buildings…" />
                </div>
              </div>
            </SurveySection>

            <SurveySection tone="tech" icon={<Camera />} title="Snap the roof while you're here"
              hint="You're looking at it now. Grab the two roof shots so nobody has to come back for them.">
              <GuidedPhotoCapture leadId={leadId} existingPhotos={photoList} onPhotosChange={handlePhotos}
                photoIds={['roof_overview', 'roof_closeup']} showExtras={false} />
            </SurveySection>
          </div>
        );

      case 5: // Electrical — kept thin. The gear lives in the Design Studio, not here.
        return (
          <div className="space-y-3">
            <SurveySection tone="tech" icon={<Zap />} title="The electrics"
              hint="What the inverter has to work with. Three quick reads, no gear picking.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="electrical_panel_capacity" className="text-xs">Main fuse / panel capacity</Label>
                  <Select onValueChange={(value) => setValue('electrical_panel_capacity', value)} value={watch('electrical_panel_capacity')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select capacity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40A">40A (older property)</SelectItem>
                      <SelectItem value="63A">63A (standard)</SelectItem>
                      <SelectItem value="80A">80A (modern)</SelectItem>
                      <SelectItem value="100A">100A (large property)</SelectItem>
                      <SelectItem value="3-phase">3-phase (commercial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grid_connection_type" className="text-xs">Grid connection</Label>
                  <Select onValueChange={(value) => setValue('grid_connection_type', value)} value={watch('grid_connection_type')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single phase">Single phase</SelectItem>
                      <SelectItem value="Three phase">Three phase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="meter_location" className="text-xs">Where's the meter / board?</Label>
                  <Input {...register('meter_location')} placeholder="e.g. outside front, utility room, garage" className="w-full mt-1.5 h-control" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-body">
                Panels, inverter and battery are chosen in the Design Studio, on the real roof. This step just reads the supply.
              </p>
            </SurveySection>

            <SurveySection tone="tech" icon={<Camera />} title="Snap the board and meter"
              hint="Right in front of you at the fuse board. Two shots the fitter and the ESB form both need.">
              <GuidedPhotoCapture leadId={leadId} existingPhotos={photoList} onPhotosChange={handlePhotos}
                photoIds={['electrical_panel', 'meter']} showExtras={false} />
            </SurveySection>
          </div>
        );

      case 6: // Installation — the fitter's prep pack. Address is captured on step 1, not here.
        return (
          <div className="space-y-3">
            <SurveySection tone="pop" icon={<Settings />} title="Getting a crew on the roof"
              hint="What the fitter needs to know before the van leaves. Fewer surprises, fewer second visits.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="property_storeys" className="text-xs">Storeys</Label>
                  <Select onValueChange={(value) => setValue('property_storeys', value)} value={watch('property_storeys')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select storeys" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 storey (bungalow)</SelectItem>
                      <SelectItem value="2">2 storey</SelectItem>
                      <SelectItem value="3">3+ storey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scaffolding_required" className="text-xs">Scaffolding</Label>
                  <Select onValueChange={(value) => setValue('scaffolding_required', value)} value={watch('scaffolding_required')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select option" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Full scaffolding</SelectItem>
                      <SelectItem value="partial">Partial, some walls</SelectItem>
                      <SelectItem value="no">Ladder access is fine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="attic_access" className="text-xs">Attic access</Label>
                  <Select onValueChange={(value) => setValue('attic_access', value)} value={watch('attic_access')}>
                    <SelectTrigger className="w-full mt-1.5 h-control"><SelectValue placeholder="Select access type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy hatch access</SelectItem>
                      <SelectItem value="difficult">Difficult access</SelectItem>
                      <SelectItem value="none">No attic access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="parking_situation" className="text-xs">Parking</Label>
                  <Input {...register('parking_situation')} placeholder="e.g. driveway, street parking" className="w-full mt-1.5 h-control" />
                </div>
              </div>
              <button type="button" onClick={() => setValue('existing_solar', !watch('existing_solar'))}
                className={cn('mt-3 w-full flex items-center justify-between rounded-control border px-3.5 h-control text-sm transition-colors',
                  watch('existing_solar') ? 'bg-pop-subtle border-pop text-pop' : 'bg-background border-border text-muted-foreground hover:text-foreground')}>
                <span className="flex items-center gap-2"><Sun className="size-4" /> Existing solar already on the roof</span>
                <Switch checked={watch('existing_solar') || false} onCheckedChange={(c) => setValue('existing_solar', c)} className="pointer-events-none" />
              </button>
            </SurveySection>

            <SurveySection tone="pop" icon={<Info />} title="Notes for the fitter"
              hint="Anything the crew should read before they knock. Optional, but it saves a phone call on the day.">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="customer_availability" className="text-xs">When suits the customer?</Label>
                  <Textarea {...register('customer_availability')} placeholder="Best days and times, any dates to avoid" rows={2} className="w-full mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="access_notes" className="text-xs">Getting in</Label>
                  <Textarea {...register('access_notes')} placeholder="Gate codes, dog in the garden, ring the doorbell" rows={2} className="w-full mt-1.5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="installation_notes" className="text-xs">On the job</Label>
                    <Textarea {...register('installation_notes')} placeholder="Cable routing, panel layout preferences" rows={2} className="w-full mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="special_requirements" className="text-xs">Permits / planning</Label>
                    <Textarea {...register('special_requirements')} placeholder="Planning permission, conservation area, estate rules" rows={2} className="w-full mt-1.5" />
                  </div>
                </div>
              </div>
            </SurveySection>

            <SurveySection tone="pop" icon={<Camera />} title="Snap the run and the access"
              hint="While you walk it: the attic, where the inverter goes, and how the crew gets in.">
              <GuidedPhotoCapture leadId={leadId} existingPhotos={photoList} onPhotosChange={handlePhotos}
                photoIds={['attic', 'inverter_location', 'access_point']} showExtras={false} />
            </SurveySection>
          </div>
        );

      case 7: { // The pack — everything snapped on the walk, in one place, plus extras
        const shotFor = (id: string) => photoList.find(p => p.type === id);
        return (
          <div className="space-y-3">
            <SurveySection tone="pop" icon={<Camera />} title="The photo pack"
              hint="Everything you snapped along the way, in one place. Green means it's in; red still needs a shot.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REQUIRED_PHOTOS.map(p => {
                  const got = shotFor(p.id);
                  return (
                    <div key={p.id} className={cn('flex items-center gap-2 rounded-control border px-2.5 py-2',
                      got ? 'border-doc-deposit/40 bg-doc-deposit/5'
                        : p.required ? 'border-pop/30 bg-pop-subtle/40' : 'border-border bg-card')}>
                      {got
                        ? <img src={got.url} alt={p.label} className="size-9 rounded object-cover shrink-0" />
                        : <span className={cn('size-9 rounded grid place-items-center shrink-0',
                            p.required ? 'bg-pop-subtle text-pop' : 'bg-muted text-muted-foreground')}><Camera className="size-4" /></span>}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{p.label}</p>
                        <p className={cn('text-2xs', got ? 'text-doc-deposit' : p.required ? 'text-pop' : 'text-muted-foreground')}>
                          {got ? 'Captured' : p.required ? 'Needed' : 'Optional'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <GuidedPhotoCapture leadId={leadId} existingPhotos={photoList} onPhotosChange={handlePhotos}
                  photoIds={[]} showHeader={false} />
              </div>
            </SurveySection>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div ref={surveyContainerRef} className="space-y-4 pb-24">
      {/* Progress Indicator - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <SurveyStepProgress 
          currentStep={currentStep} 
          completedSteps={getCompletedSteps()}
          onStepChange={setCurrentStep}
          showNavigation={false}
        />
      </div>

      {/* Step content. Calm, quick fade with a small rise — no big sideways
          slide, no long wait-gap that reads as a dim flash between steps. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Footer nav, cal.com style: a clean Back on the left, a subtle Save, and
          one prominent primary — Next through the steps, Create proposal at the end.
          The step count and % live in the top stepper, so this bar stays calm. */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50 pb-safe">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
            disabled={currentStep <= 1}
            className="h-11 px-3 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleSubmit((data) => onSubmit(data, false))}
              disabled={loading}
              className="h-11 px-3 text-muted-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save</>}
            </Button>
            {currentStep < SURVEY_STEPS.length ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} className="h-11 px-5 font-semibold">
                Next: {SURVEY_STEPS[currentStep]?.shortLabel}
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : onCreateProposal ? (
              <Button
                type="button"
                onClick={handleCompleteAndCreateProposal}
                disabled={loading || !completionStatus.isComplete}
                className="h-11 px-5 font-semibold"
                title={!completionStatus.isComplete ? `Complete all required fields (${completionStatus.completionPercentage}%) to create a proposal` : undefined}
              >
                <FileText className="mr-1.5 h-4 w-4" /> Create proposal
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
