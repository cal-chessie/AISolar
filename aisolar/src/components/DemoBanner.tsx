import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isDemoMode, isDemoAvailable, enableDemoMode, disableDemoMode } from '@/lib/demoMode';
import { X, Play } from 'lucide-react';

/**
 * DemoBanner — dev/staging entry + a minimal "you're on sample data" strip.
 *
 * Cal, 5 Aug: "I don't want no Browse Views crap — that's a complete builder's
 * development button." So the route-index navigator + drawer are GONE. What
 * remains is only: a quiet "Demo view" entry (dev/staging), and while sample
 * data is on, a thin honest strip with one Exit. The real control now lives in
 * the owner sidebar (the Sample-data toggle); the guided tour shows the why.
 *
 * Production (no VITE_ENABLE_DEMO) → renders nothing; a real owner's sample mode
 * is the sidebar toggle, no staging banner.
 */
export default function DemoBanner() {
  const [active, setActive] = useState(false);
  const location = useLocation();

  useEffect(() => { setActive(isDemoMode()); }, [location.pathname]);
  useEffect(() => {
    const sync = () => setActive(isDemoMode());
    window.addEventListener('demo-mode-changed', sync);
    return () => window.removeEventListener('demo-mode-changed', sync);
  }, []);

  if (!isDemoAvailable()) return null; // production build → nothing

  const enter = () => { enableDemoMode(); setActive(true); setTimeout(() => window.location.reload(), 0); };
  const exit = () => { disableDemoMode(); setActive(false); setTimeout(() => window.location.reload(), 0); };

  // Sample data OFF — a quiet entry so dev/staging can load the cast.
  if (!active) {
    return (
      <button
        onClick={enter}
        className="fixed bottom-4 right-4 z-[9998] rounded-full border border-border bg-background/95 text-foreground shadow-lg px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 hover:bg-muted"
        aria-label="Load sample data"
        title="Load the sample cast (dev / staging)"
      >
        <Play className="h-3.5 w-3.5 text-primary" /> Demo view
      </button>
    );
  }

  // Sample data ON — one thin honest strip, Exit only. No navigator.
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9997] bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 flex items-center justify-between shadow-md">
        <span><strong>Sample data</strong> — example leads for review. Not a production build.</span>
        <button onClick={exit} className="flex items-center gap-1 hover:underline font-semibold">
          <X className="h-3.5 w-3.5" /> Exit
        </button>
      </div>
      <div style={{ height: '28px' }} aria-hidden="true" />
    </>
  );
}
