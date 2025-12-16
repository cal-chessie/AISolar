import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingDown, Calendar, Shield, CheckCircle, FileText, Download, Send, ArrowLeft, Battery, Package, Sun, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ProposalPreview from '@/components/proposal/ProposalPreview';

interface ProposalResultsViewProps {
  proposalId: string;
  leadId: string;
  onBack: () => void;
}

export default function ProposalResultsView({ proposalId, leadId, onBack }: ProposalResultsViewProps) {
  const [proposal, setProposal] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [proposalId, leadId]);

  const loadData = async () => {
    try {
      const [proposalRes, leadRes] = await Promise.all([
        supabase.from('proposals').select('*').eq('id', proposalId).single(),
        supabase.from('leads').select('*').eq('id', leadId).single(),
      ]);

      if (proposalRes.error) throw proposalRes.error;
      if (leadRes.error) throw leadRes.error;

      setProposal(proposalRes.data);
      setLead(leadRes.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePresent = async () => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'presented', presented_at: new Date().toISOString() })
        .eq('id', proposalId);

      if (error) throw error;

      toast({
        title: "Proposal Presented",
        description: "The proposal has been marked as presented to the customer.",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    // Open print dialog for PDF generation
    window.print();
    toast({
      title: "PDF Export",
      description: "Use Print → Save as PDF to download your proposal.",
    });
  };

  const handleSendToCustomer = () => {
    setShowPreview(true);
  };

  // Show preview mode with acceptance flow
  if (showPreview && proposal && lead) {
    return (
      <ProposalPreview
        proposal={proposal}
        lead={lead}
        onBack={() => setShowPreview(false)}
        onComplete={() => {
          loadData();
          setShowPreview(false);
        }}
      />
    );
  }

  if (loading || !proposal || !lead) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const roiYears = proposal.payback_period_years || 0;
  const twentyYearSavings = (proposal.monthly_savings || 0) * 12 * 20;
  const co2Reduction = (proposal.estimated_annual_production_kwh || 0) * 0.233; // kg CO2 per kWh
  const panelCount = proposal.panel_count || Math.ceil((proposal.system_size_kw || 0) / 0.4);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 print:p-0">
      <Button onClick={onBack} variant="ghost" className="mb-6 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Solar Proposal for {lead.name}</h1>
                <p className="text-primary-foreground/90">{lead.address}</p>
                <Badge variant="secondary" className="mt-2">
                  {proposal.status}
                </Badge>
              </div>
              <Zap size={64} className="opacity-50 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <TrendingDown className="text-green-600 mx-auto mb-2 sm:mb-3" size={28} />
              <div className="text-xl sm:text-2xl font-bold text-foreground">€{Math.round(proposal.monthly_savings || 0)}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Monthly Savings</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <Zap className="text-primary mx-auto mb-2 sm:mb-3" size={28} />
              <div className="text-xl sm:text-2xl font-bold text-foreground">{proposal.system_size_kw} kW</div>
              <div className="text-xs sm:text-sm text-muted-foreground">System Size</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <Calendar className="text-orange-600 mx-auto mb-2 sm:mb-3" size={28} />
              <div className="text-xl sm:text-2xl font-bold text-foreground">{roiYears.toFixed(1)} yrs</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Payback Period</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <Shield className="text-blue-600 mx-auto mb-2 sm:mb-3" size={28} />
              <div className="text-xl sm:text-2xl font-bold text-foreground">€{proposal.seai_grant?.toLocaleString()}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">SEAI Grant</div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Package - NEW Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Your Solar Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Solar Panels */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sun className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Solar Panels</h4>
                    <p className="text-sm text-muted-foreground">{panelCount} panels</p>
                  </div>
                </div>
                <ul className="text-sm space-y-1">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{proposal.panel_type || 'Premium Mono PERC'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span className="font-medium">400W each</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Warranty:</span>
                    <span className="font-medium">25 years</span>
                  </li>
                </ul>
              </div>

              {/* Inverter */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Inverter</h4>
                    <p className="text-sm text-muted-foreground">{proposal.inverter_type || 'Hybrid'}</p>
                  </div>
                </div>
                <ul className="text-sm space-y-1">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-medium">{proposal.system_size_kw} kW</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Efficiency:</span>
                    <span className="font-medium">97.5%</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Warranty:</span>
                    <span className="font-medium">10 years</span>
                  </li>
                </ul>
              </div>

              {/* Battery (if included) */}
              <div className={`p-4 rounded-xl ${proposal.battery_storage ? 'bg-green-50 border border-green-200' : 'bg-muted'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${proposal.battery_storage ? 'bg-green-100' : 'bg-primary/10'}`}>
                    <Battery className={`h-6 w-6 ${proposal.battery_storage ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Battery Storage</h4>
                    <p className="text-sm text-muted-foreground">
                      {proposal.battery_storage ? `${proposal.battery_capacity_kwh} kWh` : 'Not included'}
                    </p>
                  </div>
                </div>
                {proposal.battery_storage ? (
                  <ul className="text-sm space-y-1">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">{proposal.battery_capacity_kwh} kWh</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">Lithium-ion</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Warranty:</span>
                      <span className="font-medium">10 years</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add battery storage for energy independence and backup power.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tabs */}
        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="environmental">Impact</TabsTrigger>
            <TabsTrigger value="installation">Install</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Investment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                  <span className="text-muted-foreground">System Cost</span>
                  <span className="font-semibold">€{proposal.system_cost?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
                  <span className="text-green-700 flex items-center gap-2">
                    <Shield size={18} />
                    SEAI Grant
                  </span>
                  <span className="font-semibold text-green-700">-€{proposal.seai_grant?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border-2 border-primary">
                  <span className="text-primary font-semibold">Your Net Investment</span>
                  <span className="font-bold text-primary text-xl">€{proposal.net_cost?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Long-term Savings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Annual Savings</div>
                    <div className="text-2xl font-bold">€{((proposal.monthly_savings || 0) * 12).toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">20-Year Savings</div>
                    <div className="text-2xl font-bold">€{Math.round(twentyYearSavings).toLocaleString()}</div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
                  <div className="text-sm text-muted-foreground mb-1">Payback Period</div>
                  <div className="text-2xl font-bold">{roiYears.toFixed(1)} years</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    After payback, you'll enjoy {(20 - roiYears).toFixed(1)} years of virtually free electricity
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">System Size</div>
                    <div className="text-xl font-bold">{proposal.system_size_kw} kW</div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Panel Count</div>
                    <div className="text-xl font-bold">{panelCount} panels</div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Annual Production</div>
                    <div className="text-xl font-bold">{proposal.estimated_annual_production_kwh?.toLocaleString()} kWh</div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Energy Offset</div>
                    <div className="text-xl font-bold">{proposal.energy_offset_percentage || '~80'}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roof Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Type</div>
                  <div className="font-semibold">{proposal.roof_type || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Orientation</div>
                  <div className="font-semibold">{proposal.roof_orientation || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Pitch</div>
                  <div className="font-semibold">{proposal.roof_pitch}°</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Material</div>
                  <div className="font-semibold">{proposal.roof_material || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Condition</div>
                  <div className="font-semibold">{proposal.roof_condition || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Shading</div>
                  <div className="font-semibold">{proposal.shading_level || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environmental" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Environmental Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-green-50 rounded-xl">
                    <div className="text-sm text-green-700 mb-1">Annual Production</div>
                    <div className="text-3xl font-bold text-green-900">
                      {proposal.estimated_annual_production_kwh?.toLocaleString()} kWh
                    </div>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <div className="text-sm text-blue-700 mb-1">Energy Offset</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {proposal.energy_offset_percentage || '~80'}%
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-3">Carbon Impact</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Annual CO₂ Reduction</span>
                      <span className="font-bold text-green-900">{Math.round(co2Reduction).toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">20-Year CO₂ Reduction</span>
                      <span className="font-bold text-green-900">{Math.round(co2Reduction * 20).toLocaleString()} kg</span>
                    </div>
                    <p className="text-sm text-green-600 mt-4">
                      Equivalent to planting {Math.round(co2Reduction * 20 / 21)} trees over 20 years
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-xl">
                  <div className="text-sm text-muted-foreground mb-1">Estimated Timeline</div>
                  <div className="text-2xl font-bold">{proposal.installation_timeline_weeks || 2-4} weeks</div>
                  <p className="text-sm text-muted-foreground mt-2">From contract signing to system activation</p>
                </div>

                {proposal.electrical_panel_upgrade_needed && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <h4 className="font-semibold text-yellow-900 mb-2">Electrical Panel Upgrade Required</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p>Current: {proposal.current_panel_capacity}</p>
                      <p>Recommended: {proposal.new_panel_capacity}</p>
                    </div>
                  </div>
                )}

                {proposal.installation_notes && (
                  <div className="p-4 bg-muted rounded-xl">
                    <h4 className="font-semibold mb-2">Installation Notes</h4>
                    <p className="text-sm text-muted-foreground">{proposal.installation_notes}</p>
                  </div>
                )}

                {proposal.special_requirements && (
                  <div className="p-4 bg-muted rounded-xl">
                    <h4 className="font-semibold mb-2">Special Requirements</h4>
                    <p className="text-sm text-muted-foreground">{proposal.special_requirements}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-semibold">What's Included</h4>
                  {[
                    'Premium solar panels with 25-year warranty',
                    'Professional installation by certified team',
                    'SEAI grant application assistance',
                    'Smart monitoring system',
                    'Post-installation support',
                    'Electrical certification',
                    '2-year workmanship warranty'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle className="text-primary flex-shrink-0 mt-1" size={18} />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <Card className="print:hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handlePresent} className="flex-1" disabled={proposal.status === 'presented'}>
                <Send className="mr-2 h-4 w-4" />
                {proposal.status === 'presented' ? 'Already Presented' : 'Mark as Presented'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleSendToCustomer}>
                <Eye className="mr-2 h-4 w-4" />
                Preview & Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
