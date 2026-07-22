import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, FileText, ClipboardList, ArrowRight, Clock } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'lead' | 'proposal' | 'survey';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLead?: (leadId: string) => void;
  onSelectProposal?: (proposalId: string) => void;
  onSelectSurvey?: (surveyId: string) => void;
}

export default function GlobalSearchModal({ 
  open, 
  onOpenChange,
  onSelectLead,
  onSelectProposal,
  onSelectSurvey
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent
  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = `%${searchQuery}%`;

      // Search leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, email, address')
        .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},address.ilike.${searchTerm}`)
        .limit(5);

      // Search proposals (by lead name or system details)
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, lead_id, system_size_kw, status, leads(name)')
        .limit(5);

      // Search surveys
      const { data: surveys } = await supabase
        .from('site_surveys')
        .select('id, lead_id, status, leads(name)')
        .limit(5);

      const searchResults: SearchResult[] = [];

      // Add leads to results
      leads?.forEach(lead => {
        searchResults.push({
          id: lead.id,
          type: 'lead',
          title: lead.name,
          subtitle: lead.email || lead.address || 'No details',
          icon: <Users className="h-4 w-4 text-primary" />,
        });
      });

      // Filter and add proposals
      proposals?.filter(p => {
        const leadName = (p.leads as any)?.name?.toLowerCase() || '';
        return leadName.includes(searchQuery.toLowerCase());
      }).forEach(proposal => {
        searchResults.push({
          id: proposal.id,
          type: 'proposal',
          title: `Proposal - ${(proposal.leads as any)?.name || 'Unknown'}`,
          subtitle: `${proposal.system_size_kw || 0}kW system • ${proposal.status}`,
          icon: <FileText className="h-4 w-4 text-primary" />,
        });
      });

      // Filter and add surveys
      surveys?.filter(s => {
        const leadName = (s.leads as any)?.name?.toLowerCase() || '';
        return leadName.includes(searchQuery.toLowerCase());
      }).forEach(survey => {
        searchResults.push({
          id: survey.id,
          type: 'survey',
          title: `Survey - ${(survey.leads as any)?.name || 'Unknown'}`,
          subtitle: survey.status || 'Draft',
          icon: <ClipboardList className="h-4 w-4 text-primary" />,
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result.title);
    onOpenChange(false);
    
    switch (result.type) {
      case 'lead':
        onSelectLead?.(result.id);
        break;
      case 'proposal':
        onSelectProposal?.(result.id);
        break;
      case 'survey':
        onSelectSurvey?.(result.id);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
        <Command className="rounded-lg border-0 shadow-none">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              ref={inputRef}
              placeholder="Search leads, proposals, surveys..."
              value={query}
              onValueChange={setQuery}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <CommandList className="max-h-[400px]">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            
            {!loading && query && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {!query && recentSearches.length > 0 && (
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((term, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => setQuery(term)}
                    className="cursor-pointer"
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{term}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.length > 0 && (
              <>
                {['lead', 'proposal', 'survey'].map((type) => {
                  const typeResults = results.filter(r => r.type === type);
                  if (typeResults.length === 0) return null;
                  
                  const heading = type === 'lead' ? 'Leads' : type === 'proposal' ? 'Proposals' : 'Surveys';
                  
                  return (
                    <CommandGroup key={type} heading={heading}>
                      {typeResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-3 w-full">
                            {result.icon}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </>
            )}
          </CommandList>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ↵
              </kbd>{' '}
              to select
            </span>
            <span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                esc
              </kbd>{' '}
              to close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
