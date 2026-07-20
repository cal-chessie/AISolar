import { Workbox } from 'workbox-window';

// Register service worker for offline support
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const wb = new Workbox('/sw.js');

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        // New content available, prompt user to refresh
        if (confirm('New version available! Click OK to refresh.')) {
          window.location.reload();
        }
      }
    });

    wb.addEventListener('waiting', () => {
      // Service worker waiting to activate
      wb.messageSkipWaiting();
    });

    try {
      await wb.register();
      console.log('Service worker registered');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
};

// Cache management for offline data
const OFFLINE_CACHE_KEY = 'installer-offline-data';

interface OfflineAssignment {
  id: string;
  status: string;
  scheduled_date: string | null;
  assignment_type: string;
  priority: string;
  notes: string | null;
  leads: {
    id: string;
    name: string;
    email: string;
    address: string | null;
    phone: string | null;
  } | null;
  proposal?: any;
  survey?: any;
  cachedAt?: number;
}

interface OfflineQueue {
  id: string;
  action: 'update_status' | 'save_checklist';
  data: Record<string, any>;
  timestamp: number;
}

// Save assignments for offline use (accepts any assignment-like data)
export const cacheAssignmentsOffline = (assignments: any[]) => {
  try {
    const data = {
      assignments: assignments.map(a => ({ ...a, cachedAt: Date.now() })),
      lastSync: Date.now(),
    };
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to cache offline data:', error);
    return false;
  }
};

// Get cached assignments
export const getCachedAssignments = (): { assignments: OfflineAssignment[]; lastSync: number } | null => {
  try {
    const data = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch {
    return null;
  }
};

// Check if offline cache is stale (older than 4 hours)
export const isCacheStale = (): boolean => {
  const cached = getCachedAssignments();
  if (!cached) return true;
  const fourHours = 4 * 60 * 60 * 1000;
  return Date.now() - cached.lastSync > fourHours;
};

// Offline action queue
const OFFLINE_QUEUE_KEY = 'installer-offline-queue';

export const queueOfflineAction = (action: OfflineQueue) => {
  try {
    const queue = getOfflineQueue();
    queue.push(action);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
};

export const getOfflineQueue = (): OfflineQueue[] => {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

export const removeFromQueue = (id: string) => {
  const queue = getOfflineQueue().filter(q => q.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

// Check online status
export const isOnline = () => navigator.onLine;

// Listen for online/offline events
export const setupConnectivityListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
