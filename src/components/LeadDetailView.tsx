import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Star,
  Calendar,
  FileText,
  ClipboardCheck,
  ArrowLeft,
  Send,
  Trash2,
  Euro,
  Wrench,
  Award,
  Clock
} from 'lucide-react';
import SiteSurveyForm from './SiteSurveyForm';
import ProposalQuestionnaire from './ProposalQuestionnaire';
import SendToCustomerDialog from './dashboard/SendToCustomerDialog';
import InvoiceManagement from './dashboard/InvoiceManagement';
import InstallationChecklist from './installer/InstallationChecklist';
import SEAIGrantTracker from './seai/SEAIGrantTracker';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  monthly_bill?: number;
  score?: number;
  status?: string;
  notes?: string;
  created_at: string;
}

interface LeadDetailViewProps {
  lead: Lead;
  onClose: () => void;
  onDelete?: () => void;
}

export default function LeadDetailView({ lead, onClose, onDelete }: LeadDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proposal, setProposal] = useState<{ 
    id: string; 
    status: string;
    system_size_kw?: number;
    seai_grant?: number;
    property_type?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProposal = async () => {
      const { data } = await supabase
        .from('proposals')
        .select('id, status, system_size_kw, seai_grant, property_type')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data?.[0]) {
        setProposal(data[0]);
      }
    };
    fetchProposal();
  }, [lead.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'Lead Deleted',
        description: `${lead.name} has been removed.`,
      });
      onDelete?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete lead.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'contacted': return 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'qualified': return 'bg-primary/10 text-primary dark:bg-primary/20';
      case 'proposal_sent': return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const canSendToCustomer = proposal && ['ready', 'presented'].includes(proposal.status || '');

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-background border-0 sm:border rounded-none sm:rounded-lg shadow-lg w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] overflow-hidden">
        {/* Header - Mobile Optimized */}
        <div className="border-b p-3 sm:p-6 flex items-center justify-between gap-2 safe-area-inset-top">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold truncate">{lead.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  #{lead.id.slice(0, 8)}
                </p>
                <Badge className={`${getStatusColor(lead.status)} text-xs`}>
                  {lead.status || 'new'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {canSendToCustomer && (
              <Button onClick={() => setSendDialogOpen(true)} size="sm" className="hidden sm:flex">
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </Button>
            )}
            {canSendToCustomer && (
              <Button onClick={() => setSendDialogOpen(true)} size="icon" className="sm:hidden h-10 w-10">
                <Send className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-destructive h-10 w-10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 hidden sm:flex">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] sm:max-h-[calc(90vh-100px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-2 sm:px-6 overflow-x-auto scrollbar-hide">
              <TabsList className="w-max min-w-full sm:w-full justify-start gap-0 sm:gap-1 h-auto p-1">
                <TabsTrigger value="overview" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Overview</span>
                  <span className="xs:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger value="survey" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Survey
                </TabsTrigger>
                <TabsTrigger value="proposal" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Proposal
                </TabsTrigger>
                <TabsTrigger value="invoice" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <Euro className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Invoice
                </TabsTrigger>
                <TabsTrigger value="installation" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Install
                </TabsTrigger>
                <TabsTrigger value="seai" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  SEAI
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-3 sm:p-6 pb-safe">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Phone</p>
                            <p className="text-sm text-muted-foreground">{lead.phone}</p>
                          </div>
                        </div>
                      )}
                      {lead.address && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Address</p>
                            <p className="text-sm text-muted-foreground">{lead.address}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Lead Quality */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Lead Quality</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Score</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-6 w-6 ${
                                star <= (lead.score || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-muted-foreground">
                            {lead.score || 0}/5
                          </span>
                        </div>
                      </div>
                      {lead.monthly_bill && (
                        <div>
                          <p className="text-sm font-medium">Monthly Bill</p>
                          <p className="text-2xl font-bold text-primary">
                            €{lead.monthly_bill.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Estimated annual savings: €{Math.round(lead.monthly_bill * 12 * 0.7).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  {lead.notes && (
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle>Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {lead.notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="survey" className="mt-0">
                <SiteSurveyForm leadId={lead.id} />
              </TabsContent>

              <TabsContent value="proposal" className="mt-0">
                <ProposalQuestionnaire leadId={lead.id} />
              </TabsContent>

              <TabsContent value="invoice" className="mt-0">
                <InvoiceManagement leadId={lead.id} />
              </TabsContent>

              <TabsContent value="installation" className="mt-0">
                {proposal ? (
                  <InstallationChecklist 
                    proposalId={proposal.id} 
                    leadId={lead.id}
                    leadName={lead.name}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Create a proposal first to access the installation checklist.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="seai" className="mt-0">
                {proposal ? (
                  <SEAIGrantTracker
                    proposalId={proposal.id}
                    leadId={lead.id}
                    systemSizeKw={proposal.system_size_kw}
                    grantAmount={proposal.seai_grant}
                    propertyType={proposal.property_type}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Create a proposal first to track SEAI grant applications.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <ActivityTimeline leadId={lead.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Send to Customer Dialog */}
      {proposal && (
        <SendToCustomerDialog
          leadId={lead.id}
          leadName={lead.name}
          leadEmail={lead.email}
          proposalId={proposal.id}
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {lead.name} and all associated surveys, proposals, and contracts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}