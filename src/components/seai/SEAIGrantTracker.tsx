import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { logActivity } from '@/lib/activityLog';
import { 
  Loader2, 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Trash2,
  Download,
  Award
} from 'lucide-react';

interface SEAIGrantTrackerProps {
  proposalId: string;
  leadId: string;
  systemSizeKw?: number;
  grantAmount?: number;
  propertyType?: string;
}

interface ApplicationData {
  id?: string;
  application_number: string | null;
  grant_amount: number | null;
  property_type: string | null;
  system_size_kw: number | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  ber_cert_uploaded: boolean;
  completion_cert_uploaded: boolean;
  invoice_uploaded: boolean;
  photos_uploaded: boolean;
  requires_engineer_review: boolean;
  engineer_email: string | null;
  engineer_reviewed_at: string | null;
  engineer_notes: string | null;
  notes: string | null;
}

interface DocumentData {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { key: 'ber_cert', label: 'BER Certificate', field: 'ber_cert_uploaded' },
  { key: 'completion_cert', label: 'Completion Certificate', field: 'completion_cert_uploaded' },
  { key: 'invoice', label: 'Final Invoice', field: 'invoice_uploaded' },
  { key: 'photos', label: 'Installation Photos', field: 'photos_uploaded' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: Clock },
  ready: { label: 'Ready to Submit', color: 'bg-blue-500', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-yellow-500', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-orange-500', icon: AlertCircle },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: AlertCircle },
};

export default function SEAIGrantTracker({ 
  proposalId, 
  leadId, 
  systemSizeKw, 
  grantAmount,
  propertyType 
}: SEAIGrantTrackerProps) {
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchApplication();
  }, [proposalId]);

  const fetchApplication = async () => {
    try {
      const { data: app, error: appError } = await supabase
        .from('seai_applications')
        .select('*')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (appError) throw appError;

      if (app) {
        setApplication(app as ApplicationData);
        // Fetch documents
        const { data: docs } = await supabase
          .from('seai_documents')
          .select('*')
          .eq('application_id', app.id)
          .order('created_at', { ascending: false });
        setDocuments(docs || []);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApplication = async () => {
    setSaving(true);
    try {
      const requiresReview = (systemSizeKw || 0) > 50;
      
      const { data, error } = await supabase
        .from('seai_applications')
        .insert({
          proposal_id: proposalId,
          lead_id: leadId,
          grant_amount: grantAmount,
          property_type: propertyType,
          system_size_kw: systemSizeKw,
          requires_engineer_review: requiresReview,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      setApplication(data as ApplicationData);
      toast({ title: 'Application Created', description: 'SEAI grant application has been initiated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateApplication = async (updates: Partial<ApplicationData>) => {
    if (!application?.id) return;
    
    try {
      const { error } = await supabase
        .from('seai_applications')
        .update(updates)
        .eq('id', application.id);

      if (error) throw error;
      setApplication(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const uploadDocument = async (file: File, documentType: string) => {
    if (!application?.id) return;
    
    setUploading(documentType);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${application.id}/${documentType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('seai-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('seai-documents')
        .getPublicUrl(filePath);

      const { data: doc, error: docError } = await supabase
        .from('seai_documents')
        .insert({
          application_id: application.id,
          document_type: documentType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size
        })
        .select()
        .single();

      if (docError) throw docError;

      setDocuments(prev => [doc as DocumentData, ...prev]);

      // Update application flags
      const fieldMap: Record<string, string> = {
        ber_cert: 'ber_cert_uploaded',
        completion_cert: 'completion_cert_uploaded',
        invoice: 'invoice_uploaded',
        photos: 'photos_uploaded'
      };

      if (fieldMap[documentType]) {
        await updateApplication({ [fieldMap[documentType]]: true } as Partial<ApplicationData>);
      }

      toast({ title: 'Document Uploaded', description: `${file.name} has been uploaded.` });
    } catch (error: any) {
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const deleteDocument = async (doc: DocumentData) => {
    try {
      // Extract file path from URL
      const urlParts = doc.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      await supabase.storage.from('seai-documents').remove([filePath]);
      await supabase.from('seai_documents').delete().eq('id', doc.id);

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: 'Document Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const submitApplication = async () => {
    if (!application) return;

    const allDocsUploaded = application.ber_cert_uploaded && 
      application.completion_cert_uploaded && 
      application.invoice_uploaded && 
      application.photos_uploaded;

    if (!allDocsUploaded) {
      toast({ title: 'Missing Documents', description: 'Please upload all required documents before submitting.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await updateApplication({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      });

      // Log activity
      await logActivity({
        leadId,
        actionType: 'seai_application_submitted',
        description: `SEAI grant application submitted`,
        metadata: {
          grant_amount: application.grant_amount,
          application_number: application.application_number
        }
      });

      toast({ title: 'Application Submitted', description: 'Your SEAI grant application has been submitted.' });
    } finally {
      setSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    if (!application) return 0;
    const checks = [
      application.ber_cert_uploaded,
      application.completion_cert_uploaded,
      application.invoice_uploaded,
      application.photos_uploaded
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Award className="h-12 w-12 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">SEAI Grant Application</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Start the SEAI grant application process for this installation. 
            {systemSizeKw && systemSizeKw > 50 && (
              <span className="text-amber-600"> This system requires engineer review due to size ({systemSizeKw}kW).</span>
            )}
          </p>
          <Button onClick={createApplication} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Start Application
          </Button>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = STATUS_CONFIG[application.status]?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                SEAI Grant Application
              </CardTitle>
              <CardDescription>
                {application.application_number 
                  ? `Application #${application.application_number}`
                  : 'Track your SEAI grant progress'}
              </CardDescription>
            </div>
            <Badge className={STATUS_CONFIG[application.status]?.color || 'bg-gray-500'}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {STATUS_CONFIG[application.status]?.label || application.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Grant Amount</p>
              <p className="font-semibold">€{(application.grant_amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">System Size</p>
              <p className="font-semibold">{application.system_size_kw || 0} kW</p>
            </div>
            <div>
              <p className="text-muted-foreground">Property Type</p>
              <p className="font-semibold capitalize">{application.property_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Documents</p>
              <p className="font-semibold">{getCompletionPercentage()}% Complete</p>
            </div>
          </div>
          <Progress value={getCompletionPercentage()} className="mt-4" />
        </CardContent>
      </Card>

      {/* Application Number */}
      {application.status === 'draft' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Number</CardTitle>
            <CardDescription>Enter the SEAI application reference number once submitted</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={application.application_number || ''}
              onChange={(e) => updateApplication({ application_number: e.target.value })}
              placeholder="e.g., SEAI-2024-12345"
            />
          </CardContent>
        </Card>
      )}

      {/* Engineer Review */}
      {application.requires_engineer_review && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Engineer Review Required
            </CardTitle>
            <CardDescription>Commercial systems over 50kW require engineer consultation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Engineer Email</Label>
              <Input
                type="email"
                value={application.engineer_email || ''}
                onChange={(e) => updateApplication({ engineer_email: e.target.value })}
                placeholder="engineer@example.com"
              />
            </div>
            <div>
              <Label>Engineer Notes</Label>
              <Textarea
                value={application.engineer_notes || ''}
                onChange={(e) => updateApplication({ engineer_notes: e.target.value })}
                placeholder="Notes from engineer review..."
              />
            </div>
            {application.engineer_reviewed_at && (
              <p className="text-sm text-green-600">
                ✓ Reviewed on {new Date(application.engineer_reviewed_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Documents</CardTitle>
          <CardDescription>Upload all compliance documents for SEAI verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {DOCUMENT_TYPES.map(docType => {
              const isUploaded = application[docType.field as keyof ApplicationData];
              const relatedDocs = documents.filter(d => d.document_type === docType.key);

              return (
                <div key={docType.key} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isUploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{docType.label}</span>
                    </div>
                    <DocumentUploader
                      documentType={docType.key}
                      onUpload={uploadDocument}
                      isUploading={uploading === docType.key}
                    />
                  </div>

                  {relatedDocs.length > 0 && (
                    <div className="space-y-2">
                      {relatedDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{doc.file_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(doc.file_url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteDocument(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={application.notes || ''}
            onChange={(e) => updateApplication({ notes: e.target.value })}
            placeholder="Any additional notes or comments..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {application.status === 'draft' && (
        <div className="flex gap-4">
          <Button onClick={submitApplication} disabled={saving || getCompletionPercentage() < 100}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Submit Application
          </Button>
        </div>
      )}

      {application.status === 'rejected' && application.rejection_reason && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-red-700 mb-2">Rejection Reason</h4>
            <p className="text-sm text-red-600">{application.rejection_reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Document Uploader Component
function DocumentUploader({ 
  documentType, 
  onUpload, 
  isUploading 
}: { 
  documentType: string; 
  onUpload: (file: File, type: string) => void; 
  isUploading: boolean;
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0], documentType);
    }
  }, [documentType, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button variant="outline" size="sm" disabled={isUploading}>
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {isDragActive ? 'Drop file' : 'Upload'}
          </>
        )}
      </Button>
    </div>
  );
}
