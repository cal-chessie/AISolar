import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2, CheckCircle, Shield, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CertDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  category: string | null;
  created_at: string;
}

const CERT_TYPES = [
  { id: 'safe_electric', label: 'Safe Electric Registration', icon: Shield, description: 'Required for ESB NC6 form submission' },
  { id: 'seai_registration', label: 'SEAI Company Registration', icon: Award, description: 'Required for SEAI grant applications' },
  { id: 'ber_assessor', label: 'BER Assessor Certificate', icon: FileText, description: 'Building Energy Rating certification' },
  { id: 'insurance', label: 'Public Liability Insurance', icon: Shield, description: 'Insurance certificate for installations' },
  { id: 'qualifications', label: 'Electrical Qualifications', icon: Award, description: 'QQI or equivalent electrical qualifications' },
];

export default function InstallerCertsImport() {
  const [documents, setDocuments] = useState<CertDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .in('category', CERT_TYPES.map(c => c.id))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching certs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (certType: string, file: File) => {
    setUploading(certType);
    try {
      const filePath = `certs/${certType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          file_name: file.name,
          file_path: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          category: certType,
          description: `Installer certification: ${CERT_TYPES.find(c => c.id === certType)?.label}`,
        });

      if (dbError) throw dbError;

      toast({ title: 'Certificate Uploaded', description: `${file.name} uploaded successfully.` });
      fetchDocuments();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc: CertDocument) => {
    try {
      // Extract path from URL for storage deletion
      const pathMatch = doc.file_path.match(/project-documents\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('project-documents').remove([pathMatch[1]]);
      }
      
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', doc.id);
      
      if (error) throw error;
      toast({ title: 'Deleted', description: `${doc.file_name} removed.` });
      fetchDocuments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getDocsForType = (certType: string) => documents.filter(d => d.category === certType);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Installer Certifications</h3>
        <Badge variant="secondary">
          {CERT_TYPES.filter(c => getDocsForType(c.id).length > 0).length}/{CERT_TYPES.length} uploaded
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CERT_TYPES.map(cert => {
          const docs = getDocsForType(cert.id);
          const hasDoc = docs.length > 0;
          const Icon = cert.icon;

          return (
            <Card key={cert.id} className={hasDoc ? 'border-green-200 dark:border-green-900' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${hasDoc ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-sm">{cert.label}</CardTitle>
                  </div>
                  {hasDoc && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
                <CardDescription className="text-xs">{cert.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-1 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs">{doc.file_name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Label htmlFor={`cert-${cert.id}`} className="cursor-pointer">
                  <div className="mt-2 border-2 border-dashed border-muted rounded-md p-3 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {uploading === cert.id ? 'Uploading...' : hasDoc ? 'Replace certificate' : 'Upload certificate'}
                    </p>
                  </div>
                </Label>
                <input
                  id={`cert-${cert.id}`}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={uploading === cert.id}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(cert.id, file);
                    e.target.value = '';
                  }}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
