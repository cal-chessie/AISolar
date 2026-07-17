import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ClipboardList, 
  FileText, 
  CheckCircle, 
  Wrench, 
  CreditCard,
  ChevronRight,
  Calendar,
  MapPin,
  Zap,
  Sun,
  Award,
  Route
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  name: string;
  email: string;
  address?: string;
  monthly_bill?: number;
  workflow_stage?: string;
  created_at: string;
}

interface LeadWorkflowJourneyProps {
  lead: Lead;
  trigger?: React.ReactNode;
}

interface JourneyData {
  survey: any | null;
  proposal: any | null;
  contract: any | null;
  checklist: any | null;
  invoice: any | null;
}

export default function LeadWorkflowJourney({ lead, trigger }: LeadWorkflowJourneyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [journeyData, setJourneyData] = useState<JourneyData>({
    survey: null,
    proposal: null,
    contract: null,
    checklist: null,
    invoice: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchJourneyData();
    }
  }, [isOpen, lead.id]);

  const fetchJourneyData = async () => {
    setLoading(true);
    try {
      const [surveyRes, proposalRes, contractRes, checklistRes, invoiceRes] = await Promise.all([
        supabase.from('site_surveys').select('*').eq('lead_id', lead.id).maybeSingle(),
        supabase.from('proposals').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('contracts').select('*').eq('lead_id', lead.id).maybeSingle(),
        supabase.from('installation_checklists').select('*').eq('lead_id', lead.id).maybeSingle(),
        supabase.from('invoices').select('*').eq('lead_id', lead.id).maybeSingle(),
      ]);

      setJourneyData({
        survey: surveyRes.data,
        proposal: proposalRes.data?.[0] || null,
        contract: contractRes.data,
        checklist: checklistRes.data,
        invoice: invoiceRes.data,
      });
    } catch (error) {
      console.error('Error fetching journey data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stageId: string): 'completed' | 'current' | 'pending' => {
    const stageOrder = ['new', 'survey', 'proposal', 'approved', 'scheduled', 'installing', 'installed', 'completed'];
    const currentIndex = stageOrder.indexOf(lead.workflow_stage || 'new');
    
    switch (stageId) {
      case 'lead':
        return 'completed';
      case 'survey':
        return journeyData.survey?.status === 'completed' ? 'completed' : 
               currentIndex >= 1 ? 'current' : 'pending';
      case 'proposal':
        return journeyData.proposal?.status === 'approved' ? 'completed' :
               journeyData.proposal ? 'current' : 'pending';
      case 'approved':
        return journeyData.contract ? 'completed' : 
               journeyData.proposal?.status === 'presented' ? 'current' : 'pending';
      case 'installation':
        return journeyData.checklist?.customer_signature ? 'completed' :
               journeyData.checklist?.status === 'in_progress' ? 'current' : 'pending';
      case 'paid':
        return journeyData.invoice?.status === 'paid' ? 'completed' :
               journeyData.invoice ? 'current' : 'pending';
      default:
        return 'pending';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const workflowStages = [
    {
      id: 'lead',
      title: 'Lead Captured',
      icon: User,
      date: formatDate(lead.created_at),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      details: [
        `Customer: ${lead.name}`,
        lead.monthly_bill ? `Monthly bill: €${lead.monthly_bill}` : null,
        lead.address ? `Location: ${lead.address}` : null,
      ].filter(Boolean) as string[],
    },
    {
      id: 'survey',
      title: 'Site Survey',
      icon: ClipboardList,
      date: formatDate(journeyData.survey?.completed_at || journeyData.survey?.created_at),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      details: journeyData.survey ? [
        journeyData.survey.roof_orientation ? `Roof: ${journeyData.survey.roof_orientation}-facing` : null,
        journeyData.survey.roof_condition ? `Condition: ${journeyData.survey.roof_condition}` : null,
        journeyData.survey.recommended_system_size ? `Recommended: ${journeyData.survey.recommended_system_size}kW system` : null,
        journeyData.survey.recommended_panel_count ? `${journeyData.survey.recommended_panel_count} panels` : null,
      ].filter(Boolean) as string[] : ['Survey not started'],
    },
    {
      id: 'proposal',
      title: 'Proposal Created',
      icon: FileText,
      date: formatDate(journeyData.proposal?.created_at),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      details: journeyData.proposal ? [
        journeyData.proposal.system_size_kw ? `System: ${journeyData.proposal.system_size_kw}kW` : null,
        journeyData.proposal.panel_count ? `${journeyData.proposal.panel_count} panels` : null,
        journeyData.proposal.battery_storage ? `Battery: ${journeyData.proposal.battery_capacity_kwh || 'Yes'}kWh` : null,
        journeyData.proposal.net_cost ? `Net cost: €${journeyData.proposal.net_cost.toLocaleString()}` : null,
        journeyData.proposal.seai_grant ? `SEAI Grant: €${journeyData.proposal.seai_grant.toLocaleString()}` : null,
      ].filter(Boolean) as string[] : ['Proposal not created'],
    },
    {
      id: 'approved',
      title: 'Contract Signed',
      icon: CheckCircle,
      date: formatDate(journeyData.contract?.signed_at),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10 dark:bg-green-500/20',
      details: journeyData.contract ? [
        `Signed by: ${journeyData.contract.signed_by_name}`,
        journeyData.contract.gdpr_consent ? 'GDPR consent confirmed' : null,
        journeyData.invoice?.deposit_paid ? `Deposit paid: €${journeyData.invoice.deposit_amount?.toLocaleString()}` : 'Deposit pending',
      ].filter(Boolean) as string[] : ['Contract not signed'],
    },
    {
      id: 'installation',
      title: 'Installation',
      icon: Wrench,
      date: formatDate(journeyData.checklist?.customer_signed_at || journeyData.proposal?.confirmed_install_date),
      color: 'text-primary',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      details: journeyData.checklist ? [
        `Status: ${journeyData.checklist.status || 'pending'}`,
        journeyData.checklist.panels_installed ? 'Panels installed' : null,
        journeyData.checklist.inverter_installed ? 'Inverter installed' : null,
        journeyData.checklist.monitoring_online ? 'Monitoring online' : null,
        journeyData.checklist.customer_signature ? 'Customer signed off' : null,
      ].filter(Boolean) as string[] : ['Installation not scheduled'],
    },
    {
      id: 'paid',
      title: 'Completed',
      icon: CreditCard,
      date: formatDate(journeyData.invoice?.final_paid_at),
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
      details: journeyData.invoice ? [
        `Invoice: ${journeyData.invoice.invoice_number}`,
        `Total: €${journeyData.invoice.total_amount?.toLocaleString()}`,
        journeyData.invoice.deposit_paid ? `Deposit: Paid` : 'Deposit: Pending',
        journeyData.invoice.status === 'paid' ? 'Fully paid' : 'Balance outstanding',
      ] : ['Invoice not generated'],
    },
  ];

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Route size={16} />
      View Journey
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            Customer Journey: {lead.name}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Customer Info Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 mb-6"
          >
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{lead.name}</h3>
                {lead.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin size={14} />
                    {lead.address}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {lead.monthly_bill && lead.monthly_bill > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Zap size={12} />
                    €{lead.monthly_bill}/mo
                  </Badge>
                )}
                <Badge className={`${
                  lead.workflow_stage === 'completed' ? 'bg-green-500/10 text-green-600' :
                  lead.workflow_stage === 'approved' ? 'bg-purple-500/10 text-purple-600' :
                  'bg-blue-500/10 text-blue-600'
                } border-none`}>
                  {lead.workflow_stage || 'new'}
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Workflow Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="relative">
              {workflowStages.map((stage, index) => {
                const status = getStageStatus(stage.id);
                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex gap-4 pb-6"
                  >
                    {/* Timeline Line */}
                    {index < workflowStages.length - 1 && (
                      <div className={`absolute left-[19px] top-10 w-0.5 h-[calc(100%-20px)] ${
                        status === 'completed' ? 'bg-primary/50' : 'bg-muted'
                      }`} />
                    )}

                    {/* Icon */}
                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      status === 'completed' ? stage.bgColor :
                      status === 'current' ? 'bg-primary/20 ring-2 ring-primary' :
                      'bg-muted'
                    }`}>
                      <stage.icon className={`h-5 w-5 ${
                        status === 'completed' ? stage.color :
                        status === 'current' ? 'text-primary' :
                        'text-muted-foreground'
                      }`} />
                    </div>

                    {/* Content */}
                    <div 
                      className={`flex-1 p-4 rounded-xl border transition-all cursor-pointer ${
                        activeStage === stage.id 
                          ? 'bg-muted border-primary/30 shadow-md' 
                          : status === 'pending' 
                            ? 'bg-muted/50 border-border/50 opacity-60'
                            : 'bg-card border-border hover:border-primary/20 hover:shadow-sm'
                      }`}
                      onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">{stage.title}</h4>
                          {stage.date && status !== 'pending' && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar size={10} className="mr-1" />
                              {stage.date}
                            </Badge>
                          )}
                          {status === 'current' && (
                            <Badge className="bg-primary/10 text-primary text-xs">Current</Badge>
                          )}
                        </div>
                        <ChevronRight 
                          size={18} 
                          className={`text-muted-foreground transition-transform ${activeStage === stage.id ? 'rotate-90' : ''}`} 
                        />
                      </div>
                      
                      <AnimatePresence>
                        {activeStage === stage.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-border"
                          >
                            <ul className="space-y-1.5">
                              {stage.details.map((detail, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle size={14} className={`flex-shrink-0 mt-0.5 ${
                                    status === 'completed' ? 'text-primary' : 'text-muted-foreground'
                                  }`} />
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Results Summary - Only show if proposal exists */}
          {journeyData.proposal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-green-500/10 border border-primary/20"
            >
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Project Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {journeyData.proposal.monthly_savings && (
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-primary">€{journeyData.proposal.monthly_savings}</div>
                    <div className="text-xs text-muted-foreground">Monthly Savings</div>
                  </div>
                )}
                {journeyData.proposal.payback_period_years && (
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{journeyData.proposal.payback_period_years} yrs</div>
                    <div className="text-xs text-muted-foreground">Payback Period</div>
                  </div>
                )}
                {journeyData.proposal.system_size_kw && (
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{journeyData.proposal.system_size_kw}kW</div>
                    <div className="text-xs text-muted-foreground">System Size</div>
                  </div>
                )}
                {journeyData.proposal.net_cost && (
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">€{journeyData.proposal.net_cost.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Net Cost</div>
                  </div>
                )}
                {journeyData.proposal.seai_grant && (
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">€{journeyData.proposal.seai_grant.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">SEAI Grant</div>
                  </div>
                )}
                {journeyData.proposal.panel_count && (
                  <div className="text-center p-3 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-primary">{journeyData.proposal.panel_count}</div>
                    <div className="text-xs text-muted-foreground">Solar Panels</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
