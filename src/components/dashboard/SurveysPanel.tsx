import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Eye, Image as ImageIcon, FileText, ArrowRight } from 'lucide-react';
import SiteSurveyForm from '@/components/SiteSurveyForm';

interface SurveysPanelProps {
  onStartSurvey?: (leadId: string) => void;
  onCreateProposal?: (surveyData: any, leadData: any) => void;
}

const dummySurveys = [
  {
    id: 'dummy-1',
    lead_id: 'dummy-lead-1',
    status: 'completed',
    roof_type: 'Pitched',
    roof_condition: 'Good',
    roof_orientation: 'South',
    roof_pitch: 35,
    roof_material: 'Slate',
    recommended_system_size: 6.6,
    shading_analysis: 'Minimal',
    electrical_panel_capacity: '63A',
    special_requirements: 'Bird guards required',
    installation_notes: 'Easy access via side gate',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    leads: { id: 'dummy-lead-1', name: 'Patrick Kelly', email: 'patrick@email.com', address: '28 Maple Drive, Dublin 8', monthly_bill: 180 },
    survey_photos: [{ id: 'p1', photo_url: '', photo_type: 'roof_overview' }, { id: 'p2', photo_url: '', photo_type: 'electrical_panel' }]
  },
  {
    id: 'dummy-2',
    lead_id: 'dummy-lead-2',
    status: 'in_progress',
    roof_type: 'Flat',
    roof_condition: 'Excellent',
    roof_orientation: 'South-East',
    roof_pitch: 10,
    roof_material: 'EPDM',
    recommended_system_size: 8.8,
    shading_analysis: 'None',
    electrical_panel_capacity: '80A',
    special_requirements: 'Commercial property',
    installation_notes: 'Loading bay access for equipment',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
    leads: { id: 'dummy-lead-2', name: 'Tech Solutions Ltd', email: 'info@techsolutions.ie', address: '15 Business Park, Galway', monthly_bill: 450 },
    survey_photos: [{ id: 'p3', photo_url: '', photo_type: 'roof_overview' }]
  },
  {
    id: 'dummy-3',
    lead_id: 'dummy-lead-3',
    status: 'draft',
    roof_type: 'Pitched',
    roof_condition: 'Fair',
    roof_orientation: 'West',
    roof_pitch: 40,
    roof_material: 'Concrete Tiles',
    recommended_system_size: null,
    shading_analysis: null,
    electrical_panel_capacity: null,
    special_requirements: null,
    installation_notes: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    leads: { id: 'dummy-lead-3', name: 'Mary O\'Sullivan', email: 'mary.osullivan@email.com', address: '7 Church Lane, Cork', monthly_bill: 120 },
    survey_photos: []
  },
];

export default function SurveysPanel({ onStartSurvey, onCreateProposal }: SurveysPanelProps) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
  const [showDummy, setShowDummy] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('site_surveys')
        .select(`
          *,
          leads (id, name, email, address, monthly_bill),
          survey_photos (id, photo_url, photo_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      console.error('Error fetching surveys:', error);
      toast({
        title: 'Error loading surveys',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-orange-100 text-orange-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  const handleCreateProposalFromSurvey = (survey: any) => {
    if (onCreateProposal && survey.leads) {
      // Map survey data to proposal format
      const proposalData = {
        roofType: survey.roof_type,
        roofCondition: survey.roof_condition,
        roofOrientation: survey.roof_orientation,
        roofPitch: survey.roof_pitch?.toString() || '',
        roofMaterial: survey.roof_material,
        shadingLevel: survey.shading_analysis || '',
        systemSize: survey.recommended_system_size?.toString() || '',
        panelCapacity: survey.electrical_panel_capacity,
        specialRequirements: survey.special_requirements,
        installationNotes: survey.installation_notes,
        // Calculate annual consumption from monthly bill
        annualConsumption: survey.leads.monthly_bill 
          ? Math.round((survey.leads.monthly_bill / 0.35) * 12).toString()
          : '',
        currentTariff: '0.35',
        batteryInterest: 'no',
      };
      
      onCreateProposal(proposalData, survey.leads);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (viewMode === 'edit' && selectedSurvey) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => {
            setViewMode('list');
            setSelectedSurvey(null);
            fetchSurveys();
          }}
          className="mb-4"
        >
          ← Back to Surveys
        </Button>
        <SiteSurveyForm 
          leadId={selectedSurvey.lead_id} 
          onCreateProposal={onCreateProposal ? (surveyData, leadData) => {
            onCreateProposal(surveyData, leadData);
            setViewMode('list');
            setSelectedSurvey(null);
          } : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Site Surveys</h2>
        <span className="text-sm text-muted-foreground">{surveys.length > 0 ? surveys.length : showDummy ? dummySurveys.length : 0} total surveys</span>
      </div>

      {surveys.length === 0 && !showDummy ? (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto text-muted-foreground/30 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-foreground mb-2">No surveys yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Start a survey from the Leads tab by clicking "Survey" on any lead
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowDummy(true)}>
            Show Demo Data
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {showDummy && surveys.length === 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDummy(false)}>
                Hide Demo Data
              </Button>
            </div>
          )}
          {(surveys.length > 0 ? surveys : showDummy ? dummySurveys : []).map((survey) => (
            <div
              key={survey.id}
              className="p-5 bg-muted/50 rounded-xl border hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-lg">
                      {survey.leads?.name || 'Unknown Lead'}
                    </h3>
                    <Badge className={getStatusBadge(survey.status)}>
                      {survey.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {survey.leads?.address || 'No address'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground/70">
                    <span>Roof: {survey.roof_type || 'N/A'}</span>
                    <span>Condition: {survey.roof_condition || 'N/A'}</span>
                    {survey.recommended_system_size && (
                      <span>Recommended: {survey.recommended_system_size} kW</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {survey.survey_photos?.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ImageIcon size={16} />
                      {survey.survey_photos.length}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSurvey(survey);
                      setViewMode('edit');
                    }}
                    className="gap-2"
                  >
                    <Eye size={16} />
                    View / Edit
                  </Button>
                  {survey.status === 'completed' && onCreateProposal && (
                    <Button
                      size="sm"
                      onClick={() => handleCreateProposalFromSurvey(survey)}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <FileText size={16} />
                      Create Proposal
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70">
                Created {new Date(survey.created_at).toLocaleDateString()}
                {survey.completed_at && ` • Completed ${new Date(survey.completed_at).toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
