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
import PipelineView from "./components/PipelineView";
import AgentFoundation from "./components/AgentFoundation";
import RoleBasedAICoach from "./components/ai/RoleBasedAICoach";
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
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/demo" element={<PageTransition><DemoIndex /></PageTransition>} />
          <Route path="/consultant" element={<PageTransition><ConsultantDashboard /></PageTransition>} />
          <Route path="/installer" element={<PageTransition><InstallerPortal /></PageTransition>} />
          <Route path="/installer-v2" element={<PageTransition><InstallerFirstDashboard /></PageTransition>} />
          <Route path="/pipeline" element={<PageTransition><PipelinePage /></PageTransition>} />
          <Route path="/agents" element={<PageTransition><AgentsPage /></PageTransition>} />
          <Route path="/customer/:token" element={<PageTransition><CustomerPortal /></PageTransition>} />
          <Route path="/portal" element={<PageTransition><ClientPortal /></PageTransition>} />
          <Route path="/admin/settings" element={<PageTransition><AdminSettings /></PageTransition>} />
          <Route path="/admin/audit" element={<PageTransition><AuditDashboard /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutUs /></PageTransition>} />
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
