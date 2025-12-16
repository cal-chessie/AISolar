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
  Eye,
  ClipboardList,
  Search,
  FileCheck,
  Settings
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import LeadDetailView from './LeadDetailView';
import ProposalQuestionnaire from './ProposalQuestionnaire';
import ProposalResultsView from './ProposalResultsView';
import ProductsManagement from './ProductsManagement';
import SurveysPanel from './dashboard/SurveysPanel';
import InstallationsPanel from './dashboard/InstallationsPanel';
import AnalyticsPanel from './dashboard/AnalyticsPanel';
import AddLeadDialog from './dashboard/AddLeadDialog';
import SiteSurveyForm from './SiteSurveyForm';
import { FollowUpReminders } from './dashboard/FollowUpReminders';

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

type TabType = 'leads' | 'proposals' | 'surveys' | 'installations' | 'products' | 'analytics';

export default function PremiumDashboard({ onBackToClient }: { onBackToClient?: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadData, setSelectedLeadData] = useState<any | null>(null);
  const [activeLeadForProposal, setActiveLeadForProposal] = useState<any | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
  const [surveyLeadId, setSurveyLeadId] = useState<string | null>(null);
  const [refreshLeads, setRefreshLeads] = useState(0);
  const [prefilledProposalData, setPrefilledProposalData] = useState<Record<string, any> | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast({
      title: 'Logged out successfully',
      description: 'You have been signed out.',
    });
  };

  // Handler for Survey → Proposal flow
  const handleCreateProposalFromSurvey = (surveyData: any, leadData: any) => {
    setPrefilledProposalData(surveyData);
    setActiveLeadForProposal(leadData);
    setActiveTab('proposals');
    toast({
      title: 'Creating proposal from survey',
      description: 'Survey data has been pre-filled into the proposal form.',
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
    { id: 'surveys' as TabType, label: 'Surveys' },
    { id: 'proposals' as TabType, label: 'Proposals' },
    { id: 'installations' as TabType, label: 'Installations' },
    { id: 'products' as TabType, label: 'Products' },
    { id: 'analytics' as TabType, label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen gradient-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Solar Dublin</h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">Consultant Portal</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                className="gradient-primary text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base"
                onClick={() => {
                  if (!activeLeadForProposal) {
                    toast({
                      title: 'Select a lead first',
                      description: 'Open a lead from the Leads tab to start a proposal.',
                    });
                    setActiveTab('leads');
                    return;
                  }
                  setPrefilledProposalData(null);
                  setActiveTab('proposals');
                }}
                aria-label="Create new proposal"
              >
                <Zap size={20} />
                <span className="hidden sm:inline">New Proposal</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/settings')}
                className="hidden sm:flex"
              >
                <Settings size={18} />
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
                size="sm"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm sm:text-lg cursor-pointer hover:shadow-lg transition-all">
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {stats.map((stat, idx) => (
            <StatCard key={idx} {...stat} />
          ))}
        </div>
        
        {/* Follow-up Reminders */}
        <FollowUpReminders 
          onLeadClick={(leadId) => {
            const lead = { id: leadId };
            setSelectedLeadId(leadId);
            setActiveTab('leads');
          }}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Tabs & Content */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs - Horizontal scroll on mobile */}
            <nav className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
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
                className="bg-card rounded-2xl border border-border shadow-lg p-4 sm:p-6 min-h-[500px] sm:min-h-[600px]"
              >
                {activeTab === 'leads' && (
                  <LeadsPanel
                    onLeadSelect={(lead) => {
                      setSelectedLeadData(lead);
                      setSelectedLeadId(lead.id);
                      setActiveLeadForProposal(lead);
                    }}
                    onStartSurvey={(leadId) => {
                      setSurveyLeadId(leadId);
                      setActiveTab('surveys');
                    }}
                    onLeadAdded={() => setRefreshLeads(r => r + 1)}
                    refreshKey={refreshLeads}
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
                      initialData={prefilledProposalData}
                      onBack={() => {
                        setActiveLeadForProposal(null);
                        setPrefilledProposalData(null);
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
                {activeTab === 'surveys' && (
                  surveyLeadId ? (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setSurveyLeadId(null)}
                        className="mb-4"
                      >
                        ← Back to Surveys
                      </Button>
                      <SiteSurveyForm 
                        leadId={surveyLeadId} 
                        onCreateProposal={(surveyData, leadData) => {
                          setSurveyLeadId(null);
                          handleCreateProposalFromSurvey(surveyData, leadData);
                        }}
                      />
                    </div>
                  ) : (
                    <SurveysPanel onCreateProposal={handleCreateProposalFromSurvey} />
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

// LeadsPanel with search, survey, and quick actions
interface LeadsPanelProps {
  onLeadSelect: (lead: any) => void;
  onStartSurvey?: (leadId: string) => void;
  onLeadAdded?: () => void;
  refreshKey?: number;
}

const LeadsPanel = ({ onLeadSelect, onStartSurvey, onLeadAdded, refreshKey }: LeadsPanelProps) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeads();
  }, [refreshKey]);

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
    <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
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

  // Filter leads by search query
  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query) ||
      lead.address?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Active Leads</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <AddLeadDialog onLeadAdded={() => {
            fetchLeads();
            onLeadAdded?.();
          }} />
        </div>
      </div>

      {searchQuery && (
        <p className="text-sm text-slate-500 mb-4">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
      )}

      {filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery ? 'No leads found' : 'No leads yet'}
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            {searchQuery 
              ? 'Try a different search term' 
              : 'Leads will appear here as clients submit their information'}
          </p>
          {!searchQuery && (
            <AddLeadDialog onLeadAdded={() => {
              fetchLeads();
              onLeadAdded?.();
            }} />
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredLeads.map((lead) => (
            <div 
              key={lead.id}
              className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate">{lead.name}</h3>
                    <StarRating score={lead.score || 0} leadId={lead.id} />
                  </div>
                  <p className="text-sm text-slate-600 truncate">
                    {lead.address || 'No address'} • €{lead.monthly_bill || 0}/month
                  </p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{lead.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                    lead.status === 'new' ? 'bg-primary text-white' :
                    lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                    lead.status === 'qualified' ? 'bg-purple-100 text-purple-700' :
                    lead.status === 'proposal_sent' ? 'bg-orange-100 text-orange-700' :
                    lead.status === 'closed_won' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {lead.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                  </span>
                  {onStartSurvey && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartSurvey(lead.id)}
                      className="gap-1 text-xs sm:text-sm"
                    >
                      <ClipboardList size={14} />
                      <span className="hidden sm:inline">Survey</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLeadSelect(lead)}
                    className="gap-1 text-xs sm:text-sm"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                </div>
              </div>
              {lead.notes && (
                <p className="text-sm text-slate-600 mt-2 italic truncate">
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
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Proposals</h2>
        <span className="text-sm text-slate-600">{proposals.length} total</span>
      </div>
      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No proposals yet</h3>
          <p className="text-slate-600 text-sm">
            Create proposals from the Leads tab or complete a survey first
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div 
              key={proposal.id} 
              className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base sm:text-lg">{proposal.leads?.name || 'Unknown'}</h3>
                  <p className="text-sm text-slate-600">{proposal.system_size_kw} kW system</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    proposal.status === 'approved' ? 'bg-green-100 text-green-700' :
                    proposal.status === 'presented' ? 'bg-blue-100 text-blue-700' :
                    proposal.status === 'draft' ? 'bg-orange-100 text-orange-700' :
                    proposal.requires_review ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {proposal.requires_review && !proposal.reviewed_at ? 'PENDING REVIEW' : proposal.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xl sm:text-2xl font-bold text-primary">€{proposal.net_cost?.toLocaleString() || 'N/A'}</span>
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

// AISalesCoachPanel is now dynamic - imported from ai/DynamicAISalesCoach
import DynamicAISalesCoach from './ai/DynamicAISalesCoach';

const AISalesCoachPanel = ({ leadId }: { leadId: string }) => (
  <DynamicAISalesCoach leadId={leadId} />
);
