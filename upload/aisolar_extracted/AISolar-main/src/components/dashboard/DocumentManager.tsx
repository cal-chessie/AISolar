import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  FolderOpen,
  FileText,
  Image,
  Download,
  Trash2,
  Search,
  Filter,
  Upload,
  Loader2,
  File,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  created_at: string;
  lead_name?: string;
  lead_id?: string;
  category: string;
  source: 'project_documents' | 'survey_photos' | 'seai_documents';
}

interface DocumentManagerProps {
  className?: string;
  leadId?: string; // Optional filter by lead
}

const DOCUMENT_CATEGORIES = [
  { value: 'all', label: 'All Documents' },
  { value: 'general', label: 'General' },
  { value: 'survey', label: 'Survey Photos' },
  { value: 'seai', label: 'SEAI Documents' },
  { value: 'contract', label: 'Contracts' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'certification', label: 'Certifications' },
  { value: 'proposal', label: 'Proposals' },
];

export default function DocumentManager({ className, leadId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const allDocs: Document[] = [];

      // Fetch from project_documents table (new)
      let projectDocsQuery = supabase
        .from('project_documents')
        .select('*, leads(name)')
        .order('created_at', { ascending: false });
      
      if (leadId) {
        projectDocsQuery = projectDocsQuery.eq('lead_id', leadId);
      }

      const { data: projectDocs, error: projectError } = await projectDocsQuery;
      
      if (projectError) {
        console.error('Error fetching project documents:', projectError);
      } else {
        projectDocs?.forEach((doc: any) => {
          allDocs.push({
            id: doc.id,
            name: doc.file_name,
            type: doc.file_type || 'file',
            size: doc.file_size || 0,
            url: doc.file_path,
            created_at: doc.created_at,
            lead_name: doc.leads?.name,
            lead_id: doc.lead_id,
            category: doc.category || 'general',
            source: 'project_documents'
          });
        });
      }

      // Fetch survey photos
      let surveyPhotosQuery = supabase
        .from('survey_photos')
        .select('*, site_surveys(lead_id, leads(name))')
        .order('created_at', { ascending: false });

      const { data: surveyPhotos, error: surveyError } = await surveyPhotosQuery;
      
      if (surveyError) {
        console.error('Error fetching survey photos:', surveyError);
      } else {
        surveyPhotos?.forEach((photo: any) => {
          if (!leadId || photo.site_surveys?.lead_id === leadId) {
            allDocs.push({
              id: photo.id,
              name: photo.description || 'Survey Photo',
              type: 'image',
              size: 0,
              url: photo.photo_url,
              created_at: photo.created_at,
              lead_name: photo.site_surveys?.leads?.name,
              lead_id: photo.site_surveys?.lead_id,
              category: 'survey',
              source: 'survey_photos'
            });
          }
        });
      }

      // Fetch SEAI documents
      let seaiDocsQuery = supabase
        .from('seai_documents')
        .select('*, seai_applications(lead_id, leads(name))')
        .order('created_at', { ascending: false });

      const { data: seaiDocs, error: seaiError } = await seaiDocsQuery;
      
      if (seaiError) {
        console.error('Error fetching SEAI documents:', seaiError);
      } else {
        seaiDocs?.forEach((doc: any) => {
          if (!leadId || doc.seai_applications?.lead_id === leadId) {
            allDocs.push({
              id: doc.id,
              name: doc.file_name,
              type: doc.document_type,
              size: doc.file_size || 0,
              url: doc.file_url,
              created_at: doc.created_at,
              lead_name: doc.seai_applications?.leads?.name,
              lead_id: doc.seai_applications?.lead_id,
              category: 'seai',
              source: 'seai_documents'
            });
          }
        });
      }

      // Sort all docs by date
      allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDocuments(allDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.lead_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type === 'image' || type.includes('photo') || type.includes('image')) return Image;
    return FileText;
  };

  const handleDelete = async (doc: Document) => {
    try {
      // Delete from appropriate table based on source
      if (doc.source === 'project_documents') {
        // Also delete from storage
        const filePath = doc.url.split('/project-documents/')[1];
        if (filePath) {
          await supabase.storage.from('project-documents').remove([filePath]);
        }
        await supabase.from('project_documents').delete().eq('id', doc.id);
      } else if (doc.source === 'survey_photos') {
        await supabase.from('survey_photos').delete().eq('id', doc.id);
      } else if (doc.source === 'seai_documents') {
        await supabase.from('seai_documents').delete().eq('id', doc.id);
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: 'Document deleted successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = leadId ? `${leadId}/${fileName}` : `general/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-documents')
          .getPublicUrl(filePath);

        // Insert record into project_documents table
        const { error: insertError } = await supabase
          .from('project_documents')
          .insert({
            lead_id: leadId || null,
            file_name: file.name,
            file_path: publicUrl,
            file_size: file.size,
            file_type: file.type,
            category: selectedCategory,
            uploaded_by: user?.id
          });

        if (insertError) throw insertError;
      }

      toast({ title: 'Files uploaded successfully' });
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [leadId, selectedCategory, fetchDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Document Manager
            </CardTitle>
            <CardDescription>
              Manage project documents, certifications, and files
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Badge variant="secondary">{documents.length} files</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Zone */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Select category before uploading</span>
          </div>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images, PDFs, Word, Excel files supported
                </p>
              </>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents found</p>
            </div>
          ) : (
            filteredDocuments.map(doc => {
              const FileIcon = getFileIcon(doc.type);
              return (
                <div
                  key={`${doc.source}-${doc.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {doc.lead_name && <span>{doc.lead_name}</span>}
                        {doc.lead_name && <span>•</span>}
                        <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                        {doc.size > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                      {doc.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}