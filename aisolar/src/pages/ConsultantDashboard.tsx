import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PremiumDashboard from '@/components/PremiumDashboard';
import SEOHead from '@/components/SEOHead';
import { isDemoMode } from '@/lib/demoMode';

export default function ConsultantDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo mode bypass — let reviewers browse the UI without auth
    if (isDemoMode()) {
      setLoading(false);
      return;
    }

    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && !isDemoMode()) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Consultant Dashboard - Solar Automation Platform"
        description="Manage solar leads, proposals, and installations from your consultant dashboard."
        ogType="website"
      />
      <PremiumDashboard onBackToClient={() => navigate('/')} />
    </>
  );
}
