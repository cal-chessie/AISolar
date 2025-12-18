import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Navigation, Phone, Calendar, CheckCircle, Clock, AlertCircle,
  Play, Pause, GraduationCap, Info, ChevronRight, Star, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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

interface InstallerMapViewProps {
  assignments?: Assignment[];
  showDemo?: boolean;
}

// Demo installation with training walkthrough
const DEMO_INSTALLATION: Assignment = {
  id: 'demo-training',
  status: 'pending',
  scheduled_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  assignment_type: 'installation',
  priority: 'high',
  leads: {
    id: 'demo-lead',
    name: '🎓 Training Demo - Murphy Family',
    address: '42 Maple Avenue, Blackrock, Co. Dublin, A94 X8P2',
    phone: '+353 85 123 4567',
  },
};

// Sample installations for demo
const SAMPLE_INSTALLATIONS: Assignment[] = [
  {
    id: 'sample-1',
    status: 'pending',
    scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignment_type: 'installation',
    priority: 'normal',
    leads: {
      id: 'sample-lead-1',
      name: 'Sample Customer A',
      address: '123 Sample Street, Dublin 2, D02 X123',
      phone: '+353 85 123 4567',
    },
  },
  {
    id: 'sample-2',
    status: 'accepted',
    scheduled_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignment_type: 'installation',
    priority: 'high',
    leads: {
      id: 'sample-lead-2',
      name: 'Sample Customer B',
      address: '456 Demo Road, Dún Laoghaire, A96 Y456',
      phone: '+353 86 987 6543',
    },
  },
];

// Dublin area coordinates for demo
const DUBLIN_LOCATIONS = [
  { lat: 53.3498, lng: -6.2603, area: 'Dublin City Centre' },
  { lat: 53.3382, lng: -6.2591, area: 'Dublin 2' },
  { lat: 53.3558, lng: -6.2649, area: 'Dublin 1' },
  { lat: 53.2934, lng: -6.1345, area: 'Dún Laoghaire' },
  { lat: 53.3897, lng: -6.2555, area: 'Drumcondra' },
  { lat: 53.2707, lng: -6.2048, area: 'Blackrock' },
];

// Training steps for demo
const TRAINING_STEPS = [
  {
    title: 'Review Assignment',
    description: 'Check customer details, system specs, and survey photos before arriving on-site.',
    tip: 'Always review the full survey report including roof photos and electrical panel images.',
  },
  {
    title: 'Navigate to Site',
    description: 'Use the "Open in Maps" button to get directions. Plan your route for efficiency.',
    tip: 'Call the customer 30 minutes before arrival to confirm they\'re home.',
  },
  {
    title: 'On-Site Assessment',
    description: 'Verify roof condition matches survey. Check electrical panel and identify isolation point.',
    tip: 'Take photos of any discrepancies between survey and actual conditions.',
  },
  {
    title: 'Complete Installation',
    description: 'Follow the installation checklist step-by-step. Document each milestone.',
    tip: 'Use the checklist buttons to track progress in real-time.',
  },
  {
    title: 'Customer Handover',
    description: 'Walk customer through monitoring app setup. Explain system operation and maintenance.',
    tip: 'Ensure customer signs off on completion before leaving site.',
  },
];

export default function InstallerMapView({ 
  assignments: propAssignments, 
  showDemo: propShowDemo 
}: InstallerMapViewProps) {
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(!propAssignments);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showDemoState, setShowDemoState] = useState(propShowDemo ?? true);
  const [trainingMode, setTrainingMode] = useState(false);
  const [currentTrainingStep, setCurrentTrainingStep] = useState(0);

  // Use props if provided, otherwise use local state
  const assignments = propAssignments ?? localAssignments;
  const showDemo = propShowDemo !== undefined ? propShowDemo : showDemoState;
  const setShowDemo = propShowDemo !== undefined ? () => {} : setShowDemoState;

  useEffect(() => {
    // Only fetch locally if no props provided
    if (!propAssignments) {
      loadAssignments();
    }
  }, [propAssignments]);

  const loadAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: installer } = await supabase
        .from('installers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!installer) {
        setLoading(false);
        return;
      }

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
        .in('status', ['pending', 'accepted', 'in_progress', 'scheduled']);

      if (error) throw error;
      setLocalAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'scheduled': return 'bg-cyan-500';
      case 'accepted': return 'bg-blue-500';
      case 'in_progress': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Zap className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const allAssignments = showDemo 
    ? [DEMO_INSTALLATION, ...SAMPLE_INSTALLATIONS, ...assignments] 
    : assignments;

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  const startTraining = () => {
    setTrainingMode(true);
    setCurrentTrainingStep(0);
    setSelectedAssignment(DEMO_INSTALLATION);
    toast.success('Training mode started! Follow the steps to learn the workflow.');
  };

  const nextTrainingStep = () => {
    if (currentTrainingStep < TRAINING_STEPS.length - 1) {
      setCurrentTrainingStep(prev => prev + 1);
    } else {
      setTrainingMode(false);
      toast.success('Training complete! You\'re ready for real installations.');
    }
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
      {/* Training Mode Banner */}
      <AnimatePresence>
        {trainingMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Training Mode</h3>
                      <p className="text-sm text-muted-foreground">Step {currentTrainingStep + 1} of {TRAINING_STEPS.length}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTrainingMode(false)}>
                    Exit Training
                  </Button>
                </div>

                <div className="mb-4">
                  <div className="flex gap-1 mb-3">
                    {TRAINING_STEPS.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          idx <= currentTrainingStep ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <h4 className="font-medium text-lg">{TRAINING_STEPS[currentTrainingStep].title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {TRAINING_STEPS[currentTrainingStep].description}
                  </p>
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Pro tip:</strong> {TRAINING_STEPS[currentTrainingStep].tip}
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={nextTrainingStep} className="w-full">
                  {currentTrainingStep < TRAINING_STEPS.length - 1 ? (
                    <>Next Step <ChevronRight className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Complete Training <CheckCircle className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Placeholder with Location Pins */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Installation Locations
            </CardTitle>
            <div className="flex items-center gap-2">
              {!trainingMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startTraining}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Start Training
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDemo(!showDemo)}
              >
                {showDemo ? 'Hide Samples' : 'Show Samples'}
              </Button>
            </div>
          </div>
          <CardDescription>
            {allAssignments.length} active installation{allAssignments.length !== 1 ? 's' : ''} in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Interactive Map Representation */}
          <div className="relative bg-muted rounded-lg h-[350px] overflow-hidden">
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
              const xPos = 15 + (index * 18) % 70;
              const yPos = 20 + (index * 22) % 55;
              const isDemo = assignment.id === 'demo-training';
              const isSelected = selectedAssignment?.id === assignment.id;
              
              return (
                <motion.button
                  key={assignment.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`absolute transform -translate-x-1/2 -translate-y-full transition-all hover:scale-110 ${
                    isSelected ? 'z-20 scale-110' : 'z-10'
                  }`}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  onClick={() => setSelectedAssignment(isSelected ? null : assignment)}
                >
                  <div className={`${isDemo ? 'bg-gradient-to-r from-primary to-emerald-500' : getStatusColor(assignment.status)} text-white rounded-full p-2 shadow-lg ${isDemo ? 'animate-pulse' : ''}`}>
                    {isDemo ? <GraduationCap className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  {assignment.priority === 'high' && !isDemo && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
                  )}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-background border rounded-lg shadow-xl p-3 min-w-[220px] z-30"
                      >
                        <p className="font-medium text-sm">{assignment.leads?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.leads?.address || 'No address'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {assignment.status}
                          </Badge>
                          {isDemo && (
                            <Badge className="text-xs bg-primary">Training</Badge>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-emerald-500"></div>
                  <span>Training Demo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span>Scheduled</span>
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
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No active installations</p>
                  <Button variant="link" onClick={() => setShowDemo(true)} className="mt-2">
                    Show sample data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment List */}
      <div className="grid gap-4 md:grid-cols-2">
        {allAssignments.map((assignment) => {
          const isDemo = assignment.id === 'demo-training';
          const isSample = assignment.id.startsWith('sample-');
          
          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAssignment?.id === assignment.id ? 'ring-2 ring-primary' : ''
                } ${isDemo ? 'border-2 border-primary bg-primary/5' : ''} ${isSample ? 'border-dashed' : ''}`}
                onClick={() => setSelectedAssignment(
                  selectedAssignment?.id === assignment.id ? null : assignment
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{assignment.leads?.name}</h3>
                        {isDemo && (
                          <Badge className="bg-primary text-xs">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            Training
                          </Badge>
                        )}
                        {isSample && (
                          <Badge variant="outline" className="text-xs">Sample</Badge>
                        )}
                        {assignment.priority === 'high' && !isDemo && (
                          <Badge variant="destructive" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {assignment.leads?.address || 'No address provided'}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(assignment.status)} text-white`}>
                      {getStatusIcon(assignment.status)}
                      <span className="ml-1 capitalize">{assignment.status}</span>
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

                  <div className="flex gap-2">
                    {assignment.leads?.address && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInMaps(assignment.leads!.address!);
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>
                    )}
                    {isDemo && !trainingMode && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTraining();
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Tutorial
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
