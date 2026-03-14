import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sun, Mail, ArrowRight, FileText, Clock, CheckCircle2, LogIn } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { brand } from '@/config/brand';

interface Project {
  id: string;
  name: string;
  email: string;
  address: string | null;
  workflow_stage: string | null;
  access_token: string | null;
  proposal?: {
    status: string | null;
    system_size_kw: number | null;
    net_cost: number | null;
  } | null;
}

export default function ClientPortal() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjects, setShowProjects] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          address,
          workflow_stage,
          access_token
        `)
        .eq('email', email.toLowerCase().trim());

      if (error) throw error;

      if (!leads || leads.length === 0) {
        toast({
          title: 'No Projects Found',
          description: 'We couldn\'t find any projects associated with this email address.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch proposals for each lead
      const projectsWithProposals = await Promise.all(
        leads.map(async (lead) => {
          const { data: proposals } = await supabase
            .from('proposals')
            .select('status, system_size_kw, net_cost')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...lead,
            proposal: proposals?.[0] || null,
          };
        })
      );

      setProjects(projectsWithProposals);
      setShowProjects(true);
    } catch (error: any) {
      console.error('Lookup error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStageDisplay = (stage: string | null) => {
    const stages: Record<string, { label: string; color: string }> = {
      new: { label: 'New Lead', color: 'bg-blue-100 text-blue-700' },
      survey_in_progress: { label: 'Survey In Progress', color: 'bg-amber-100 text-amber-700' },
      survey_complete: { label: 'Survey Complete', color: 'bg-green-100 text-green-700' },
      proposal: { label: 'Proposal Ready', color: 'bg-purple-100 text-purple-700' },
      approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
      installation_scheduled: { label: 'Installation Scheduled', color: 'bg-cyan-100 text-cyan-700' },
      installed: { label: 'Installed', color: 'bg-green-200 text-green-800' },
    };
    return stages[stage || 'new'] || { label: stage || 'Unknown', color: 'bg-gray-100 text-gray-700' };
  };

  const handleViewProject = (project: Project) => {
    if (project.access_token) {
      navigate(`/customer/${project.access_token}`);
    } else {
      toast({
        title: 'Access Not Available',
        description: 'Please contact your consultant for access to this project.',
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Client Portal | {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-8 w-8 text-primary" />
                <span className="font-bold text-xl">{brand.name}</span>
              </div>
              <Button variant="ghost" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {!showProjects ? (
              <>
                {/* Welcome Section */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    Welcome to Your Portal
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Enter your email to view your solar projects
                  </p>
                </div>

                {/* Login Form */}
                <Card className="shadow-xl border-0 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Access Your Projects</CardTitle>
                    <CardDescription>
                      We'll find all projects associated with your email address
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLookup} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1.5"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Looking up...
                          </>
                        ) : (
                          <>
                            Find My Projects
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Features */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Want full access to your projects?</p>
                  <Button variant="outline" onClick={() => navigate('/auth')} className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in for full access
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  {[
                    { icon: FileText, label: 'View Proposals' },
                    { icon: Clock, label: 'Track Progress' },
                    { icon: CheckCircle2, label: 'Manage Payments' },
                  ].map((feature, idx) => (
                    <div key={idx} className="p-4">
                      <feature.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <span className="text-sm text-muted-foreground">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Projects List */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Your Projects</h1>
                    <p className="text-muted-foreground">{projects.length} project(s) found for {email}</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowProjects(false)}>
                    Different Email
                  </Button>
                </div>

                <div className="space-y-4">
                  {projects.map((project) => {
                    const stage = getStageDisplay(project.workflow_stage);
                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleViewProject(project)}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-lg">{project.name}</h3>
                                {project.address && (
                                  <p className="text-sm text-muted-foreground">{project.address}</p>
                                )}
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${stage.color}`}>
                                  {stage.label}
                                </span>
                              </div>
                              <div className="text-right">
                                {project.proposal && (
                                  <>
                                    {project.proposal.system_size_kw && (
                                      <p className="font-semibold">{project.proposal.system_size_kw} kWp System</p>
                                    )}
                                    {project.proposal.net_cost && (
                                      <p className="text-sm text-muted-foreground">
                                        €{project.proposal.net_cost.toLocaleString()}
                                      </p>
                                    )}
                                  </>
                                )}
                                <ArrowRight className="h-5 w-5 text-muted-foreground mt-2 ml-auto" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t bg-background mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
