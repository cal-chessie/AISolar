import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isDemoMode, isDemoAvailable, disableDemoMode, ALL_ROUTES } from '@/lib/demoMode';
import { X, Compass, ExternalLink, AlertTriangle, FlaskConical } from 'lucide-react';

/**
 * Floating demo banner + navigation menu.
 * Renders only when demo mode is active (dev/staging builds only).
 * In production builds, this component is a no-op.
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
  if (!active) return null;

  const handleExit = () => {
    disableDemoMode();
    setActive(false);
    setMenuOpen(false);
    navigate('/?demo=0');
  };

  return (
    <>
      {/* Floating nav button (bottom-right) */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed bottom-4 right-4 z-[9998] bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105"
        aria-label="Open demo navigation"
      >
        <Compass className="h-5 w-5" />
        Browse Views
      </button>

      {/* Top banner */}
      <div className="fixed top-0 left-0 right-0 z-[9997] bg-violet-600 text-white text-xs font-medium px-3 py-1.5 flex items-center justify-between shadow-md">
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
                <Compass className="h-5 w-5 text-violet-600" />
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
                              ? 'bg-violet-50 border-violet-300 dark:bg-violet-950/30 dark:border-violet-700'
                              : 'hover:bg-muted border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{route.label}</span>
                            {isCurrent && (
                              <span className="text-xs text-violet-600 font-bold">CURRENT</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{route.desc}</p>
                          <p className="text-xs text-violet-600 mt-1 font-mono">{route.path}</p>
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
                  className="block text-center text-sm text-violet-600 hover:underline font-semibold"
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
