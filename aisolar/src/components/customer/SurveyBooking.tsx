/**
 * SurveyBooking — the customer picks (or counters) their survey window, in chat.
 *
 * The other half of LeadFlow's "Let them choose" mode. Cal: "we cant expect an
 * owner or a consultant to bend to such a rigid timeline… the customer could
 * pick one of the offered options OR counter with when they're around."
 *
 * Flow (vault Sweep 3 spec, items 2 + 4):
 *   1. Surveyor offers 2–3 WINDOWS (half-days, never clock times).
 *   2. Customer taps one — OR "none suit" opens a counter: day chips +
 *      morning/afternoon/evening.
 *   3. Confirm → both-sides-agreed state. A picked window confirms straight
 *      away with a T-1 reminder promise; a counter goes back to the surveyor.
 *
 * HONESTY: nothing "books" a clock time the calendar can't hold — a pick is a
 * half-day window; a counter is availability the scheduler still confirms.
 * Demo holds the choice locally; at launch it writes the survey booking and
 * the scheduler creates the calendar event + reminder.
 */
import { useState } from 'react';
import { Calendar, Check, Clock } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const PARTS = ['Morning', 'Afternoon', 'Evening'] as const;

export default function SurveyBooking({
  offered = ['Any morning next week', 'Tuesday or Thursday afternoon', 'Saturday morning'],
  surveyorName = 'your surveyor',
  onConfirm,
}: {
  offered?: string[];
  surveyorName?: string;
  onConfirm?: (choice: { kind: 'offered' | 'counter'; label: string }) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<{ kind: 'offered' | 'counter'; label: string } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const counterLabel = () => {
    const d = days.length ? days.join(', ') : 'any day';
    const p = parts.length ? parts.map(x => x.toLowerCase()).join(' or ') : 'any time';
    return `${d} · ${p}`;
  };

  const canConfirm = countering ? days.length > 0 || parts.length > 0 : !!picked;

  const confirm = () => {
    const choice = countering
      ? { kind: 'counter' as const, label: counterLabel() }
      : { kind: 'offered' as const, label: picked! };
    setConfirmed(choice);
    onConfirm?.(choice);
  };

  if (confirmed) {
    return (
      <div className="rounded-[16px] bg-card shadow-card p-4 max-w-sm">
        <div className="flex items-start gap-2.5">
          <span className="size-7 rounded-full bg-doc-deposit/15 grid place-items-center shrink-0">
            <Check className="size-4 text-doc-deposit" />
          </span>
          <div>
            {confirmed.kind === 'offered' ? (
              <>
                <p className="text-sm font-semibold">Survey set — {confirmed.label}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {surveyorName} has it locked in. We'll send a reminder the day
                  before, and you can reply here if anything changes.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Sent to {surveyorName}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  We passed on <span className="font-medium text-foreground">{confirmed.label}</span>.
                  {surveyorName} will confirm a window that suits and you'll see it here.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] bg-card shadow-card p-4 max-w-sm">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-doc-deposit" />
        <p className="text-sm font-semibold">Your site survey</p>
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-snug">
        {surveyorName} offered these windows. Tap one that suits — or tell us when
        you're around. Surveys run as half-days, not fixed clock times.
      </p>

      {!countering && (
        <div className="mt-3 space-y-1.5">
          {offered.map(opt => (
            <button key={opt} type="button" onClick={() => setPicked(opt)}
              className={`w-full flex items-center gap-2 rounded-[10px] p-2.5 text-left text-xs transition-colors ${
                picked === opt ? 'bg-doc-deposit/10 border border-doc-deposit/50 font-medium' : 'bg-muted/40 border border-transparent hover:bg-muted/70'
              }`}>
              <span className={`size-3.5 rounded-full border shrink-0 grid place-items-center ${picked === opt ? 'border-doc-deposit' : 'border-muted-foreground/40'}`}>
                {picked === opt && <span className="size-1.5 rounded-full bg-doc-deposit" />}
              </span>
              {opt}
            </button>
          ))}
          <button type="button" onClick={() => { setCountering(true); setPicked(null); }}
            className="w-full flex items-center gap-1.5 rounded-[10px] p-2.5 text-left text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
            <Clock className="size-3.5" /> None of these suit — here's when I'm around
          </button>
        </div>
      )}

      {countering && (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Which days work?</p>
          <div className="grid grid-cols-6 gap-1">
            {DAYS.map(d => (
              <button key={d} type="button" onClick={() => toggle(days, setDays, d)}
                className={`py-1.5 rounded-[8px] text-[11px] border transition-colors ${days.includes(d) ? 'border-doc-deposit bg-doc-deposit/10 font-medium' : 'border-border hover:bg-muted/50'}`}>
                {d}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground mt-2.5 mb-1.5">What time of day?</p>
          <div className="grid grid-cols-3 gap-1">
            {PARTS.map(p => (
              <button key={p} type="button" onClick={() => toggle(parts, setParts, p)}
                className={`py-1.5 rounded-[8px] text-[11px] border transition-colors ${parts.includes(p) ? 'border-doc-deposit bg-doc-deposit/10 font-medium' : 'border-border hover:bg-muted/50'}`}>
                {p}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCountering(false)}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            ← back to offered times
          </button>
        </div>
      )}

      <button type="button" disabled={!canConfirm} onClick={confirm}
        className="mt-3 w-full h-9 rounded-[10px] bg-doc-deposit text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
        {countering ? 'Send my availability' : picked ? `Confirm ${picked}` : 'Pick a window'}
      </button>
    </div>
  );
}
