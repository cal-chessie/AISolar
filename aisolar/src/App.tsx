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
import PersistentAICoach from "@/components/ai/PersistentAICoach";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import Index from "./pages/Index";
import PremiumIndex from "./pages/PremiumIndex";
import NotFound from "./pages/NotFound";
import ValueUpsell from "./pages/ValueUpsell";
import Auth from "./pages/Auth";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import InstallerPortal from "./pages/InstallerPortal";
import CustomerPortal from "./pages/CustomerPortal";
import ClientPortal from "./pages/ClientPortal";
import AdminSettings from "./pages/AdminSettings";
import AboutUs from "./pages/AboutUs";
import AuditDashboard from "./pages/AuditDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import DemoIndex from "./pages/DemoIndex";
import DemoBanner from "./components/DemoBanner";
import InstallerFirstDashboard from "./components/InstallerFirstDashboard";
import InstallerPortalV2 from "./components/installer/InstallerPortalV2";
import InstallerBOM from "./components/installer/InstallerBOM";
import InstallerPortalV3 from "./components/installer/InstallerPortalV3";
import JobView from "./components/installer/JobView";
import JobViewV2 from "./components/installer/JobViewV2";
import PipelineView from "./components/PipelineView";
import AgentFoundation from "./components/AgentFoundation";
import RoleBasedAICoach from "./components/ai/RoleBasedAICoach";
import CustomerMobilePortal from "./components/customer/CustomerMobilePortal";
import ProfessionalProducts from "./components/ProfessionalProducts";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import SystemSettings from "./components/SystemSettings";
import CommunicationHub from "./components/CommunicationHub";
import ConsultantDashboardV2 from "./components/ConsultantDashboardV2";
import ConsultantCockpitV3 from "./components/ConsultantCockpitV3";
import InstallerIntelligenceBuilder from "./components/InstallerIntelligenceBuilder";
import PrestigiousAuth from "./pages/PrestigiousAuth";
import OnboardingMode from "./pages/OnboardingMode";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
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

  // Only show AI Coach on internal dashboard pages
  const showAICoach = ['/consultant', '/installer', '/admin', '/field', '/pipeline', '/agents'].some(path =>
    location.pathname.startsWith(path)
  );

  // Show role-based coach in demo mode, otherwise old coach (until full cutover)
  const useRoleCoach = isDemoMode();

  return (
    <>
      <DemoBanner />
      <CookieConsentBanner />
      <GlobalSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
      {showAICoach && (useRoleCoach ? <RoleBasedAICoach /> : <PersistentAICoach />)}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><PremiumIndex /></PageTransition>} />
          <Route path="/upload" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/upsell" element={<PageTransition><ValueUpsell /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><PrestigiousAuth /></PageTransition>} />
          <Route path="/auth-legacy" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/demo" element={<PageTransition><DemoIndex /></PageTransition>} />
          <Route path="/onboarding" element={<PageTransition><OnboardingMode /></PageTransition>} />
          <Route path="/consultant" element={<PageTransition><ConsultantCockpitV3 /></PageTransition>} />
          <Route path="/consultant-v2" element={<PageTransition><ConsultantDashboardV2 /></PageTransition>} />
          <Route path="/consultant-legacy" element={<PageTransition><ConsultantDashboard /></PageTransition>} />
          <Route path="/installer" element={<PageTransition><InstallerPortal /></PageTransition>} />
          <Route path="/installer-v2" element={<PageTransition><InstallerFirstDashboard /></PageTransition>} />
          <Route path="/installer-v3" element={<PageTransition><InstallerPortalV2 /></PageTransition>} />
          <Route path="/installer-v4" element={<PageTransition><InstallerPortalV3 /></PageTransition>} />
          <Route path="/job/:leadId" element={<PageTransition><JobViewV2 /></PageTransition>} />
          <Route path="/job" element={<PageTransition><JobViewV2 /></PageTransition>} />
          <Route path="/job-v1" element={<PageTransition><JobView /></PageTransition>} />
          <Route path="/installer-bom" element={<PageTransition><BOMPage /></PageTransition>} />
          <Route path="/pipeline" element={<PageTransition><PipelinePage /></PageTransition>} />
          <Route path="/agents" element={<PageTransition><AgentsPage /></PageTransition>} />
          <Route path="/customer-mobile" element={<PageTransition><CustomerMobilePortal /></PageTransition>} />
          <Route path="/products" element={<PageTransition><ProductsPage /></PageTransition>} />
          <Route path="/intelligence" element={<PageTransition><IntelligencePage /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><AnalyticsPage /></PageTransition>} />
          <Route path="/system-settings" element={<PageTransition><SystemSettingsPage /></PageTransition>} />
          <Route path="/comms" element={<PageTransition><CommsPage /></PageTransition>} />
          <Route path="/customer/:token" element={<PageTransition><CustomerPortal /></PageTransition>} />
          <Route path="/portal" element={<PageTransition><ClientPortal /></PageTransition>} />
          <Route path="/admin/settings" element={<PageTransition><AdminSettings /></PageTransition>} />
          <Route path="/admin/audit" element={<PageTransition><AuditDashboard /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutUs /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/my-projects" element={<PageTransition><CustomerDashboard /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

// Lightweight wrapper pages for the new components
function PipelinePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <PipelineView />
      </div>
    </div>
  );
}

function AgentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <AgentFoundation />
      </div>
    </div>
  );
}

function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <ProfessionalProducts />
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}

function SystemSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <SystemSettings />
      </div>
    </div>
  );
}

function CommsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <CommunicationHub />
      </div>
    </div>
  );
}

function BOMPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <InstallerBOM />
      </div>
    </div>
  );
}

function IntelligencePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <InstallerIntelligenceBuilder />
      </div>
    </div>
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
