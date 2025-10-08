import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar,
  Zap,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

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

type TabType = 'leads' | 'proposals' | 'installations' | 'analytics';

export default function PremiumDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

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
              <button className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all">
                <Zap size={20} />
                New Proposal
              </button>
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
                {activeTab === 'leads' && <LeadsPanel onLeadSelect={setSelectedLead} />}
                {activeTab === 'proposals' && <ProposalsPanel />}
                {activeTab === 'installations' && <InstallationsPanel />}
                {activeTab === 'analytics' && <AnalyticsPanel />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel - AI Coach */}
          <div className="lg:col-span-1">
            <AnimatePresence>
              {selectedLead ? (
                <motion.div
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className="bg-card rounded-2xl border border-border shadow-lg p-6 sticky top-8"
                >
                  <AISalesCoachPanel leadId={selectedLead} />
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
    </div>
  );
}

// Placeholder components for each tab
const LeadsPanel = ({ onLeadSelect }: { onLeadSelect: (id: string) => void }) => (
  <div>
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Active Leads</h2>
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div 
          key={i}
          className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors border border-slate-200"
          onClick={() => onLeadSelect(`lead-${i}`)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">John Smith {i}</h3>
              <p className="text-sm text-slate-600">Dublin • €800/month bill</p>
            </div>
            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
              New
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProposalsPanel = () => (
  <div>
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Recent Proposals</h2>
    <p className="text-slate-600">Proposal management coming soon...</p>
  </div>
);

const InstallationsPanel = () => (
  <div>
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Scheduled Installations</h2>
    <p className="text-slate-600">Installation calendar coming soon...</p>
  </div>
);

const AnalyticsPanel = () => (
  <div>
    <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance Analytics</h2>
    <p className="text-slate-600">Analytics dashboard coming soon...</p>
  </div>
);

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
