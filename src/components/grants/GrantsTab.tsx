import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Award, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ESBFormNC6 from './ESBFormNC6';
import SEAIGrantForm from './SEAIGrantForm';
import InstallerCertsImport from './InstallerCertsImport';
import SEAIGrantTracker from '@/components/seai/SEAIGrantTracker';

interface GrantsTabProps {
  leadId: string;
  leadData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    mprn?: string;
  };
  proposalId?: string;
}

export default function GrantsTab({ leadId, leadData, proposalId }: GrantsTabProps) {
  const [activeTab, setActiveTab] = useState('esb_nc6');
  const [proposalData, setProposalData] = useState<any>(null);
  const [installerData, setInstallerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch proposal
        const { data: proposal } = await supabase
          .from('proposals')
          .select('system_size_kw, panel_count, panel_type, inverter_type, battery_storage, battery_capacity_kwh, net_cost, seai_grant, property_type, assigned_installer_id, id')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (proposal?.[0]) {
          setProposalData(proposal[0]);

          // Fetch installer if assigned
          if (proposal[0].assigned_installer_id) {
            const { data: installer } = await supabase
              .from('installers')
              .select('id, user_id')
              .eq('id', proposal[0].assigned_installer_id)
              .single();

            if (installer) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('user_id', installer.user_id)
                .single();

              if (profile) {
                setInstallerData({
                  name: profile.full_name,
                  phone: profile.phone,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading grants data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const effectiveProposalId = proposalId || proposalData?.id;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full justify-start mb-4">
        <TabsTrigger value="esb_nc6" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          ESB NC6
        </TabsTrigger>
        <TabsTrigger value="seai_form" className="gap-1.5">
          <Award className="h-3.5 w-3.5" />
          SEAI Application
        </TabsTrigger>
        <TabsTrigger value="seai_tracker" className="gap-1.5">
          <Award className="h-3.5 w-3.5" />
          Grant Tracker
        </TabsTrigger>
        <TabsTrigger value="certs" className="gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Installer Certs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="esb_nc6">
        <ESBFormNC6
          leadId={leadId}
          leadData={leadData}
          proposalData={proposalData}
          installerData={installerData}
        />
      </TabsContent>

      <TabsContent value="seai_form">
        <SEAIGrantForm
          leadId={leadId}
          leadData={leadData}
          proposalData={proposalData}
        />
      </TabsContent>

      <TabsContent value="seai_tracker">
        {effectiveProposalId ? (
          <SEAIGrantTracker
            proposalId={effectiveProposalId}
            leadId={leadId}
            systemSizeKw={proposalData?.system_size_kw}
            grantAmount={proposalData?.seai_grant}
            propertyType={proposalData?.property_type}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Create a proposal first to track SEAI grant applications.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="certs">
        <InstallerCertsImport />
      </TabsContent>
    </Tabs>
  );
}
