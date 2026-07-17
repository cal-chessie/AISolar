import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sun, LogOut, ArrowLeft, ArrowRight, Home, FileText, CreditCard, Award } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { brand } from '@/config/brand';
import StatusTimeline from '@/components/customer/StatusTimeline';
import ProposalSummaryCard from '@/components/customer/ProposalSummaryCard';
import InvoiceCard from '@/components/customer/InvoiceCard';
import SEAIGrantStatus from '@/components/seai/SEAIGrantStatus';
import { isDemoMode } from '@/lib/demoMode';

interface ProjectData {
  id: string;
  name: string;
  email: string;
  address: string | null;
  workflow_stage: string | null;
  access_token: string | null;
  proposal: any | null;
  invoice: any | null;
  contract: any | null;
}

const STAGE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'New Lead', variant: 'secondary' },
  survey: { label: 'Survey Started', variant: 'secondary' },
  survey_complete: { label: 'Survey Complete', variant: 'secondary' },
  proposal: { label: 'Proposal Created', variant: 'default' },
  proposal_sent: { label: 'Proposal Sent', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'default' },
  installing: { label: 'Installing', variant: 'default' },
  installed: { label: 'Installed', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (!authLoading && !user && !isDemoMode()) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.email) {
      fetchProjects(user.email);
    } else if (isDemoMode()) {
      // In demo mode, just clear loading — no email to fetch by
      setLoading(false);
    }
  }, [user?.email]);

  const fetchProjects = async (email: string) => {
    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, email, address, workflow_stage, access_token')
        .eq('email', email);

      if (error) throw error;
      if (!leads || leads.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        leads.map(async (lead) => {
          const [{ data: proposals }, { data: invoices }, { data: contracts }] = await Promise.all([
            supabase.from('proposals').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1),
            supabase.from('invoices').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1),
            supabase.from('contracts').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1),
          ]);

          return {
            ...lead,
            proposal: proposals?.[0] || null,
            invoice: invoices?.[0] || null,
            contract: contracts?.[0] || null,
          };
        })
      );

      setProjects(enriched);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({ title: 'Error', description: 'Failed to load your projects.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStage = (stage: string | null) => STAGE_MAP[stage || 'new'] || { label: stage || 'Unknown', variant: 'outline' as const };

  if (authLoading || (!user && !authLoading && !isDemoMode())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // In demo mode with no user, render the empty state
  const demoUser = isDemoMode() && !user ? {
    email: 'demo@aisolar.example',
    user_metadata: { full_name: 'Demo Customer' }
  } : user;

  return (
    <>
      <Helmet>
        <title>My Projects | {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="h-7 w-7 text-primary" />
                <span className="font-bold text-lg">{brand.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">{demoUser?.email}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              onBack={() => setSelectedProject(null)}
            />
          ) : (
            <ProjectList
              projects={projects}
              loading={loading}
              onSelect={setSelectedProject}
              getStage={getStage}
              userName={demoUser?.user_metadata?.full_name || demoUser?.email?.split('@')[0] || 'there'}
            />
          )}
        </main>
      </div>
    </>
  );
}

function ProjectList({
  projects,
  loading,
  onSelect,
  getStage,
  userName,
}: {
  projects: ProjectData[];
  loading: boolean;
  onSelect: (p: ProjectData) => void;
  getStage: (s: string | null) => { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' };
  userName: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your projects...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {userName}</h1>
        <p className="text-muted-foreground mt-1">
          {projects.length > 0
            ? `You have ${projects.length} solar project${projects.length > 1 ? 's' : ''}.`
            : 'No projects found for your account yet.'}
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <Home className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">
              No projects linked to your email yet.<br />
              Contact your solar consultant to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project, idx) => {
            const stage = getStage(project.workflow_stage);
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                  onClick={() => onSelect(project)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        {project.address && (
                          <p className="text-sm text-muted-foreground">{project.address}</p>
                        )}
                        <Badge variant={stage.variant}>{stage.label}</Badge>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        {project.proposal?.system_size_kw && (
                          <span className="font-semibold">{project.proposal.system_size_kw} kWp</span>
                        )}
                        {project.proposal?.net_cost && (
                          <span className="text-sm text-muted-foreground">
                            €{Number(project.proposal.net_cost).toLocaleString()}
                          </span>
                        )}
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function ProjectDetail({ project, onBack }: { project: ProjectData; onBack: () => void }) {
  const stage = project.workflow_stage || 'new';

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {project.address && <p className="text-muted-foreground">{project.address}</p>}
      </div>

      {/* Status Timeline */}
      <div className="mb-6">
        <StatusTimeline
          currentStage={stage}
          proposalStatus={project.proposal?.status}
          contractSigned={!!project.contract}
          depositPaid={project.invoice?.deposit_paid || false}
          installationScheduled={!!project.proposal?.confirmed_install_date}
          installationInProgress={stage === 'installing'}
          installationComplete={['installed', 'completed'].includes(stage)}
          finalPaymentPaid={project.invoice?.final_paid || false}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <Home className="h-4 w-4 mr-1 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="proposal" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
            Proposal
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 mr-1 hidden sm:inline" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="grant" className="text-xs sm:text-sm">
            <Award className="h-4 w-4 mr-1 hidden sm:inline" />
            SEAI Grant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{project.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{project.address || 'Not set'}</p>
                </div>
                {project.proposal && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">System Size</p>
                      <p className="font-medium">{project.proposal.system_size_kw || '—'} kWp</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{project.proposal.status || 'Draft'}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposal">
          {project.proposal ? (
            <ProposalSummaryCard proposal={project.proposal} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-2">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No proposal created yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payment">
          {project.invoice ? (
            <InvoiceCard invoice={project.invoice} portalToken={project.access_token || undefined} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-2">
                <CreditCard className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No invoice generated yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="grant">
          {project.proposal ? (
            <SEAIGrantStatus proposalId={project.proposal.id} leadId={project.id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-2">
                <Award className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">SEAI grant tracking will be available after a proposal is created.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
