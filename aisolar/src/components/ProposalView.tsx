/**
 * ProposalView — the close, rebuilt as a crown jewel.
 *
 * The proposal is the ONE document the customer compares against two other
 * quotes, so it has to look like nobody else's: framed in the doc-proposal
 * yellow, opened by an inverted charcoal masthead, and grounded in the
 * customer's own bill (the canonical 21-point read, dense) so every number
 * below it is visibly theirs — not an average home's.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sun, Zap, Award, FileText, CheckCircle2, Shield,
  Calculator, MapPin, Circle, Send, Plus,
} from 'lucide-react';
import { type DummyLead } from '@/lib/dummyData';
import { calculateSEAI, seaiPropertyType, seaiGrantEligibility } from '@/lib/seaiPipeline';
import { selfConsumptionFromOccupancy, computeQuote, ratesFromIntake } from '@/lib/leadIntake';
import { moneyStory } from '@/lib/proposalNarrative';
import { getProduct } from '@/config/productCatalog';
import BillReadPanel, { billReadFromIntake } from '@/components/bill/BillReadPanel';
import ProductSnapshot from '@/components/proposal/ProductSnapshot';
import DocumentActions from '@/components/consultant/DocumentActions';

/** The plain-English "ah, that makes sense" line for a roof orientation. */
function roofPointer(orientation?: string): string {
  if (!orientation) return 'The array goes on the best-lit pitch, confirmed at the survey.';
  if (/south/i.test(orientation)) return 'The sun sits on this pitch longest through the day, so it makes the most power at the times the house is drawing the most.';
  if (/east|west/i.test(orientation)) return 'This pitch catches the morning and evening sun, spreading generation across the hours the house is busiest.';
  if (/north/i.test(orientation)) return 'North is the weaker pitch, so the design leans on the better-lit roof faces and sizes for it with that in mind.';
  return 'The array goes where this roof catches the most sun, measured at the survey.';
}

const eurFmt = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function ProposalView({ lead }: { lead: DummyLead }) {
  const navigate = useNavigate();
  const proposal = lead.proposal;
  const survey = lead.survey;
  // The financial lever: occupancy pre-sets it, the consultant owns it. Same
  // self-consumption maths as the customer proposal, so the two never diverge.
  const surveySelfConsumption = selfConsumptionFromOccupancy({
    occupants: survey?.household_occupants,
    homeDuringDay: survey?.home_during_day,
    hasBattery: !!proposal?.battery_model,
  });
  const [selfConsumption, setSelfConsumption] = useState(surveySelfConsumption);
  // Versioning — append-only, never delete (the kernel's own law applied to the
  // customer's document). If the customer changes plans, the consultant renders
  // a NEW version; every earlier one stays on file exactly as it was sent.
  // Each version SNAPSHOTS its numbers at creation — a sent document never
  // changes retroactively when rates or occupancy edits move the live figures.
  const [versions, setVersions] = useState<Array<{ n: number; status: string; created: string; snapshot?: { annualSavings: number; netCost: number; paybackYears: number } }>>(
    () => [{
      n: 1,
      status: proposal?.status ?? 'draft',
      created: proposal?.sent_date ?? new Date().toISOString(),
      snapshot: proposal ? { annualSavings: proposal.annual_savings, netCost: proposal.net_cost, paybackYears: proposal.payback_years } : undefined,
    }],
  );
  if (!proposal) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No proposal created yet for this lead.</div>;
  }
  const overridden = Math.abs(selfConsumption - surveySelfConsumption) > 0.005;
  const activeVersion = versions[versions.length - 1];
  const revise = () => {
    const next = activeVersion.n + 1;
    setVersions(v => [...v, {
      n: next, status: 'draft', created: new Date().toISOString(),
      snapshot: { annualSavings, netCost: proposal.net_cost, paybackYears },
    }]);
    toast.success(`Version ${next} started`, {
      description: `Version ${next - 1} stays on file. Nothing is deleted. Edit the new render, then gate-check and send it.`,
    });
  };
  // ONE quote engine — identical maths to the studio, the customer proposal and
  // the portal header. The stored proposal net_cost stays authoritative (the
  // contract number); everything else recomputes from the same inputs.
  const propertyType = seaiPropertyType((survey as Record<string, unknown>)?.property_type as string ?? (lead.intake as Record<string, unknown>)?.property_type as string);
  const quote = computeQuote({
    systemSizeKw: proposal.system_size_kw,
    batteryKwh: proposal.battery_model ? ((survey as Record<string, unknown>)?.confirmed_battery_kwh as number ?? 5) : 0,
    roof: {
      orientation: (survey as Record<string, unknown>)?.roof_orientation as string ?? (survey as Record<string, unknown>)?.confirmed_roof_orientation as string,
      pitchDeg: (survey as Record<string, unknown>)?.roof_pitch as number ?? (survey as Record<string, unknown>)?.confirmed_roof_pitch as number,
      shading: (survey as Record<string, unknown>)?.shading as string ?? (survey as Record<string, unknown>)?.confirmed_shading as string,
    },
    occupancy: { occupants: survey?.household_occupants, homeDuringDay: survey?.home_during_day },
    selfConsumptionOverride: overridden ? selfConsumption : null,
    rates: ratesFromIntake(lead.intake as Record<string, unknown>),
    annualUseKwh: lead.annual_kwh,
    propertyType,
    netCostOverride: proposal.net_cost,
  });
  const production = quote.productionKwh;
  const annualSavings = quote.annualSavings;
  const paybackYears = quote.paybackYears || proposal.payback_years;
  const twentyYear = quote.twentyYearBenefit;
  const story = moneyStory({ annualSavings, netCost: proposal.net_cost, paybackYears, twentyYearBenefit: twentyYear, monthlyBill: lead.monthly_bill });

  const seai = calculateSEAI({
    systemSizeKw: proposal.system_size_kw,
    propertyType,
    installType: 'retrofit',
    annualKwhUsage: lead.annual_kwh || 0,
    annualProductionKwh: quote.productionKwh,
    selfConsumptionPct: quote.selfConsumption,
    netCost: proposal.net_cost,
  });

  // Grant eligibility — the proposal must not present the SEAI grant as certain
  // when the home can't claim it (post-2021 build / new build / no MPRN).
  const grantElig = seaiGrantEligibility({
    propertyType,
    installType: 'retrofit',
    yearBuilt: (lead.intake as Record<string, unknown>)?.year_built as string | number | undefined,
    mprn: lead.mprn,
  });

  const bill = billReadFromIntake(lead.intake as Record<string, unknown>, {
    monthlyBill: lead.monthly_bill,
    annualKwh: lead.annual_kwh,
    mprn: lead.mprn,
    accountName: lead.name,
    address: lead.address,
  });

  // The gear as real products (same catalogue the customer's copy reads), and
  // the roof from above, keyed to the eircode off their own bill.
  const panel = getProduct(proposal.panel_model, 'panel');
  const inverter = getProduct(proposal.inverter_model, 'inverter');
  const battery = proposal.battery_model ? getProduct(proposal.battery_model, 'battery') : null;
  const eircode = bill.eircode ?? lead.address?.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/)?.[0];
  const roofQuery = eircode ?? lead.address;

  const statusMeta = proposal.status === 'draft'
    ? { label: 'DRAFT', tone: 'bg-muted-foreground text-white' }
    : proposal.status === 'presented'
      ? { label: 'SENT', tone: 'bg-doc-contract text-white' }
      : { label: 'APPROVED', tone: 'bg-doc-deposit text-white' };

  return (
    /* The doc-proposal yellow frame — the proposal's colour, everywhere it appears */
    <div className="space-y-3 rounded-panel border-l-4 border-l-doc-proposal pl-3 -ml-3">
      {/* Masthead — inverted charcoal, the number that matters on the right */}
      <div className="rounded-panel bg-primary text-primary-foreground shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 mb-2 ${statusMeta.tone}`}>{statusMeta.label}</span>
            <h2 className="text-xl font-bold">Solar Proposal</h2>
            <p className="text-sm text-primary-foreground/70">Prepared for {lead.name} · {lead.address}</p>
            <p className="text-xs text-primary-foreground/60 mt-1">
              Proposal #{proposal.id} · <span className="font-semibold text-primary-foreground/80">v{activeVersion.n}</span>
              {versions.length > 1 && <span> · {versions.length - 1} earlier kept</span>}
              {' · '}{proposal.sent_date ? `Sent ${new Date(proposal.sent_date).toLocaleDateString('en-IE')}` : 'Not sent'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold tabular-nums">{proposal.system_size_kw} kWp</div>
            <div className="text-xs text-primary-foreground/70">{proposal.panel_count} panels</div>
            <div className="mt-2 text-lg font-semibold text-doc-deposit tabular-nums">{eurFmt(annualSavings)}<span className="text-xs font-normal text-primary-foreground/60"> saved / yr</span></div>
          </div>
        </div>
      </div>

      {/* Their bill, in full — the reason every number below is theirs */}
      <BillReadPanel bill={bill} dense />

      {/* The roof from above — the moment it stops being an average home and
          becomes THEIR house. Keyed to the eircode off their own bill. */}
      {roofQuery && (
        <div className="rounded-panel bg-card shadow-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <MapPin className="size-4 text-tech" />
            <span className="text-sm font-semibold">The roof, from above</span>
            {eircode && <span className="ml-auto text-2xs text-muted-foreground">{eircode}</span>}
          </div>
          <iframe
            title="Property satellite view"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(roofQuery)}&t=k&z=19&output=embed`}
            className="w-full h-52 border-0"
            loading="lazy"
          />
          <p className="px-4 py-2 text-xs text-muted-foreground leading-ui">
            {roofPointer(survey?.roof_orientation)} <span className="text-2xs">Exact panel layout is measured at the survey.</span>
          </p>
        </div>
      )}

      {/* System design — the gear as real products, with the datasheet that
          rides to the BER assessor. Same catalogue the customer's copy reads. */}
      <div className="rounded-panel bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sun className="h-4 w-4 text-primary" /> Designed for this roof</h3>
        <div className="grid gap-2.5">
          {panel && <ProductSnapshot product={panel} qty={proposal.panel_count} dense />}
          {inverter && <ProductSnapshot product={inverter} dense />}
          {battery && <ProductSnapshot product={battery} dense />}
        </div>
        {survey && (
          <div className="mt-2.5 p-3 bg-muted/30 rounded-control">
            <div className="label-micro">Roof, surveyed on site</div>
            <div className="font-semibold text-sm capitalize">{survey.roof_type} · {survey.roof_orientation} · {survey.roof_pitch}° · shading {survey.shading}</div>
          </div>
        )}
      </div>

      {/* The money */}
      <div className="rounded-panel bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Investment & savings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Net cost', value: eurFmt(proposal.net_cost), sub: `after ${eurFmt(proposal.seai_grant)} grant`, tone: '' },
            { label: 'Annual savings', value: eurFmt(annualSavings), tone: 'text-doc-deposit' },
            { label: 'Payback', value: `${paybackYears} yrs`, tone: '' },
            { label: '20-yr savings', value: eurFmt(twentyYear), tone: 'text-doc-deposit' },
          ].map(m => (
            <div key={m.label} className="p-3 bg-muted/30 rounded-control">
              <div className="label-micro">{m.label}</div>
              <div className={`text-xl font-bold tabular-nums ${m.tone || 'text-foreground'}`}>{m.value}</div>
              {m.sub && <div className="text-[11px] text-muted-foreground">{m.sub}</div>}
            </div>
          ))}
        </div>
        {/* The WOW — the figures said plainly, the way the customer reads them. */}
        <div className="mt-3 rounded-control bg-doc-deposit/[0.07] border border-doc-deposit/20 p-3">
          <p className="text-sm font-medium text-foreground leading-body">{story.lead}</p>
          <p className="text-xs text-muted-foreground leading-body mt-1">{story.horizon}</p>
        </div>
        <div className="mt-3 p-2.5 bg-muted/30 rounded-control text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Gross cost</span><span className="font-medium tabular-nums">{eurFmt(proposal.gross_cost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">SEAI grant</span><span className="font-medium text-tech tabular-nums">−{eurFmt(proposal.seai_grant)}</span></div>
          <div className="flex justify-between font-bold border-t border-border pt-1"><span>Net investment</span><span className="tabular-nums">{eurFmt(proposal.net_cost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Deposit (30%)</span><span className="text-doc-deposit font-medium tabular-nums">{eurFmt(proposal.net_cost * 0.3)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Balance (70%)</span><span className="tabular-nums">{eurFmt(proposal.net_cost * 0.7)}</span></div>
        </div>
        {!grantElig.eligible && (
          <div className="mt-3 rounded-control border border-doc-proposal/40 bg-doc-proposal/5 p-2.5 text-2xs leading-snug">
            <span className="font-semibold text-doc-proposal">SEAI grant may not apply — </span>
            <span className="text-muted-foreground">{grantElig.blockers.join(' · ')}. Net investment above assumes the {eurFmt(proposal.seai_grant)} grant; without it it's <span className="font-semibold text-foreground">{eurFmt(proposal.net_cost + proposal.seai_grant)}</span>. Confirm eligibility before this proposal goes out.</span>
          </div>
        )}

        {/* The lever — occupancy pre-sets it, the consultant owns it. Simple. */}
        <div className="mt-3 rounded-control border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">
              {Math.round(selfConsumption * 100)}% used at home
              <span className="font-normal text-muted-foreground"> · this drives the savings above</span>
            </p>
            {overridden && (
              <button onClick={() => setSelfConsumption(surveySelfConsumption)} className="text-2xs font-semibold text-tech hover:underline">Reset to survey</button>
            )}
          </div>
          <input type="range" min={0.25} max={0.9} step={0.01} value={selfConsumption}
            onChange={e => setSelfConsumption(Number(e.target.value))}
            aria-label="How much of the solar is used at home"
            className="mt-2 w-full accent-primary cursor-pointer" />
          <p className="mt-1 text-2xs text-muted-foreground">
            {survey?.home_during_day
              ? `From the survey: ${survey.household_occupants === '5+' ? 'five or more' : (survey.household_occupants ?? 'the household')} at home, ${survey.home_during_day === 'usually' ? 'someone usually in during the day' : survey.home_during_day === 'mixed' ? 'in part of the day' : 'out at work'}. Nudge it if you know their pattern better.`
              : 'No occupancy survey yet, so this uses the default. Nudge it, or confirm it on the call.'}
          </p>
        </div>
      </div>

      {/* The case — the proposal ARGUES, it does not just quote */}
      <div className="rounded-panel bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Why this system, for this home</h3>
        <div className="text-xs leading-relaxed text-muted-foreground space-y-2">
          <p>
            {lead.annual_kwh
              ? <>Your home uses about <span className="font-semibold text-foreground tabular-nums">{lead.annual_kwh.toLocaleString()} kWh</span> a year, and this <span className="font-semibold text-foreground">{proposal.system_size_kw} kWp</span> system is sized to that, not to an average home.</>
              : <>This <span className="font-semibold text-foreground">{proposal.system_size_kw} kWp</span> system is sized to your own usage and roof, not to an average home.</>}
            {' '}Every figure above is built from your bill, so it holds up when you set it beside another quote.
          </p>
          {survey?.roof_orientation && (
            <p>
              A <span className="font-semibold text-foreground capitalize">{survey.roof_orientation}</span> roof {
                /south/i.test(survey.roof_orientation) ? 'gives the strongest midday generation, which is when most homes draw the most power.'
                  : /east|west/i.test(survey.roof_orientation) ? 'spreads generation across the morning and evening, so more of it is used in the house rather than exported.'
                    : 'generates less than a south pitch, and the system is sized with that accounted for.'
              }
            </p>
          )}
          <p>
            {proposal.battery_model
              ? <>The {proposal.battery_model} earns its place: it holds the day's generation for the evening, so more of what you make replaces units you would otherwise buy back at the higher rate.</>
              : <>A battery is left out of this design on purpose. On your usage the panels pay back faster without one, and a battery can be added later if your evening use grows.</>}
          </p>
        </div>
      </div>

      {/* Compliance papertrail — SEAI tracked (never "submitted for you") */}
      <div className="rounded-panel bg-card shadow-card p-4">
        <h3 className="font-semibold text-sm mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Compliance papertrail</h3>
        <p className="text-xs text-muted-foreground mb-3">Pre-populated from survey + install data, linked to the customer portal.</p>
        <div className="space-y-2">
          <ComplianceItem
            org="SEAI" label="Solar Electricity Grant" icon={Award}
            status={lead.workflow_stage === 'completed' ? 'submitted' : ['approved','deposit_paid','install_scheduled','installing','installed','final_paid'].includes(lead.workflow_stage) ? 'in_progress' : 'pending'}
            details={`Grant: ${eurFmt(proposal.seai_grant)} · MPRN: ${lead.mprn} · System: ${proposal.system_size_kw}kWp`}
            prePopulated={['MPRN', 'System size', 'Invoice (auto)', 'Install photos (from checklist)']}
          />
          <ComplianceItem
            org="ESB" label="NC6 Microgen Export" icon={Zap}
            status={['installed','final_paid','completed'].includes(lead.workflow_stage) ? 'submitted' : 'pending'}
            details={`Export tariff: €0.14/kWh · Connection: ${survey?.confirmed_inverter_type || 'Single phase'}`}
            prePopulated={['Inverter type (from survey)', 'System size', 'Installation date']}
          />
          <ComplianceItem
            org="RECI" label="Electrical sign-off" icon={Shield}
            status={['installed','final_paid','completed'].includes(lead.workflow_stage) ? 'filed' : 'pending'}
            details={`RECI cert required for commissioning · Isolator: ${lead.assignment ? 'installed' : 'pending'}`}
            prePopulated={['Isolator installed (from checklist)', 'RCD tested (from checklist)', 'Earth bond (from checklist)', 'SPD installed (from checklist)']}
          />
        </div>
      </div>

      {/* The consultant's close: the whole window in one place, gate-checked,
          then one deliberate send (draft-first — this click IS the approval). */}
      <GateCheck lead={lead} panel={panel} inverter={inverter} versions={versions} onRevise={revise} />

      {/* Review-and-act: bottleneck intelligence + notify, not print/download */}
      <DocumentActions lead={lead} forwardLabel="Open in LeadFlow" forwardIcon={FileText}
        onForward={() => navigate(`/lead-flow/${lead.id}`)} />
    </div>
  );
}

/**
 * GateCheck — the consultant's total window before send.
 *
 * The customer's close is a couple of buttons and a secured gateway (accept +
 * deposit). The consultant's close is this: everything in the pack laid out in
 * the order it's built — survey feeds the submission, financials come off the
 * bill, the gear and its datasheets are attached, compliance is pre-filled —
 * each with a green tick or an honest gap and a one-tap way to close it. Then
 * ONE send. Nothing goes to the customer on its own; this click is the sign-off.
 */
function GateCheck({ lead, panel, inverter, versions, onRevise }: {
  lead: DummyLead;
  panel: ReturnType<typeof getProduct>;
  inverter: ReturnType<typeof getProduct>;
  versions: Array<{ n: number; status: string; created: string }>;
  onRevise: () => void;
}) {
  const navigate = useNavigate();
  const p = lead.proposal!;
  const survey = lead.survey;
  const hasOccupancy = !!survey?.home_during_day;
  const sent = ['proposal_sent', 'approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed'].includes(lead.workflow_stage);
  const first = lead.name.split(' ')[0];

  const checks: Array<{ ok: boolean; label: string; detail: string; fix?: { label: string; go: () => void } }> = [
    {
      ok: !!survey,
      label: 'Survey on file',
      detail: survey
        ? `${survey.roof_type} · ${survey.roof_orientation} · ${survey.available_area_m2} m². Roof data that carries to the SEAI and NC6 submission.`
        : 'No survey yet. It captures the roof detail the final submission needs.',
      fix: survey ? undefined : { label: 'Book survey', go: () => navigate(`/lead-flow/${lead.id}`) },
    },
    {
      ok: hasOccupancy,
      label: 'Occupancy captured',
      detail: hasOccupancy
        ? 'Sets the self-consumption behind the savings figure, so the number is theirs, not a default.'
        : 'Not answered yet. Nudge the lever above or confirm it on the call so the savings are grounded.',
    },
    { ok: true, label: 'Financials set', detail: `${eurFmt(p.net_cost)} net · payback and 20-year benefit computed off their own bill` },
    {
      ok: !!(panel && inverter),
      label: 'Equipment + datasheets attached',
      detail: [
        panel ? `${p.panel_count} × ${panel.model}${panel.datasheet ? ' (datasheet ✓)' : ''}` : null,
        inverter?.model,
        p.battery_model,
      ].filter(Boolean).join(' · '),
    },
    { ok: true, label: 'Compliance pre-filled', detail: `SEAI · NC6 · RECI · MPRN ${lead.mprn} · ${p.system_size_kw} kWp` },
  ];
  const gaps = checks.filter(c => !c.ok).length;

  return (
    <div className="rounded-panel bg-card shadow-card border-l-4 border-l-doc-proposal p-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-doc-proposal" />
        <h3 className="font-semibold text-sm">Gate check &amp; send</h3>
        <span className="ml-auto text-2xs text-muted-foreground">
          {gaps === 0 ? 'All clear' : `${gaps} to confirm`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">The whole pack in the order it's built. Clear the gate, then send. Nothing reaches {first} until you do.</p>

      {/* Versions — append-only. Plans change; the old render is never deleted. */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {versions.map((v, idx) => {
          const isActive = idx === versions.length - 1;
          return (
            <span key={v.n}
              className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-2xs font-semibold ${isActive ? 'bg-doc-proposal-subtle text-doc-proposal' : 'bg-muted text-muted-foreground'}`}
              title={isActive ? 'The version you are working on' : 'Kept on file, exactly as sent'}>
              v{v.n}{isActive ? ' · editing' : ' · kept'}
            </span>
          );
        })}
        <button onClick={onRevise}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-2xs font-semibold text-tech hover:bg-tech-subtle transition-colors">
          <Plus className="h-3 w-3" /> Revise (new version)
        </button>
      </div>

      <div className="space-y-1.5">
        {checks.map(c => (
          <div key={c.label} className="flex items-start gap-2.5 p-2 rounded-control bg-muted/20">
            {c.ok
              ? <CheckCircle2 className="h-4 w-4 text-doc-deposit shrink-0 mt-0.5" />
              : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">{c.label}</div>
              <div className="text-2xs text-muted-foreground leading-ui">{c.detail}</div>
            </div>
            {c.fix && (
              <button onClick={c.fix.go} className="shrink-0 text-2xs font-semibold text-tech hover:underline mt-0.5">
                {c.fix.label}
              </button>
            )}
          </div>
        ))}
      </div>

      <Button
        className="mt-3 w-full h-control"
        variant={sent ? 'outline' : 'default'}
        onClick={() => toast.success(
          sent ? `Proposal re-sent to ${first}` : `Proposal sent to ${first}`,
          { description: gaps === 0 ? 'Gate check clear. Link is in their inbox and their portal.' : `Sent with ${gaps} item${gaps > 1 ? 's' : ''} still open, flagged on the lead.` },
        )}
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {sent ? `Re-send to ${first}` : gaps === 0 ? `Send to ${first}` : `Send to ${first} anyway`}
      </Button>
    </div>
  );
}

function ComplianceItem({ org, label, icon: Icon, status, details, prePopulated }: {
  org: string; label: string; icon: typeof Shield;
  status: 'pending' | 'in_progress' | 'submitted' | 'filed';
  details: string; prePopulated: string[];
}) {
  const statusMeta = {
    pending: { label: 'Pending', bg: 'bg-doc-proposal-subtle text-doc-proposal border-doc-proposal/30' },
    in_progress: { label: 'In progress', bg: 'bg-tech-subtle text-tech border-tech/30' },
    submitted: { label: 'Submitted', bg: 'bg-doc-contract-subtle text-doc-contract border-doc-contract/30' },
    filed: { label: 'Filed', bg: 'bg-doc-deposit-subtle text-doc-deposit border-doc-deposit/30' },
  }[status];

  return (
    <div className="p-3 bg-muted/20 rounded-control">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-control bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{org}</span>
            <span className="text-xs text-muted-foreground">· {label}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{details}</div>
        </div>
        <Badge variant="outline" className={`text-[11px] ${statusMeta.bg}`}>{statusMeta.label}</Badge>
      </div>
      <div className="pl-9 space-y-0.5">
        {prePopulated.map((field, i) => (
          <div key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-2.5 w-2.5 text-doc-deposit" />
            <span>{field}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
