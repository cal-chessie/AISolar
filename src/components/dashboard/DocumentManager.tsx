import { useState, useEffect } from 'react';
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
  Calendar
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
}

interface DocumentManagerProps {
  className?: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'all', label: 'All Documents' },
  { value: 'survey', label: 'Survey Photos' },
  { value: 'seai', label: 'SEAI Documents' },
  { value: 'contract', label: 'Contracts' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'certification', label: 'Certifications' },
];

export default function DocumentManager({ className }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Fetch survey photos
      const { data: surveyPhotos } = await supabase
        .from('survey_photos')
        .select('*, site_surveys(lead_id, leads(name))')
        .order('created_at', { ascending: false });

      // Fetch SEAI documents
      const { data: seaiDocs } = await supabase
        .from('seai_documents')
        .select('*, seai_applications(lead_id, leads(name))')
        .order('created_at', { ascending: false });

      // Combine and format documents
      const allDocs: Document[] = [];

      surveyPhotos?.forEach(photo => {
        allDocs.push({
          id: photo.id,
          name: photo.description || 'Survey Photo',
          type: 'image',
          size: 0,
          url: photo.photo_url,
          created_at: photo.created_at,
          lead_name: photo.site_surveys?.leads?.name,
          lead_id: photo.site_surveys?.lead_id,
          category: 'survey'
        });
      });

      seaiDocs?.forEach(doc => {
        allDocs.push({
          id: doc.id,
          name: doc.file_name,
          type: doc.document_type,
          size: doc.file_size || 0,
          url: doc.file_url,
          created_at: doc.created_at,
          lead_name: doc.seai_applications?.leads?.name,
          lead_id: doc.seai_applications?.lead_id,
          category: 'seai'
        });
      });

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (type === 'image' || type.includes('photo')) return Image;
    return FileText;
  };

  const handleDelete = async (doc: Document) => {
    try {
      if (doc.category === 'survey') {
        await supabase.from('survey_photos').delete().eq('id', doc.id);
      } else if (doc.category === 'seai') {
        await supabase.from('seai_documents').delete().eq('id', doc.id);
      }
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: 'Document deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `general/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error } = await supabase.storage
            .from('survey-photos')
            .upload(fileName, file);

          if (error) throw error;
        }
        toast({ title: 'Files uploaded successfully' });
        fetchDocuments();
      } catch (error: any) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf']
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
              Managing project documents, certifications, and files
            </CardDescription>
          </div>
          <Badge variant="secondary">{documents.length} files</Badge>
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
            </>
          )}
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
                  key={doc.id}
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
                        <span>•</span>
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
                    <Badge variant="outline" className="hidden sm:inline-flex">
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
