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
 * Every row is one click to the thing itself. Empty states say what to do
 * next rather than "nothing here".
 */
import { useMemo } from 'react';
import {
  ArrowRight, CalendarClock, Flame, PhoneCall, Send, Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStage } from '@/lib/leadIntake';
import type { DummyLead } from '@/lib/dummyData';
import AgentWindow, { useAgentActions } from '@/components/agents/AgentWindow';
import { toast } from 'sonner';

const eur = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('');

function Row({ lead, meta, accent, onOpen }: {
  lead: DummyLead; meta: string; accent?: 'hot' | 'wait'; onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group w-full flex items-center gap-3 rounded-md border border-transparent hover:border-border hover:bg-muted/50 px-2.5 h-row text-left cursor-pointer transition-colors duration-instant"
    >
      <span className="size-7 shrink-0 rounded-full bg-muted grid place-items-center text-2xs font-semibold">
        {initials(lead.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{lead.name}</span>
          {accent === 'hot' && <Flame className="size-3.5 text-orange-500 shrink-0" aria-label="hot lead" />}
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

function Panel({ title, icon, count, hint, children }: {
  title: string; icon: React.ReactNode; count: number; hint: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-panel border border-border/70 bg-card shadow-card">
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <span className="[&>svg]:size-4 text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {count > 0 && (
          <span className="text-2xs tabular-nums rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">{count}</span>
        )}
      </header>
      <div className="p-1.5">
        {count === 0 ? (
          <p className="px-2.5 py-4 text-xs text-muted-foreground">{hint}</p>
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
  const { diary, needsMe, waiting } = useMemo(() => {
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
    return { diary, needsMe, waiting };
  }, [leads]);

  const agentActions = useAgentActions(leads, 8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-4 max-w-5xl">
      {/* One-line orientation */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">{greeting}</h2>
        <p className="text-sm text-muted-foreground">
          {diary.length > 0
            ? <>You have <strong className="text-foreground font-medium">{diary.length}</strong> booked today and <strong className="text-foreground font-medium">{needsMe.length}</strong> {needsMe.length === 1 ? 'lead' : 'leads'} needing a reply.</>
            : <>Nothing booked today — <strong className="text-foreground font-medium">{needsMe.length}</strong> {needsMe.length === 1 ? 'lead needs' : 'leads need'} you.</>}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Today's diary" icon={<CalendarClock />} count={diary.length}
          hint="No calls or surveys booked today. Your Cal.com link fills this automatically."
        >
          {diary.map(l => (
            <Row key={l.id} lead={l} onOpen={() => onOpenLead(l)}
              meta={`${l.survey?.scheduled_date ? new Date(l.survey.scheduled_date).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }) : ''} · ${l.address.split(',').slice(-2, -1)[0]?.trim() ?? ''}`} />
          ))}
        </Panel>

        <Panel
          title="Needs you now" icon={<PhoneCall />} count={needsMe.length}
          hint="Nobody waiting — every lead has had a reply. Nice."
        >
          {needsMe.slice(0, 6).map(l => {
            const last = l.touchpoints[l.touchpoints.length - 1];
            // Clamp: demo/imported data can carry future timestamps — never render "-1d".
            const days = last ? Math.max(0, Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000)) : null;
            const when = days === null ? 'no contact yet' : days === 0 ? 'today' : `${days}d since contact`;
            return (
              <Row key={l.id} lead={l} accent={l.score > 80 ? 'hot' : undefined} onOpen={() => onOpenLead(l)}
                meta={`${getStage(l.workflow_stage).label} · ${when}`} />
            );
          })}
        </Panel>

        <Panel
          title="Sent — awaiting decision" icon={<Send />} count={waiting.length}
          hint="No proposals out for decision right now."
        >
          {waiting.map(l => (
            <Row key={l.id} lead={l} onOpen={() => onOpenLead(l)}
              meta={(() => {
                if (!l.proposal?.sent_date) return 'Proposal sent';
                const d = Math.max(0, Math.floor((Date.now() - new Date(l.proposal.sent_date).getTime()) / 86400000));
                return d === 0 ? 'Proposal sent today' : `Proposal sent ${d}d ago`;
              })()} />
          ))}
        </Panel>

        <AgentWindow
          actions={agentActions}
          onCorrect={(a, note) => toast.success(`Correction sent to ${a.agent}`, { description: note })}
        />

        <section className="rounded-panel border border-border/70 bg-card shadow-card p-4 flex flex-col justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sun className="size-4 text-muted-foreground" /> Your booking link
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5 leading-body">
              Homeowners pick their own slot — it lands in your calendar and creates
              the lead here automatically. No back-and-forth.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-control border border-border bg-muted/50 px-2.5 h-control grid items-center text-xs">
              cal.com/renewableireland/solar-consultation
            </code>
            <Button variant="outline" size="default" onClick={onGoCalendar}>
              <CalendarClock /> Calendar
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
