/**
 * DemoToggle — the owner's sandbox switch (Cal, 5 Aug: "a demo toggle on the
 * left hand sidebar. with leads nothing else — leads. when i flick the demo
 * toggle — not a button — a toggle i want to see the 5 leads across the crm").
 *
 * A real on/off toggle in the owner sidebar footer. ON ⇒ the five-lead cast
 * (one per variant, NC6 + NC7) replaces the pipeline across the CRM; OFF ⇒ the
 * owner's real leads. Flicking it fires `demo-mode-changed`, which every
 * `useLeads` listens for and re-reads. Nothing writes to the real DB while it's
 * on (the sandbox guard in leadWrites / notify).
 */
import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { isDemoMode, enableDemoMode, disableDemoMode, isDemoToggleAvailable } from '@/lib/demoMode';
import { cn } from '@/lib/utils';

export default function DemoToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [on, setOn] = useState(() => isDemoMode());
  const [show, setShow] = useState(() => isDemoToggleAvailable());

  // The toggle only appears for a signed-in owner (or DEV). The session flag
  // resolves a beat after load, so re-check on the demo event + a short settle.
  useEffect(() => {
    const sync = () => { setShow(isDemoToggleAvailable()); setOn(isDemoMode()); };
    const t = setTimeout(sync, 400);
    window.addEventListener('demo-mode-changed', sync);
    return () => { clearTimeout(t); window.removeEventListener('demo-mode-changed', sync); };
  }, []);

  if (!show) return null;

  const flip = () => {
    const next = !on;
    setOn(next);
    if (next) enableDemoMode(); else disableDemoMode();
  };

  if (collapsed) {
    return (
      <button
        onClick={flip}
        role="switch" aria-checked={on} aria-label="Sample data"
        title={on ? 'Sample data ON' : 'Sample data OFF'}
        className={cn('w-full h-control grid place-items-center rounded-md transition-colors',
          on ? 'bg-tech/15 text-tech' : 'text-muted-foreground hover:bg-muted')}
      >
        <FlaskConical className="size-4" />
      </button>
    );
  }

  return (
    <button
      onClick={flip}
      role="switch" aria-checked={on}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-md h-control px-2.5 text-sm font-medium transition-colors',
        on ? 'bg-tech/10 text-foreground border border-tech/25' : 'text-muted-foreground hover:bg-muted border border-transparent',
      )}
    >
      <FlaskConical className={cn('size-4 shrink-0', on && 'text-tech')} />
      <span className="min-w-0 text-left leading-tight">
        Sample data
        <span className="block text-2xs text-muted-foreground font-normal">
          {on ? '5 example leads showing' : 'Show 5 example leads'}
        </span>
      </span>
      {/* The switch track — the affordance that says "toggle", not "button". */}
      <span className={cn('ml-auto shrink-0 relative w-9 h-5 rounded-full transition-colors',
        on ? 'bg-tech' : 'bg-muted-foreground/30')}>
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]',
          on ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}
