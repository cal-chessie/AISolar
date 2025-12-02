import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';

interface Metrics {
  totalLeads: number;
  totalProposals: number;
  totalCompleted: number;
  conversionRate: number;
  avgDealSize: number;
  totalRevenue: number;
  leadsByStatus: { name: string; value: number }[];
  proposalsByMonth: { month: string; count: number; value: number }[];
}

export default function AnalyticsPanel() {
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
        { data: assignments }
      ] = await Promise.all([
        supabase.from('leads').select('id, status, created_at'),
        supabase.from('proposals').select('id, status, net_cost, system_cost, created_at'),
        supabase.from('assignments').select('id, status, completed_date'),
      ]);

      const totalLeads = leads?.length || 0;
      const totalProposals = proposals?.length || 0;
      const approvedProposals = proposals?.filter(p => p.status === 'approved') || [];
      const totalCompleted = assignments?.filter(a => a.status === 'completed').length || 0;

      // Calculate conversion rate (proposals / leads)
      const conversionRate = totalLeads > 0 ? (totalProposals / totalLeads) * 100 : 0;

      // Calculate average deal size from approved proposals
      const avgDealSize = approvedProposals.length > 0
        ? approvedProposals.reduce((sum, p) => sum + (p.net_cost || 0), 0) / approvedProposals.length
        : 0;

      // Calculate total revenue from approved proposals
      const totalRevenue = approvedProposals.reduce((sum, p) => sum + (p.net_cost || 0), 0);

      // Group leads by status
      const statusCounts: Record<string, number> = {};
      leads?.forEach(lead => {
        const status = lead.status || 'new';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const leadsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
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
        .map(([month, data]) => ({
          month,
          count: data.count,
          value: data.value,
        }))
        .slice(-6); // Last 6 months

      setMetrics({
        totalLeads,
        totalProposals,
        totalCompleted,
        conversionRate,
        avgDealSize,
        totalRevenue,
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-center py-12 text-slate-600">Failed to load analytics</div>;
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  const statCards = [
    {
      icon: <Users className="text-blue-500" size={24} />,
      value: metrics.totalLeads,
      label: 'Total Leads',
      color: 'bg-blue-50',
    },
    {
      icon: <FileText className="text-purple-500" size={24} />,
      value: metrics.totalProposals,
      label: 'Proposals Created',
      color: 'bg-purple-50',
    },
    {
      icon: <TrendingUp className="text-green-500" size={24} />,
      value: `${metrics.conversionRate.toFixed(1)}%`,
      label: 'Conversion Rate',
      color: 'bg-green-50',
    },
    {
      icon: <CheckCircle className="text-orange-500" size={24} />,
      value: metrics.totalCompleted,
      label: 'Completed Installs',
      color: 'bg-orange-50',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance Analytics</h2>
      
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`p-4 ${stat.color} rounded-xl border border-slate-200`}>
            <div className="flex items-center gap-3">
              {stat.icon}
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-slate-900">
            €{metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 mt-1">From approved proposals</div>
        </div>
        <div className="p-6 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl border border-purple-200">
          <div className="text-sm text-slate-600 mb-1">Average Deal Size</div>
          <div className="text-3xl font-bold text-slate-900">
            €{metrics.avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-slate-500 mt-1">Per approved proposal</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Proposals by Month */}
        {metrics.proposalsByMonth.length > 0 && (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Proposals by Month</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.proposalsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Proposals']}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leads by Status */}
        {metrics.leadsByStatus.length > 0 && (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Leads by Status</h3>
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
          </div>
        )}
      </div>

      {/* Goal Progress */}
      <div className="mt-6 p-6 bg-gradient-to-r from-primary/10 to-green-50 rounded-xl border border-primary/20">
        <h3 className="font-semibold text-slate-900 mb-2">Monthly Goal Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-400" 
              style={{ width: `${Math.min((metrics.totalRevenue / 50000) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="font-semibold text-primary">
            {Math.min((metrics.totalRevenue / 50000) * 100, 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-sm text-slate-600 mt-2">
          €{metrics.totalRevenue.toLocaleString()} of €50,000 monthly target
        </p>
      </div>
    </div>
  );
}
