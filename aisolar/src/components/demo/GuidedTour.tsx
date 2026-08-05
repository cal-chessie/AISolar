/**
 * GuidedTour — the owner's walk around the app (Cal, 5 Aug: "the guided tour
 * takes the owner around the app… what do they need to see is WHY they're using
 * the SaaS. instructional, each stop says what this screen is for, what to
 * click, what just happened behind it").
 *
 * It drives the real cockpit — switching `activeView` as it goes — and shows a
 * card per stop, following the spine then the finale. It turns the sample data
 * ON so there are real leads to see, and marks itself done so it only auto-runs
 * once (first login after signup). Relaunch anytime from the sidebar.
 *
 * Trigger: `?tour=1` (the /onboarding redirect + the sidebar button both use it)
 * or first login (no `aisolar_tour_done`). Not decorative — no route index, no
 * "browse views". The why, in order.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { enableDemoMode } from '@/lib/demoMode';

const DONE_KEY = 'aisolar_tour_done';

export type OwnerView =
  | 'overview' | 'clients' | 'estimates' | 'seai' | 'financials'
  | 'installers' | 'agents' | 'products' | 'analytics' | 'settings';

interface Stop {
  view: OwnerView;
  title: string;
  /** What this screen is FOR. */
  forWhat: string;
  /** What just happened behind it / why it matters (the moat line). */
  behind: string;
}

/** The spine, then the finale — mapped to the owner's real sections. */
const STOPS: Stop[] = [
  { view: 'overview', title: 'Your business, at a glance',
    forWhat: 'The one screen you open each morning: what needs you today, what\'s banked, and where the pipeline is stuck.',
    behind: 'The bottleneck and the "needs you" cards are worked out live from every lead — you\'re not hunting, it\'s surfaced.' },
  { view: 'clients', title: 'The spine — every customer, one board',
    forWhat: 'Enquiry → estimate → survey → proposal → contract → deposit → install → grant pack → handover. Click any lead to open their whole story.',
    behind: 'Each lead carries its own money, grant and paperwork — nothing lives in a spreadsheet or your head anymore.' },
  { view: 'estimates', title: 'Where a bill becomes a proposal',
    forWhat: 'The calculator that sizes a system off a real bill or a drawn roof — the same engine your customers use on your website.',
    behind: 'Savings are worked from how the home is actually used, with the right grant and (for business) ex-VAT — so the number holds up on survey.' },
  { view: 'seai', title: 'The paperwork, done for you',
    forWhat: 'NC6 and NC7 connection forms and the SEAI grant — filled straight from the survey, ready to sign.',
    behind: 'This is the part that used to eat your evenings. It\'s the moat: the compliance is automatic, not a night job.' },
  { view: 'financials', title: 'Money — and the gate',
    forWhat: 'Deposits and invoices at a glance. When a deposit lands, you pick the crew before the job can move.',
    behind: 'The routing gate means a paid job never sits unassigned — it\'s in front of you the moment it\'s live.' },
  { view: 'installers', title: 'Your crews',
    forWhat: 'The installers you route jobs to. A deposit-paid job lands on their phone with everything they need on site.',
    behind: 'Serial numbers and sign-off come back up the wire — that\'s what closes the NC6 pack.' },
  { view: 'agents', title: 'The AI working behind you',
    forWhat: 'Drafting proposals, chasing quietly, prepping the grant — the work that happens while you sleep.',
    behind: 'Every send waits for your say-so. The AI does the typing; you keep the final word.' },
  { view: 'products', title: 'Your catalogue and prices',
    forWhat: 'The panels, inverters, batteries and the numbers every proposal is built from.',
    behind: 'Change a price here and every future quote moves with it — one place, no drift.' },
  { view: 'analytics', title: 'Your week in numbers',
    forWhat: 'What\'s converting, what\'s stuck, and how each consultant is doing.',
    behind: 'The same live data the coach reads — so the advice you get is grounded in your real pipeline.' },
  { view: 'settings', title: 'Make it yours',
    forWhat: 'Your brand, your dials, Teach-your-AI (feed it your story so it sells your way), and the embed widget for your own website.',
    behind: 'What you teach here is what your AI says to customers — in your voice, your edge, your offer.' },
];

export default function GuidedTour({ setView }: { setView: (v: OwnerView) => void }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  // setView identity changes every parent render — hold it in a ref so the
  // effects below don't churn (an earlier version reset the tour to step 1 on
  // every re-render because `start` depended on setView).
  const setViewRef = useRef(setView);
  setViewRef.current = setView;

  const start = useCallback(() => {
    enableDemoMode();      // the tour walks the cast — make sure there are leads
    setI(0); setOpen(true);
    setViewRef.current('overview');
  }, []);

  // Auto-start ONCE on mount (?tour=1 or first login), then listen for the
  // sidebar relaunch button.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let done = true;
    try { done = localStorage.getItem(DONE_KEY) === '1'; } catch { /* ignore */ }
    if (params.get('tour') === '1' || !done) start();
    window.addEventListener('start-tour', start);
    return () => window.removeEventListener('start-tour', start);
  }, [start]);

  // Move to a stop AND drive the cockpit to it — imperative (in the handler),
  // never a render effect, so switching the view never loops the parent.
  const go = (n: number) => { setI(n); setViewRef.current(STOPS[n].view); };

  const finish = () => {
    setOpen(false);
    try { localStorage.setItem(DONE_KEY, '1'); } catch { /* ignore */ }
  };

  if (!open) return null;
  const stop = STOPS[i];
  const last = i === STOPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* A soft dim so the card owns attention, without hiding the screen it
          describes. Clicks pass through except on the card. */}
      <div className="absolute inset-0 bg-black/20" />

      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg rounded-panel border border-border bg-popover text-popover-foreground shadow-2xl">
        <div className="p-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-tech/15 text-tech">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{stop.title}</h3>
                <span className="ml-auto text-2xs text-muted-foreground tabular-nums">{i + 1} / {STOPS.length}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stop.forWhat}</p>
              <p className="mt-2 text-xs text-foreground/80"><span className="font-medium text-tech">Behind it:</span> {stop.behind}</p>
            </div>
            <button onClick={finish} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Close tour">
              <X className="size-4" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="mt-3 flex items-center gap-1">
            {STOPS.map((_, k) => (
              <span key={k} className={`h-1 rounded-full transition-all ${k === i ? 'w-5 bg-tech' : 'w-1.5 bg-muted-foreground/30'}`} />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">Skip tour</button>
            <div className="ml-auto flex items-center gap-2">
              {i > 0 && (
                <button onClick={() => go(i - 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-muted">
                  <ArrowLeft className="size-4" /> Back
                </button>
              )}
              <button
                onClick={() => (last ? finish() : go(i + 1))}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {last ? 'Finish' : <>Next <ArrowRight className="size-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fire from the sidebar "Take the tour" control. */
export function launchTour() {
  window.dispatchEvent(new CustomEvent('start-tour'));
}
