import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, User, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeadSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLead: (lead: any) => void;
  onCreateNewLead: () => void;
}

export default function LeadSelectorDialog({ 
  isOpen, 
  onClose, 
  onSelectLead,
  onCreateNewLead 
}: LeadSelectorDialogProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
    }
  }, [isOpen]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: 'Error loading leads',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.address?.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Lead for Proposal</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Create New Lead Option */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => {
              onClose();
              onCreateNewLead();
            }}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="text-primary" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium">Create New Lead</p>
              <p className="text-xs text-muted-foreground">Add a new lead and start proposal</p>
            </div>
          </Button>

          {/* Leads List */}
          <div className="border rounded-lg max-h-[40vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="mx-auto mb-2" size={24} />
                <p className="text-sm">No leads found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                    onClick={() => {
                      onSelectLead(lead);
                      onClose();
                    }}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="text-primary" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.address || lead.email}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      lead.workflow_stage === 'new' ? 'bg-primary/10 text-primary' :
                      lead.workflow_stage === 'survey' ? 'bg-blue-100 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {lead.workflow_stage || 'new'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
