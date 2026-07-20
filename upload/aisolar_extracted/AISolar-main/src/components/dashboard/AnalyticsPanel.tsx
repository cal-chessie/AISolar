import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileCheck,
  Star,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Loader2
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface Metrics {
  totalLeads: number;
  totalProposals: number;
  totalCompleted: number;
  conversionRate: number;
  avgDealSize: number;
  totalRevenue: number;
  outstandingPayments: number;
  pendingSeai: number;
  leadsByStatus: { name: string; value: number }[];
  proposalsByMonth: { month: string; count: number; value: number }[];
}

interface AnalyticsPanelProps {
  className?: string;
}

export default function AnalyticsPanel({ className }: AnalyticsPanelProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch all data in parallel
      const [
        { data: leads },
        { data: proposals },
        { data: assignments },
        { data: invoices },
        { data: seaiApps }
      ] = await Promise.all([
        supabase.from('leads').select('id, workflow_stage, created_at'),
        supabase.from('proposals').select('id, status, net_cost, system_cost, created_at, installation_status'),
        supabase.from('assignments').select('id, status, completed_date'),
        supabase.from('invoices').select('total_amount, deposit_paid, final_paid, status'),
        supabase.from('seai_applications').select('status'),
      ]);

      const totalLeads = leads?.length || 0;
      const totalProposals = proposals?.length || 0;
      const approvedProposals = proposals?.filter(p => p.status === 'approved') || [];
      const totalCompleted = proposals?.filter(p => p.installation_status === 'completed').length || 0;

      // Calculate conversion rate
      const conversionRate = totalLeads > 0 ? (approvedProposals.length / totalLeads) * 100 : 0;

      // Calculate average deal size
      const avgDealSize = approvedProposals.length > 0
        ? approvedProposals.reduce((sum, p) => sum + (p.net_cost || 0), 0) / approvedProposals.length
        : 0;

      // Calculate total revenue from approved proposals
      const totalRevenue = invoices?.reduce((sum, inv) => {
        if (inv.deposit_paid) sum += Number(inv.total_amount) * 0.3;
        if (inv.final_paid) sum += Number(inv.total_amount) * 0.7;
        return sum;
      }, 0) || approvedProposals.reduce((sum, p) => sum + (p.net_cost || 0), 0);

      // Outstanding payments
      const outstandingPayments = invoices?.reduce((sum, inv) => {
        if (!inv.deposit_paid) sum += Number(inv.total_amount) * 0.3;
        if (!inv.final_paid && inv.deposit_paid) sum += Number(inv.total_amount) * 0.7;
        return sum;
      }, 0) || 0;

      // SEAI pending
      const pendingSeai = seaiApps?.filter(a => 
        a.status === 'submitted' || a.status === 'under_review'
      ).length || 0;

      // Group leads by workflow stage
      const stageCounts: Record<string, number> = {};
      leads?.forEach(lead => {
        const stage = lead.workflow_stage || 'new';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });
      const leadsByStatus = Object.entries(stageCounts).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value,
      }));

      // Group proposals by month
      const monthCounts: Record<string, { count: number; value: number }> = {};
      proposals?.forEach(proposal => {
        const date = new Date(proposal.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthCounts[monthKey]) {
          monthCounts[monthKey] = { count: 0, value: 0 };
        }
        monthCounts[monthKey].count += 1;
        monthCounts[monthKey].value += proposal.net_cost || 0;
      });
      const proposalsByMonth = Object.entries(monthCounts)
        .map(([month, data]) => ({ month, count: data.count, value: data.value }))
        .slice(-6);

      setMetrics({
        totalLeads,
        totalProposals,
        totalCompleted,
        conversionRate,
        avgDealSize,
        totalRevenue,
        outstandingPayments,
        pendingSeai,
        leadsByStatus,
        proposalsByMonth,
      });
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      toast({
        title: 'Error loading analytics',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return <div className="text-center py-12 text-muted-foreground">Failed to load analytics</div>;
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalLeads}</div>
                <p className="text-xs text-muted-foreground">{metrics.totalProposals} proposals created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
                <Progress value={metrics.conversionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Installs</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalCompleted}</div>
                <p className="text-xs text-muted-foreground">Avg €{metrics.avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })} per deal</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From approved proposals</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.proposalsByMonth.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Proposals by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metrics.proposalsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {metrics.leadsByStatus.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leads by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={metrics.leadsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {metrics.leadsByStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Collected payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">€{metrics.outstandingPayments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Pending payments</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking Dashboard</CardTitle>
              <CardDescription>Revenue and payment analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Deposits Collected</p>
                    <p className="text-sm text-muted-foreground">30% of approved projects</p>
                  </div>
                  <Badge variant="secondary">€{Math.round(metrics.totalRevenue * 0.3).toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Final Payments</p>
                    <p className="text-sm text-muted-foreground">70% of completed projects</p>
                  </div>
                  <Badge variant="secondary">€{Math.round(metrics.totalRevenue * 0.7).toLocaleString()}</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Download className="h-4 w-4 mr-2" />
                Generate Payment Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                SEAI Compliance Timeline
              </CardTitle>
              <CardDescription>Submissions and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">{metrics.pendingSeai} pending</span>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Approved Applications</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">On Track</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm">Under Review</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{metrics.pendingSeai} Pending</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Documents Required</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Action Needed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>Download project documents and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Monthly Financial Report', date: format(new Date(), 'MMMM yyyy'), size: '2.1 MB', type: 'Finance' },
                  { name: 'SEAI Submission Status', date: format(subDays(new Date(), 3), 'MMM d'), size: '890 KB', type: 'Compliance' },
                  { name: 'Installation Progress Report', date: format(subDays(new Date(), 5), 'MMM d'), size: '1.5 MB', type: 'Operations' },
                  { name: 'Customer Survey Analysis', date: format(subDays(new Date(), 7), 'MMM d'), size: '3.2 MB', type: 'Analytics' },
                ].map((report, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Generated {report.date} • {report.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{report.type}</Badge>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
