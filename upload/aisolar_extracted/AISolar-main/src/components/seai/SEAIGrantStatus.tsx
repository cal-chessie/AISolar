import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Loader2,
  Euro
} from 'lucide-react';

interface SEAIGrantStatusProps {
  proposalId: string;
  leadId: string;
}

interface ApplicationData {
  id: string;
  status: string;
  application_number: string | null;
  grant_amount: number | null;
  system_size_kw: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  ber_cert_uploaded: boolean;
  completion_cert_uploaded: boolean;
  invoice_uploaded: boolean;
  photos_uploaded: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-500', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-yellow-500', icon: AlertCircle },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-emerald-600', icon: FileCheck },
};

export default function SEAIGrantStatus({ proposalId, leadId }: SEAIGrantStatusProps) {
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [proposalId]);

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from('seai_applications')
        .select('*')
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (error) throw error;
      setApplication(data);
    } catch (error) {
      console.error('Error fetching SEAI application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            SEAI grant application will be initiated after installation is confirmed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const getDocumentProgress = () => {
    const docs = [
      application.ber_cert_uploaded,
      application.completion_cert_uploaded,
      application.invoice_uploaded,
      application.photos_uploaded
    ];
    const completed = docs.filter(Boolean).length;
    return Math.round((completed / docs.length) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              SEAI Grant Application
            </CardTitle>
            <CardDescription>
              {application.application_number 
                ? `Application #${application.application_number}` 
                : 'Track your grant application status'
              }
            </CardDescription>
          </div>
          <Badge className={`${statusConfig.color} text-white`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grant Amount */}
        {application.grant_amount && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700 dark:text-emerald-400">Grant Amount</span>
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center">
                <Euro className="h-5 w-5 mr-1" />
                {application.grant_amount.toLocaleString()}
              </span>
            </div>
            {application.system_size_kw && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                For {application.system_size_kw}kW system
              </p>
            )}
          </div>
        )}

        {/* Document Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Document Progress</span>
            <span className="font-medium">{getDocumentProgress()}%</span>
          </div>
          <Progress value={getDocumentProgress()} className="h-2" />
          
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: 'BER Certificate', done: application.ber_cert_uploaded },
              { label: 'Completion Cert', done: application.completion_cert_uploaded },
              { label: 'Invoice', done: application.invoice_uploaded },
              { label: 'Photos', done: application.photos_uploaded },
            ].map((doc) => (
              <div 
                key={doc.label}
                className={`flex items-center gap-2 text-xs p-2 rounded ${
                  doc.done 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {doc.done ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {doc.label}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {application.submitted_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Submitted</span>
              <span>{new Date(application.submitted_at).toLocaleDateString()}</span>
            </div>
          )}
          {application.approved_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approved</span>
              <span className="text-green-600">{new Date(application.approved_at).toLocaleDateString()}</span>
            </div>
          )}
          {application.rejected_at && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rejected</span>
                <span className="text-red-600">{new Date(application.rejected_at).toLocaleDateString()}</span>
              </div>
              {application.rejection_reason && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  Reason: {application.rejection_reason}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}