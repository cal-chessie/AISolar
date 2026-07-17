/**
 * Installer Portal V2 — best-in-class field installer app
 *
 * Mobile + tablet optimised. Irish market specific (OSM tiles, Eircode lookup,
 * Met Éireann weather, RECI compliance).
 *
 * 5 tabs:
 *   1. Today — today's jobs with route optimisation + materials checklist
 *   2. Map — OpenStreetMap with all job pins + traffic overlay
 *   3. Surveys — site surveys to complete with photo checklist
 *   4. Stock — materials inventory + auto-reorder alerts
 *   5. Handover — post-install warranty + review handovers
 *
 * Uses Leaflet via CDN (no npm install) for the map. OSM tiles are free.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar, MapPin, Phone, Clock, AlertTriangle, CheckCircle2,
  Truck, FileText, Camera, Wrench, Cloud, Navigation, Bot, Sun,
  Package, ArrowRight, Plus, CloudRain, Wind, Thermometer, Eye,
  ListTodo, Route,
} from 'lucide-react';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import WorkflowOrchestrator from '@/components/WorkflowOrchestrator';

export default function InstallerPortalV2() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [activeTab, setActiveTab] = useState<'today' | 'map' | 'surveys' | 'stock' | 'handover' | 'workflow'>('today');
  const [selectedJobForWorkflow, setSelectedJobForWorkflow] = useState<DummyLead | null>(null);

  const myJobs = useMemo(() => leads.filter(l =>
    l.assignment && ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)
  ), [leads]);

  const todayJobs = useMemo(() => myJobs.filter(l =>
    l.assignment?.scheduled_date &&
    new Date(l.assignment.scheduled_date).toDateString() === new Date().toDateString()
  ), [myJobs]);

  // For demo, show all install_scheduled as "today"
  const displayToday = todayJobs.length > 0 ? todayJobs : myJobs.slice(0, 2);
  const surveysToDo = leads.filter(l => ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage));
  const handoverPending = leads.filter(l => l.workflow_stage === 'installed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/20 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-7 w-7 text-amber-600" />
            <div>
              <span className="font-bold text-base">{brand.name} Field</span>
              <p className="text-xs text-muted-foreground">Installer Cockpit v2</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              <Sun className="h-3 w-3 mr-1" /> Demo
            </Badge>
            <DarkModeToggle />
          </div>
        </div>
        {/* Weather strip — Irish market specific */}
        <div className="px-4 pb-2 flex items-center gap-4 text-xs overflow-x-auto">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Cloud className="h-3 w-3" />
            <span>18°C Dublin</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <CloudRain className="h-3 w-3 text-amber-600" />
            <span className="text-amber-700">Yellow rain warning tomorrow</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Wind className="h-3 w-3" />
            <span>12 km/h SW</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Sun className="h-3 w-3" />
            <span>Sunset 21:47</span>
          </div>
        </div>
      </header>

      {/* Tab navigation — mobile bottom nav + tablet top nav */}
      <nav className="sticky top-[73px] z-20 bg-background/95 backdrop-blur border-b">
        <div className="grid grid-cols-6 gap-1 p-2">
          {[
            { id: 'today' as const, label: 'Today', icon: Calendar, count: displayToday.length },
            { id: 'map' as const, label: 'Map', icon: MapPin, count: myJobs.length },
            { id: 'surveys' as const, label: 'Surveys', icon: Camera, count: surveysToDo.length },
            { id: 'workflow' as const, label: 'Workflow', icon: ListTodo, count: 0 },
            { id: 'stock' as const, label: 'Stock', icon: Package, count: 0 },
            { id: 'handover' as const, label: 'Handover', icon: CheckCircle2, count: handoverPending.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1 py-2.5 rounded-lg transition-colors min-h-[56px] ${
                  isActive ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] sm:text-xs font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="absolute top-1 right-2 bg-amber-600 text-white text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="pb-4">
        {activeTab === 'today' && (
          <TodayTab jobs={displayToday} onOpenWorkflow={(lead) => {
            setSelectedJobForWorkflow(lead);
            setActiveTab('workflow');
          }} />
        )}
        {activeTab === 'map' && <MapTab jobs={myJobs} onOpenWorkflow={(lead) => {
          setSelectedJobForWorkflow(lead);
          setActiveTab('workflow');
        }} />}
        {activeTab === 'surveys' && <SurveysTab surveys={surveysToDo} onOpenWorkflow={(lead) => {
          setSelectedJobForWorkflow(lead);
          setActiveTab('workflow');
        }} />}
        {activeTab === 'workflow' && (
          <div className="px-4 py-4">
            {selectedJobForWorkflow ? (
              <>
                <Card className="mb-4">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{selectedJobForWorkflow.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedJobForWorkflow.address}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedJobForWorkflow(null)}>Close</Button>
                  </CardContent>
                </Card>
                <WorkflowOrchestrator
                  lead={selectedJobForWorkflow}
                  viewer="installer"
                  onStepComplete={(step, data) => {
                    console.log('Installer step complete:', step, data);
                  }}
                />
              </>
            ) : (
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Pick a job to view its workflow</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Shows the survey form, installation checklist (toggles + photos + signature), and handover pack.
                </p>
                {[...displayToday, ...myJobs, ...surveysToDo].slice(0, 8).map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedJobForWorkflow(lead)}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.address.split(',').slice(-1)[0]?.trim()}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'stock' && <StockTab />}
        {activeTab === 'handover' && <HandoverTab jobs={handoverPending} />}
      </main>

      <RoleBasedAICoach />
    </div>
  );
}

// ============= TODAY TAB =============
function TodayTab({ jobs, onOpenWorkflow }: { jobs: DummyLead[]; onOpenWorkflow?: (lead: DummyLead) => void }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Today's Jobs</h2>
        <p className="text-xs text-muted-foreground">{jobs.length} install{jobs.length !== 1 ? 's' : ''} scheduled</p>
      </div>

      {/* Route summary */}
      <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-amber-600" />
            <span className="font-medium">Optimised route:</span>
            <span className="text-muted-foreground">{jobs.length} stops · 87 km · 1h 42m drive</span>
          </div>
          <Button size="sm" variant="outline" className="mt-2 h-8 text-xs">
            <Navigation className="h-3 w-3 mr-1" /> Open in Google Maps
          </Button>
        </CardContent>
      </Card>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No installs scheduled for today.</p>
          </CardContent>
        </Card>
      ) : (
        jobs.map(job => <JobCard key={job.id} lead={job} onOpenWorkflow={onOpenWorkflow} />)
      )}
    </div>
  );
}

function JobCard({ lead, onOpenWorkflow }: { lead: DummyLead; onOpenWorkflow?: (lead: DummyLead) => void }) {
  const proposal = lead.proposal;
  const survey = lead.survey;
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <Card className="border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-base">{lead.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {lead.address}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" /> {lead.phone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="default" className="bg-amber-600">
              {proposal?.system_size_kw} kWp
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-1">
              ETA 8:00-9:00am
            </div>
          </div>
        </div>

        {/* Materials checklist */}
        {proposal && (
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Package className="h-3 w-3" /> Materials (auto-picked)
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {proposal.panel_count} × {proposal.panel_model.split(' ').slice(0, 2).join(' ')}
              </div>
              <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                1 × {proposal.inverter_model}
              </div>
              <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Mounting + cabling
              </div>
              {proposal.battery_model ? (
                <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  1 × battery
                </div>
              ) : (
                <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded opacity-50">
                  <span>—</span> No battery
                </div>
              )}
            </div>
          </div>
        )}

        {/* Site notes */}
        {survey && (
          <div className="mb-3 p-2 bg-muted/30 rounded text-xs">
            <strong>Site notes:</strong> {survey.roof_type} roof, {survey.roof_orientation},
            {survey.shading === 'none' ? ' no shading' : ` ${survey.shading} shading`},
            {' '}{survey.roof_pitch}° pitch.
            {' '}{survey.confirmed_battery_kwh ? `Battery: ${survey.confirmed_battery_kwh}kWh.` : ''}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 h-9" onClick={() => onOpenWorkflow?.(lead)}>
            <FileText className="h-3 w-3 mr-1" /> Job sheet
          </Button>
          <Button size="sm" variant="outline" className="h-9">
            <Navigation className="h-3 w-3 mr-1" /> Navigate
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => onOpenWorkflow?.(lead)}>
            <Camera className="h-3 w-3 mr-1" /> Photos
          </Button>
          <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 h-9 ml-auto" onClick={() => onOpenWorkflow?.(lead)}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Mark complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============= MAP TAB =============
function MapTab({ jobs, onOpenWorkflow }: { jobs: DummyLead[]; onOpenWorkflow?: (lead: DummyLead) => void }) {
  // Generate Dublin-area lat/lng for demo jobs
  const dublinCenter = { lat: 53.3498, lng: -6.2603 };
  const jobPins = jobs.map((job, i) => ({
    id: job.id,
    name: job.name,
    address: job.address,
    lat: dublinCenter.lat + (Math.random() - 0.5) * 0.15,
    lng: dublinCenter.lng + (Math.random() - 0.5) * 0.2,
    status: job.assignment?.status || 'pending',
    systemSize: job.proposal?.system_size_kw,
  }));

  // Build OSM bbox around the pins
  const lats = jobPins.map(p => p.lat);
  const lngs = jobPins.map(p => p.lng);
  const minLat = Math.min(...lats) - 0.01;
  const maxLat = Math.max(...lats) + 0.01;
  const minLng = Math.min(...lngs) - 0.02;
  const maxLng = Math.max(...lngs) + 0.02;

  // Use OSM static map embed (free, no token)
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${dublinCenter.lat},${dublinCenter.lng}`;

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-3">Job Map · Dublin area</h2>

      {/* Map iframe — OSM, free, no token needed */}
      <Card className="overflow-hidden mb-4">
        <div className="aspect-[4/3] sm:aspect-[16/9] bg-muted">
          <iframe
            title="Installer job map"
            src={mapUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">© OpenStreetMap contributors</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <a href={`https://www.openstreetmap.org/?mlat=${dublinCenter.lat}&mlon=${dublinCenter.lng}#map=11/${dublinCenter.lat}/${dublinCenter.lng}`} target="_blank" rel="noopener noreferrer">
                Open full map <ArrowRight className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job pins list */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">{jobPins.length} jobs on map</h3>
        {jobPins.map(pin => {
          const lead = jobs.find(j => j.id === pin.id);
          return (
          <Card key={pin.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => lead && onOpenWorkflow?.(lead)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                pin.status === 'completed' ? 'bg-emerald-100' :
                pin.status === 'accepted' ? 'bg-amber-100' :
                'bg-muted'
              }`}>
                <MapPin className={`h-4 w-4 ${
                  pin.status === 'completed' ? 'text-emerald-700' :
                  pin.status === 'accepted' ? 'text-amber-700' :
                  'text-muted-foreground'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{pin.name}</div>
                <div className="text-xs text-muted-foreground truncate">{pin.address}</div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs">{pin.systemSize} kWp</Badge>
                <div className="text-[10px] text-muted-foreground mt-1 capitalize">{pin.status}</div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs">
        <div className="font-semibold mb-1">Legend</div>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-500" /> Scheduled</span>
          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-muted-foreground" /> Pending</span>
        </div>
      </div>
    </div>
  );
}

// ============= SURVEYS TAB =============
function SurveysTab({ surveys, onOpenWorkflow }: { surveys: DummyLead[]; onOpenWorkflow?: (lead: DummyLead) => void }) {
  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-1">Site Surveys</h2>
      <p className="text-xs text-muted-foreground mb-4">Capture all 8 photos + roof data. Auto-feeds Proposal Drafter Agent.</p>

      <div className="space-y-3">
        {surveys.map(lead => (
          <Card key={lead.id} className="border-l-4 border-l-indigo-400">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-base">{lead.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {lead.address}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {lead.survey?.scheduled_date ? new Date(lead.survey.scheduled_date).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unscheduled'}
                  </div>
                </div>
                <Badge variant="outline">
                  {lead.survey?.photo_count || 0}/8 photos
                </Badge>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Photo checklist</span>
                  <span>{lead.survey?.photo_count || 0}/8</span>
                </div>
                <Progress value={((lead.survey?.photo_count || 0) / 8) * 100} className="h-1.5" />
              </div>

              {/* Photo checklist items */}
              <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                {['Roof (front)', 'Roof (rear)', 'Fuse board', 'Meter', 'Inverter loc', 'Battery loc', 'Access', 'Obstructions'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-1 ${i < (lead.survey?.photo_count || 0) ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {i < (lead.survey?.photo_count || 0) ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-current" />}
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="default" className="bg-indigo-600 hover:bg-indigo-700 h-9" onClick={() => onOpenWorkflow?.(lead)}>
                  <Camera className="h-3 w-3 mr-1" /> Open survey
                </Button>
                <Button size="sm" variant="outline" className="h-9">
                  <Navigation className="h-3 w-3 mr-1" /> Directions
                </Button>
                <Button size="sm" variant="ghost" className="h-9">
                  <Phone className="h-3 w-3 mr-1" /> Call
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {surveys.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Camera className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No surveys pending.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============= STOCK TAB =============
function StockTab() {
  const inventory = [
    { item: 'Longi Hi-MO 6 435W', stock: 48, alloc: 32, low: false },
    { item: 'SolarEdge SE5K inverter', stock: 6, alloc: 4, low: false },
    { item: 'SolarEdge SE8K inverter', stock: 2, alloc: 1, low: false },
    { item: 'Tesla Powerwall 3 (13.5kWh)', stock: 4, alloc: 3, low: false },
    { item: 'Mounting rails (1.6m)', stock: 120, alloc: 84, low: false },
    { item: 'DC cable (6mm²)', stock: 800, alloc: 400, low: false },
    { item: 'AC isolator', stock: 24, alloc: 18, low: false },
    { item: 'Surge protector (Type 2)', stock: 8, alloc: 7, low: true },
  ];

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-1">Stock · Dublin Depot</h2>
      <p className="text-xs text-muted-foreground mb-4">Auto-reorder triggers when stock drops below 5 units</p>

      <div className="space-y-2">
        {inventory.map(row => {
          const available = row.stock - row.alloc;
          return (
            <Card key={row.item} className={row.low ? 'border-red-300 dark:border-red-800' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{row.item}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.stock} in stock · {row.alloc} allocated this week
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${available < 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {available}
                    </div>
                    <div className="text-[10px] text-muted-foreground">available</div>
                  </div>
                </div>
                {row.low && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Auto-reorder triggered · PO sent to Setanta Solar</span>
                  </div>
                )}
                {/* Stock bar */}
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${available < 5 ? 'bg-red-500' : available < 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (available / Math.max(1, row.stock)) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-3 text-xs">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-amber-600" />
            <span className="font-medium">InstallCoordinator Agent</span>
          </div>
          <p className="text-muted-foreground mt-1">
            Auto-reorders when stock &lt; 5 units. Last PO: 2026-07-12 (48 panels, €14,400).
            Supplier: Setanta Solar. Delivery: 3 business days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= HANDOVER TAB =============
function HandoverTab({ jobs }: { jobs: DummyLead[] }) {
  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-1">Post-Install Handovers</h2>
      <p className="text-xs text-muted-foreground mb-4">Warranty emails sent. Final invoice must be paid to close out.</p>

      <div className="space-y-3">
        {jobs.map(lead => (
          <Card key={lead.id} className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-base">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.address}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Installed: {lead.assignment?.completed_date ? new Date(lead.assignment.completed_date).toLocaleDateString('en-IE') : 'Recently'}
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Warranty sent
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-muted-foreground">Final invoice</div>
                  <div className="font-semibold">{lead.invoice ? `€${lead.invoice.final_amount.toLocaleString()}` : '—'}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-muted-foreground">Review req</div>
                  <div className="font-semibold">T+7 days</div>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-muted-foreground">SEAI</div>
                  <div className="font-semibold">Auto-submit</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-9">
                  <FileText className="h-3 w-3 mr-1" /> Handover pack
                </Button>
                <Button size="sm" variant="outline" className="h-9">
                  <Camera className="h-3 w-3 mr-1" /> Install photos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {jobs.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No handovers pending. All installs closed out.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
