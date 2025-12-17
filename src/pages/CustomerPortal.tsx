import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sun, AlertCircle, Phone, Mail, FileCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import StatusTimeline from '@/components/customer/StatusTimeline';
import ProposalSummaryCard from '@/components/customer/ProposalSummaryCard';
import ContractSignature from '@/components/contracts/ContractSignature';
import InvoiceCard from '@/components/customer/InvoiceCard';
import InstallerAvailabilityCalendar from '@/components/installer/InstallerAvailabilityCalendar';
import SEAIGrantStatus from '@/components/seai/SEAIGrantStatus';
import { Helmet } from 'react-helmet-async';
import { toast } from '@/components/ui/use-toast';
import { brand } from '@/config/brand';

interface PortalData {
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    workflow_stage: string | null;
  };
  proposal: {
    id: string;
    status: string | null;
    system_size_kw: number | null;
    panel_count: number | null;
    panel_type: string | null;
    battery_storage: boolean | null;
    battery_capacity_kwh: number | null;
    system_cost: number | null;
    seai_grant: number | null;
    net_cost: number | null;
    monthly_savings: number | null;
    payback_period_years: number | null;
    estimated_annual_production_kwh: number | null;
    approved_at: string | null;
    confirmed_install_date: string | null;
    installation_status: string | null;
    assigned_installer_id: string | null;
  } | null;
  contract: {
    id: string;
    signed_at: string;
  } | null;
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    deposit_amount: number | null;
    deposit_paid: boolean | null;
    deposit_paid_at: string | null;
    final_amount: number | null;
    final_paid: boolean | null;
    final_paid_at: string | null;
    due_date: string | null;
    status: string | null;
  } | null;
}

export default function CustomerPortal() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [contractSigned, setContractSigned] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Handle payment status from URL
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast({
        title: 'Payment Successful!',
        description: 'Thank you for your payment. Your invoice has been updated.',
      });
      searchParams.delete('payment');
      setSearchParams(searchParams);
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment was not completed. You can try again anytime.',
        variant: 'destructive',
      });
      searchParams.delete('payment');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);
  const fetchPortalData = useCallback(async () => {
    if (!token) {
      setError('Invalid access link');
      setLoading(false);
      return;
    }

    try {
      // Fetch lead by access token
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();

      if (leadError) throw leadError;
      if (!lead) {
        setError('This link is invalid or has expired');
        setLoading(false);
        return;
      }

      // Fetch proposal
      const { data: proposals } = await supabase
        .from('proposals')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const proposal = proposals?.[0] || null;

      // Fetch contract if exists
      let contract = null;
      let invoice = null;

      if (proposal) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*')
          .eq('proposal_id', proposal.id)
          .maybeSingle();
        contract = contracts;

        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('proposal_id', proposal.id)
          .maybeSingle();
        invoice = invoices;
      }

      setData({
        lead,
        proposal,
        contract,
        invoice
      });
      setContractSigned(!!contract);
    } catch (err: any) {
      console.error('Portal fetch error:', err);
      setError('Unable to load your proposal. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Real-time updates for invoices and proposals
  useEffect(() => {
    if (!data?.lead?.id) return;

    const channel = supabase
      .channel('customer-portal-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `lead_id=eq.${data.lead.id}`,
        },
        (payload) => {
          console.log('Invoice update:', payload);
          if (payload.new) {
            setData(prev => prev ? { ...prev, invoice: payload.new as any } : null);
            toast({
              title: 'Invoice Updated',
              description: 'Your invoice has been updated.',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
          filter: `lead_id=eq.${data.lead.id}`,
        },
        (payload) => {
          console.log('Proposal update:', payload);
          if (payload.new) {
            setData(prev => prev ? { ...prev, proposal: payload.new as any } : null);
            toast({
              title: 'Proposal Updated',
              description: 'Your proposal has been updated.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.lead?.id]);

  const handleContractSigned = () => {
    setContractSigned(true);
    // Refresh data
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Error</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <p className="text-sm text-muted-foreground">
                If you believe this is an error, please contact us:
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href="tel:+353851234567">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Us
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:support@solardublin.ie">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { lead, proposal, contract, invoice } = data;

  return (
    <>
      <Helmet>
        <title>Your Solar Proposal | {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-background to-muted/30">
        {/* Header with Back Button - Mobile Optimized */}
        <header className="bg-background border-b sticky top-0 z-10 safe-area-inset-top">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                  <span className="font-bold text-lg sm:text-xl truncate">{brand.name}</span>
                </div>
              </div>
              <div className="text-right min-w-0 flex-shrink-0">
                <p className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{lead.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{lead.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl pb-safe">
          {/* Welcome Message */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
              Welcome, {lead.name.split(' ')[0]}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track your solar installation journey below
            </p>
          </div>

          {/* Status Timeline */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Project Status</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your installation progress</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <StatusTimeline
                currentStage={lead.workflow_stage || 'proposal'}
                proposalStatus={proposal?.status || undefined}
                contractSigned={contractSigned}
                depositPaid={invoice?.deposit_paid || false}
                installationScheduled={!!proposal?.confirmed_install_date}
              />
            </CardContent>
          </Card>

          {/* Main Content - Tabs for larger screens */}
          <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 gap-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-2.5">Overview</TabsTrigger>
              <TabsTrigger value="proposal" className="text-xs sm:text-sm py-2.5">Proposal</TabsTrigger>
              <TabsTrigger value="payment" className="text-xs sm:text-sm py-2.5">Payment</TabsTrigger>
              <TabsTrigger value="grant" className="text-xs sm:text-sm py-2.5 flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">SEAI</span> Grant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                {/* Proposal Summary */}
                {proposal && (
                  <ProposalSummaryCard proposal={proposal} />
                )}

                {/* Action Card */}
                <div className="space-y-6">
                  {/* Contract Signing Section */}
                  {proposal && !contractSigned && proposal.status !== 'draft' && (
                    <ContractSignature
                      proposalId={proposal.id}
                      leadId={lead.id}
                      leadName={lead.name}
                      leadEmail={lead.email}
                      totalAmount={proposal.net_cost || 0}
                      onSignComplete={handleContractSigned}
                    />
                  )}

                  {/* Contract Signed - Show Invoice */}
                  {contractSigned && (
                    <>
                      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                        <CardContent className="pt-6">
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Contract signed on{' '}
                            {contract?.signed_at 
                              ? new Date(contract.signed_at).toLocaleDateString()
                              : 'recently'
                            }
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Contact Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Need Help?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Our team is here to answer any questions about your solar installation.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button variant="outline" className="flex-1 h-11" asChild>
                            <a href="tel:+353851234567">
                              <Phone className="h-4 w-4 mr-2" />
                              Call Us
                            </a>
                          </Button>
                          <Button variant="outline" className="flex-1 h-11" asChild>
                            <a href="mailto:support@solardublin.ie">
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </a>
                          </Button>
                        </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="proposal">
              {proposal && <ProposalSummaryCard proposal={proposal} />}
            </TabsContent>

            <TabsContent value="payment" className="space-y-6">
              {/* Invoice Card */}
              {invoice && <InvoiceCard invoice={invoice} portalToken={token} />}

              {/* Installation Calendar with Availability - Show after deposit paid */}
              {invoice?.deposit_paid && proposal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Schedule Installation</span>
                      <Button variant="ghost" size="sm" onClick={fetchPortalData}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Select your preferred installation date from available slots
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InstallerAvailabilityCalendar
                      installerId={proposal.assigned_installer_id || undefined}
                      onDateSelect={(date) => {
                        toast({
                          title: 'Date Selected',
                          description: `You selected ${date.toLocaleDateString()}. We'll confirm availability shortly.`,
                        });
                      }}
                      mode="select"
                    />
                  </CardContent>
                </Card>
              )}

              {!invoice && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Invoice will be available after contract signing.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="grant">
              {proposal && (
                <SEAIGrantStatus proposalId={proposal.id} leadId={lead.id} />
              )}
            </TabsContent>
          </Tabs>

          {/* Property Details */}
          {lead.address && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Installation Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{lead.address}</p>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-background mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
            <p className="mt-1">SEAI Registered Installer | RECI Certified</p>
          </div>
        </footer>
      </div>
    </>
  );
}