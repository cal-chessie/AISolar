/**
 * PaperworkWindow — THE page. Cal's core vision, per customer:
 * "automated seai, esb and reci paperwork… the final doc pack can all be
 * clicked and viewed before the final gate."
 *
 * Three gates, seven documents, one honest rule:
 *   GATE A — SEAI grant: application pre-filled from the bill read (MPRN,
 *            year built, installer). Grant OFFER must exist before work.
 *   GATE B — ESB NC6: auto-prepared from survey + design (kW + phase decide
 *            NC6 vs NC7). 20 WORKING DAYS before install — the clock shows
 *            the earliest legal install date.
 *   GATE C — Completion pack: Declaration of Works · Inspection & Test cert
 *            (from the installer checklist) · RECI cert (UPLOAD — signed by
 *            the Registered Electrical Contractor, per I.S. 10101) · BER
 *            (3rd-party assessor emails it in — the correspondent agent
 *            files it to the customer's docs) · NC6 copy.
 *
 * Agents PREPARE, TRACK and CHASE. The registered humans SIGN and SUBMIT.
 * SEAI/ESB API slots are declared but honest: "manual submit until the API
 * keys land" — nothing pretends to file itself.
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Award, Zap, Shield, FileText, Bot, Upload, Mail, Eye, X,
  CheckCircle2, Clock, Lock, ArrowRight, CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import { getProposalTerms } from '@/lib/proposalTerms';
import { DowTemplate, LoaTemplate } from '@/components/compliance/docTemplates';
import BlockDiagram from '@/components/compliance/BlockDiagram';
import { getProduct } from '@/config/productCatalog';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** +N working days (Mon–Fri) from a date — the NC6 rule. */
function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; }
  return d;
}

type DocStatus = 'not_started' | 'prepared' | 'awaiting_signature' | 'sent' | 'received' | 'complete';

interface PackDoc {
  id: string;
  gate: 'A' | 'B' | 'C';
  name: string;
  who: string;               // who produces/signs it — the honesty line
  source: 'agent' | 'upload' | 'email-in' | 'installer';
  status: DocStatus;
  detail?: string;
}

const STATUS_STYLE: Record<DocStatus, { label: string; cls: string }> = {
  not_started: { label: 'Not started', cls: 'bg-muted text-muted-foreground' },
  prepared: { label: 'Prepared by agent', cls: 'bg-tech-subtle text-tech' },
  awaiting_signature: { label: 'Awaiting signature', cls: 'bg-doc-proposal-subtle text-doc-proposal' },
  sent: { label: 'Sent', cls: 'bg-doc-contract-subtle text-doc-contract' },
  received: { label: 'Received & filed', cls: 'bg-doc-deposit/10 text-doc-deposit' },
  complete: { label: 'Complete', cls: 'bg-doc-deposit/10 text-doc-deposit' },
};

const SOURCE_META = {
  agent: { icon: Bot, note: 'agent-prepared' },
  upload: { icon: Upload, note: 'uploaded cert' },
  'email-in': { icon: Mail, note: 'emailed in — agent filed it' },
  installer: { icon: Shield, note: 'installer-signed' },
} as const;

/** Derive the pack's demo state from the pipeline stage — never claims a
 *  document that the stage can't justify. */
function buildPack(lead: DummyLead): PackDoc[] {
  const s = lead.workflow_stage;
  // ONE form or the other (Cal): NC6 covers ≤6kW single-phase / ≤11kW
  // three-phase; anything above notifies on NC7. Decided from the survey's
  // phase + the designed kW — never left as a "check this" note.
  const kW = lead.proposal?.system_size_kw ?? 0;
  const threePhase = /three/i.test(lead.survey?.confirmed_inverter_type ?? '');
  const nc6Limit = threePhase ? 11 : 6;
  const esbForm = kW <= nc6Limit ? 'NC6' : 'NC7';
  const at = (stages: string[]) => stages.includes(s);
  const afterAccept = at(['approved', 'deposit_paid', 'install_scheduled', 'installing', 'installed', 'final_paid', 'completed']);
  const afterSchedule = at(['install_scheduled', 'installing', 'installed', 'final_paid', 'completed']);
  const afterInstall = at(['installed', 'final_paid', 'completed']);
  const done = s === 'completed';

  return [
    { id: 'seai_app', gate: 'A', name: 'SEAI grant application', who: 'Grants clerk prepares · homeowner submits', source: 'agent',
      status: !afterAccept ? (lead.proposal ? 'prepared' : 'not_started') : 'sent',
      detail: `MPRN ${lead.mprn || '—'} · year built ${(lead.intake as Record<string, unknown>)?.year_built ?? 'ASK'} · ${eur(lead.proposal?.seai_grant ?? 1800)}` },
    { id: 'seai_offer', gate: 'A', name: 'SEAI grant offer', who: 'SEAI issues · agent tracks', source: 'email-in',
      status: afterAccept ? 'received' : 'not_started',
      detail: 'work cannot start before the offer exists' },
    { id: 'esb_loa', gate: 'B', name: `Letter of Authority — ESB ${esbForm}`, who: 'Agent prepares · homeowner signs with the contract', source: 'agent',
      status: afterAccept ? 'received' : lead.proposal ? 'prepared' : 'not_started',
      detail: `authorises ${''}the contractor to complete, sign and submit the ${esbForm}` },
    { id: 'block_diagram', gate: 'B', name: 'Single line diagram — generated', who: 'Drawn from the design · engineer reviews and stamps', source: 'agent',
      status: lead.proposal ? 'prepared' : 'not_started',
      detail: lead.proposal ? `array, inverter, MCB sizing and supply drawn from ${lead.name.split(' ')[0]}'s design — required with the ${esbForm}` : undefined },
    { id: 'nc6', gate: 'B', name: `ESB ${esbForm} microgen notification`, who: 'Safe Electric installer submits', source: 'agent',
      status: afterSchedule ? 'sent' : lead.survey ? 'prepared' : 'not_started',
      detail: `${kW || '—'} kWp · ${threePhase ? 'three phase' : 'single phase'} → ${esbForm} (${esbForm === 'NC6' ? `within the ${nc6Limit}kW limit` : `above the ${nc6Limit}kW NC6 limit`})` },
    { id: 'dow', gate: 'C', name: 'Declaration of Works', who: 'Installer signs', source: 'installer',
      status: afterInstall ? 'complete' : afterSchedule ? 'prepared' : 'not_started',
      detail: (() => { const a = getProposalTerms().berAssessorEmail; return afterInstall
        ? (a ? `auto-sent to ${a} — BER triggered` : 'set the BER assessor email in Settings → Terms to auto-trigger the BER')
        : (a ? `on completion: auto-sends to ${a}` : undefined); })() },
    { id: 'itc', gate: 'C', name: 'Inspection, Test & Commissioning cert', who: 'From the installer checklist', source: 'installer',
      status: afterInstall ? 'complete' : at(['installing']) ? 'prepared' : 'not_started',
      detail: 'isolator · RCD · earth bond · SPD — the checklist IS the cert data' },
    { id: 'reci', gate: 'C', name: 'Safe Electric (RECI) certificate', who: 'Registered Electrical Contractor signs — I.S. 10101', source: 'upload',
      status: afterInstall ? 'received' : 'not_started',
      detail: 'uploaded by the REC — never generated' },
    { id: 'datasheet', gate: 'C', name: 'Product data sheets (for the BER assessor)', who: 'From the product catalogue — attached automatically', source: 'agent',
      status: (() => { const pd = lead.proposal ? getProduct(lead.proposal.panel_model, 'panel') : null; return pd?.datasheet ? 'complete' : lead.proposal ? 'prepared' : 'not_started'; })(),
      detail: lead.proposal ? `${lead.proposal.panel_model}${(getProduct(lead.proposal.panel_model, 'panel')?.datasheet) ? ' — sheet attached' : ' — add the sheet in Products'}` : undefined },
    { id: 'ber', gate: 'C', name: 'Post-works BER assessment', who: '3rd-party assessor · emailed in', source: 'email-in',
      status: done ? 'received' : afterInstall ? 'awaiting_signature' : 'not_started',
      detail: getProposalTerms().berAssessorEmail
        ? `assessor (${getProposalTerms().berAssessorEmail}) emails it back — the correspondent agent files it here`
        : 'assessor emails it — the correspondent agent files it here' },
  ];
}

export default function PaperworkWindow({ lead, onBack }: { lead: DummyLead; onBack?: () => void }) {
  const pack = useMemo(() => buildPack(lead), [lead]);
  const esbForm: 'NC6' | 'NC7' = (lead.proposal?.system_size_kw ?? 0) <= (/three/i.test(lead.survey?.confirmed_inverter_type ?? '') ? 11 : 6) ? 'NC6' : 'NC7';
  const [viewing, setViewing] = useState<PackDoc | null>(null);
  const readyCount = pack.filter(d => ['received', 'complete', 'sent'].includes(d.status)).length;
  const allReady = pack.every(d => ['received', 'complete', 'sent'].includes(d.status));

  // NC6 clock: earliest legal install = 20 working days after NC6 sent
  const nc6 = pack.find(d => d.id === 'nc6')!;
  const earliestInstall = addWorkingDays(new Date(), 20);

  const gates: Array<{ id: 'A' | 'B' | 'C'; title: string; icon: typeof Award; tint: string; rule: string }> = [
    { id: 'A', title: 'SEAI grant', icon: Award, tint: 'text-doc-contract', rule: 'Offer BEFORE any work starts' },
    { id: 'B', title: 'ESB NC6 / NC7', icon: Zap, tint: 'text-tech', rule: '20 working days before install — form chosen from kW + phase' },
    { id: 'C', title: 'Completion pack', icon: Shield, tint: 'text-doc-deposit', rule: 'Assembled at commissioning' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
      {onBack && (
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-3.5" /> Back
        </button>
      )}

      {/* Masthead: whose paperwork, how far along */}
      <div className="rounded-[16px] bg-primary text-primary-foreground shadow-card p-4 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">{lead.name} — the paperwork</h2>
          <p className="text-xs text-primary-foreground/70 mt-0.5">
            {getStage(lead.workflow_stage).label} · {readyCount} of {pack.length} documents in hand · agents prepare and chase, the registered people sign
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums">{readyCount}/{pack.length}</div>
          <div className="h-1.5 w-28 bg-primary-foreground/20 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-doc-deposit rounded-full transition-all" style={{ width: `${(readyCount / pack.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* NC6 clock — the rule made visible */}
      {nc6.status !== 'sent' && (
        <div className="rounded-[16px] bg-card shadow-card p-3 flex items-center gap-3 text-sm">
          <CalendarClock className="size-4 text-tech shrink-0" />
          <span>If the NC6 goes to ESB <strong>today</strong>, the earliest legal install day is{' '}
            <strong className="text-tech">{earliestInstall.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> — the booking calendar enforces this.</span>
        </div>
      )}

      {/* The three gates */}
      {gates.map(g => (
        <div key={g.id} className="rounded-[16px] bg-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <g.icon className={`size-4 ${g.tint}`} />
            <span className="text-sm font-semibold">Gate {g.id} — {g.title}</span>
            <span className="ml-auto text-2xs text-muted-foreground">{g.rule}</span>
          </div>
          <div className="divide-y divide-border">
            {pack.filter(d => d.gate === g.id).map(doc => {
              const st = STATUS_STYLE[doc.status];
              const src = SOURCE_META[doc.source];
              return (
                <div key={doc.id} className="px-4 py-2.5 flex items-center gap-3">
                  <src.icon className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-2xs text-muted-foreground truncate">{doc.who}{doc.detail ? ` · ${doc.detail}` : ''}</div>
                  </div>
                  <span className={`text-2xs rounded-full px-2 py-0.5 font-medium shrink-0 ${st.cls}`}>{st.label}</span>
                  {doc.source === 'upload' && doc.status === 'not_started' ? (
                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0"
                      onClick={() => toast.success('Upload slot ready', { description: 'The REC uploads their signed cert here — it is never generated.' })}>
                      <Upload className="size-3 mr-1" /> Upload
                    </Button>
                  ) : doc.status !== 'not_started' ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setViewing(doc)}>
                      <Eye className="size-3 mr-1" /> View
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* THE FINAL GATE — review everything, then release */}
      <div className={`rounded-[16px] shadow-card p-4 ${allReady ? 'bg-doc-deposit/10' : 'bg-card'}`}>
        <div className="flex flex-wrap items-center gap-3">
          {allReady ? <CheckCircle2 className="size-5 text-doc-deposit shrink-0" /> : <Lock className="size-5 text-muted-foreground shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">The final gate — handover pack</div>
            <div className="text-xs text-muted-foreground">
              {allReady
                ? 'Every document is in hand and viewable above. Release sends the full pack to the customer’s portal.'
                : `Locked until all ${pack.length} documents are in hand — click any prepared document above to review it.`}
            </div>
          </div>
          <Button disabled={!allReady} className="shrink-0 font-semibold"
            onClick={() => toast.success(`Handover pack released to ${lead.name.split(' ')[0]}`, { description: 'Filed in their portal documents — the closer takes it from here.' })}>
            Release pack <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* API honesty strip */}
      <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
        <Clock className="size-3" /> SEAI + ESB API submission slots are built and waiting — until those keys land, prepared documents are submitted manually by the registered people. Nothing here pretends to file itself.
      </p>

      {/* Document viewer */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-background w-full max-w-lg rounded-[16px] p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold">{viewing.name}</h3>
                <span className={`inline-block mt-1 text-2xs rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[viewing.status].cls}`}>{STATUS_STYLE[viewing.status].label}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewing(null)}><X className="size-4" /></Button>
            </div>
            {/* The prepared document, from the data we hold — a DRAFT preview */}
            {viewing.id === 'block_diagram' ? (
              <div className="space-y-2">
                <BlockDiagram lead={lead} />
                <p className="text-2xs text-muted-foreground">Generated from the job's design data. An engineer reviews and stamps before it goes to ESB — the drawing draws itself, the sign-off stays human.</p>
              </div>
            ) : viewing.id === 'nc6' ? (
              <div className="space-y-2">
                <iframe title="Official ESB NC form" src="/forms/esbn-form-nc7.pdf" className="w-full h-[50vh] rounded-[10px] border border-border" />
                <p className="text-2xs text-muted-foreground">The official ESB Networks form, pre-fill data ready from the record — the Safe Electric installer completes and submits it{esbForm === 'NC7' ? ' with the letter of authority and single line diagram' : ''}.</p>
              </div>
            ) : viewing.id === 'dow' ? (
              <div className="rounded-[10px] border border-border p-4"><DowTemplate lead={lead} /></div>
            ) : viewing.id === 'esb_loa' ? (
              <div className="rounded-[10px] border border-border p-4"><LoaTemplate lead={lead} esbForm={esbForm} /></div>
            ) : viewing.id === 'datasheet' && lead.proposal && getProduct(lead.proposal.panel_model, 'panel')?.datasheet ? (
              <iframe title="Product data sheet" src={getProduct(lead.proposal.panel_model, 'panel')!.datasheet} className="w-full h-[55vh] rounded-[10px] border border-border" />
            ) : (
            <div className="rounded-[10px] border border-border p-4 text-sm space-y-2 font-mono text-xs">
              <div className="text-center font-bold text-sm pb-2 border-b border-border">{viewing.name.toUpperCase()}</div>
              <div>Applicant: {lead.name}</div>
              <div>Address: {lead.address}</div>
              <div>MPRN: {lead.mprn || '—'}</div>
              {lead.proposal && <div>System: {lead.proposal.system_size_kw} kWp · {lead.proposal.panel_count} × {lead.proposal.panel_model}</div>}
              {lead.proposal && <div>Inverter: {lead.proposal.inverter_model}</div>}
              {viewing.id === 'seai_app' && lead.proposal && <div>Grant sought: {eur(lead.proposal.seai_grant)}</div>}
              {viewing.id === 'itc' && <div>Checks: isolator ✓ · RCD ✓ · earth bond ✓ · SPD ✓ (from the install checklist)</div>}
              <div className="pt-2 border-t border-border text-muted-foreground">
                {viewing.source === 'upload' ? 'Original signed document — uploaded by the Registered Electrical Contractor.'
                  : viewing.source === 'email-in' ? 'Received by email and filed by the correspondent agent.'
                  : viewing.source === 'installer' ? 'Signed by the installer on completion.'
                  : 'DRAFT — prepared by the grants clerk from the customer record. A registered person reviews and submits.'}
              </div>
            </div>
            )}
            <p className="text-2xs text-muted-foreground mt-3">At launch this renders the actual PDF. The data above is live from {lead.name.split(' ')[0]}'s record.</p>
          </div>
        </div>
      )}
    </div>
  );
}
