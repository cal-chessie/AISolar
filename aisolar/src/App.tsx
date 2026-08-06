import { useState, useEffect, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import PageTransition from "@/components/layout/PageTransition";
import GlobalSearchModal from "@/components/search/GlobalSearchModal";
import ProposalPage from "@/pages/ProposalPage";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Code-split the heavy authed surfaces so the public landing + portal don't
// ship all three cockpits (cut the 1.44MB main chunk). Proven lazyWithRetry
// pattern (survives a stale-chunk fetch after a deploy).
const AgentFoundation = lazyWithRetry(() => import("./components/AgentFoundation"));
const ConsultantCockpitV5 = lazyWithRetry(() => import("./components/ConsultantCockpitV5"));
const OwnerCockpit = lazyWithRetry(() => import("./components/OwnerCockpit"));
const LeadFlow = lazyWithRetry(() => import("./components/LeadFlow"));
const JobViewV2 = lazyWithRetry(() => import("./components/installer/JobViewV2"));
const InstallerPortalV5 = lazyWithRetry(() => import("./components/installer/InstallerPortalV5"));
const CustomerPortalV2 = lazyWithRetry(() => import("./components/customer/CustomerPortalV2"));
const CustomerPortalTokenRoute = lazyWithRetry(() => import("./components/customer/CustomerPortalTokenRoute"));

// Pages
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import AuthPage from "./pages/AuthPage";
import InstallerSignup from "./pages/InstallerSignup";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ROICalculator from "./pages/ROICalculator";
import CalculatorWidget from "./components/calculator/CalculatorWidget";
import FAQ from "./pages/FAQ";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import AISolarLanding from "./pages/AISolarLanding";
import StartAnalysis from "./pages/StartAnalysis";
import AiosPage from "./pages/AiosPage";
import AiTeamPage from "./pages/AiTeamPageV2";
import PricingPage from "./pages/PricingPage";
import DocsPage from "./pages/DocsPage";
import AgentsPage from "./pages/AgentsPage";

// Components (current versions only — no legacy)
import RoleBasedAICoach from "./components/ai/RoleBasedAICoach";
import DemoBanner from "./components/DemoBanner";
import GuidedTour from "@/components/demo/GuidedTour";
import OfflineIndicator from "@/components/OfflineIndicator";
import ProtectedRoute from "./components/ProtectedRoute";
import { CookieConsentBanner } from "./lib/gdpr";
import { isDemoMode } from "./lib/demoMode";

const queryClient = new QueryClient();

/**
 * ScrollToTop — React Router keeps the window scroll position across route
 * changes, so clicking any link while scrolled down dropped you into the middle
 * (or bottom) of the next page. Every click-through in the app was doing this.
 *
 * Rules:
 *  - PUSH/REPLACE (a click) → go to the top of the new page.
 *  - POP (browser back/forward) → leave it alone; the browser restores the
 *    position the user expects.
 *  - #hash links → scroll to that element instead of the top.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === 'POP') return;

    if (hash) {
      // Let the target render before we look for it.
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView({ block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, navType]);

  return null;
}

function AppRoutes() {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useGlobalShortcuts({
    onSearch: () => setIsSearchOpen(true),
    onEscape: () => setIsSearchOpen(false),
  });

  const showAICoach = ['/consultant', '/installer', '/admin', '/owner', '/pipeline', '/agent-console'].some(path =>
    location.pathname.startsWith(path)
  );

  // /embed is the chrome-less widget dropped into a tenant's own site (iframe) —
  // the host page owns its own banners, so we suppress ours entirely here.
  const isEmbed = location.pathname.startsWith('/embed');

  const useRoleCoach = isDemoMode();

  // Wrap each route in an ErrorBoundary so a render crash in one view doesn't
  // blank the whole app. The boundary renders a friendly "Something went wrong"
  // card with a Reload button.
  const wrap = (node: React.ReactNode) => (
    <PageTransition>
      <ErrorBoundary>{node}</ErrorBoundary>
    </PageTransition>
  );

  return (
    <>
      {!isEmbed && <DemoBanner />}
      {!isEmbed && <GuidedTour />}
      {!isEmbed && <CookieConsentBanner />}
      {!isEmbed && <OfflineIndicator />}
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      {showAICoach && useRoleCoach && <RoleBasedAICoach />}
      <Suspense fallback={<div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">Loading…</div>}>
      <Routes location={location} key={location.pathname}>
          {/* Public */}
          {/* Cal: AIOS is the homescreen; AISolar is the first product page */}
          <Route path="/" element={wrap(<AiosPage />)} />
          <Route path="/aisolar" element={wrap(<AISolarLanding />)} />
          <Route path="/start" element={wrap(<StartAnalysis />)} />
          <Route path="/upload" element={wrap(<StartAnalysis />)} />
          <Route path="/aios" element={wrap(<AiosPage />)} />{/* alias until domains split */}
          <Route path="/aiteam" element={wrap(<AiTeamPage />)} />
          <Route path="/pricing" element={wrap(<PricingPage />)} />
          <Route path="/docs" element={wrap(<DocsPage />)} />
          <Route path="/agents" element={wrap(<AgentsPage />)} />{/* public: the ten agents */}
          <Route path="/about" element={wrap(<AboutUs />)} />
          <Route path="/faq" element={wrap(<FAQ />)} />
          <Route path="/blog" element={wrap(<Blog />)} />
          <Route path="/blog/:slug" element={wrap(<BlogArticle />)} />
          <Route path="/calculator" element={wrap(<ROICalculator />)} />
          {/* Chrome-less embeddable widget — tenant pastes this in an iframe */}
          <Route path="/embed" element={<ErrorBoundary><CalculatorWidget /></ErrorBoundary>} />
          <Route path="/privacy" element={wrap(<PrivacyPolicy />)} />
          <Route path="/terms" element={wrap(<TermsOfService />)} />

          {/* Auth + Onboarding */}
          <Route path="/auth" element={wrap(<AuthPage />)} />
          <Route path="/get-started" element={wrap(<AuthPage />)} />
          {/* A1 — the AISolar-site door: installer signup (provisions a tenant) vs
              property estimate. INSTALLER copy; card-payer becomes admin. */}
          <Route path="/signup" element={wrap(<InstallerSignup />)} />
          <Route path="/onboarding" element={<Navigate to="/owner?tour=1" replace />} />

          {/* Main views — auth-guarded */}
          <Route path="/owner" element={wrap(<ProtectedRoute roles={['admin', 'owner']}><OwnerCockpit /></ProtectedRoute>)} />
          <Route path="/consultant" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'consultant']}><ConsultantCockpitV5 /></ProtectedRoute>)} />
          <Route path="/installer" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'installer']}><InstallerPortalV5 /></ProtectedRoute>)} />
          <Route path="/my-projects" element={wrap(<ProtectedRoute><CustomerPortalV2 /></ProtectedRoute>)} />
          {/* P0: the customer MAGIC LINK — token IS the auth (RLS can_see_lead);
              also the Stripe/Coinbase return URL (?payment=success|cancelled). */}
          <Route path="/customer/:token" element={wrap(<CustomerPortalTokenRoute />)} />
          {/* #6: agent calendar events navigate here — was a 404 stub */}
          <Route path="/agent-console" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'consultant']}><AgentFoundation /></ProtectedRoute>)} />{/* in-app agent console (was /agents) */}
          <Route path="/p/:leadId" element={wrap(<ProposalPage />)} />

          {/* Workflow — auth-guarded (staff-only) */}
          <Route path="/lead-flow" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'consultant']}><LeadFlow /></ProtectedRoute>)} />
          <Route path="/lead-flow/:leadId" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'consultant']}><LeadFlow /></ProtectedRoute>)} />
          <Route path="/job" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'installer']}><JobViewV2 /></ProtectedRoute>)} />
          <Route path="/job/:leadId" element={wrap(<ProtectedRoute roles={['admin', 'owner', 'installer']}><JobViewV2 /></ProtectedRoute>)} />

          {/* Catch-all */}
          <Route path="*" element={wrap(<NotFound />)} />
      </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* SEOHead sets <head> tags directly (helmet v2 silently no-op'd under
        React 18 createRoot) — no provider needed. */}
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
