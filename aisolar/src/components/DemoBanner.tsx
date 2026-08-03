import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isDemoMode, isDemoAvailable, enableDemoMode, disableDemoMode, ALL_ROUTES } from '@/lib/demoMode';
import { X, Compass, FlaskConical, Play } from 'lucide-react';

/**
 * Floating demo launcher + all-views navigator (dev/staging only; a no-op in
 * production builds). Two states:
 *   demo OFF → a small "Enter demo" pill (so you can always flip it on + browse)
 *   demo ON  → the STAGING banner + Browse Views drawer (every route, grouped)
 * Cal (3 Aug): "put demo list toggle somewhere so I can view everything properly."
 */
export default function DemoBanner() {
  const [active, setActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setActive(isDemoMode());
  }, [location.pathname]);

  // In production builds, render nothing.
  if (!isDemoAvailable()) return null;

  const handleExit = () => {
    disableDemoMode();
    setActive(false);
    setMenuOpen(false);
    navigate('/?demo=0');
  };

  const handleEnter = () => {
    enableDemoMode();
    setActive(true);
    // demo mode swaps to the fabricated cast; reload so every mounted view picks it up.
    navigate(location.pathname + '?demo=1');
    setTimeout(() => window.location.reload(), 0);
  };

  // DEMO OFF — a quiet launcher so demo is always one tap away.
  if (!active) {
    return (
      <button
        onClick={handleEnter}
        className="fixed bottom-4 right-4 z-[9998] rounded-full border border-border bg-background/95 text-foreground shadow-lg px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 hover:bg-muted"
        aria-label="Enter demo view"
        title="Load the demo cast + browse every view"
      >
        <Play className="h-3.5 w-3.5 text-primary" /> Demo view
      </button>
    );
  }

  return (
    <>
      {/* Floating nav button (bottom-right) */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed bottom-4 right-4 z-[9998] bg-primary hover:bg-primary text-primary-foreground rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105"
        aria-label="Open demo navigation"
      >
        <Compass className="h-5 w-5" />
        Browse Views
      </button>

      {/* Top banner */}
      <div className="fixed top-0 left-0 right-0 z-[9997] bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5" />
          <span>
            <strong>STAGING PREVIEW</strong> — Auth bypassed for review. Not a production build.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/demo"
            className="underline hover:no-underline font-semibold"
          >
            Route Index
          </Link>
          <button
            onClick={handleExit}
            className="flex items-center gap-1 hover:underline font-semibold"
          >
            <X className="h-3.5 w-3.5" /> Exit Demo
          </button>
        </div>
      </div>

      {/* Spacer so the banner doesn't cover content */}
      <div style={{ height: '28px' }} aria-hidden="true" />

      {/* Slide-out navigation drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center sm:justify-end"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-background text-foreground w-full sm:max-w-md sm:h-full h-[80vh] overflow-y-auto shadow-2xl border-l sm:rounded-l-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                All Views
              </h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 hover:bg-muted rounded"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {ALL_ROUTES.map((group) => (
                <div key={group.group}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    {group.group}
                  </h3>
                  <div className="space-y-1.5">
                    {group.routes.map((route) => {
                      const isCurrent = location.pathname === route.path ||
                        (route.path !== '/' && location.pathname.startsWith(route.path));
                      return (
                        <button
                          key={route.path}
                          onClick={() => {
                            navigate(route.path);
                            setMenuOpen(false);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isCurrent
                              ? 'bg-primary/10 border-primary/40 dark:bg-primary/10 dark:border-primary/40'
                              : 'hover:bg-muted border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{route.label}</span>
                            {isCurrent && (
                              <span className="text-xs text-primary font-bold">CURRENT</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{route.desc}</p>
                          <p className="text-xs text-primary mt-1 font-mono">{route.path}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border-t pt-4 mt-4">
                <Link
                  to="/demo"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center text-sm text-primary hover:underline font-semibold"
                >
                  View full route index page →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
