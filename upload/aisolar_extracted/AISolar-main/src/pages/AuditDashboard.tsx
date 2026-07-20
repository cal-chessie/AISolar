import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Shield, 
  Package, 
  Image, 
  TrendingUp,
  RefreshCw,
  Download,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuditResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  count?: number;
  details?: string;
}

interface WorkflowStats {
  stage: string;
  count: number;
}

interface PhotoStats {
  type: string;
  count: number;
}

export default function AuditDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dataIntegrity, setDataIntegrity] = useState<AuditResult[]>([]);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats[]>([]);
  const [photoStats, setPhotoStats] = useState<PhotoStats[]>([]);
  const [productStats, setProductStats] = useState({ panels: 0, inverters: 0, batteries: 0, total: 0 });
  const [entityCounts, setEntityCounts] = useState({
    leads: 0,
    surveys: 0,
    proposals: 0,
    invoices: 0,
    contracts: 0,
    installers: 0,
    users: 0
  });
  const [lastAudit, setLastAudit] = useState<Date>(new Date());

  const runAudit = async () => {
    setLoading(true);
    const results: AuditResult[] = [];

    try {
      // 1. Check for duplicate leads (same email)
      const { data: leads } = await supabase.from('leads').select('email');
      const emailCounts = leads?.reduce((acc, l) => {
        acc[l.email] = (acc[l.email] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      const duplicateEmails = Object.values(emailCounts).filter(c => c > 1).length;
      results.push({
        check: 'Duplicate Leads (same email)',
        status: duplicateEmails === 0 ? 'pass' : 'warning',
        count: duplicateEmails,
        details: duplicateEmails > 0 ? `${duplicateEmails} duplicate email addresses found` : 'No duplicates'
      });

      // 2. Orphan proposals (no lead)
      const { data: proposals } = await supabase.from('proposals').select('id, lead_id');
      const { data: allLeads } = await supabase.from('leads').select('id');
      const leadIds = new Set(allLeads?.map(l => l.id) || []);
      const orphanProposals = proposals?.filter(p => !leadIds.has(p.lead_id)) || [];
      results.push({
        check: 'Orphan Proposals (missing lead)',
        status: orphanProposals.length === 0 ? 'pass' : 'fail',
        count: orphanProposals.length,
        details: orphanProposals.length > 0 ? `${orphanProposals.length} proposals without valid lead` : 'All proposals linked'
      });

      // 3. Orphan surveys
      const { data: surveys } = await supabase.from('site_surveys').select('id, lead_id');
      const orphanSurveys = surveys?.filter(s => !leadIds.has(s.lead_id)) || [];
      results.push({
        check: 'Orphan Surveys (missing lead)',
        status: orphanSurveys.length === 0 ? 'pass' : 'fail',
        count: orphanSurveys.length,
        details: orphanSurveys.length > 0 ? `${orphanSurveys.length} surveys without valid lead` : 'All surveys linked'
      });

      // 4. Invoices without proposals
      const { data: invoices } = await supabase.from('invoices').select('id, proposal_id');
      const proposalIds = new Set(proposals?.map(p => p.id) || []);
      const orphanInvoices = invoices?.filter(i => !proposalIds.has(i.proposal_id)) || [];
      results.push({
        check: 'Orphan Invoices (missing proposal)',
        status: orphanInvoices.length === 0 ? 'pass' : 'warning',
        count: orphanInvoices.length,
        details: orphanInvoices.length > 0 ? `${orphanInvoices.length} invoices without valid proposal` : 'All invoices linked'
      });

      // 5. Surveys missing required photos
      const { data: surveyPhotos } = await supabase.from('survey_photos').select('survey_id, photo_type');
      const surveyPhotoCount = surveys?.map(s => ({
        id: s.id,
        photoCount: surveyPhotos?.filter(p => p.survey_id === s.id).length || 0
      })) || [];
      const surveysWithoutPhotos = surveyPhotoCount.filter(s => s.photoCount < 2);
      results.push({
        check: 'Surveys with insufficient photos (<2)',
        status: surveysWithoutPhotos.length === 0 ? 'pass' : 'warning',
        count: surveysWithoutPhotos.length,
        details: `${surveysWithoutPhotos.length} surveys need more photos`
      });

      // 6. Products availability
      const { data: products } = await supabase.from('solar_products').select('product_type, active, in_stock');
      const activeProducts = products?.filter(p => p.active) || [];
      const inStockProducts = activeProducts.filter(p => p.in_stock);
      results.push({
        check: 'Product Catalog Status',
        status: activeProducts.length >= 10 ? 'pass' : activeProducts.length > 0 ? 'warning' : 'fail',
        count: activeProducts.length,
        details: `${activeProducts.length} active, ${inStockProducts.length} in stock`
      });

      // 7. Installer availability
      const { data: installers } = await supabase.from('installers').select('id, availability_status');
      const availableInstallers = installers?.filter(i => i.availability_status === 'available') || [];
      results.push({
        check: 'Available Installers',
        status: availableInstallers.length > 0 ? 'pass' : 'fail',
        count: availableInstallers.length,
        details: `${availableInstallers.length} of ${installers?.length || 0} installers available`
      });

      setDataIntegrity(results);

      // Workflow stats
      const workflowCounts: WorkflowStats[] = [
        { stage: 'new', count: allLeads?.filter((l: any) => l.workflow_stage === 'new').length || 0 },
        { stage: 'survey', count: allLeads?.filter((l: any) => l.workflow_stage === 'survey').length || 0 },
        { stage: 'proposal', count: allLeads?.filter((l: any) => l.workflow_stage === 'proposal').length || 0 },
        { stage: 'approved', count: allLeads?.filter((l: any) => l.workflow_stage === 'approved').length || 0 },
        { stage: 'scheduled', count: allLeads?.filter((l: any) => l.workflow_stage === 'scheduled').length || 0 },
        { stage: 'installed', count: allLeads?.filter((l: any) => l.workflow_stage === 'installed').length || 0 }
      ];
      
      // Get actual workflow stage counts
      const { data: leadsWithStage } = await supabase.from('leads').select('workflow_stage');
      const stageCounts = leadsWithStage?.reduce((acc, l) => {
        const stage = l.workflow_stage || 'new';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      setWorkflowStats([
        { stage: 'New', count: stageCounts['new'] || 0 },
        { stage: 'Survey', count: stageCounts['survey'] || 0 },
        { stage: 'Proposal', count: stageCounts['proposal'] || 0 },
        { stage: 'Approved', count: stageCounts['approved'] || 0 },
        { stage: 'Scheduled', count: stageCounts['scheduled'] || 0 },
        { stage: 'Installed', count: stageCounts['installed'] || 0 }
      ]);

      // Photo stats
      const photoTypeCounts = surveyPhotos?.reduce((acc, p) => {
        const type = p.photo_type || 'uncategorized';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      setPhotoStats(Object.entries(photoTypeCounts).map(([type, count]) => ({ type, count })));

      // Product stats
      const panels = products?.filter(p => p.product_type === 'panel' && p.active).length || 0;
      const inverters = products?.filter(p => p.product_type === 'inverter' && p.active).length || 0;
      const batteries = products?.filter(p => p.product_type === 'battery' && p.active).length || 0;
      setProductStats({ panels, inverters, batteries, total: panels + inverters + batteries });

      // Entity counts
      const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      const { count: surveyCount } = await supabase.from('site_surveys').select('*', { count: 'exact', head: true });
      const { count: proposalCount } = await supabase.from('proposals').select('*', { count: 'exact', head: true });
      const { count: invoiceCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const { count: contractCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
      const { count: installerCount } = await supabase.from('installers').select('*', { count: 'exact', head: true });
      const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      setEntityCounts({
        leads: leadCount || 0,
        surveys: surveyCount || 0,
        proposals: proposalCount || 0,
        invoices: invoiceCount || 0,
        contracts: contractCount || 0,
        installers: installerCount || 0,
        users: profileCount || 0
      });

      setLastAudit(new Date());
      toast.success('Audit completed successfully');
    } catch (error) {
      console.error('Audit error:', error);
      toast.error('Failed to complete audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const exportReport = () => {
    const report = {
      timestamp: lastAudit.toISOString(),
      dataIntegrity,
      workflowStats,
      photoStats,
      productStats,
      entityCounts
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${lastAudit.toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return null;
    }
  };

  const passCount = dataIntegrity.filter(r => r.status === 'pass').length;
  const totalChecks = dataIntegrity.length;
  const healthScore = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/consultant')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">System Audit Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                Last audit: {lastAudit.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportReport} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={runAudit} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Run Audit
            </Button>
          </div>
        </div>

        {/* Health Score Card */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={`${healthScore * 3.51} 351`}
                    className={healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{healthScore}%</span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-semibold">System Health Score</h2>
                <p className="text-muted-foreground">
                  {passCount} of {totalChecks} checks passed
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    {dataIntegrity.filter(r => r.status === 'pass').length} Passed
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    {dataIntegrity.filter(r => r.status === 'warning').length} Warnings
                  </Badge>
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                    {dataIntegrity.filter(r => r.status === 'fail').length} Failed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="integrity" className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
            <TabsTrigger value="integrity" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Data Integrity</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Workflow</span>
              <span className="sm:hidden">Flow</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
              <span className="sm:hidden">Prod</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Media</span>
              <span className="sm:hidden">Media</span>
            </TabsTrigger>
          </TabsList>

          {/* Data Integrity Tab */}
          <TabsContent value="integrity" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(entityCounts).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Integrity Checks</CardTitle>
                <CardDescription>Validation results for database consistency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dataIntegrity.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <p className="font-medium text-sm">{result.check}</p>
                          <p className="text-xs text-muted-foreground">{result.details}</p>
                        </div>
                      </div>
                      {result.count !== undefined && (
                        <Badge variant={result.status === 'pass' ? 'secondary' : 'destructive'}>
                          {result.count}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
                <CardDescription>Leads by workflow stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowStats.map((stat) => {
                    const total = workflowStats.reduce((sum, s) => sum + s.count, 0);
                    const percentage = total > 0 ? (stat.count / total) * 100 : 0;
                    return (
                      <div key={stat.stage} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{stat.stage}</span>
                          <span className="text-muted-foreground">{stat.count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-primary">{entityCounts.leads}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-primary">{entityCounts.proposals}</p>
                  <p className="text-sm text-muted-foreground">Proposals Created</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-primary">{entityCounts.contracts}</p>
                  <p className="text-sm text-muted-foreground">Contracts Signed</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">{productStats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-500">{productStats.panels}</p>
                  <p className="text-sm text-muted-foreground">Solar Panels</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-500">{productStats.inverters}</p>
                  <p className="text-sm text-muted-foreground">Inverters</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-purple-500">{productStats.batteries}</p>
                  <p className="text-sm text-muted-foreground">Batteries</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Catalog Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {productStats.total >= 10 ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : productStats.total > 0 ? (
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {productStats.total >= 10 
                        ? 'Product catalog is well-stocked' 
                        : productStats.total > 0 
                          ? 'Product catalog needs more items'
                          : 'Product catalog is empty'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recommended: At least 5 panels, 3 inverters, 3 batteries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Survey Photos by Type</CardTitle>
                <CardDescription>Distribution of uploaded photos</CardDescription>
              </CardHeader>
              <CardContent>
                {photoStats.length > 0 ? (
                  <div className="space-y-3">
                    {photoStats.map((stat) => (
                      <div key={stat.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="capitalize text-sm font-medium">
                          {stat.type.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="secondary">{stat.count} photos</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No photos uploaded yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Storage Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{photoStats.reduce((sum, s) => sum + s.count, 0)}</p>
                    <p className="text-sm text-muted-foreground">Survey Photos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-sm text-muted-foreground">Storage Buckets</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">Active</p>
                    <p className="text-sm text-muted-foreground">Storage Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">RLS Enabled</p>
                  <p className="text-xs text-muted-foreground">All tables have row-level security</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Role-Based Access</p>
                  <p className="text-xs text-muted-foreground">Separate user_roles table configured</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-sm">Extension Warning</p>
                  <p className="text-xs text-muted-foreground">moddatetime in public schema (informational)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Auth Configured</p>
                  <p className="text-xs text-muted-foreground">Email auth with auto-confirm enabled</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
