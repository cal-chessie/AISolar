import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Plus, User, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function InstallationsPanel() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [installers, setInstallers] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    lead_id: '',
    installer_id: '',
    assignment_type: 'installation',
    scheduled_date: '',
    notes: '',
    priority: 'normal',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch assignments with lead data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          leads (id, name, email, phone, address)
        `)
        .order('scheduled_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch leads for dropdown
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, name, address')
        .order('name');
      setLeads(leadsData || []);

      // Fetch installers for dropdown
      const { data: installersData } = await supabase
        .from('installers')
        .select('id, user_id, specialization')
        .eq('availability_status', 'available');
      setInstallers(installersData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading installations',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (!newAssignment.lead_id || !newAssignment.installer_id) {
      toast({
        title: 'Missing required fields',
        description: 'Please select a lead and installer',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assignments')
        .insert({
          lead_id: newAssignment.lead_id,
          installer_id: newAssignment.installer_id,
          assigned_by: user.id,
          assignment_type: newAssignment.assignment_type,
          scheduled_date: newAssignment.scheduled_date || null,
          notes: newAssignment.notes || null,
          priority: newAssignment.priority,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Assignment created',
        description: 'The installation has been assigned successfully',
      });

      setIsCreateOpen(false);
      setNewAssignment({
        lead_id: '',
        installer_id: '',
        assignment_type: 'installation',
        scheduled_date: '',
        notes: '',
        priority: 'normal',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error creating assignment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      normal: 'bg-slate-100 text-slate-700',
      low: 'bg-gray-100 text-gray-500',
    };
    return styles[priority] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Scheduled Installations</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Installation Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Lead *</Label>
                <Select
                  value={newAssignment.lead_id}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, lead_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} - {lead.address || 'No address'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Installer *</Label>
                <Select
                  value={newAssignment.installer_id}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, installer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select installer" />
                  </SelectTrigger>
                  <SelectContent>
                    {installers.map((installer) => (
                      <SelectItem key={installer.id} value={installer.id}>
                        Installer #{installer.id.slice(0, 8)} - {installer.specialization || 'General'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assignment Type</Label>
                <Select
                  value={newAssignment.assignment_type}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, assignment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="site_survey">Site Survey</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={newAssignment.priority}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Scheduled Date</Label>
                <Input
                  type="datetime-local"
                  value={newAssignment.scheduled_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, scheduled_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newAssignment.notes}
                  onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                  placeholder="Any special instructions..."
                />
              </div>

              <Button onClick={createAssignment} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No installations scheduled</h3>
          <p className="text-slate-600 text-sm">
            Create an assignment to schedule an installation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {assignment.leads?.name || 'Unknown'}
                    </h3>
                    <Badge className={getStatusBadge(assignment.status)}>
                      {assignment.status}
                    </Badge>
                    <Badge className={getPriorityBadge(assignment.priority)}>
                      {assignment.priority}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      {assignment.leads?.address || 'No address'}
                    </div>
                    {assignment.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        {new Date(assignment.scheduled_date).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline">{assignment.assignment_type}</Badge>
              </div>
              {assignment.notes && (
                <p className="text-sm text-slate-600 italic mt-2">
                  Note: {assignment.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
