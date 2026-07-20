import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { isDemoMode, isDemoAvailable, enableDemoMode, ALL_ROUTES } from '@/lib/demoMode';
import { Compass, Zap, ArrowRight, AlertTriangle, Bug, ShieldAlert, Lock } from 'lucide-react';
import { brand } from '@/config/brand';

export default function DemoIndex() {
  const navigate = useNavigate();
  const demoAvailable = isDemoAvailable();

  useEffect(() => {
    // v3: Only auto-enable in dev/staging builds (never production)
    if (demoAvailable) {
      enableDemoMode();
    }
  }, [demoAvailable]);

  const demoActive = isDemoMode();

  // If demo mode is not available (production build), show a lock screen
  if (!demoAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-4">
        <div className="max-w-md text-center">
          <Lock className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Demo mode disabled</h1>
          <p className="text-muted-foreground mb-4">
            This is a production build. Demo mode (which bypasses authentication)
            is disabled for security. Sign in to access internal views.
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-muted"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50 dark:from-violet-950/30 dark:via-background dark:to-emerald-950/20">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Compass className="h-3.5 w-3.5" />
            VIEW INDEX
          </div>
          <h1 className="text-4xl font-bold mb-3">{brand.name} — All Views</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse every internal and customer-facing view without authentication.
            Click any card to open it. Data fetches will show empty or error states —
            that's expected in demo mode.
          </p>
        </div>

        {/* Status banner */}
        <div className={`rounded-xl border p-4 mb-8 flex items-start gap-3 ${
          demoActive
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
        }`}>
          {demoActive ? (
            <Zap className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <strong>{demoActive ? 'Demo mode is ACTIVE.' : 'Demo mode is OFF.'}</strong>{' '}
            {demoActive
              ? 'All auth-gated routes are bypassed. Use the floating "Browse Views" button (bottom-right) on any page to jump between views, or click any card below.'
              : 'Visiting this page auto-enabled demo mode. Refresh to see the floating navigation button.'}
          </div>
        </div>

        {/* Routes by group */}
        <div className="space-y-10">
          {ALL_ROUTES.map((group) => (
            <section key={group.group}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-violet-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                  {ALL_ROUTES.indexOf(group) + 1}
                </span>
                {group.group}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {group.routes.map((route) => (
                  <button
                    key={route.path}
                    onClick={() => navigate(route.path)}
                    className="text-left p-4 rounded-xl border bg-card hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-base group-hover:text-violet-600 transition-colors">
                        {route.label}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{route.desc}</p>
                    <code className="text-xs text-violet-600 dark:text-violet-400 font-mono bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded">
                      {route.path}
                    </code>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Bug audit summary */}
        <section className="mt-12 p-6 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600" />
            Bug Audit Complete
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            I ran a comprehensive code audit and found ~135 bugs across 4 categories.
            A categorized bug list is saved at:
          </p>
          <code className="block bg-background border rounded p-3 text-xs font-mono break-all">
            /home/z/my-project/download/AISolar_Bug_Audit.md
          </code>
          <p className="text-sm text-muted-foreground mt-3">
            Top critical issues: anonymous PII leak via <code>leads</code> RLS,
            client-side role escalation on signup, customer portal tables blocked by RLS,
            missing <code>tenant_id</code> migration, Coinbase webhook signature not verified.
          </p>
        </section>

        {/* Security warning */}
        <section className="mt-6 p-6 rounded-xl border-2 border-dashed border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-red-700 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
            Critical Security Notes
          </h2>
          <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
            <li>
              <strong>Do NOT ship this to production.</strong> Several RLS policies allow
              anonymous reads of customer PII (see bug #5 in the audit).
            </li>
            <li>
              Sign-up flow lets anyone grant themselves the <code>owner</code> role client-side
              (bug #1) — only Supabase RLS is preventing total admin takeover.
            </li>
            <li>
              The <code>/portal</code> email lookup leaks <code>access_token</code>s to anonymous
              callers (bug #10) — combined with the leads RLS hole, the entire customer database
              is publicly enumerable.
            </li>
            <li>
              Edge functions have <code>verify_jwt = false</code> (bug #4) — anyone with the
              function URL can invoke them.
            </li>
          </ul>
        </section>

        {/* Footer */}
        <div className="text-center mt-10 text-sm text-muted-foreground">
          <p>
            Visit <Link to="/?demo=0" className="text-violet-600 hover:underline">the home page</Link>
            {' '}to exit demo mode, or click "Exit Demo" in the top banner.
          </p>
        </div>
      </div>
    </div>
  );
}
