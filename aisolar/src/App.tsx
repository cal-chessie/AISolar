import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import PageTransition from "@/components/layout/PageTransition";
import GlobalSearchModal from "@/components/search/GlobalSearchModal";
import ProposalPage from "@/pages/ProposalPage";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Pages
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import AuthPage from "./pages/AuthPage";
import OnboardingMode from "./pages/OnboardingMode";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DemoIndex from "./pages/DemoIndex";
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
import AgentFoundation from "./components/AgentFoundation";

// Components (current versions only — no legacy)
import ConsultantCockpitV5 from "./components/ConsultantCockpitV5";
import OwnerCockpit from "./components/OwnerCockpit";
import LeadFlow from "./components/LeadFlow";
import JobViewV2 from "./components/installer/JobViewV2";
import InstallerPortalV5 from "./components/installer/InstallerPortalV5";
import CustomerPortalV2 from "./components/customer/CustomerPortalV2";
import RoleBasedAICoach from "./components/ai/RoleBasedAICoach";
import DemoBanner from "./components/DemoBanner";
import ProtectedRoute from "./components/ProtectedRoute";
import { CookieConsentBanner } from "./lib/gdpr";
import { isDemoMode } from "./lib/demoMode";

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useGlobalShortcuts({
    onSearch: () => setIsSearchOpen(true),
    onEscape: () => setIsSearchOpen(false),
  });

  const showAICoach = ['/consultant', '/installer', '/admin', '/owner', '/pipeline', '/agents'].some(path =>
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
      {!isEmbed && <CookieConsentBanner />}
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      {showAICoach && useRoleCoach && <RoleBasedAICoach />}
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
          <Route path="/onboarding" element={wrap(<OnboardingMode />)} />
          <Route path="/demo" element={wrap(<DemoIndex />)} />

          {/* Main views — auth-guarded */}
          <Route path="/owner" element={wrap(<ProtectedRoute roles={['admin', 'consultant']}><OwnerCockpit /></ProtectedRoute>)} />
          <Route path="/consultant" element={wrap(<ProtectedRoute roles={['admin', 'consultant']}><ConsultantCockpitV5 /></ProtectedRoute>)} />
          <Route path="/installer" element={wrap(<ProtectedRoute roles={['admin', 'installer']}><InstallerPortalV5 /></ProtectedRoute>)} />
          <Route path="/my-projects" element={wrap(<ProtectedRoute><CustomerPortalV2 /></ProtectedRoute>)} />
          {/* #6: agent calendar events navigate here — was a 404 stub */}
          <Route path="/agents" element={wrap(<ProtectedRoute roles={['admin', 'consultant']}><AgentFoundation /></ProtectedRoute>)} />
          <Route path="/p/:leadId" element={wrap(<ProposalPage />)} />

          {/* Workflow — auth-guarded (staff-only) */}
          <Route path="/lead-flow" element={wrap(<ProtectedRoute roles={['admin', 'consultant']}><LeadFlow /></ProtectedRoute>)} />
          <Route path="/lead-flow/:leadId" element={wrap(<ProtectedRoute roles={['admin', 'consultant']}><LeadFlow /></ProtectedRoute>)} />
          <Route path="/job" element={wrap(<ProtectedRoute roles={['admin', 'installer']}><JobViewV2 /></ProtectedRoute>)} />
          <Route path="/job/:leadId" element={wrap(<ProtectedRoute roles={['admin', 'installer']}><JobViewV2 /></ProtectedRoute>)} />

          {/* Catch-all */}
          <Route path="*" element={wrap(<NotFound />)} />
      </Routes>
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
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
