// Survey Validation & Completion Logic

export interface SurveyCompletionStatus {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  sections: {
    roof: { complete: boolean; fields: string[] };
    electrical: { complete: boolean; fields: string[] };
    recommendations: { complete: boolean; fields: string[] };
    photos: { complete: boolean; count: number; required: number };
  };
}

export interface SurveyData {
  roof_type?: string;
  roof_condition?: string;
  roof_orientation?: string;
  roof_pitch?: number | string;
  roof_material?: string;
  electrical_panel_capacity?: string;
  electrical_panel_condition?: string;
  grid_connection_type?: string;
  recommended_system_size?: number | string;
  recommended_panel_count?: number | string;
  shading_analysis?: string;
  installation_notes?: string;
  special_requirements?: string;
  // New installer logistics fields (optional)
  property_storeys?: number | string;
  scaffolding_required?: string;
  parking_situation?: string;
  attic_access?: string;
  access_notes?: string;
  customer_availability?: string;
  existing_solar?: boolean;
}

export function validateSurveyCompletion(
  surveyData: SurveyData,
  photoCount: number = 0
): SurveyCompletionStatus {
  const missingFields: string[] = [];
  
  // Roof section (required: type, condition, orientation, pitch, material)
  const roofFields: string[] = [];
  if (!surveyData.roof_type) roofFields.push('Roof Type');
  if (!surveyData.roof_condition) roofFields.push('Roof Condition');
  if (!surveyData.roof_orientation) roofFields.push('Roof Orientation');
  if (!surveyData.roof_pitch) roofFields.push('Roof Pitch');
  if (!surveyData.roof_material) roofFields.push('Roof Material');
  
  // Electrical section (required: panel capacity, grid connection) - removed panel condition
  const electricalFields: string[] = [];
  if (!surveyData.electrical_panel_capacity) electricalFields.push('Panel Capacity');
  if (!surveyData.grid_connection_type) electricalFields.push('Grid Connection Type');
  
  // Recommendations section (required: system size, panel count)
  const recommendationsFields: string[] = [];
  if (!surveyData.recommended_system_size) recommendationsFields.push('Recommended System Size');
  if (!surveyData.recommended_panel_count) recommendationsFields.push('Recommended Panel Count');
  
  // Photo requirements (minimum 2 photos)
  const requiredPhotos = 2;
  const photosComplete = photoCount >= requiredPhotos;
  
  // Combine all missing fields
  missingFields.push(...roofFields, ...electricalFields, ...recommendationsFields);
  if (!photosComplete) {
    missingFields.push(`At least ${requiredPhotos} photos required (${photoCount} uploaded)`);
  }
  
  // Calculate completion percentage
  const totalRequiredFields = 9; // 5 roof + 2 electrical + 2 recommendations
  const completedFields = totalRequiredFields - (roofFields.length + electricalFields.length + recommendationsFields.length);
  const fieldPercentage = (completedFields / totalRequiredFields) * 80; // Fields worth 80%
  const photoPercentage = photosComplete ? 20 : (photoCount / requiredPhotos) * 20; // Photos worth 20%
  const completionPercentage = Math.round(fieldPercentage + photoPercentage);
  
  const isComplete = missingFields.length === 0;
  
  return {
    isComplete,
    completionPercentage,
    missingFields,
    sections: {
      roof: { complete: roofFields.length === 0, fields: roofFields },
      electrical: { complete: electricalFields.length === 0, fields: electricalFields },
      recommendations: { complete: recommendationsFields.length === 0, fields: recommendationsFields },
      photos: { complete: photosComplete, count: photoCount, required: requiredPhotos }
    }
  };
}

// Auto-calculate survey status based on completion
export type SurveyAutoStatus = 'draft' | 'in_progress' | 'completed';

export function calculateSurveyStatus(
  surveyData: SurveyData,
  photoCount: number = 0
): SurveyAutoStatus {
  const validation = validateSurveyCompletion(surveyData, photoCount);
  
  if (validation.isComplete) {
    return 'completed';
  }
  
  if (validation.completionPercentage >= 25) {
    return 'in_progress';
  }
  
  return 'draft';
}

// Map survey data to proposal data - used for Survey → Proposal flow
// This comprehensive mapping eliminates duplicate data entry
export function mapSurveyToProposal(surveyData: any, leadData: any) {
  const systemSize = parseFloat(surveyData.recommended_system_size) || 0;
  const panelCount = parseInt(surveyData.recommended_panel_count) || 0;
  
  // Calculate annual consumption from monthly bill (rough estimate)
  const monthlyBill = leadData?.monthly_bill || 0;
  const avgTariff = 0.35;
  const estimatedAnnualConsumption = monthlyBill > 0 
    ? Math.round((monthlyBill / avgTariff) * 12) 
    : systemSize * 900;

  return {
    // From survey - roof details (auto-populated)
    roofType: surveyData.roof_type || '',
    roofCondition: surveyData.roof_condition || '',
    roofOrientation: surveyData.roof_orientation || '',
    roofPitch: surveyData.roof_pitch?.toString() || '',
    roofMaterial: surveyData.roof_material || '',
    
    // From survey - electrical (auto-populated)
    panelCapacity: surveyData.electrical_panel_capacity || '',
    gridConnectionType: surveyData.grid_connection_type || '',
    
    // From survey - shading & environment (auto-populated)
    shadingLevel: surveyData.shading_analysis || '',
    nearbyObstructions: surveyData.nearby_obstructions || '',
    
    // From survey - recommendations (auto-populated)
    systemSize: systemSize.toString(),
    panelCount: panelCount.toString(),
    
    // From survey - notes (auto-populated)
    specialRequirements: surveyData.special_requirements || '',
    installationNotes: surveyData.installation_notes || '',
    
    // From survey - customer goals (auto-populated if captured in survey)
    batteryStorage: surveyData.battery_storage ? 'yes' : 'no',
    hotWaterDiverter: surveyData.hot_water_diverter || false,
    evCharger: surveyData.ev_charger || false,
    
    // From survey - installer logistics (for reference)
    propertyStoreys: surveyData.property_storeys || '',
    scaffoldingRequired: surveyData.scaffolding_required || '',
    atticAccess: surveyData.attic_access || '',
    existingSolar: surveyData.existing_solar || false,
    
    // Calculated/derived from lead data
    annualConsumption: estimatedAnnualConsumption.toString(),
    
    // Defaults that can be adjusted in proposal
    currentTariff: '0.35',
    propertyType: leadData?.property_type || 'residential',
    
    // Flag to show this data came from survey
    _prefilledFromSurvey: true,
  };
}

// Get workflow stage based on data
export function getWorkflowStage(lead: any, survey: any, proposal: any): string {
  if (!lead) return 'unknown';
  
  // Check proposal status first
  if (proposal) {
    if (proposal.status === 'approved') return 'approved';
    if (proposal.status === 'presented') return 'presented';
    if (proposal.requires_review && !proposal.reviewed_at) return 'pending_review';
    if (proposal.status === 'draft') return 'proposal_draft';
  }
  
  // Check survey status
  if (survey) {
    if (survey.status === 'completed') return 'survey_complete';
    if (survey.status === 'in_progress') return 'survey_in_progress';
    if (survey.status === 'draft') return 'survey_draft';
  }
  
  // Lead-only stages
  if (lead.status === 'contacted') return 'contacted';
  if (lead.status === 'qualified') return 'qualified';
  
  return 'new';
}

export const WORKFLOW_STAGES = [
  { id: 'new', label: 'New Lead', color: 'bg-slate-100 text-slate-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-700' },
  { id: 'survey_draft', label: 'Survey Started', color: 'bg-orange-100 text-orange-700' },
  { id: 'survey_in_progress', label: 'Survey In Progress', color: 'bg-orange-100 text-orange-700' },
  { id: 'survey_complete', label: 'Survey Complete', color: 'bg-green-100 text-green-700' },
  { id: 'proposal_draft', label: 'Proposal Draft', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'pending_review', label: 'Pending Review', color: 'bg-red-100 text-red-700' },
  { id: 'presented', label: 'Presented', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { id: 'installation_pending', label: 'Installation Pending', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'installation_scheduled', label: 'Installation Scheduled', color: 'bg-teal-100 text-teal-700' },
  { id: 'installed', label: 'Installed', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
];
