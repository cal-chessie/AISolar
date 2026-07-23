import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import PageTransition from "@/components/layout/PageTransition";
import GlobalSearchModal from "@/components/search/GlobalSearchModal";
import ProposalPage from "@/pages/ProposalPage";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Pages
import InstallerLanding from "./pages/InstallerLanding";
import NotFound from "./pages/NotFound";
import ValueUpsell from "./pages/ValueUpsell";
import AboutUs from "./pages/AboutUs";
import PrestigiousAuth from "./pages/PrestigiousAuth";
import OnboardingMode from "./pages/OnboardingMode";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DemoIndex from "./pages/DemoIndex";
import ROICalculator from "./pages/ROICalculator";
import AISolarLanding from "./pages/AISolarLanding";
import StartAnalysis from "./pages/StartAnalysis";
import AiosPage from "./pages/AiosPage";
import AiTeamPage from "./pages/AiTeamPageV2";
import PricingPage from "./pages/PricingPage";
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
      <DemoBanner />
      <CookieConsentBanner />
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      {showAICoach && useRoleCoach && <RoleBasedAICoach />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={wrap(<AISolarLanding />)} />
          <Route path="/start" element={wrap(<StartAnalysis />)} />
          <Route path="/upload" element={wrap(<StartAnalysis />)} />
          <Route path="/aios" element={wrap(<AiosPage />)} />
          <Route path="/aiteam" element={wrap(<AiTeamPage />)} />
          <Route path="/pricing" element={wrap(<PricingPage />)} />
          <Route path="/old-landing" element={wrap(<InstallerLanding />)} />
          <Route path="/upsell" element={wrap(<ValueUpsell />)} />
          <Route path="/about" element={wrap(<AboutUs />)} />
          <Route path="/calculator" element={wrap(<ROICalculator />)} />
          <Route path="/privacy" element={wrap(<PrivacyPolicy />)} />
          <Route path="/terms" element={wrap(<TermsOfService />)} />

          {/* Auth + Onboarding */}
          <Route path="/auth" element={wrap(<PrestigiousAuth />)} />
          <Route path="/get-started" element={wrap(<PrestigiousAuth />)} />
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
      </AnimatePresence>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
