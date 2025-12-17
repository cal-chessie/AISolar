import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, Navigation, Phone, Calendar, CheckCircle, Clock, AlertCircle,
  FileText, Wrench, User, ChevronRight, PhoneCall,
  MessageSquare, Zap, Battery, Sun, ClipboardCheck, ArrowLeft,
  List, HelpCircle, RefreshCw, WifiOff, Wifi, CloudOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import InstallationChecklist from './InstallationChecklist';
import { 
  cacheAssignmentsOffline, 
  getCachedAssignments, 
  isOnline, 
  setupConnectivityListeners,
  queueOfflineAction,
  getOfflineQueue,
  removeFromQueue
} from '@/lib/offlineSupport';

interface Assignment {
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
}

interface Proposal {
  id: string;
  system_size_kw: number | null;
  panel_count: number | null;
  panel_type: string | null;
  inverter_type: string | null;
  battery_storage: boolean | null;
  battery_capacity_kwh: number | null;
  installation_notes: string | null;
}

interface Survey {
  roof_type: string | null;
  roof_condition: string | null;
  roof_orientation: string | null;
  electrical_panel_capacity: string | null;
  scaffolding_required: string | null;
  parking_situation: string | null;
  access_notes: string | null;
  special_requirements: string | null;
}

export default function MobileInstallerCompanion() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  const [showChecklist, setShowChecklist] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const [offlineMode, setOfflineMode] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  // Sync offline queue when back online
  const syncOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.action === 'update_status') {
          await supabase.from('assignments').update(item.data).eq('id', item.data.assignmentId);
          removeFromQueue(item.id);
        }
      } catch (error) {
        console.error('Failed to sync item:', item.id);
      }
    }
    setPendingSync(getOfflineQueue().length);
    loadAssignments();
    toast.success('Offline changes synced!');
  }, []);

  useEffect(() => {
    // Check for cached data first
    const cached = getCachedAssignments();
    if (cached && !isOnline()) {
      setAssignments(cached.assignments);
      setOfflineMode(true);
      setLoading(false);
    }
    
    loadAssignments();
    setPendingSync(getOfflineQueue().length);
    
    // Real-time subscription (only when online)
    let channel: any = null;
    if (isOnline()) {
      channel = supabase
        .channel('mobile-installer')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => loadAssignments())
        .subscribe();
    }

    // Setup connectivity listeners
    const cleanup = setupConnectivityListeners(
      () => {
        setOnline(true);
        setOfflineMode(false);
        toast.success('Back online!');
        syncOfflineQueue();
      },
      () => {
        setOnline(false);
        setOfflineMode(true);
        toast.warning('You are offline. Changes will sync when connected.');
      }
    );

    return () => {
      cleanup();
      if (channel) supabase.removeChannel(channel);
    };
  }, [syncOfflineQueue]);

  const loadAssignments = async () => {
    if (!isOnline()) {
      const cached = getCachedAssignments();
      if (cached) {
        setAssignments(cached.assignments);
        setOfflineMode(true);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: installer } = await supabase
        .from('installers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!installer) return;

      const { data } = await supabase
        .from('assignments')
        .select(`*, leads (id, name, email, address, phone)`)
        .eq('installer_id', installer.id)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      const assignmentData = data || [];
      setAssignments(assignmentData);
      setOfflineMode(false);
      
      // Cache for offline use
      cacheAssignmentsOffline(assignmentData);
    } catch (error) {
      console.error('Error:', error);
      // Fallback to cached data
      const cached = getCachedAssignments();
      if (cached) {
        setAssignments(cached.assignments);
        setOfflineMode(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadJobDetails = async (leadId: string) => {
    const [proposalRes, surveyRes] = await Promise.all([
      supabase.from('proposals').select('*').eq('lead_id', leadId).maybeSingle(),
      supabase.from('site_surveys').select('*').eq('lead_id', leadId).maybeSingle()
    ]);
    setProposal(proposalRes.data);
    setSurvey(surveyRes.data);
  };

  const updateStatus = async (id: string, status: string) => {
    const updateData: Record<string, string> = { status };
    if (status === 'completed') updateData.completed_date = new Date().toISOString();

    // If offline, queue the action
    if (!isOnline()) {
      queueOfflineAction({
        id: `status-${id}-${Date.now()}`,
        action: 'update_status',
        data: { assignmentId: id, ...updateData },
        timestamp: Date.now(),
      });
      setPendingSync(getOfflineQueue().length);
      toast.info('Status change saved offline. Will sync when connected.');
      
      // Update local state immediately
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selectedAssignment?.id === id) {
        setSelectedAssignment({ ...selectedAssignment, status });
      }
      return;
    }

    const { error } = await supabase.from('assignments').update(updateData).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Status updated to ${status}`);
      loadAssignments();
      if (selectedAssignment) setSelectedAssignment({ ...selectedAssignment, status });
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const sendSMS = (phone: string) => {
    window.open(`sms:${phone}`, '_self');
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
      pending: { bg: 'bg-yellow-500', icon: <Clock className="h-4 w-4" />, label: 'Pending' },
      accepted: { bg: 'bg-blue-500', icon: <CheckCircle className="h-4 w-4" />, label: 'Accepted' },
      in_progress: { bg: 'bg-purple-500', icon: <Zap className="h-4 w-4" />, label: 'In Progress' },
      completed: { bg: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" />, label: 'Completed' },
    };
    return configs[status] || configs.pending;
  };

  // Job Card Component
  const JobCard = ({ assignment }: { assignment: Assignment }) => {
    const config = getStatusConfig(assignment.status);
    const isUrgent = assignment.priority === 'high' || assignment.priority === 'urgent';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="touch-manipulation"
      >
        <Card 
          className={`relative overflow-hidden active:scale-[0.98] transition-transform ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}
          onClick={() => {
            setSelectedAssignment(assignment);
            if (assignment.leads?.id) loadJobDetails(assignment.leads.id);
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${config.bg} text-white gap-1`}>
                    {config.icon}
                    {config.label}
                  </Badge>
                  {isUrgent && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-lg truncate">{assignment.leads?.name}</h3>
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {assignment.leads?.address || 'No address'}
                </p>
                {assignment.scheduled_date && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(assignment.scheduled_date).toLocaleDateString('en-IE', { 
                      weekday: 'short', day: 'numeric', month: 'short'
                    })}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Job Detail View
  const JobDetailView = () => {
    if (!selectedAssignment) return null;
    const lead = selectedAssignment.leads;
    const config = getStatusConfig(selectedAssignment.status);

    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-background z-50 overflow-y-auto pb-safe"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-4 py-3 safe-area-inset-top">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedAssignment(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate">{lead?.name}</h2>
              <Badge className={`${config.bg} text-white text-xs`}>{config.label}</Badge>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Actions - Larger Touch Targets */}
          <div className="grid grid-cols-4 gap-3">
            {lead?.phone && (
              <>
                <Button variant="outline" className="h-20 flex-col gap-1.5 touch-manipulation" onClick={() => callCustomer(lead.phone!)}>
                  <PhoneCall className="h-6 w-6 text-green-600" />
                  <span className="text-xs font-medium">Call</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-1.5 touch-manipulation" onClick={() => sendSMS(lead.phone!)}>
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <span className="text-xs font-medium">SMS</span>
                </Button>
              </>
            )}
            {lead?.address && (
              <Button variant="outline" className="h-20 flex-col gap-1.5 touch-manipulation" onClick={() => openInMaps(lead.address!)}>
                <Navigation className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium">Navigate</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-1.5 touch-manipulation" 
              onClick={() => setShowChecklist(true)}
            >
              <ClipboardCheck className="h-6 w-6 text-orange-600" />
              <span className="text-xs font-medium">Checklist</span>
            </Button>
          </div>

          {/* Customer Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Customer Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{lead?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <a href={`tel:${lead?.phone}`} className="font-medium text-primary">{lead?.phone || 'N/A'}</a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium truncate ml-4">{lead?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Specs */}
          {proposal && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sun className="h-4 w-4" /> System Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{proposal.system_size_kw || 0}</p>
                    <p className="text-xs text-muted-foreground">kW System</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{proposal.panel_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Panels</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Panel Type</span>
                    <span className="font-medium">{proposal.panel_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inverter</span>
                    <span className="font-medium">{proposal.inverter_type || 'N/A'}</span>
                  </div>
                  {proposal.battery_storage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Battery className="h-3 w-3" /> Battery
                      </span>
                      <span className="font-medium">{proposal.battery_capacity_kwh}kWh</span>
                    </div>
                  )}
                </div>
                {proposal.installation_notes && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">{proposal.installation_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Site Survey Info */}
          {survey && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Site Survey Summary
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Roof Type</p>
                    <p className="font-medium capitalize">{survey.roof_type || 'N/A'}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Condition</p>
                    <p className="font-medium capitalize">{survey.roof_condition || 'N/A'}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Orientation</p>
                    <p className="font-medium capitalize">{survey.roof_orientation || 'N/A'}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Panel Capacity</p>
                    <p className="font-medium">{survey.electrical_panel_capacity || 'N/A'}</p>
                  </div>
                </div>
                {(survey.scaffolding_required || survey.parking_situation || survey.access_notes) && (
                  <div className="space-y-2 text-sm">
                    {survey.scaffolding_required && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scaffolding</span>
                        <span className="font-medium capitalize">{survey.scaffolding_required}</span>
                      </div>
                    )}
                    {survey.parking_situation && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parking</span>
                        <span className="font-medium">{survey.parking_situation}</span>
                      </div>
                    )}
                  </div>
                )}
                {survey.access_notes && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Access Notes</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{survey.access_notes}</p>
                  </div>
                )}
                {survey.special_requirements && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Special Requirements</p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">{survey.special_requirements}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Update Status
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {selectedAssignment.status === 'pending' && (
                  <Button className="h-12" onClick={() => updateStatus(selectedAssignment.id, 'accepted')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Job
                  </Button>
                )}
                {selectedAssignment.status === 'accepted' && (
                  <Button className="h-12 bg-purple-600 hover:bg-purple-700" onClick={() => updateStatus(selectedAssignment.id, 'in_progress')}>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Installation
                  </Button>
                )}
                {selectedAssignment.status === 'in_progress' && (
                  <Button 
                    className="h-12 bg-green-600 hover:bg-green-700" 
                    onClick={() => setShowChecklist(true)}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Complete Checklist & Finish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Installation Checklist Sheet */}
        <Sheet open={showChecklist} onOpenChange={setShowChecklist}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Installation Checklist</SheetTitle>
            </SheetHeader>
            {proposal && lead && (
              <div className="overflow-y-auto h-full pb-20">
                <InstallationChecklist 
                  proposalId={proposal.id} 
                  leadId={lead.id} 
                  leadName={lead.name} 
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </motion.div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  const todayJobs = assignments.filter(a => {
    if (!a.scheduled_date) return false;
    const today = new Date().toDateString();
    return new Date(a.scheduled_date).toDateString() === today;
  });

  const upcomingJobs = assignments.filter(a => {
    if (!a.scheduled_date) return true;
    return new Date(a.scheduled_date) > new Date();
  });

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-24">
      {/* Offline Banner */}
      <AnimatePresence>
        {offlineMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500 text-yellow-950 px-4 py-3 text-center text-sm font-medium flex items-center justify-center gap-2 safe-area-inset-top"
          >
            <WifiOff className="h-4 w-4" />
            Offline Mode - {pendingSync > 0 ? `${pendingSync} changes pending sync` : 'Using cached data'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`sticky ${offlineMode ? 'top-0' : 'top-0'} bg-background/95 backdrop-blur-sm border-b z-10 px-4 py-4 ${!offlineMode ? 'safe-area-inset-top pt-safe' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Field Companion</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {assignments.length} active jobs
                {online ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <CloudOff className="h-3 w-3" /> Offline
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => { setRefreshing(true); loadAssignments(); }}
            className={`h-11 w-11 ${refreshing ? 'animate-spin' : ''}`}
            disabled={!online}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Today Summary */}
      {todayJobs.length > 0 && (
        <div className="px-4 py-3 bg-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold">{todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''} today</p>
                <p className="text-xs text-muted-foreground">
                  {todayJobs.filter(j => j.status === 'completed').length} completed
                </p>
              </div>
            </div>
            <Progress value={(todayJobs.filter(j => j.status === 'completed').length / todayJobs.length) * 100} className="w-20" />
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="p-4 space-y-3">
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No active jobs</p>
            <p className="text-sm text-muted-foreground">Check back later for new assignments</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <JobCard key={assignment.id} assignment={assignment} />
          ))
        )}
      </div>

      {/* Job Detail View */}
      <AnimatePresence>
        {selectedAssignment && <JobDetailView />}
      </AnimatePresence>

      {/* Bottom Navigation - Enhanced Touch Targets */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t pb-safe z-20">
        <div className="flex justify-around py-1">
          <Button 
            variant="ghost" 
            className={`flex-col h-16 w-full gap-0.5 rounded-none ${activeTab === 'jobs' ? 'bg-primary/10' : ''}`} 
            onClick={() => setActiveTab('jobs')}
          >
            <List className={`h-6 w-6 ${activeTab === 'jobs' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${activeTab === 'jobs' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Jobs</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex-col h-16 w-full gap-0.5 rounded-none ${activeTab === 'today' ? 'bg-primary/10' : ''}`} 
            onClick={() => setActiveTab('today')}
          >
            <Calendar className={`h-6 w-6 ${activeTab === 'today' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${activeTab === 'today' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Today</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col h-16 w-full gap-0.5 rounded-none"
            onClick={() => window.open('tel:+353851234567')}
          >
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Help</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
