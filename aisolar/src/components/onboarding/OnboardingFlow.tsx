/**
 * OnboardingFlow — the shared Flowith-pattern engine (ONBOARDING_SPEC): one
 * question per full screen, big tappable chips (not dropdowns), progress implied,
 * "no pressure, switch anytime". Steps are DATA, so every entry point (installer
 * signup, the widget, team invite) supplies its own steps + COPY against the same
 * shell — the copy law (Cal): same skeleton, different audience.
 */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, type LucideIcon } from 'lucide-react';

export type OnboardingAnswers = Record<string, string>;

export type OnboardingStep =
  | {
      kind: 'chip';
      id: string;
      question: string;
      sub?: string;
      /** Big single-select chips. Selecting one auto-advances. */
      options: { value: string; label: string; sub?: string; icon?: LucideIcon }[];
    }
  | {
      kind: 'input';
      id: string;
      question: string;
      sub?: string;
      fields: { name: string; label: string; placeholder?: string; type?: string; required?: boolean }[];
      cta?: string;
    };

export default function OnboardingFlow({
  steps, onComplete, busy = false, accent = 'hsl(var(--primary))', reassurance = 'No pressure — you can change any of this later.',
}: {
  steps: OnboardingStep[];
  onComplete: (answers: OnboardingAnswers) => void;
  busy?: boolean;
  accent?: string;
  reassurance?: string;
}) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const step = steps[i];
  const pct = Math.round(((i) / steps.length) * 100);

  const advance = (patch: OnboardingAnswers) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    if (i + 1 >= steps.length) onComplete(next);
    else setI(i + 1);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* progress — implied, not numbered */}
      <div className="h-1 bg-muted">
        <div className="h-full transition-all duration-500" style={{ width: `${Math.max(6, pct)}%`, background: accent }} />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-lg w-full mx-auto px-5 py-10">
        {i > 0 && (
          <button onClick={() => setI(i - 1)} className="self-start mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
        )}

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{step.question}</h1>
        {step.sub && <p className="mt-2 text-muted-foreground leading-body">{step.sub}</p>}

        {step.kind === 'chip' ? (
          <div className="mt-7 grid gap-3">
            {step.options.map(o => (
              <button key={o.value} disabled={busy} onClick={() => advance({ [step.id]: o.value })}
                className="group rounded-panel border border-border bg-card shadow-card p-4 text-left flex items-center gap-4 hover:border-primary/50 transition-colors disabled:opacity-50">
                {o.icon && <span className="size-11 rounded-lg bg-muted grid place-items-center shrink-0 group-hover:bg-primary/10 transition-colors"><o.icon className="size-5" /></span>}
                <span className="flex-1 min-w-0">
                  <span className="font-semibold block">{o.label}</span>
                  {o.sub && <span className="block text-sm text-muted-foreground mt-0.5">{o.sub}</span>}
                </span>
                <ArrowRight className="size-5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <InputStep step={step} initial={answers} busy={busy} accent={accent} onNext={advance} />
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">{reassurance}</p>
      </div>
    </div>
  );
}

function InputStep({ step, initial, busy, accent, onNext }: {
  step: Extract<OnboardingStep, { kind: 'input' }>; initial: OnboardingAnswers; busy: boolean; accent: string; onNext: (p: OnboardingAnswers) => void;
}) {
  const [vals, setVals] = useState<OnboardingAnswers>(() =>
    Object.fromEntries(step.fields.map(f => [f.name, initial[f.name] ?? ''])));
  const ready = step.fields.every(f => !f.required || (vals[f.name] ?? '').trim() !== '');
  return (
    <form className="mt-7 grid gap-4" onSubmit={e => { e.preventDefault(); if (ready && !busy) onNext(vals); }}>
      {step.fields.map(f => (
        <div key={f.name}>
          <label className="text-sm font-medium" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} type={f.type ?? 'text'} value={vals[f.name] ?? ''} placeholder={f.placeholder}
            onChange={e => setVals(v => ({ ...v, [f.name]: e.target.value }))}
            className="mt-1.5 w-full h-12 rounded-control border border-input bg-background px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25" />
        </div>
      ))}
      <button type="submit" disabled={!ready || busy}
        className="mt-2 h-12 rounded-control text-base font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
        style={{ background: accent }}>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <>{step.cta ?? 'Continue'} <ArrowRight className="size-5" /></>}
      </button>
    </form>
  );
}
