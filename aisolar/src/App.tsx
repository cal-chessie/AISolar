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
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";

// Pages
import PremiumIndex from "./pages/PremiumIndex";
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

  return (
    <>
      <DemoBanner />
      <CookieConsentBanner />
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      {showAICoach && useRoleCoach && <RoleBasedAICoach />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={<PageTransition><InstallerLanding /></PageTransition>} />
          <Route path="/upsell" element={<PageTransition><ValueUpsell /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutUs /></PageTransition>} />
          <Route path="/calculator" element={<PageTransition><ROICalculator /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />

          {/* Auth + Onboarding */}
          <Route path="/auth" element={<PageTransition><PrestigiousAuth /></PageTransition>} />
          <Route path="/onboarding" element={<PageTransition><OnboardingMode /></PageTransition>} />
          <Route path="/demo" element={<PageTransition><DemoIndex /></PageTransition>} />

          {/* Main views — auth-guarded */}
          <Route path="/owner" element={<PageTransition><ProtectedRoute roles={['admin', 'consultant']}><OwnerCockpit /></ProtectedRoute></PageTransition>} />
          <Route path="/consultant" element={<PageTransition><ProtectedRoute roles={['admin', 'consultant']}><ConsultantCockpitV5 /></ProtectedRoute></PageTransition>} />
          <Route path="/installer" element={<PageTransition><ProtectedRoute roles={['admin', 'installer']}><InstallerPortalV5 /></ProtectedRoute></PageTransition>} />
          <Route path="/my-projects" element={<PageTransition><ProtectedRoute><CustomerPortalV2 /></ProtectedRoute></PageTransition>} />

          {/* Workflow — auth-guarded (staff-only) */}
          <Route path="/lead-flow" element={<PageTransition><ProtectedRoute roles={['admin', 'consultant']}><LeadFlow /></ProtectedRoute></PageTransition>} />
          <Route path="/lead-flow/:leadId" element={<PageTransition><ProtectedRoute roles={['admin', 'consultant']}><LeadFlow /></ProtectedRoute></PageTransition>} />
          <Route path="/job" element={<PageTransition><ProtectedRoute roles={['admin', 'installer']}><JobViewV2 /></ProtectedRoute></PageTransition>} />
          <Route path="/job/:leadId" element={<PageTransition><ProtectedRoute roles={['admin', 'installer']}><JobViewV2 /></ProtectedRoute></PageTransition>} />

          {/* Catch-all */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
