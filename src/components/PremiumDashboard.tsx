import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar,
  Zap,
  ArrowUp,
  ArrowDown,
  Star,
  LogOut,
  Eye
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import LeadDetailView from './LeadDetailView';
import ProposalQuestionnaire from './ProposalQuestionnaire';
import ProposalResultsView from './ProposalResultsView';
import ProductsManagement from './ProductsManagement';
interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend: { value: string; positive: boolean };
  color: string;
}

const StatCard = ({ icon, value, label, trend, color }: StatCardProps) => (
  <motion.div 
    className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all cursor-pointer"
    whileHover={{ scale: 1.02, y: -2 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600 mt-1">{label}</div>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
        trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}>
        {trend.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {trend.value}
      </div>
    </div>
  </motion.div>
);

type TabType = 'leads' | 'proposals' | 'installations' | 'products' | 'analytics';

export default function PremiumDashboard({ onBackToClient }: { onBackToClient?: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadData, setSelectedLeadData] = useState<any | null>(null);
  const [activeLeadForProposal, setActiveLeadForProposal] = useState<any | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast({
      title: 'Logged out successfully',
      description: 'You have been signed out.',
    });
  };

  const stats = [
    {
      icon: <Users className="text-blue-500" size={24} />,
      value: 47,
      label: 'Total Leads',
      trend: { value: '+12%', positive: true },
      color: 'text-blue-500'
    },
    {
      icon: <TrendingUp className="text-green-500" size={24} />,
      value: '23%',
      label: 'Conversion Rate',
      trend: { value: '+5%', positive: true },
      color: 'text-green-500'
    },
    {
      icon: <FileText className="text-purple-500" size={24} />,
      value: '€8,450',
      label: 'Avg Deal Size',
      trend: { value: '+8%', positive: true },
      color: 'text-purple-500'
    },
    {
      icon: <Calendar className="text-orange-500" size={24} />,
      value: 12,
      label: 'Pending',
      trend: { value: '-3%', positive: false },
      color: 'text-orange-500'
    }
  ];

  const tabs = [
    { id: 'leads' as TabType, label: 'Leads' },
    { id: 'proposals' as TabType, label: 'Proposals' },
    { id: 'installations' as TabType, label: 'Installations' },
    { id: 'products' as TabType, label: 'Products' },
    { id: 'analytics' as TabType, label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen gradient-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Solar Dublin</h1>
              <p className="text-slate-600 mt-1">Consultant Portal</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
                onClick={() => {
                  if (!activeLeadForProposal) {
                    toast({
                      title: 'Select a lead first',
                      description: 'Open a lead from the Leads tab to start a proposal.',
                    });
                    setActiveTab('leads');
                    return;
                  }
                  setActiveTab('proposals');
                }}
                aria-label="Create new proposal"
              >
                <Zap size={20} />
                New Proposal
              </button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </Button>
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-lg cursor-pointer hover:shadow-lg transition-all">
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <StatCard key={idx} {...stat} />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Tabs & Content */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs */}
            <nav className="flex gap-2 mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.id
                      ? 'gradient-primary text-white shadow-lg'
                      : 'bg-card text-slate-600 hover:bg-slate-50 border border-border'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-2xl border border-border shadow-lg p-6 min-h-[600px]"
              >
                {activeTab === 'leads' && (
                  <LeadsPanel
                    onLeadSelect={(lead) => {
                      setSelectedLeadData(lead);
                      setSelectedLeadId(lead.id);
                      setActiveLeadForProposal(lead);
                    }}
                  />
                )}
                {activeTab === 'proposals' && (
                  viewMode === 'view' && selectedProposal ? (
                    <ProposalResultsView
                      proposalId={selectedProposal.id}
                      leadId={selectedProposal.lead_id}
                      onBack={() => {
                        setViewMode('list');
                        setSelectedProposal(null);
                      }}
                    />
                  ) : viewMode === 'edit' && selectedProposal ? (
                    <ProposalQuestionnaire
                      leadId={selectedProposal.lead_id}
                      proposalId={selectedProposal.id}
                      onBack={() => {
                        setViewMode('list');
                        setSelectedProposal(null);
                      }}
                    />
                  ) : activeLeadForProposal ? (
                    <ProposalQuestionnaire
                      leadId={activeLeadForProposal.id}
                      onBack={() => {
                        setActiveLeadForProposal(null);
                        setViewMode('list');
                      }}
                    />
                  ) : (
                    <ProposalsPanel 
                      onProposalSelect={(proposal, lead) => {
                        setSelectedProposal(proposal);
                        setViewMode('view');
                      }}
                      onEditProposal={(proposal) => {
                        setSelectedProposal(proposal);
                        setViewMode('edit');
                      }}
                    />
                  )
                )}
                {activeTab === 'installations' && <InstallationsPanel />}
                {activeTab === 'products' && <ProductsManagement />}
                {activeTab === 'analytics' && <AnalyticsPanel />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel - AI Coach */}
          <div className="lg:col-span-1">
            <AnimatePresence>
              {selectedLeadId ? (
                <motion.div
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className="bg-card rounded-2xl border border-border shadow-lg p-6 sticky top-8"
                >
                  <AISalesCoachPanel leadId={selectedLeadId} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-2xl border border-border shadow-lg p-6 text-center"
                >
                  <div className="py-12">
                    <Zap className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Sales Coach</h3>
                    <p className="text-slate-600 text-sm">
                      Select a lead to get AI-powered sales guidance
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLeadData && (
        <LeadDetailView 
          lead={selectedLeadData} 
          onClose={() => setSelectedLeadData(null)} 
        />
      )}
    </div>
  );
}

// Placeholder components for each tab
const LeadsPanel = ({ onLeadSelect }: { onLeadSelect: (lead: any) => void }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error loading leads',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const updateLeadScore = async (leadId: string, newScore: number) => {
    const { error } = await supabase
      .from('leads')
      .update({ score: newScore })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Error updating score',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, score: newScore } : lead
      ));
      toast({
        title: 'Score updated',
        description: `Lead score set to ${newScore} stars`,
      });
    }
  };

  const StarRating = ({ score, leadId }: { score: number; leadId: string }) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          className={`cursor-pointer transition-all ${
            star <= score
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-slate-300 hover:text-yellow-300'
          }`}
          onClick={() => updateLeadScore(leadId, star)}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Active Leads</h2>
        <span className="text-sm text-slate-600">{leads.length} total leads</span>
      </div>
      {leads.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No leads yet</h3>
          <p className="text-slate-600 text-sm">
            Leads will appear here as clients submit their information
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div 
              key={lead.id}
              className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 text-lg">{lead.name}</h3>
                    <StarRating score={lead.score || 0} leadId={lead.id} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {lead.address || 'No address'} • €{lead.monthly_bill || 0}/month
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{lead.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-xs font-medium ${
                    lead.status === 'new' ? 'bg-primary text-white' :
                    lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                    lead.status === 'qualified' ? 'bg-purple-100 text-purple-700' :
                    lead.status === 'proposal_sent' ? 'bg-orange-100 text-orange-700' :
                    lead.status === 'closed_won' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {lead.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLeadSelect(lead)}
                    className="gap-2"
                  >
                    <Eye size={16} />
                    View
                  </Button>
                </div>
              </div>
              {lead.notes && (
                <p className="text-sm text-slate-600 mt-2 italic">
                  Note: {lead.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProposalsPanel = ({ onProposalSelect, onEditProposal }: { 
  onProposalSelect?: (proposal: any, lead: any) => void;
  onEditProposal?: (proposal: any) => void;
}) => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, leads(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: 'Error loading proposals',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProposals(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Proposals</h2>
        <span className="text-sm text-slate-600">{proposals.length} total</span>
      </div>
      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No proposals yet</h3>
          <p className="text-slate-600 text-sm">
            Create proposals from the Leads tab
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div 
              key={proposal.id} 
              className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{proposal.leads?.name || 'Unknown'}</h3>
                  <p className="text-sm text-slate-600">{proposal.system_size_kw} kW system</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  proposal.status === 'approved' ? 'bg-green-100 text-green-700' :
                  proposal.status === 'presented' ? 'bg-blue-100 text-blue-700' :
                  proposal.status === 'draft' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {proposal.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-primary">€{proposal.net_cost?.toLocaleString() || 'N/A'}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditProposal?.(proposal)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onProposalSelect?.(proposal, proposal.leads)}
                  >
                    <Eye size={16} className="mr-1" />
                    View
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Created {new Date(proposal.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InstallationsPanel = () => {
  const mockInstallations = [
    { id: '1', client: 'Sarah Kelly', date: '2024-01-22', time: '09:00', crew: 'Team A', status: 'Scheduled' },
    { id: '2', client: 'John Smith', date: '2024-01-24', time: '14:00', crew: 'Team B', status: 'Confirmed' },
    { id: '3', client: 'Mary O\'Brien', date: '2024-01-20', time: '10:00', crew: 'Team A', status: 'Completed' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Scheduled Installations</h2>
      <div className="space-y-4">
        {mockInstallations.map((install) => (
          <div key={install.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{install.client}</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>📅 {install.date} at {install.time}</p>
                  <p>👥 {install.crew}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                install.status === 'Completed' ? 'bg-green-100 text-green-700' :
                install.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {install.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsPanel = () => {
  const metrics = [
    { label: 'Total Revenue', value: '€287,450', change: '+23%', positive: true },
    { label: 'Conversion Rate', value: '23.5%', change: '+5.2%', positive: true },
    { label: 'Avg. Response Time', value: '2.4 hours', change: '-18%', positive: true },
    { label: 'Customer Satisfaction', value: '4.8/5', change: '+0.3', positive: true },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance Analytics</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-slate-600">{metric.label}</span>
              <span className={`text-xs font-medium ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change}
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{metric.value}</div>
          </div>
        ))}
      </div>
      <div className="p-6 bg-primary-50 rounded-xl border border-primary-100">
        <h3 className="font-semibold text-slate-900 mb-2">Monthly Goal Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
            <div className="h-full gradient-primary" style={{ width: '68%' }}></div>
          </div>
          <span className="font-semibold text-primary">68%</span>
        </div>
        <p className="text-sm text-slate-600 mt-2">€287k of €420k monthly target</p>
      </div>
    </div>
  );
};

const AISalesCoachPanel = ({ leadId }: { leadId: string }) => (
  <div>
    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Zap className="text-primary" size={24} />
      AI Sales Coach
    </h3>
    <div className="space-y-4">
      <div className="p-4 bg-primary-50 rounded-xl">
        <h4 className="font-semibold text-slate-900 mb-2">Opening Strategy</h4>
        <p className="text-sm text-slate-700">
          Start with their current energy costs and emphasize SEAI grant availability in Dublin.
        </p>
      </div>
      <div className="p-4 bg-slate-50 rounded-xl">
        <h4 className="font-semibold text-slate-900 mb-2">Key Points</h4>
        <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
          <li>€2,400 SEAI grant available</li>
          <li>8-year payback period</li>
          <li>30% ROI over 25 years</li>
        </ul>
      </div>
      <div className="p-4 bg-slate-50 rounded-xl">
        <h4 className="font-semibold text-slate-900 mb-2">Next Steps</h4>
        <p className="text-sm text-slate-700">
          Schedule site survey within 48 hours. Mention current promotion ending soon.
        </p>
      </div>
    </div>
  </div>
);
