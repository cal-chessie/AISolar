/**
 * ConsultantToday — the consultant's landing view.
 *
 * Cal: "the consultant view goes straight into messages. I don't know if
 * that's the best view to start with." It isn't. An inbox is a list of the
 * past; a consultant opening the app needs to know what to DO now.
 *
 * So the default answers three questions, in priority order:
 *   1. What's booked today?        (calls + surveys — their diary)
 *   2. Who needs me right now?     (hot, stale, awaiting my reply)
 *   3. What's waiting on someone else? (proposals sent, decision pending)
 *
 * Colour follows the family (Cal: "it feels flat"): each surface carries its
 * own tone — booked = blue (tech), needs-you = red (pop), awaiting = gold
 * (doc-proposal), value + agents = green (doc-deposit) — so the day reads at a
 * glance, not as one grey wall. Every row is one click to the thing itself.
 */
import { useMemo } from 'react';
import {
  ArrowRight, CalendarClock, Flame, PhoneCall, Send, Sun, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStage } from '@/lib/leadIntake';
import type { DummyLead } from '@/lib/dummyData';
import EngagementBadge from '@/components/consultant/EngagementBadge';
import AgentWindow, { useAgentActions } from '@/components/agents/AgentWindow';
import { Kpi, TONE, eurCompact, type Tone } from './cockpitUi';
import { toast } from 'sonner';

const eur = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('');

function Row({ lead, meta, tone, accent, onOpen }: {
  lead: DummyLead; meta: string; tone: Tone; accent?: 'hot'; onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className={`group w-full flex items-center gap-3 rounded-control border border-transparent hover:bg-muted/50 px-2.5 h-row text-left cursor-pointer transition-colors duration-instant ${TONE[tone].ring}`}
    >
      <span className="size-7 shrink-0 rounded-full bg-muted grid place-items-center text-2xs font-semibold">
        {initials(lead.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{lead.name}</span>
          {accent === 'hot' && <Flame className="size-3.5 text-pop shrink-0" aria-label="hot lead" />}
          <EngagementBadge lead={lead} compact />
        </span>
        <span className="block text-xs text-muted-foreground truncate">{meta}</span>
      </span>
      {lead.proposal && (
        <span className="hidden sm:block text-xs font-medium tabular-nums text-muted-foreground">
          {eur(lead.proposal.net_cost)}
        </span>
      )}
      <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-colors duration-instant" />
    </button>
  );
}

function Panel({ title, icon, tone, count, hint, children }: {
  title: string; icon: React.ReactNode; tone: Tone; count: number; hint: string; children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card">
      {/* thin family-colour edge — the flat grey wall gets its identity back */}
      <span className={`absolute left-0 top-0 h-full w-0.5 ${t.edge}`} aria-hidden />
      <header className="flex items-center gap-2 pl-4 pr-3 h-11 border-b border-border">
        <span className={`[&>svg]:size-4 ${t.text}`}>{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {count > 0 && (
          <span className={`text-2xs tabular-nums rounded-full px-1.5 py-0.5 ${t.chip}`}>{count}</span>
        )}
      </header>
      <div className="p-1.5">
        {count === 0 ? (
          <p className="px-2.5 py-3 text-xs text-muted-foreground">{hint}</p>
        ) : children}
      </div>
    </section>
  );
}

export default function ConsultantToday({ leads, onOpenLead, onGoCalendar }: {
  leads: DummyLead[];
  onOpenLead: (lead: DummyLead) => void;
  onGoCalendar: () => void;
}) {
  const { diary, needsMe, waiting, pipelineValue } = useMemo(() => {
    const today = new Date().toDateString();
    const diary = leads.filter(l => {
      const d = l.survey?.scheduled_date;
      return d && new Date(d).toDateString() === today;
    });
    const needsMe = leads.filter(l => {
      const last = l.touchpoints[l.touchpoints.length - 1];
      const stale = last && (Date.now() - new Date(last.timestamp).getTime()) > 3 * 86400000;
      const inbound = last?.direction === 'inbound';
      return (inbound || stale || l.score > 80) &&
        !['completed', 'final_paid', 'installed'].includes(l.workflow_stage);
    }).sort((a, b) => b.score - a.score);
    const waiting = leads.filter(l => l.workflow_stage === 'proposal_sent');
    const pipelineValue = leads
      .filter(l => l.proposal && !['completed', 'final_paid'].includes(l.workflow_stage))
      .reduce((s, l) => s + (l.proposal?.net_cost ?? 0), 0);
    return { diary, needsMe, waiting, pipelineValue };
  }, [leads]);

  const agentActions = useAgentActions(leads, 8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-3">
      {/* Orientation + the day in four numbers, on the family palette */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">{greeting}</h2>
        <p className="text-sm text-muted-foreground">
          {diary.length > 0
            ? <>{diary.length} booked, {needsMe.length} {needsMe.length === 1 ? 'lead' : 'leads'} on you, {waiting.length} out for decision.</>
            : <>Nothing booked today. {needsMe.length} {needsMe.length === 1 ? 'lead needs' : 'leads need'} you, {waiting.length} out for decision.</>}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Kpi tone="tech" icon={<CalendarClock />} value={diary.length} label="Booked today" />
        <Kpi tone="pop" icon={<Flame />} value={needsMe.length} label="Need you now" />
        <Kpi tone="proposal" icon={<Send />} value={waiting.length} label="For decision" />
        <Kpi tone="deposit" icon={<TrendingUp />} value={eurCompact(pipelineValue)} label="Pipeline in play" />
      </div>

      {/* Priority gets the full width; it carries the day. */}
      <Panel
        title="Needs you now" icon={<PhoneCall />} tone="pop" count={needsMe.length}
        hint="Nobody waiting — every lead has had a reply. Nice."
      >
        {needsMe.slice(0, 6).map(l => {
          const last = l.touchpoints[l.touchpoints.length - 1];
          // Clamp: demo/imported data can carry future timestamps — never render "-1d".
          const days = last ? Math.max(0, Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000)) : null;
          const when = days === null ? 'no contact yet' : days === 0 ? 'today' : `${days}d since contact`;
          return (
            <Row key={l.id} lead={l} tone="pop" accent={l.score > 80 ? 'hot' : undefined} onOpen={() => onOpenLead(l)}
              meta={`${getStage(l.workflow_stage).label} · ${when}`} />
          );
        })}
      </Panel>

      {/* The two short panels pair so neither stretches into empty space. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel
          title="Today's diary" icon={<CalendarClock />} tone="tech" count={diary.length}
          hint="No calls or surveys booked today. Your Cal.com link fills this automatically."
        >
          {diary.map(l => (
            <Row key={l.id} lead={l} tone="tech" onOpen={() => onOpenLead(l)}
              meta={`${l.survey?.scheduled_date ? new Date(l.survey.scheduled_date).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }) : ''} · ${l.address.split(',').slice(-2, -1)[0]?.trim() ?? ''}`} />
          ))}
        </Panel>

        <Panel
          title="Sent — awaiting decision" icon={<Send />} tone="proposal" count={waiting.length}
          hint="No proposals out for decision right now."
        >
          {waiting.map(l => (
            <Row key={l.id} lead={l} tone="proposal" onOpen={() => onOpenLead(l)}
              meta={(() => {
                if (!l.proposal?.sent_date) return 'Proposal sent';
                const d = Math.max(0, Math.floor((Date.now() - new Date(l.proposal.sent_date).getTime()) / 86400000));
                return d === 0 ? 'Proposal sent today' : `Proposal sent ${d}d ago`;
              })()} />
          ))}
        </Panel>
      </div>

      <AgentWindow
        actions={agentActions}
        onCorrect={(a, note) => toast.success(`Correction sent to ${a.agent}`, { description: note })}
      />

      {/* Booking link — a slim full-width bar, not a half-empty card */}
      <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card shadow-card">
        <span className="absolute left-0 top-0 h-full w-0.5 bg-doc-deposit" aria-hidden />
        <div className="flex flex-wrap items-center gap-3 pl-4 pr-3 py-3">
          <span className="[&>svg]:size-4 text-doc-deposit"><Sun /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Your booking link</h2>
            <p className="text-2xs text-muted-foreground leading-body">
              Homeowners pick their own slot. It lands in your calendar and creates the lead here. No back-and-forth.
            </p>
          </div>
          <code className="order-3 sm:order-none w-full sm:w-auto truncate rounded-control border border-border bg-muted/50 px-2.5 h-control grid items-center text-xs">
            cal.com/renewableireland/solar-consultation
          </code>
          <Button variant="outline" size="default" onClick={onGoCalendar}>
            <CalendarClock /> Calendar
          </Button>
        </div>
      </section>
    </div>
  );
}
