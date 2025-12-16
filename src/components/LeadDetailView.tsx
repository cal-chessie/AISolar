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
  Trash2
} from 'lucide-react';
import SiteSurveyForm from './SiteSurveyForm';
import ProposalQuestionnaire from './ProposalQuestionnaire';
import SendToCustomerDialog from './dashboard/SendToCustomerDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
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
  const [proposal, setProposal] = useState<{ id: string; status: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProposal = async () => {
      const { data } = await supabase
        .from('proposals')
        .select('id, status')
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
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal_sent': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canSendToCustomer = proposal && ['ready', 'presented'].includes(proposal.status || '');

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{lead.name}</h2>
              <p className="text-sm text-muted-foreground">
                Lead #{lead.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canSendToCustomer && (
              <Button onClick={() => setSendDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </Button>
            )}
            <Badge className={getStatusColor(lead.status)}>
              {lead.status || 'new'}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="survey" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Site Survey
                </TabsTrigger>
                <TabsTrigger value="proposal" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Proposal
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <TabsContent value="timeline" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>Track all interactions with this lead</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div className="w-px h-full bg-border mt-2" />
                        </div>
                        <div className="pb-4">
                          <p className="font-medium">Lead Created</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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