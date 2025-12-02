import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Eye, Plus, Image as ImageIcon } from 'lucide-react';
import SiteSurveyForm from '@/components/SiteSurveyForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SurveysPanelProps {
  onStartSurvey?: (leadId: string) => void;
}

export default function SurveysPanel({ onStartSurvey }: SurveysPanelProps) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('site_surveys')
        .select(`
          *,
          leads (id, name, email, address),
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
        <SiteSurveyForm leadId={selectedSurvey.lead_id} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Site Surveys</h2>
        <span className="text-sm text-slate-600">{surveys.length} total surveys</span>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No surveys yet</h3>
          <p className="text-slate-600 text-sm">
            Start a survey from the Leads tab by clicking "Start Survey" on any lead
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {survey.leads?.name || 'Unknown Lead'}
                    </h3>
                    <Badge className={getStatusBadge(survey.status)}>
                      {survey.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {survey.leads?.address || 'No address'}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Roof: {survey.roof_type || 'N/A'}</span>
                    <span>Condition: {survey.roof_condition || 'N/A'}</span>
                    {survey.recommended_system_size && (
                      <span>Recommended: {survey.recommended_system_size} kW</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {survey.survey_photos?.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-slate-500">
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
                </div>
              </div>
              <p className="text-xs text-slate-500">
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
