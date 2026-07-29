/**
 * SchedulingTransparency — the owner watches the scheduling agents think.
 *
 * Cal's 28-Jul .note: "put this logic into the owner's interface… if the owner
 * clicks the agent he can see how it's programmed… show them its savings."
 * This is that, view-first: it runs the REAL brain (`scheduling.ts` +
 * `routeOptimize.ts`) on the live book and shows the PROPOSED plan + the savings
 * (km / min / €). The opposite of a black box — the exact "verify, don't trust"
 * move the whole kernel thesis rests on.
 *
 * Draft-never-send: the agent PROPOSES; the owner approves. Nothing here writes.
 *
 * Demo caveat (honest): the home base is a fixed depot until per-employee home
 * addresses land (Sweep 8); the geographic solve uses the gazetteer/haversine
 * estimate until Google Distance Matrix (Sweep 8). See SWEEP8_DB_WIRING.md.
 *
 * Skills: ui-ux-pro-max (family tokens, one purpose), stop-slop.
 */
import { useMemo, useState } from 'react';
import { CalendarClock, Route, Sparkles, TrendingDown, Info, Building2, CheckCircle2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { planSchedule, type PlannableJob } from '@/lib/scheduling';
import { optimiseRoute, coordsForAddress, type GeoPoint } from '@/lib/routeOptimize';
import type { DummyLead } from '@/lib/dummyData';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// Demo home base (Citywest depot, Dublin 24). Real per-employee home addresses
// come from Owner Settings in Sweep 8 — this is a stand-in so the maths is real.
const HOME: GeoPoint = { lat: 53.2915, lng: -6.4408 };
const HOME_LABEL = 'Depot · Citywest, Dublin 24 (demo base)';

// Cost model for the € figure — stated, not hidden (truth-pass).
const PER_KM = 0.55;      // fuel + wear
const PER_HOUR = 30;      // driver time

const toJobs = (leads: DummyLead[]): PlannableJob[] =>
  leads.map(l => ({ id: l.id, address: l.address, label: l.name.split(' ')[0] }));

function savingsFor(jobs: PlannableJob[]) {
  const stops = jobs.map(j => coordsForAddress(j.address)).filter((p): p is GeoPoint => !!p);
  if (stops.length < 2) return null;
  const r = optimiseRoute([HOME, ...stops], true);
  if (!r) return null;
  const euro = r.savedKm * PER_KM + (r.savedMin / 60) * PER_HOUR;
  return { ...r, euro };
}

export default function SchedulingTransparency({ leads, only }: { leads: DummyLead[]; only?: 'survey' | 'install' }) {
  const model = useMemo(() => {
    const surveyLeads = leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage));
    const installLeads = leads.filter(l => l.assignment && ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage));

    const surveyJobs = toJobs(surveyLeads);
    const installJobs = toJobs(installLeads);

    const surveyPlan = planSchedule(surveyJobs, { home: HOME, perDayCapacity: 3 });
    const installPlan = planSchedule(installJobs, { home: HOME, perDayCapacity: 1 });

    const surveySave = savingsFor(surveyJobs);
    const installSave = savingsFor(installJobs);

    const totalKm = (surveySave?.savedKm ?? 0) + (installSave?.savedKm ?? 0);
    const totalMin = (surveySave?.savedMin ?? 0) + (installSave?.savedMin ?? 0);
    const totalEuro = (surveySave?.euro ?? 0) + (installSave?.euro ?? 0);

    return { surveyPlan, installPlan, surveySave, installSave, totalKm, totalMin, totalEuro };
  }, [leads]);

  // Draft-never-send made real, view-first: the agent PROPOSES, the owner
  // APPROVES here. Approving is local/honest in the demo — no schedule is
  // written and nothing is sent (see the approved-state copy + SWEEP8 note).
  const [approved, setApproved] = useState({ survey: false, install: false });

  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });

  // When embedded in one agent's window (`only`), the headline reflects just that
  // planner's savings; standalone it sums both.
  const dispKm = only === 'survey' ? (model.surveySave?.savedKm ?? 0) : only === 'install' ? (model.installSave?.savedKm ?? 0) : model.totalKm;
  const dispMin = only === 'survey' ? (model.surveySave?.savedMin ?? 0) : only === 'install' ? (model.installSave?.savedMin ?? 0) : model.totalMin;
  const dispEuro = only === 'survey' ? (model.surveySave?.euro ?? 0) : only === 'install' ? (model.installSave?.euro ?? 0) : model.totalEuro;

  return (
    <div className="rounded-panel bg-card shadow-card overflow-hidden">
      {/* header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center size-9 rounded-control bg-tech/10 text-tech shrink-0"><CalendarClock className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">Scheduling agents — how they're programmed
              <span className="text-2xs font-normal text-muted-foreground inline-flex items-center gap-1"><Sparkles className="size-3 text-tech" /> view-first</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">The agent plans from your base, visits each job once (never doubles back), and proposes a draft — you approve. This is the live plan it would suggest right now.</p>
          </div>
        </div>
        {/* savings headline — the trust payoff */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-control border border-doc-deposit/30 bg-doc-deposit/5 p-2.5 text-center">
            <div className="text-lg font-bold text-doc-deposit tabular-nums leading-none">{dispKm.toFixed(0)}<span className="text-2xs font-medium"> km</span></div>
            <div className="text-2xs text-muted-foreground mt-1">saved vs unplanned</div>
          </div>
          <div className="rounded-control border border-doc-deposit/30 bg-doc-deposit/5 p-2.5 text-center">
            <div className="text-lg font-bold text-doc-deposit tabular-nums leading-none">{dispMin.toFixed(0)}<span className="text-2xs font-medium"> min</span></div>
            <div className="text-2xs text-muted-foreground mt-1">less driving</div>
          </div>
          <div className="rounded-control border border-doc-deposit/30 bg-doc-deposit/5 p-2.5 text-center">
            <div className="text-lg font-bold text-doc-deposit tabular-nums leading-none">≈{eur(dispEuro)}</div>
            <div className="text-2xs text-muted-foreground mt-1">per cycle</div>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1"><Info className="size-2.5 shrink-0" /> € at €{PER_KM.toFixed(2)}/km + {eur(PER_HOUR)}/hr driver time · from {HOME_LABEL}</p>
      </div>

      {/* the two planners */}
      <div className={only ? '' : 'grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border'}>
        {only !== 'install' && (
          <PlannerColumn
            title="Survey planner"
            who="Consultant · up to 3/day, a week ahead"
            plan={model.surveyPlan}
            save={model.surveySave}
            fmtDay={fmtDay}
            approved={approved.survey}
            onApprove={() => setApproved(a => ({ ...a, survey: true }))}
          />
        )}
        {only !== 'survey' && (
          <PlannerColumn
            title="Install planner"
            who="Installer · 1/day, a fortnight ahead"
            plan={model.installPlan}
            save={model.installSave}
            fmtDay={fmtDay}
            approved={approved.install}
            onApprove={() => setApproved(a => ({ ...a, install: true }))}
          />
        )}
      </div>

      {/* how it's programmed */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5"><Route className="size-3.5 text-tech" /> How it's programmed</div>
        <ul className="text-2xs text-muted-foreground space-y-1 leading-relaxed">
          <li>• Orders the run from your base with a nearest-neighbour + 2-opt solve — an open path that visits <strong>each job once, never doubling back</strong>.</li>
          <li>• Slices into working days by capacity (surveys ≤3/day, installs 1/day), skipping weekends — adjacent days sit geographically together.</li>
          <li>• Owner-optimal first (least driving); the customer is <strong>accommodated on top</strong> — offered the best days, and only a customer who can take none bends the plan.</li>
          <li>• A van holds ~2 days' gear, so a warehouse restock is woven in ~every 2 days, not a run home each night.</li>
          <li>• The agent <strong>proposes a draft</strong>; you approve. It never books on its own.</li>
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">Sweep 8 makes it fully live: per-employee home addresses (Owner Settings) + Google Distance Matrix for real drive-time. Today the maths runs on a fixed depot + a distance estimate.</p>
      </div>
    </div>
  );
}

function PlannerColumn({ title, who, plan, save, fmtDay, approved, onApprove }: {
  title: string;
  who: string;
  plan: { days: Array<{ date: string; jobs: Array<{ id: string; label?: string }> }>; unplaceable: Array<{ id: string; label?: string }> };
  save: { savedKm: number; savedMin: number; optimisedKm: number } | null;
  fmtDay: (iso: string) => string;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        {save && save.savedKm >= 0.5 && (
          <span className="text-2xs font-semibold text-doc-deposit inline-flex items-center gap-1"><TrendingDown className="size-3" />−{save.savedKm.toFixed(0)} km</span>
        )}
      </div>
      <p className="text-2xs text-muted-foreground mb-2.5">{who}</p>

      {plan.days.length === 0 ? (
        <p className="text-2xs text-muted-foreground py-4 text-center">Nothing to plan — the queue is clear.</p>
      ) : (
        <div className="space-y-1.5">
          {plan.days.map((d, i) => (
            <div key={i} className="rounded-control border border-border bg-background p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="grid place-items-center size-4 rounded-full bg-tech/10 text-tech text-[10px] font-bold tabular-nums">{i + 1}</span>
                <span className="text-2xs font-semibold">{fmtDay(d.date)}</span>
                <Building2 className="size-2.5 text-muted-foreground/50 ml-auto" />
              </div>
              <div className="flex flex-wrap gap-1">
                {d.jobs.map(j => (
                  <span key={j.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">{j.label ?? 'Job'}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {plan.unplaceable.length > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">{plan.unplaceable.length} address{plan.unplaceable.length > 1 ? 'es' : ''} not on the map yet — surfaced, never dropped.</p>
      )}

      {/* propose → approve — the human gate. Honest in the demo: approving marks
          it accepted; it does NOT write the schedule or send anything. */}
      {plan.days.length > 0 && (
        approved ? (
          <div className="mt-3 flex items-start gap-1.5 rounded-control bg-doc-deposit/10 text-doc-deposit px-2.5 py-2 text-[10px] font-medium leading-relaxed">
            <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
            <span>Plan approved. In production this writes the schedule, then the messaging agent <strong>offers each customer their day</strong> (a draft they can reply to). Nothing is sent yet — draft-never-send holds.</span>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-3 w-full h-8 text-xs" onClick={onApprove}>
            <Check className="size-3.5 mr-1" /> Approve this plan
          </Button>
        )
      )}
    </div>
  );
}
