/**
 * GuidedTour — the owner's walk around the whole product (Cal, 5 Aug).
 *
 * App-level and route-driven: mounted once beside the router (not inside a
 * cockpit), so it survives navigation — you can click a lead, poke around, and
 * the tour is still there; "Next" carries you to the next stop. It walks the
 * spine, ducks into the consultant's survey and the installer's field job as
 * sub-steps, doubles back on the SEAI pack, and finishes in Settings.
 *
 * Every stop makes the same quiet point: a human gates each step — nothing
 * files, sends or advances itself. It turns the sample cast ON so there's real
 * work to see, and never touches real leads.
 *
 * Trigger: `?tour=1` (the /onboarding redirect + the sidebar "Take the tour"),
 * or the first time an owner lands on their cockpit. Resumes across reloads
 * (sessionStorage) so it never restarts mid-walk.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { enableDemoMode } from '@/lib/demoMode';

const SEEN_KEY = 'aisolar_tour_seen';   // gates the one auto-run
const STATE_KEY = 'aisolar_tour_state'; // {active, step} — resume across reloads

interface Stop {
  to: string;            // route (+ ?view=) this stop lives on
  title: string;
  forWhat: string;       // what this screen is FOR
  behind: string;        // what just happened behind it / the human gate
  cta?: string;          // an optional "try it yourself" nudge
}

const STOPS: Stop[] = [
  { to: '/owner?view=overview', title: 'Welcome — your business, at a glance',
    forWhat: 'The one screen you open each morning: what needs you today, what\'s banked, and where the pipeline is stuck.',
    behind: 'Take this tour any time over your next 7 days — poke around, click anything. It runs on sample data and never touches your real leads.' },
  { to: '/owner?view=clients', title: 'The spine — every customer, one board',
    forWhat: 'Enquiry → estimate → survey → proposal → contract → deposit → install → grant pack → handover. Click any lead to open their whole story.',
    behind: 'Nothing moves on its own: every step forward is a person\'s click. The board just makes sure none of them slips.' },
  { to: '/owner?view=estimates', title: 'Where a bill becomes a proposal',
    forWhat: 'The calculator that sizes a system off a real bill or a drawn roof — the same engine your customers use on your website.',
    behind: 'Savings are worked from how the home is actually used, with the right grant and (for business) ex-VAT — so the number holds up on survey.' },
  { to: '/owner?view=seai', title: 'The paperwork, done for you',
    forWhat: 'NC6 and NC7 connection forms and the SEAI grant — filled straight from the survey, ready for a human to check and sign.',
    behind: 'This is the part that used to eat your evenings. The app fills it; you sign it. It never submits itself.' },
  { to: '/owner?view=financials', title: 'Money — and the gate',
    forWhat: 'Deposits and invoices at a glance. When a deposit lands, you pick the crew before the job can move.',
    behind: 'That routing choice is yours — a paid job never auto-assigns. It waits in front of you until you send it to a crew.' },
  { to: '/owner?view=calendar', title: 'Your calendar',
    forWhat: 'Surveys and installs across the week — the same calendar your consultants and installers work from.',
    behind: 'One diary for the whole team, so a survey booked here is the survey the installer sees on their phone.' },

  // ── Consultant sub-walk — the survey ──────────────────────────────────────
  { to: '/consultant', title: 'Your consultant — where the selling happens',
    forWhat: 'The consultant\'s own cockpit: their leads, their chats, and the site survey they run at the house.',
    behind: 'Same customers, their view. What they do here flows straight back to your board — one system, two seats.' },
  { to: '/consultant', title: 'The site survey → the proposal',
    forWhat: 'On the tablet at the house: roof, shading, occupancy — and for anything over a 6kW inverter, the MIC/MEC that decides an NC7.',
    behind: 'The consultant confirms every figure by hand. That confirmed survey is what makes the proposal exact — and it drafts from it in seconds, sent only when they click send.' },

  // ── Installer sub-walk — in the field ─────────────────────────────────────
  { to: '/installer', title: 'Your installer — the day\'s work',
    forWhat: 'The crew\'s jobs for the day, in order, with everything they need on site — no ringing the office.',
    behind: 'A deposit-paid job you routed lands right here on their phone. They see the address, the system, the checklist.' },
  { to: '/installer', title: 'On site → sign-off',
    forWhat: 'Serial numbers scanned, the NC6 fitted-equipment fields captured on the roof, then the triple-check and handover.',
    behind: 'The serials are the gate — the pack can\'t close without them. And a person signs the job off; a human closes it, never a silent checkbox.' },

  // ── Back to the owner — the finale ────────────────────────────────────────
  { to: '/owner?view=agents', title: 'The AI working behind you',
    forWhat: 'Drafting proposals, chasing quietly, prepping the grant — the work that happens while you sleep.',
    behind: 'Every send waits for your say-so. The AI does the typing; you keep the final word — always.' },
  { to: '/owner?view=products', title: 'Your catalogue and prices',
    forWhat: 'The panels, inverters, batteries and the numbers every proposal is built from.',
    behind: 'Change a price here and every future quote moves with it — one place, no drift.' },
  { to: '/owner?view=analytics', title: 'Your week in numbers',
    forWhat: 'What\'s converting, what\'s stuck, and how each consultant is doing.',
    behind: 'The same live data the coach reads — so the advice you get is grounded in your real pipeline, not a guess.' },
  { to: '/owner?view=seai', title: 'The grant pack — see for yourself',
    forWhat: 'Back to the paperwork one more time. Open a job\'s SEAI pack and download it — the real Declaration of Works and data sheets.',
    behind: 'Everything you\'ve just walked is gated by a human: nothing files, sends or submits itself. Download a pack and check it yourself.',
    cta: 'Download a pack below and open it.' },
  { to: '/owner?view=settings', title: 'Make it yours',
    forWhat: 'Your brand, your dials, Teach-your-AI (feed it your story so it sells your way), and the embed widget for your own website.',
    behind: 'Want something changed? Drop a note in "Help us improve" and our agent carries it straight to us. Have fun enjoying what you do again. — AISolar by AIOS' },
];

function readState(): { active: boolean; step: number } {
  try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || '') || { active: false, step: 0 }; }
  catch { return { active: false, step: 0 }; }
}
function writeState(active: boolean, step: number) {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ active, step })); } catch { /* ignore */ }
}

export default function GuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() => readState().active);
  const [i, setI] = useState(() => readState().step);

  const start = useCallback(() => {
    enableDemoMode();
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    setI(0); setOpen(true); writeState(true, 0);
    navigate(STOPS[0].to);
  }, [navigate]);

  const go = (n: number) => {
    setI(n); writeState(true, n);
    navigate(STOPS[n].to);
  };

  const finish = useCallback(() => {
    setOpen(false); writeState(false, 0);
  }, []);

  // The sidebar "Take the tour" relaunch — set up once.
  useEffect(() => {
    window.addEventListener('start-tour', start);
    return () => window.removeEventListener('start-tour', start);
  }, [start]);

  // Auto-run AT MOST ONCE (?tour=1, or the first cockpit visit). The ref guard is
  // load-bearing: without it, if `navigate` changes identity before the URL
  // flushes the `?tour=1` removal, this effect re-fires start() every render →
  // "Maximum update depth" (found on the 5 Aug console sweep). The ref makes the
  // auto-start fire exactly once per mount, independent of navigate's identity.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    const params = new URLSearchParams(location.search);
    let seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
    const onCockpit = location.pathname.startsWith('/owner');
    if (params.get('tour') === '1' || (!seen && onCockpit && !readState().active)) {
      autoStarted.current = true;
      start();
    }
  }, [start, location.pathname, location.search]);

  if (!open) return null;
  const stop = STOPS[i];
  const last = i === STOPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* Soft dim; clicks pass through so the owner can still poke around. */}
      <div className="absolute inset-0 bg-black/15" />

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
              {stop.cta && <p className="mt-1.5 text-xs font-medium text-doc-deposit">↓ {stop.cta}</p>}
            </div>
            <button onClick={finish} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Close tour">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1">
            {STOPS.map((_, k) => (
              <span key={k} className={`h-1 rounded-full transition-all ${k === i ? 'w-4 bg-tech' : 'w-1.5 bg-muted-foreground/30'}`} />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">
              {last ? 'Close' : 'Skip tour'}
            </button>
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
