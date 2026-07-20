import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'leads' | 'proposals' | 'contracts' | 'invoices' | 'site_surveys' | 'installation_checklists' | 'seai_applications';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions {
  table: TableName;
  event?: EventType;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
  enabled?: boolean;
}

export function useRealtimeUpdates({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const stableOnInsert = useCallback((payload: any) => onInsert?.(payload), [onInsert]);
  const stableOnUpdate = useCallback((payload: any) => onUpdate?.(payload), [onUpdate]);
  const stableOnDelete = useCallback((payload: any) => onDelete?.(payload), [onDelete]);
  const stableOnChange = useCallback((payload: any) => onChange?.(payload), [onChange]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channelName = `realtime-${table}-${Date.now()}`;
    
    const channelConfig: {
      event: EventType;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        channelConfig,
        (payload: any) => {
          stableOnChange(payload);

          switch (payload.eventType) {
            case 'INSERT':
              stableOnInsert(payload.new);
              break;
            case 'UPDATE':
              stableOnUpdate(payload.new);
              break;
            case 'DELETE':
              stableOnDelete(payload.old);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscription active for ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime subscription error for ${table}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, enabled, stableOnInsert, stableOnUpdate, stableOnDelete, stableOnChange]);

  return channelRef.current;
}

// Convenience hooks for specific tables
export function useLeadsRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'leads' });
}

export function useProposalsRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'proposals' });
}

export function useContractsRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'contracts' });
}

export function useInvoicesRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'invoices' });
}

export function useSurveysRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'site_surveys' });
}

export function useInstallationsRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'installation_checklists' });
}

export function useSEAIApplicationsRealtime(handlers: Omit<UseRealtimeOptions, 'table'>) {
  return useRealtimeUpdates({ ...handlers, table: 'seai_applications' });
}

export default useRealtimeUpdates;
