import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, Navigation, Phone, Calendar, CheckCircle, Clock, AlertCircle,
  Camera, FileText, Wrench, User, ChevronRight, ExternalLink, PhoneCall,
  MessageSquare, Zap, Battery, Sun, ClipboardCheck, ArrowLeft, Home,
  List, Settings, HelpCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import InstallationChecklist from './InstallationChecklist';

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

  useEffect(() => {
    loadAssignments();
    
    // Real-time subscription
    const channel = supabase
      .channel('mobile-installer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => loadAssignments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAssignments = async () => {
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

      setAssignments(data || []);
    } catch (error) {
      console.error('Error:', error);
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
          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            {lead?.phone && (
              <>
                <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => callCustomer(lead.phone!)}>
                  <PhoneCall className="h-5 w-5 text-green-600" />
                  <span className="text-xs">Call</span>
                </Button>
                <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => sendSMS(lead.phone!)}>
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">SMS</span>
                </Button>
              </>
            )}
            {lead?.address && (
              <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => openInMaps(lead.address!)}>
                <Navigation className="h-5 w-5 text-primary" />
                <span className="text-xs">Navigate</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-1" 
              onClick={() => setShowChecklist(true)}
            >
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
              <span className="text-xs">Checklist</span>
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Field Companion</h1>
            <p className="text-xs text-muted-foreground">{assignments.length} active jobs</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setRefreshing(true); loadAssignments(); }}
            className={refreshing ? 'animate-spin' : ''}
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          <Button variant="ghost" className="flex-col h-14 gap-0.5" onClick={() => setActiveTab('jobs')}>
            <List className={`h-5 w-5 ${activeTab === 'jobs' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${activeTab === 'jobs' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Jobs</span>
          </Button>
          <Button variant="ghost" className="flex-col h-14 gap-0.5" onClick={() => setActiveTab('today')}>
            <Calendar className={`h-5 w-5 ${activeTab === 'today' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${activeTab === 'today' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Today</span>
          </Button>
          <Button variant="ghost" className="flex-col h-14 gap-0.5">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Help</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
