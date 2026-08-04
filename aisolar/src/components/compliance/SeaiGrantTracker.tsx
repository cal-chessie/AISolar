/**
 * SeaiGrantTracker — the owner's live view of a job's SEAI grant, from offer to
 * payment. Reads the lifecycle spine (seaiGrant.ts); advances each stage only on
 * a real proof. The grant is NET to the customer (SEAI pays them directly), so
 * the copy never implies the owner banks it.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Award, CheckCircle2, Clock, AlertTriangle, ArrowRight, FileText, Zap,
  CalendarClock, BadgeEuro, Landmark, ClipboardCheck,
} from 'lucide-react';
import type { DummyLead } from '@/lib/dummyData';
import {
  GRANT_STAGES, useGrant, advanceGrant, currentStage, nextStage, grantProgress,
  offerClock, type GrantStageSpec, type SeaiGrantRecord,
} from '@/lib/seaiGrant';
import { calculateSEAI, seaiPropertyType, eur } from '@/lib/seaiPipeline';

const ACTOR_STYLE: Record<string, string> = {
  customer: 'bg-doc-proposal/10 text-doc-proposal border-doc-proposal/30',
  owner: 'bg-tech/10 text-tech border-tech/30',
  installer: 'bg-primary/10 text-primary border-primary/30',
  seai: 'bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30',
};

const STAGE_ICON: Record<string, typeof Award> = {
  offer_applied: FileText,
  offer_received: BadgeEuro,
  installed: Zap,
  docs_shared: ClipboardCheck,
  ber_booked: CalendarClock,
  ber_published: CheckCircle2,
  dow_submitted: Landmark,
  paid: BadgeEuro,
};

export default function SeaiGrantTracker({ lead }: { lead: DummyLead }) {
  const rec = useGrant(lead.id);
  const cur = currentStage(rec);
  const next = nextStage(rec);
  const progress = grantProgress(rec);
  const clock = offerClock(rec);

  const propertyType = seaiPropertyType((lead.intake as Record<string, unknown>)?.property_type as string);
  const grantAmount = rec.grantAmount ?? (lead.proposal?.seai_grant ?? calculateSEAI({
    systemSizeKw: lead.proposal?.system_size_kw ?? 0,
    propertyType, installType: 'retrofit', annualKwhUsage: lead.annual_kwh ?? 0,
    annualProductionKwh: 0, selfConsumptionPct: 0.7, netCost: lead.proposal?.net_cost ?? 0,
  }).solarElectricityGrant);

  const curOrder = cur?.order ?? 0;

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      {/* Header — amount, net-to-customer, progress */}
      <div className="flex items-start gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Award className="size-4 text-tech shrink-0" /> SEAI grant
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {eur(grantAmount)} · paid by SEAI to the customer’s bank (net — you don’t reclaim it)
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <div className="text-lg font-bold tabular-nums text-tech">{progress}%</div>
          <div className="text-2xs text-muted-foreground">{rec.status === 'paid' ? 'complete' : cur ? cur.label : 'not started'}</div>
        </div>
      </div>

      {/* The 8-month offer clock */}
      {clock.expiresAt && (
        <div className={`mt-3 rounded-control border p-2.5 text-2xs flex items-center gap-2 ${clock.expired ? 'border-pop/40 bg-pop-subtle text-pop' : (clock.daysLeft ?? 99) < 30 ? 'border-doc-proposal/40 bg-doc-proposal/5 text-doc-proposal' : 'border-border bg-muted/40 text-muted-foreground'}`}>
          {clock.expired ? <AlertTriangle className="size-3.5 shrink-0" /> : <Clock className="size-3.5 shrink-0" />}
          <span>
            {clock.expired
              ? `Grant offer EXPIRED — the 8-month window closed. Re-apply before submitting the claim.`
              : `Grant offer valid — ${clock.daysLeft} days left to install + submit the Declaration of Works.`}
          </span>
        </div>
      )}

      {/* The stepper */}
      <ol className="mt-3 space-y-1.5">
        {GRANT_STAGES.map(s => {
          const done = curOrder >= s.order && rec.status !== 'ineligible';
          const isCurrent = cur?.id === s.id;
          const Icon = STAGE_ICON[s.id] ?? CheckCircle2;
          return (
            <li key={s.id} className={`flex items-start gap-2.5 rounded-control p-2 ${isCurrent ? 'bg-tech/5 border border-tech/20' : ''}`}>
              <span className={`mt-0.5 shrink-0 ${done ? 'text-doc-deposit' : 'text-muted-foreground/40'}`}>
                {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium ${done ? '' : 'text-muted-foreground'}`}>{s.label}</span>
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full border capitalize ${ACTOR_STYLE[s.actor]}`}>{s.actor}</span>
                </div>
                {done && <ProofLine stage={s} rec={rec} />}
              </div>
            </li>
          );
        })}
      </ol>

      {/* The next action — the one thing to do now */}
      {next && rec.status !== 'ineligible' && (
        <NextAction lead={lead} next={next} rec={rec} />
      )}
      {rec.status === 'paid' && (
        <div className="mt-3 rounded-control border border-doc-deposit/40 bg-doc-deposit/10 p-2.5 text-xs font-medium text-doc-deposit flex items-center gap-1.5">
          <CheckCircle2 className="size-4 shrink-0" /> Grant paid to the customer. Nothing outstanding.
        </div>
      )}
    </div>
  );
}

/** The captured proof for a completed stage, shown under its label. */
function ProofLine({ stage, rec }: { stage: GrantStageSpec; rec: SeaiGrantRecord }) {
  const bits: string[] = [];
  switch (stage.id) {
    case 'offer_received': if (rec.offerRef) bits.push(`Offer ${rec.offerRef}`); if (rec.offerExpiresAt) bits.push(`expires ${new Date(rec.offerExpiresAt).toLocaleDateString('en-IE')}`); break;
    case 'docs_shared': if (rec.docsSharedAt) bits.push(`Shared ${new Date(rec.docsSharedAt).toLocaleDateString('en-IE')}`); break;
    case 'ber_booked': if (rec.berAssessor) bits.push(rec.berAssessor); if (rec.berBookedFor) bits.push(new Date(rec.berBookedFor).toLocaleDateString('en-IE')); break;
    case 'ber_published': if (rec.berRating) bits.push(`BER ${rec.berRating}`); if (rec.berCertNo) bits.push(`#${rec.berCertNo}`); break;
    case 'dow_submitted': if (rec.dowSignedBy) bits.push(`Signed ${rec.dowSignedBy}`); if (rec.seaiClaimRef) bits.push(`Claim ${rec.seaiClaimRef}`); break;
    case 'paid': if (rec.paidAt) bits.push(new Date(rec.paidAt).toLocaleDateString('en-IE')); break;
  }
  if (bits.length === 0) return null;
  return <p className="text-2xs text-muted-foreground mt-0.5">{bits.join(' · ')}</p>;
}

/** Stage-aware capture of the next proof, then advance. The button never fires
 *  without the proof the stage requires — no optimistic advance. */
function NextAction({ lead, next, rec }: { lead: DummyLead; next: GrantStageSpec; rec: SeaiGrantRecord }) {
  const [f, setF] = useState<Partial<SeaiGrantRecord>>({});
  const set = (k: keyof SeaiGrantRecord) => (e: React.ChangeEvent<HTMLInputElement>) => setF(v => ({ ...v, [k]: e.target.value }));

  const commit = (proof: Partial<SeaiGrantRecord>) => {
    advanceGrant(lead.id, next.id, proof);
    setF({});
    toast.success(`${next.label} — recorded`, { description: next.doneMeans });
  };

  // What each stage needs before it can advance.
  let form: React.ReactNode = null;
  let ready = true;
  let onCommit: () => void = () => commit({});
  switch (next.id) {
    case 'offer_applied':
      onCommit = () => commit({ offerAppliedAt: new Date().toISOString() });
      break;
    case 'offer_received':
      ready = !!f.offerRef?.trim();
      form = <Field label="SEAI grant offer reference" value={f.offerRef ?? ''} onChange={set('offerRef')} placeholder="off the SEAI offer email" />;
      onCommit = () => commit({ offerRef: f.offerRef, offerReceivedAt: new Date().toISOString() });
      break;
    case 'installed':
      onCommit = () => commit({ installedAt: new Date().toISOString() });
      break;
    case 'docs_shared':
      // The real generation + portal share lands in the next build step; this
      // records the milestone. (DoW & data sheets → customer for the BER guys.)
      onCommit = () => commit({ docsSharedAt: new Date().toISOString() });
      break;
    case 'ber_booked':
      ready = !!f.berAssessor?.trim();
      form = <>
        <Field label="BER assessor" value={f.berAssessor ?? ''} onChange={set('berAssessor')} placeholder="who the customer booked" />
        <Field label="Appointment date" type="date" value={f.berBookedFor ?? ''} onChange={set('berBookedFor')} />
      </>;
      onCommit = () => commit({ berAssessor: f.berAssessor, berBookedFor: f.berBookedFor });
      break;
    case 'ber_published':
      ready = !!f.berCertNo?.trim() && !!f.berRating?.trim();
      form = <>
        <Field label="BER cert number" value={f.berCertNo ?? ''} onChange={set('berCertNo')} placeholder="off the published BER" />
        <Field label="BER rating" value={f.berRating ?? ''} onChange={set('berRating')} placeholder="e.g. B2" />
      </>;
      onCommit = () => commit({ berCertNo: f.berCertNo, berRating: f.berRating, berPublishedAt: new Date().toISOString() });
      break;
    case 'dow_submitted':
      ready = !!f.dowSignedBy?.trim() && !!f.seaiClaimRef?.trim();
      form = <>
        <Field label="Registered installer (DoW signatory)" value={f.dowSignedBy ?? ''} onChange={set('dowSignedBy')} placeholder="only a registered installer may sign" />
        <Field label="SEAI claim reference" value={f.seaiClaimRef ?? ''} onChange={set('seaiClaimRef')} placeholder="from the SEAI portal" />
      </>;
      onCommit = () => commit({ dowSignedBy: f.dowSignedBy, dowSignedAt: new Date().toISOString(), seaiClaimRef: f.seaiClaimRef });
      break;
    case 'paid':
      onCommit = () => commit({ paidAt: new Date().toISOString() });
      break;
  }

  return (
    <div className="mt-3 rounded-control border border-tech/30 bg-tech/5 p-3">
      <p className="text-2xs font-semibold text-tech uppercase tracking-wide">Next</p>
      <p className="mt-0.5 text-xs leading-snug">{next.action}</p>
      {form && <div className="mt-2 grid sm:grid-cols-2 gap-2">{form}</div>}
      <Button size="sm" className="mt-2.5 h-8 text-xs" disabled={!ready} onClick={onCommit}>
        {next.label} <ArrowRight className="size-3.5 ml-1" />
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-2xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={onChange} placeholder={placeholder} type={type} className="mt-1 h-8 text-sm" />
    </div>
  );
}
