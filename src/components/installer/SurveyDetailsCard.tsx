import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Image as ImageIcon, Home, Zap, MapPin } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SurveyDetailsCardProps {
  leadId: string;
}

export default function SurveyDetailsCard({ leadId }: SurveyDetailsCardProps) {
  const [survey, setSurvey] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchSurveyData();
  }, [leadId]);

  const fetchSurveyData = async () => {
    try {
      const { data: surveyData, error } = await supabase
        .from('site_surveys')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;

      if (surveyData) {
        setSurvey(surveyData);

        // Fetch photos
        const { data: photosData } = await supabase
          .from('survey_photos')
          .select('*')
          .eq('survey_id', surveyData.id);

        setPhotos(photosData || []);
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-muted rounded-lg animate-pulse">
        <div className="h-4 bg-muted-foreground/20 rounded w-1/3"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">No site survey available for this lead</p>
      </div>
    );
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-700';
      case 'good': return 'bg-blue-100 text-blue-700';
      case 'fair': return 'bg-yellow-100 text-yellow-700';
      case 'poor': return 'bg-red-100 text-red-700';
      case 'needs_upgrade': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Home size={20} className="text-primary" />
                Site Survey Details
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getConditionColor(survey.status)}>
                  {survey.status}
                </Badge>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Roof Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Home size={16} />
                  Roof Information
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{survey.roof_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition:</span>
                    <Badge className={getConditionColor(survey.roof_condition)}>
                      {survey.roof_condition || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orientation:</span>
                    <span className="font-medium">{survey.roof_orientation || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pitch:</span>
                    <span className="font-medium">{survey.roof_pitch ? `${survey.roof_pitch}°` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material:</span>
                    <span className="font-medium">{survey.roof_material || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Zap size={16} />
                  Electrical System
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Panel Capacity:</span>
                    <span className="font-medium">{survey.electrical_panel_capacity || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Panel Condition:</span>
                    <Badge className={getConditionColor(survey.electrical_panel_condition)}>
                      {survey.electrical_panel_condition || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meter Location:</span>
                    <span className="font-medium">{survey.meter_location || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grid Connection:</span>
                    <span className="font-medium">{survey.grid_connection_type || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {(survey.recommended_system_size || survey.recommended_panel_count) && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{survey.recommended_system_size || '-'}</div>
                    <div className="text-xs text-muted-foreground">kW System</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{survey.recommended_panel_count || '-'}</div>
                    <div className="text-xs text-muted-foreground">Panels</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {survey.estimated_installation_cost ? `€${survey.estimated_installation_cost.toLocaleString()}` : '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">Est. Cost</div>
                  </div>
                </div>
              </div>
            )}

            {/* Shading & Obstructions */}
            {(survey.shading_analysis || survey.nearby_obstructions) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin size={16} />
                  Environmental Factors
                </h4>
                {survey.shading_analysis && (
                  <p className="text-sm"><strong>Shading:</strong> {survey.shading_analysis}</p>
                )}
                {survey.nearby_obstructions && (
                  <p className="text-sm"><strong>Obstructions:</strong> {survey.nearby_obstructions}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {(survey.installation_notes || survey.special_requirements) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Notes & Requirements</h4>
                {survey.installation_notes && (
                  <p className="text-sm bg-muted p-3 rounded-lg">{survey.installation_notes}</p>
                )}
                {survey.special_requirements && (
                  <p className="text-sm bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <strong>Special:</strong> {survey.special_requirements}
                  </p>
                )}
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <ImageIcon size={16} />
                  Site Photos ({photos.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.description || 'Site photo'}
                        className="w-full h-24 object-cover rounded-lg border border-border hover:border-primary transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
