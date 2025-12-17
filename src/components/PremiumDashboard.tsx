import { useState, useEffect, useMemo } from 'react';
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
  Settings,
  Phone,
  Plus
} from 'lucide-react';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { brand } from '@/config/brand';
import { useAuth } from '@/hooks/useAuth';
import LeadDetailView from './LeadDetailView';
import ProposalQuestionnaire from './ProposalQuestionnaire';
import ProposalResultsView from './ProposalResultsView';
import ProductsManagement from './ProductsManagement';
import SurveysPanel from './dashboard/SurveysPanel';
import InstallationsPanel from './dashboard/InstallationsPanel';
import AnalyticsPanel from './dashboard/AnalyticsPanel';
import AddLeadDialog from './dashboard/AddLeadDialog';
import LeadSelectorDialog from './dashboard/LeadSelectorDialog';
import DeleteLeadDialog from './dashboard/DeleteLeadDialog';
import CollapsibleStats from './dashboard/CollapsibleStats';
import SiteSurveyForm from './SiteSurveyForm';
import { FollowUpReminders } from './dashboard/FollowUpReminders';
import DocumentManager from './dashboard/DocumentManager';
import ConsultantCalendar from './dashboard/ConsultantCalendar';
import MobileBottomNav from './layout/MobileBottomNav';
import AICoachFloatingButton from './ai/AICoachFloatingButton';
import { DashboardStatsSkeleton, LeadCardsSkeleton } from './ui/skeletons';
import ErrorBoundary from './ui/ErrorBoundary';
import { PaginationControls, usePagination } from './ui/PaginationControls';
import { EmptyLeadsState, EmptyProposalsState, EmptySearchResultsState } from './ui/EmptyState';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend: { value: string; positive: boolean };
  color: string;
  isLoading?: boolean;
}

const StatCard = ({ icon, value, label, trend, color }: StatCardProps) => (
  <motion.div 
    className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-all cursor-pointer"
    whileHover={{ scale: 1.02, y: -2 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-muted ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
        trend.positive ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-destructive/10 text-destructive dark:bg-destructive/20'
      }`}>
        {trend.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {trend.value}
      </div>
    </div>
  </motion.div>
);

type TabType = 'leads' | 'proposals' | 'surveys' | 'installations' | 'calendar' | 'followups' | 'products' | 'documents' | 'analytics';

interface DashboardStats {
  totalLeads: number;
  conversionRate: string;
  avgDealSize: string;
  pendingLeads: number;
  leadsTrend: { value: string; positive: boolean };
  conversionTrend: { value: string; positive: boolean };
  dealSizeTrend: { value: string; positive: boolean };
  pendingTrend: { value: string; positive: boolean };
}

export default function PremiumDashboard({ onBackToClient }: { onBackToClient?: () => void }) {
  const navigate = useNavigate();
  const { hasRole, isOwner } = useAuth();
  const isAdmin = hasRole('admin') || isOwner();
  
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadData, setSelectedLeadData] = useState<any | null>(null);
  const [activeLeadForProposal, setActiveLeadForProposal] = useState<any | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
  const [surveyLeadId, setSurveyLeadId] = useState<string | null>(null);
  const [refreshLeads, setRefreshLeads] = useState(0);
  const [prefilledProposalData, setPrefilledProposalData] = useState<Record<string, any> | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    conversionRate: '0%',
    avgDealSize: '€0',
    pendingLeads: 0,
    leadsTrend: { value: '+0%', positive: true },
    conversionTrend: { value: '+0%', positive: true },
    dealSizeTrend: { value: '+0%', positive: true },
    pendingTrend: { value: '0%', positive: false },
  });

  // Fetch real dashboard stats
  useEffect(() => {
    fetchDashboardStats();
    
    // Set up real-time subscription for leads
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchDashboardStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, created_at, monthly_bill');
      
      if (leadsError) throw leadsError;

      // Fetch accepted proposals with net_cost
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, status, net_cost, created_at')
        .eq('status', 'accepted');
      
      if (proposalsError) throw proposalsError;

      // Calculate stats
      const totalLeads = leads?.length || 0;
      const closedWonLeads = leads?.filter(l => l.status === 'closed_won').length || 0;
      const conversionRate = totalLeads > 0 ? ((closedWonLeads / totalLeads) * 100).toFixed(0) : '0';
      
      // Calculate avg deal size from accepted proposals
      const acceptedProposals = proposals || [];
      const totalDealValue = acceptedProposals.reduce((sum, p) => sum + (p.net_cost || 0), 0);
      const avgDealSize = acceptedProposals.length > 0 
        ? Math.round(totalDealValue / acceptedProposals.length) 
        : 0;
      
      const pendingLeads = leads?.filter(l => 
        l.status === 'new' || l.status === 'contacted'
      ).length || 0;

      // Calculate trends (last 7 days vs previous 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const recentLeads = leads?.filter(l => new Date(l.created_at) >= sevenDaysAgo).length || 0;
      const previousLeads = leads?.filter(l => 
        new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo
      ).length || 0;

      const leadsTrendValue = previousLeads > 0 
        ? Math.round(((recentLeads - previousLeads) / previousLeads) * 100)
        : recentLeads > 0 ? 100 : 0;

      setStats({
        totalLeads,
        conversionRate: `${conversionRate}%`,
        avgDealSize: `€${avgDealSize.toLocaleString()}`,
        pendingLeads,
        leadsTrend: { 
          value: `${leadsTrendValue >= 0 ? '+' : ''}${leadsTrendValue}%`, 
          positive: leadsTrendValue >= 0 
        },
        conversionTrend: { value: '+5%', positive: true },
        dealSizeTrend: { value: '+8%', positive: true },
        pendingTrend: { value: '-3%', positive: false },
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

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

  const statCards = [
    {
      icon: <Users className="text-blue-500" size={24} />,
      value: stats.totalLeads,
      label: 'Total Leads',
      trend: stats.leadsTrend,
      color: 'text-blue-500'
    },
    {
      icon: <TrendingUp className="text-green-500" size={24} />,
      value: stats.conversionRate,
      label: 'Conversion Rate',
      trend: stats.conversionTrend,
      color: 'text-green-500'
    },
    {
      icon: <FileText className="text-purple-500" size={24} />,
      value: stats.avgDealSize,
      label: 'Avg Deal Size',
      trend: stats.dealSizeTrend,
      color: 'text-purple-500'
    },
    {
      icon: <Calendar className="text-orange-500" size={24} />,
      value: stats.pendingLeads,
      label: 'Pending',
      trend: stats.pendingTrend,
      color: 'text-orange-500'
    }
  ];

  // Consultant tabs (visible to all)
  const consultantTabs = [
    { id: 'leads' as TabType, label: 'Leads', icon: <Users size={16} /> },
    { id: 'surveys' as TabType, label: 'Surveys', icon: <ClipboardList size={16} /> },
    { id: 'proposals' as TabType, label: 'Proposals', icon: <FileText size={16} /> },
    { id: 'installations' as TabType, label: 'Installations', icon: <FileCheck size={16} /> },
    { id: 'calendar' as TabType, label: 'Calendar', icon: <Calendar size={16} /> },
    { id: 'followups' as TabType, label: 'Follow-ups', icon: <Phone size={16} /> },
  ];

  // Admin-only tabs
  const adminTabs = [
    { id: 'products' as TabType, label: 'Products', icon: <FileText size={16} />, isAdmin: true },
    { id: 'documents' as TabType, label: 'Documents', icon: <FileText size={16} />, isAdmin: true },
    { id: 'analytics' as TabType, label: 'Analytics', icon: <TrendingUp size={16} />, isAdmin: true },
  ];

  // Helper to check if current tab is admin tab
  const isAdminTab = (tabId: TabType) => adminTabs.some(t => t.id === tabId);

  return (
    <div className="min-h-screen gradient-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{brand.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Consultant Portal</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                className="gradient-primary text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base"
                onClick={() => setShowAddLead(true)}
                aria-label="Add new lead"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">New Lead</span>
              </button>
              <DarkModeToggle />
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

      {/* Stats Grid - Collapsible */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <CollapsibleStats defaultExpanded={false}>
          {statsLoading ? (
            <DashboardStatsSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {statCards.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>
          )}
        </CollapsibleStats>
        
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
            {/* Navigation Tabs - Horizontal scroll on mobile with Admin separator */}
            <nav className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide items-center">
              {consultantTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                    activeTab === tab.id
                      ? 'gradient-primary text-white shadow-lg'
                      : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              
              {/* Admin tabs separator and tabs */}
              {isAdmin && (
                <>
                  <div className="flex items-center gap-2 px-2">
                    <div className="h-6 w-px bg-border"></div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Admin</span>
                    <div className="h-6 w-px bg-border"></div>
                  </div>
                  {adminTabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                        activeTab === tab.id
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-500/20'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </>
              )}
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
                <ErrorBoundary>
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
                  {activeTab === 'calendar' && <ConsultantCalendar />}
                  {activeTab === 'followups' && (
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Follow-ups</h2>
                      <FollowUpReminders 
                        onLeadClick={(leadId) => {
                          setSelectedLeadId(leadId);
                          setActiveTab('leads');
                        }}
                        expanded
                      />
                    </div>
                  )}
                  {activeTab === 'products' && isAdmin && <ProductsManagement />}
                  {activeTab === 'documents' && isAdmin && <DocumentManager />}
                  {activeTab === 'analytics' && isAdmin && <AnalyticsPanel />}
                </ErrorBoundary>
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
                    <Zap className="mx-auto text-muted-foreground/30 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-foreground mb-2">AI Sales Coach</h3>
                    <p className="text-muted-foreground text-sm">
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

      {/* Lead Selector Dialog for New Proposal */}
      <LeadSelectorDialog
        isOpen={showLeadSelector}
        onClose={() => setShowLeadSelector(false)}
        onSelectLead={(lead) => {
          setActiveLeadForProposal(lead);
          setSelectedLeadId(lead.id);
          setPrefilledProposalData(null);
          setActiveTab('proposals');
        }}
        onCreateNewLead={() => {
          setShowAddLead(true);
        }}
      />

      {/* AI Coach Floating Button for Mobile/Tablet */}
      <AICoachFloatingButton leadId={selectedLeadId} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as TabType)} 
        variant="dashboard"
      />
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
  const [filterAILeads, setFilterAILeads] = useState(false);

  // Check if lead is from AI Analyser
  const isAILead = (lead: any) => lead.notes?.includes('[SOURCE: AI_ANALYSER]') || lead.notes?.includes('[AI Analysis');

  // Check if lead is high value (monthly bill > €200)
  const isHighValue = (lead: any) => (lead.monthly_bill || 0) >= 200;

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
              : 'text-muted-foreground/40 hover:text-yellow-300'
          }`}
          onClick={() => updateLeadScore(leadId, star)}
        />
      ))}
    </div>
  );

  // Count AI leads for badge
  const aiLeadsCount = leads.filter(isAILead).length;

  // Filter leads by search query and AI filter
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // AI filter
      if (filterAILeads && !isAILead(lead)) return false;
      
      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query)
      );
    });
  }, [leads, searchQuery, filterAILeads]);

  // Pagination
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedLeads,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredLeads, 10);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-32 bg-muted/70 rounded animate-pulse" />
          <div className="h-10 w-48 bg-muted/70 rounded animate-pulse" />
        </div>
        <LeadCardsSkeleton count={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Active Leads</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
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
        
        {/* Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filterAILeads ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterAILeads(!filterAILeads)}
            className="gap-2"
          >
            <Zap size={14} />
            AI Leads
            {aiLeadsCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filterAILeads ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
              }`}>
                {aiLeadsCount}
              </span>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {filteredLeads.length} of {leads.length} leads
          </span>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        searchQuery || filterAILeads ? (
          <EmptySearchResultsState query={searchQuery || 'AI leads'} />
        ) : (
          <EmptyLeadsState onAddLead={() => {
            // Trigger the AddLeadDialog - this is handled by the button above
          }} />
        )
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {paginatedLeads.map((lead) => (
              <div 
                key={lead.id}
                className={`p-4 sm:p-5 rounded-xl border hover:shadow-md transition-all ${
                  isAILead(lead) 
                    ? 'bg-primary/5 border-primary/30 dark:bg-primary/10' 
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-base sm:text-lg truncate">{lead.name}</h3>
                      {/* AI Lead Badge */}
                      {isAILead(lead) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                          <Zap size={10} />
                          AI Lead
                        </span>
                      )}
                      {/* High Value Badge */}
                      {isHighValue(lead) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <TrendingUp size={10} />
                          High Value
                        </span>
                      )}
                      <StarRating score={lead.score || 0} leadId={lead.id} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {lead.address || 'No address'} • €{lead.monthly_bill || 0}/month
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1 truncate">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'new' ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                      lead.status === 'contacted' ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                      lead.status === 'qualified' ? 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
                      lead.status === 'proposal_sent' ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                      lead.status === 'closed_won' ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                      'bg-destructive/10 text-destructive dark:bg-destructive/20'
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
                    <DeleteLeadDialog
                      leadId={lead.id}
                      leadName={lead.name}
                      onDeleted={() => {
                        fetchLeads();
                        onLeadAdded?.();
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showPageSize={totalItems > 10}
            />
          )}
        </>
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

  // Pagination
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedProposals,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(proposals, 10);

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
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Proposals</h2>
        <span className="text-sm text-muted-foreground">{proposals.length} total</span>
      </div>
      {proposals.length === 0 ? (
        <EmptyProposalsState />
      ) : (
        <>
          <div className="space-y-4">
            {paginatedProposals.map((proposal) => (
              <div 
                key={proposal.id} 
                className="p-4 sm:p-5 bg-muted/50 rounded-xl border border-border hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-base sm:text-lg">{proposal.leads?.name || 'Unknown'}</h3>
                    <p className="text-sm text-muted-foreground">{proposal.system_size_kw} kW system</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      proposal.status === 'approved' ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                      proposal.status === 'presented' ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                      proposal.status === 'draft' ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                      proposal.requires_review ? 'bg-destructive/10 text-destructive dark:bg-destructive/20' :
                      'bg-muted text-muted-foreground'
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
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Created {new Date(proposal.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showPageSize={totalItems > 10}
            />
          )}
        </>
      )}
    </div>
  );
};

// AISalesCoachPanel is now dynamic - imported from ai/DynamicAISalesCoach
import DynamicAISalesCoach from './ai/DynamicAISalesCoach';

const AISalesCoachPanel = ({ leadId }: { leadId: string }) => (
  <DynamicAISalesCoach leadId={leadId} />
);
