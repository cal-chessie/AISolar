/**
 * InstallerFirstDashboard
 *
 * The old InstallerDashboard was a thin shell — just a list of assignments.
 * This replaces it with a complete installer cockpit:
 *
 *   1. Today's jobs (with materials checklist + customer info)
 *   2. This week's schedule (with weather + route)
 *   3. Surveys to complete (with photo checklist)
 *   4. Inventory + materials (low stock alerts)
 *   5. Customer handovers pending (warranty, review requests)
 *   6. Agent status (what automations are running for the installer)
 *
 * Voice: practical, job-focused. No sales talk.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, MapPin, Phone, Mail, Clock, AlertTriangle, CheckCircle2,
  Truck, FileText, Camera, Wrench, Cloud, Navigation, Bot, Sun,
  Package, ArrowRight, Plus,
} from 'lucide-react';
import RoleBasedAICoach from './ai/RoleBasedAICoach';
import AgentFoundation from './AgentFoundation';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';

export default function InstallerFirstDashboard() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());

  // Leads relevant to an installer
  const myAssignments = useMemo(() => leads.filter(l =>
    l.assignment && ['install_scheduled', 'installing', 'installed'].includes(l.workflow_stage)
  ), [leads]);

  const todayJobs = useMemo(() => myAssignments.filter(l =>
    l.assignment?.scheduled_date &&
    new Date(l.assignment.scheduled_date).toDateString() === new Date().toDateString()
  ), [myAssignments]);

  const upcomingJobs = useMemo(() => myAssignments.filter(l =>
    l.assignment?.scheduled_date &&
    new Date(l.assignment.scheduled_date) > new Date() &&
    !todayJobs.includes(l)
  ).slice(0, 5), [myAssignments, todayJobs]);

  const surveysToDo = useMemo(() => leads.filter(l =>
    ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage) && l.survey
  ), [leads]);

  const installedNeedsHandover = useMemo(() => leads.filter(l =>
    l.workflow_stage === 'installed' && !l.invoice?.final_paid
  ), [leads]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/20 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-7 w-7 text-amber-600" />
            <div>
              <span className="font-bold text-lg">{brand.name} · Installer Cockpit</span>
              <p className="text-xs text-muted-foreground">Today's jobs, surveys, materials, and automations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
              <Sun className="h-3 w-3 mr-1" /> Demo data
            </Badge>
            <DarkModeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/demo')}>
              All views
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Today summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Today</div>
              <div className="text-2xl font-bold text-amber-600">{todayJobs.length} jobs</div>
              <div className="text-xs text-muted-foreground mt-1">{todayJobs.length > 0 ? 'First: 8:00am' : 'No installs today'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">This week</div>
              <div className="text-2xl font-bold">{upcomingJobs.length + todayJobs.length} jobs</div>
              <div className="text-xs text-muted-foreground mt-1">+{surveysToDo.length} surveys</div>
            </CardContent>
          </Card>
          <Card className={installedNeedsHandover.length > 0 ? "border-blue-200 dark:border-blue-800" : ""}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Handovers pending</div>
              <div className="text-2xl font-bold text-blue-600">{installedNeedsHandover.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Warranty + review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Weather</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Cloud className="h-5 w-5" /> 18°C
              </div>
              <div className="text-xs text-amber-600 mt-1">⚠ Yellow rain warning tomorrow</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4 h-auto">
            <TabsTrigger value="today" className="text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:mr-1 sm:inline" /> Today
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:mr-1 sm:inline" /> Week
            </TabsTrigger>
            <TabsTrigger value="surveys" className="text-xs sm:text-sm">
              <Camera className="h-3 w-3 sm:mr-1 sm:inline" /> Surveys
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs sm:text-sm">
              <Package className="h-3 w-3 sm:mr-1 sm:inline" /> Materials
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs sm:text-sm">
              <Bot className="h-3 w-3 sm:mr-1 sm:inline" /> Agents
            </TabsTrigger>
            <TabsTrigger value="handover" className="text-xs sm:text-sm">
              <CheckCircle2 className="h-3 w-3 sm:mr-1 sm:inline" /> Handover
            </TabsTrigger>
          </TabsList>

          {/* TODAY */}
          <TabsContent value="today" className="space-y-4">
            {todayJobs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No installs scheduled for today.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check the Week tab for upcoming jobs, or Surveys for site visits.</p>
                </CardContent>
              </Card>
            ) : (
              todayJobs.map(job => <JobCard key={job.id} lead={job} variant="today" />)
            )}
          </TabsContent>

          {/* WEEK */}
          <TabsContent value="week" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Upcoming installs (next 7 days)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing scheduled. The InstallCoordinator Agent will queue jobs here as deposits come in.</p>
                ) : (
                  upcomingJobs.map(job => <UpcomingJobRow key={job.id} lead={job} />)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SURVEYS */}
          <TabsContent value="surveys" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Site surveys to complete
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Each survey feeds the Proposal Drafter Agent. Capture all 8 photos or it stays incomplete.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {surveysToDo.map(lead => (
                  <Card key={lead.id} className="border-l-4 border-l-indigo-400">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{lead.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {lead.address}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Survey: {lead.survey?.scheduled_date ? new Date(lead.survey.scheduled_date).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : 'unscheduled'}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {lead.survey?.photo_count || 0}/8 photos
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Photo checklist</span>
                          <span>{lead.survey?.photo_count || 0}/8</span>
                        </div>
                        <Progress value={((lead.survey?.photo_count || 0) / 8) * 100} className="h-1.5" />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="default">
                          <Camera className="h-3 w-3 mr-1" /> Open survey
                        </Button>
                        <Button size="sm" variant="outline">
                          <Navigation className="h-3 w-3 mr-1" /> Directions
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Phone className="h-3 w-3 mr-1" /> Call customer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {surveysToDo.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No surveys pending. SurveyScheduler Agent will queue them as leads reach intake_complete.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MATERIALS */}
          <TabsContent value="materials" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Inventory — Dublin depot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right">In stock</th>
                      <th className="text-right">Allocated (this week)</th>
                      <th className="text-right">Available</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { item: 'Longi Hi-MO 6 435W', stock: 48, alloc: 32 },
                      { item: 'SolarEdge SE5K inverter', stock: 6, alloc: 4 },
                      { item: 'SolarEdge SE8K inverter', stock: 2, alloc: 1 },
                      { item: 'Tesla Powerwall 3 (13.5kWh)', stock: 4, alloc: 3 },
                      { item: 'Mounting rails (1.6m)', stock: 120, alloc: 84 },
                      { item: 'DC cable (6mm²)', stock: 800, alloc: 400 },
                      { item: 'AC isolator', stock: 24, alloc: 18 },
                      { item: 'Surge protector (Type 2)', stock: 8, alloc: 7, low: true },
                    ].map(row => (
                      <tr key={row.item} className="border-b last:border-0">
                        <td className="py-2">{row.item}</td>
                        <td className="text-right tabular-nums">{row.stock}</td>
                        <td className="text-right tabular-nums text-amber-600">{row.alloc}</td>
                        <td className="text-right tabular-nums font-semibold">{row.stock - row.alloc}</td>
                        <td className="text-right">
                          {row.low || (row.stock - row.alloc) < 5 ? (
                            <Badge variant="destructive" className="text-[10px]">Low — reorder</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  <strong>Auto-reorder trigger:</strong> When stock drops below 5 units, the InstallCoordinator Agent
                  places a purchase order with your supplier (Setanta Solar). Last PO: 2026-07-12, 48 panels.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AGENTS */}
          <TabsContent value="agents" className="space-y-3">
            <AgentFoundation compact />
          </TabsContent>

          {/* HANDOVER */}
          <TabsContent value="handover" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Post-install handovers pending
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  These installs are marked complete. PostInstall Agent has sent warranty docs — final invoice must be paid to close out.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {installedNeedsHandover.map(lead => (
                  <Card key={lead.id} className="border-l-4 border-l-blue-400">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{lead.name}</div>
                          <div className="text-sm text-muted-foreground">{lead.address}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Installed: {lead.assignment?.completed_date ? new Date(lead.assignment.completed_date).toLocaleDateString('en-IE') : 'N/A'}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Warranty sent
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-muted/30 rounded">
                          <div className="text-muted-foreground">Final invoice</div>
                          <div className="font-semibold">{lead.invoice ? `€${lead.invoice.final_amount.toLocaleString()}` : '—'}</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                          <div className="text-muted-foreground">Review request</div>
                          <div className="font-semibold">Scheduled T+7</div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                          <div className="text-muted-foreground">SEAI submitted</div>
                          <div className="font-semibold">Auto by GrantAgent</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {installedNeedsHandover.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No handovers pending. All installs are closed out.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role-aware AI coach — installer flavor */}
      <RoleBasedAICoach />
    </div>
  );
}

function JobCard({ lead, variant = 'today' }: { lead: DummyLead; variant?: 'today' | 'upcoming' }) {
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const job = lead.assignment;
  const proposal = lead.proposal;
  return (
    <Card className="border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{lead.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {lead.address}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {job?.scheduled_date ? new Date(job.scheduled_date).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="default" className="bg-amber-600">
              {proposal?.system_size_kw} kWp
            </Badge>
            {proposal?.battery_model && (
              <div className="text-xs text-muted-foreground mt-1">+ battery</div>
            )}
          </div>
        </div>

        {/* Materials checklist */}
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Materials (auto-picked by InstallCoordinator Agent)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-2 bg-muted/40 rounded">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              {proposal?.panel_count} × panels
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-muted/40 rounded">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              1 × inverter
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-muted/40 rounded">
              {proposal?.battery_model ? (
                <><CheckCircle2 className="h-3 w-3 text-emerald-600" />1 × battery</>
              ) : (
                <><span className="opacity-50">—</span> No battery</>
              )}
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-muted/40 rounded">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Mounting kit
            </div>
          </div>
        </div>

        {/* Site notes */}
        {lead.survey && (
          <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
            <strong>Site notes from survey:</strong> {lead.survey.roof_type} roof, {lead.survey.roof_orientation},
            {lead.survey.shading === 'none' ? ' no shading' : ` ${lead.survey.shading} shading`}.
            {lead.survey.confirmed_battery_kwh ? ` Battery: ${lead.survey.confirmed_battery_kwh}kWh.` : ''}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="default">
            <FileText className="h-3 w-3 mr-1" /> Job sheet
          </Button>
          <Button size="sm" variant="outline">
            <Navigation className="h-3 w-3 mr-1" /> Navigate
          </Button>
          <Button size="sm" variant="outline">
            <Phone className="h-3 w-3 mr-1" /> Call customer
          </Button>
          <Button size="sm" variant="outline">
            <Camera className="h-3 w-3 mr-1" /> Progress photos
          </Button>
          {variant === 'today' && (
            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark install complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingJobRow({ lead }: { lead: DummyLead }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase">
            {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { month: 'short' }) : ''}
          </div>
          <div className="text-lg font-bold">
            {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).getDate() : ''}
          </div>
        </div>
        <div>
          <div className="font-semibold text-sm">{lead.name}</div>
          <div className="text-xs text-muted-foreground">{lead.address.split(',').slice(-2)[0]?.trim()}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">{lead.proposal?.system_size_kw} kWp</Badge>
        <span className="text-xs text-muted-foreground">
          {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
    </div>
  );
}
