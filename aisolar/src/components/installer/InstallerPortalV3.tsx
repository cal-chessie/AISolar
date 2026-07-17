/**
 * Installer Portal V3 — simplified.
 *
 * One clean view: today's jobs as cards. Click a job → opens JobView
 * (the single scrollable page with BOM + site notes + install steps +
 * handover signature all in the right order).
 *
 * No more 6 tabs. Just: today's jobs + a map + stock. That's it.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wrench, Sun, MapPin, Clock, ArrowRight, Package, Cloud, CloudRain,
  Wind, Calendar, Camera, CheckCircle2, AlertTriangle, Navigation,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function InstallerPortalV3() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [view, setView] = useState<'jobs' | 'map' | 'stock'>('jobs');

  // Jobs relevant to installer: surveys + installs scheduled + in progress
  const myJobs = useMemo(() => leads.filter(l =>
    l.assignment && ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)
  ), [leads]);

  const mySurveys = useMemo(() => leads.filter(l =>
    ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage)
  ), [leads]);

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
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              <Sun className="h-3 w-3 mr-1" /> Demo
            </Badge>
            <DarkModeToggle />
          </div>
        </div>
        {/* Weather strip */}
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

      {/* View toggle — only 3 options */}
      <nav className="sticky top-[73px] z-20 bg-background/95 backdrop-blur border-b">
        <div className="grid grid-cols-3 gap-1 p-2">
          {[
            { id: 'jobs' as const, label: 'Jobs', icon: Calendar, count: myJobs.length + mySurveys.length },
            { id: 'map' as const, label: 'Map', icon: MapPin, count: myJobs.length },
            { id: 'stock' as const, label: 'Stock', icon: Package, count: 0 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`relative flex flex-col items-center gap-1 py-2.5 rounded-lg transition-colors min-h-[56px] ${
                  isActive ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="absolute top-1 right-3 bg-amber-600 text-white text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="pb-20 max-w-2xl mx-auto">
        {view === 'jobs' && (
          <div className="px-4 py-4 space-y-4">
            {/* Surveys to complete */}
            {mySurveys.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Surveys to complete ({mySurveys.length})
                </h2>
                {mySurveys.map(lead => (
                  <JobCard key={lead.id} lead={lead} variant="survey" onClick={() => navigate(`/job/${lead.id}`)} />
                ))}
              </div>
            )}

            {/* Today's installs */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Installs ({myJobs.length})
              </h2>
              {myJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No installs scheduled. Check back tomorrow.
                  </CardContent>
                </Card>
              ) : (
                myJobs.map(lead => (
                  <JobCard key={lead.id} lead={lead} variant="install" onClick={() => navigate(`/job/${lead.id}`)} />
                ))
              )}
            </div>

            {/* Handovers pending */}
            {handoverPending.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Handovers pending ({handoverPending.length})
                </h2>
                {handoverPending.map(lead => (
                  <JobCard key={lead.id} lead={lead} variant="handover" onClick={() => navigate(`/job/${lead.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'map' && <MapView jobs={myJobs} onJobClick={(lead) => navigate(`/job/${lead.id}`)} />}
        {view === 'stock' && <StockView />}
      </main>

      <RoleBasedAICoach />
    </div>
  );
}

function JobCard({ lead, variant, onClick }: { lead: DummyLead; variant: 'survey' | 'install' | 'handover'; onClick: () => void }) {
  const proposal = lead.proposal;
  const survey = lead.survey;
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const phaseColor = variant === 'survey' ? 'indigo' : variant === 'handover' ? 'blue' : 'amber';

  return (
    <Card
      className={`mb-2 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-${phaseColor}-500`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{lead.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.address.split(',').slice(-2).join(',').trim()}</span>
              </div>
              {variant === 'survey' && survey && (
                <div className="text-xs text-indigo-600 mt-0.5">
                  {survey.photo_count || 0}/8 photos · {survey.roof_type} roof
                </div>
              )}
              {variant === 'install' && proposal && (
                <div className="text-xs text-amber-600 mt-0.5">
                  {proposal.system_size_kw} kWp · {proposal.panel_count} panels{proposal.battery_model ? ' + battery' : ''}
                </div>
              )}
              {variant === 'handover' && (
                <div className="text-xs text-blue-600 mt-0.5">
                  Warranty sent · Final invoice pending
                </div>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              {lead.assignment?.scheduled_date
                ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
                : 'TBD'
              }
            </div>
            <div className="text-[10px] text-muted-foreground">8:00 AM</div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MapView({ jobs, onJobClick }: { jobs: DummyLead[]; onJobClick: (lead: DummyLead) => void }) {
  const dublinCenter = { lat: 53.3498, lng: -6.2603 };
  const lats = jobs.map((_, i) => dublinCenter.lat + (Math.sin(i * 1.7) * 0.05));
  const lngs = jobs.map((_, i) => dublinCenter.lng + (Math.cos(i * 2.3) * 0.08));
  const minLat = Math.min(...lats) - 0.01, maxLat = Math.max(...lats) + 0.01;
  const minLng = Math.min(...lngs) - 0.02, maxLng = Math.max(...lngs) + 0.02;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${dublinCenter.lat},${dublinCenter.lng}`;

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-3">Job map · Dublin area</h2>
      <Card className="overflow-hidden mb-4">
        <div className="aspect-[4/3] bg-muted">
          <iframe title="Job map" src={mapUrl} className="w-full h-full border-0" loading="lazy" />
        </div>
        <CardContent className="p-2 text-xs text-center text-muted-foreground">
          © OpenStreetMap · {jobs.length} jobs pinned
        </CardContent>
      </Card>
      <div className="space-y-2">
        {jobs.map(lead => (
          <Card key={lead.id} className="cursor-pointer hover:shadow-md" onClick={() => onJobClick(lead)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/40">
                <MapPin className="h-4 w-4 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{lead.name}</div>
                <div className="text-xs text-muted-foreground truncate">{lead.address}</div>
              </div>
              <Badge variant="outline" className="text-xs">{lead.proposal?.system_size_kw} kWp</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StockView() {
  const inventory = [
    { item: 'Longi Hi-MO 6 435W', stock: 48, alloc: 32, low: false },
    { item: 'SolarEdge SE5K inverter', stock: 6, alloc: 4, low: false },
    { item: 'Tesla Powerwall 3 (13.5kWh)', stock: 4, alloc: 3, low: false },
    { item: 'Mounting rails (1.6m)', stock: 120, alloc: 84, low: false },
    { item: 'DC cable (6mm²)', stock: 800, alloc: 400, low: false },
    { item: 'Surge protector (Type 2)', stock: 8, alloc: 7, low: true },
  ];
  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold mb-1">Stock · Dublin Depot</h2>
      <p className="text-xs text-muted-foreground mb-4">Auto-reorder triggers when stock &lt; 5 units</p>
      <div className="space-y-2">
        {inventory.map(row => {
          const available = row.stock - row.alloc;
          return (
            <Card key={row.item} className={row.low ? 'border-red-300 dark:border-red-800' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{row.item}</div>
                    <div className="text-xs text-muted-foreground">{row.stock} in stock · {row.alloc} allocated</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${available < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{available}</div>
                    <div className="text-[10px] text-muted-foreground">available</div>
                  </div>
                </div>
                {row.low && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Auto-reorder triggered · PO sent to Setanta Solar</span>
                  </div>
                )}
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
    </div>
  );
}
