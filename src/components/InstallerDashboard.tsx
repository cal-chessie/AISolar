import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Phone, Mail, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import SurveyDetailsCard from './installer/SurveyDetailsCard';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';

export default function InstallerDashboard() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAssignments();

    // Subscribe to assignment changes
    const channel = supabase
      .channel('installer-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
        },
        () => loadAssignments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get installer profile
      const { data: installer } = await supabase
        .from('installers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!installer) {
        throw new Error('Installer profile not found');
      }

      // Load assignments with lead details
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          leads (
            id,
            name,
            email,
            phone,
            address,
            status
          )
        `)
        .eq('installer_id', installer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment status updated successfully.",
      });
      loadAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'accepted': return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'in_progress': return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
      case 'completed': return 'bg-primary/10 text-primary dark:bg-primary/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive dark:bg-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="text-red-600" size={20} />;
      case 'high': return <AlertCircle className="text-orange-600" size={20} />;
      default: return <Clock className="text-muted-foreground" size={20} />;
    }
  };

  const filterAssignments = (status?: string) => {
    if (!status) return assignments;
    return assignments.filter(a => a.status === status);
  };

  const AssignmentCard = ({ assignment }: { assignment: any }) => {
    const lead = assignment.leads;
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{lead?.name}</CardTitle>
              <Badge className={`mt-2 ${getStatusColor(assignment.status)}`}>
                {assignment.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {getPriorityIcon(assignment.priority)}
              <Badge variant="outline">{assignment.assignment_type}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={16} />
              <span>{lead?.address || 'Address not provided'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={16} />
              <span>{lead?.phone || 'Phone not provided'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail size={16} />
              <span>{lead?.email}</span>
            </div>
            {assignment.scheduled_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={16} />
                <span>Scheduled: {new Date(assignment.scheduled_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {assignment.notes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{assignment.notes}</p>
            </div>
          )}

          {/* Site Survey Details */}
          {lead?.id && (
            <SurveyDetailsCard leadId={lead.id} />
          )}

          <div className="flex gap-2 pt-2">
            {assignment.status === 'pending' && (
              <>
                <Button
                  onClick={() => updateAssignmentStatus(assignment.id, 'accepted')}
                  className="flex-1"
                  size="sm"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => updateAssignmentStatus(assignment.id, 'cancelled')}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Decline
                </Button>
              </>
            )}
            {assignment.status === 'accepted' && (
              <Button
                onClick={() => updateAssignmentStatus(assignment.id, 'in_progress')}
                className="flex-1"
                size="sm"
              >
                Start Work
              </Button>
            )}
            {assignment.status === 'in_progress' && (
              <Button
                onClick={() => updateAssignmentStatus(assignment.id, 'completed')}
                className="flex-1"
                size="sm"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast({
      title: 'Logged out',
      description: 'You have been signed out.',
    });
  };

  const pendingCount = filterAssignments('pending').length;
  const activeCount = filterAssignments('in_progress').length + filterAssignments('accepted').length;
  const completedCount = filterAssignments('completed').length;

  return (
    <div className="min-h-screen gradient-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Installer Dashboard</h1>
            <p className="text-muted-foreground">Manage your installation assignments</p>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold">{pendingCount}</p>
                </div>
                <Clock className="text-yellow-600" size={40} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold">{activeCount}</p>
                </div>
                <AlertCircle className="text-blue-600" size={40} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{completedCount}</p>
                </div>
                <CheckCircle className="text-green-600" size={40} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No assignments yet</p>
                </CardContent>
              </Card>
            ) : (
              assignments.map(assignment => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {filterAssignments('pending').map(assignment => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-6">
            {[...filterAssignments('accepted'), ...filterAssignments('in_progress')].map(assignment => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {filterAssignments('completed').map(assignment => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 mt-6">
            {filterAssignments('cancelled').map(assignment => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
