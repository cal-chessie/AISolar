import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import Index from "./pages/Index";
import PremiumIndex from "./pages/PremiumIndex";
import NotFound from "./pages/NotFound";
import ValueUpsell from "./pages/ValueUpsell";
import Auth from "./pages/Auth";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import InstallerPortal from "./pages/InstallerPortal";
import CustomerPortal from "./pages/CustomerPortal";
import AdminSettings from "./pages/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PremiumIndex />} />
            <Route path="/upload" element={<Index />} />
            <Route path="/upsell" element={<ValueUpsell />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/consultant" element={<ConsultantDashboard />} />
            <Route path="/installer" element={<InstallerPortal />} />
            <Route path="/customer/:token" element={<CustomerPortal />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
