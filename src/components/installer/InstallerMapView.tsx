import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Phone, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Assignment {
  id: string;
  status: string;
  scheduled_date: string | null;
  assignment_type: string;
  priority: string;
  leads: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
}

// Sample installation for demo/testing
const SAMPLE_INSTALLATION: Assignment = {
  id: 'sample-1',
  status: 'pending',
  scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  assignment_type: 'installation',
  priority: 'normal',
  leads: {
    id: 'sample-lead-1',
    name: 'Demo Customer',
    address: '123 Sample Street, Dublin 2, D02 X123',
    phone: '+353 85 123 4567',
  },
};

// Dublin area coordinates for demo
const DUBLIN_LOCATIONS = [
  { lat: 53.3498, lng: -6.2603, area: 'Dublin City Centre' },
  { lat: 53.3382, lng: -6.2591, area: 'Dublin 2' },
  { lat: 53.3558, lng: -6.2649, area: 'Dublin 1' },
  { lat: 53.2934, lng: -6.1345, area: 'Dún Laoghaire' },
  { lat: 53.3897, lng: -6.2555, area: 'Drumcondra' },
  { lat: 53.2707, lng: -6.2048, area: 'Blackrock' },
];

export default function InstallerMapView() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSample, setShowSample] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: installer } = await supabase
        .from('installers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!installer) return;

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id,
          status,
          scheduled_date,
          assignment_type,
          priority,
          leads (
            id,
            name,
            address,
            phone
          )
        `)
        .eq('installer_id', installer.id)
        .in('status', ['pending', 'accepted', 'in_progress']);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-blue-500';
      case 'in_progress': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const allAssignments = showSample ? [SAMPLE_INSTALLATION, ...assignments] : assignments;

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map Placeholder with Location Pins */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Installation Locations
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSample(!showSample)}
            >
              {showSample ? 'Hide Sample' : 'Show Sample'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simple Visual Map Representation */}
          <div className="relative bg-muted rounded-lg h-[300px] overflow-hidden">
            {/* Map background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30">
              {/* Grid lines for map effect */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.3
              }} />
            </div>
            
            {/* Dublin label */}
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-sm font-medium text-foreground">Dublin Area</span>
            </div>

            {/* Location markers */}
            {allAssignments.map((assignment, index) => {
              const location = DUBLIN_LOCATIONS[index % DUBLIN_LOCATIONS.length];
              const xPos = 20 + (index * 15) % 60;
              const yPos = 20 + (index * 20) % 60;
              
              return (
                <button
                  key={assignment.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-full transition-all hover:scale-110 ${
                    selectedAssignment?.id === assignment.id ? 'z-20 scale-110' : 'z-10'
                  }`}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  onClick={() => setSelectedAssignment(
                    selectedAssignment?.id === assignment.id ? null : assignment
                  )}
                >
                  <div className={`${getStatusColor(assignment.status)} text-white rounded-full p-2 shadow-lg`}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  {selectedAssignment?.id === assignment.id && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-background border rounded-lg shadow-xl p-3 min-w-[200px] z-30">
                      <p className="font-medium text-sm">{assignment.leads?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {assignment.leads?.address || 'No address'}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {assignment.status}
                      </Badge>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Accepted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>In Progress</span>
                </div>
              </div>
            </div>

            {allAssignments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">No active installations</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment List */}
      <div className="grid gap-4 md:grid-cols-2">
        {allAssignments.map((assignment) => (
          <Card 
            key={assignment.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedAssignment?.id === assignment.id ? 'ring-2 ring-primary' : ''
            } ${assignment.id === 'sample-1' ? 'border-dashed border-2 border-primary/30' : ''}`}
            onClick={() => setSelectedAssignment(
              selectedAssignment?.id === assignment.id ? null : assignment
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{assignment.leads?.name}</h3>
                    {assignment.id === 'sample-1' && (
                      <Badge variant="outline" className="text-xs">Sample</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {assignment.leads?.address || 'No address provided'}
                  </p>
                </div>
                <Badge className={`${getStatusColor(assignment.status)} text-white`}>
                  {getStatusIcon(assignment.status)}
                  <span className="ml-1">{assignment.status}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                {assignment.scheduled_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(assignment.scheduled_date).toLocaleDateString()}</span>
                  </div>
                )}
                {assignment.leads?.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{assignment.leads.phone}</span>
                  </div>
                )}
              </div>

              {assignment.leads?.address && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInMaps(assignment.leads!.address!);
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Open in Maps
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
