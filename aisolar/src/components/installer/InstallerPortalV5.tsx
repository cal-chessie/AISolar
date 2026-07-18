/**
 * Installer Portal V5 — clean, no legacy.
 *
 * 3 tabs:
 *   1. Jobs — with sub-tabs: Active | Completed
 *   2. Materials — with sub-tabs: Per Customer | Stock
 *   3. Map — all jobs on OSM
 *
 * Everything interconnected:
 *   - Job card → click → JobView (tabbed checklist)
 *   - Materials per customer → click → JobView
 *   - Map pin → click → JobView
 *   - Header: Owner + Consultant cross-view buttons
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Wrench, Sun, MapPin, Clock, ArrowRight, Package, Cloud, CloudRain,
  Wind, Calendar, Camera, CheckCircle2, AlertTriangle, Navigation,
  Building2, Users, ChevronRight, CheckCircle, ClipboardList,
} from 'lucide-react';
import { generateDummyLeads, type DummyLead } from '@/lib/dummyData';
import { getStage } from '@/lib/leadIntake';
import { brand } from '@/config/brand';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import RoleBasedAICoach from '@/components/ai/RoleBasedAICoach';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function InstallerPortalV5() {
  const navigate = useNavigate();
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [tab, setTab] = useState<'jobs' | 'materials' | 'map'>('jobs');
  const [jobSubTab, setJobSubTab] = useState<'active' | 'completed'>('active');
  const [matSubTab, setMatSubTab] = useState<'per_customer' | 'stock'>('per_customer');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Jobs
  const activeJobs = useMemo(() => leads.filter(l =>
    l.assignment && ['install_scheduled', 'installing'].includes(l.workflow_stage)
  ), [leads]);
  const completedJobs = useMemo(() => leads.filter(l =>
    l.assignment && l.assignment.status === 'completed'
  ), [leads]);
  const surveyJobs = useMemo(() => leads.filter(l =>
    ['survey_scheduled', 'survey_complete'].includes(l.workflow_stage)
  ), [leads]);
  const handoverJobs = useMemo(() => leads.filter(l => l.workflow_stage === 'installed'), [leads]);

  const displayActive = [...surveyJobs, ...activeJobs, ...handoverJobs];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-6 w-6 text-amber-600" />
            <div>
              <span className="font-bold text-sm">{brand.name} Field</span>
              <span className="text-xs text-muted-foreground ml-2">{new Date().toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/owner')}>
              <Building2 className="h-3.5 w-3.5 mr-1" /> Owner
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/consultant')}>
              <Users className="h-3.5 w-3.5 mr-1" /> Consultant
            </Button>
            <DarkModeToggle />
          </div>
        </div>
        {/* Weather strip */}
        <div className="px-4 pb-2 flex items-center gap-4 text-xs overflow-x-auto">
          <div className="flex items-center gap-1 flex-shrink-0"><Cloud className="h-3 w-3" /><span>18°C Dublin</span></div>
          <div className="flex items-center gap-1 flex-shrink-0"><CloudRain className="h-3 w-3 text-amber-600" /><span className="text-amber-700">Yellow rain warning tomorrow</span></div>
          <div className="flex items-center gap-1 flex-shrink-0"><Wind className="h-3 w-3" /><span>12 km/h SW</span></div>
          <div className="flex items-center gap-1 flex-shrink-0"><Sun className="h-3 w-3" /><span>Sunset 21:47</span></div>
        </div>
        {/* 3 main tabs */}
        <div className="px-2 pb-1.5 flex gap-0.5">
          {[
            { id: 'jobs' as const, label: 'Jobs', icon: Calendar, count: displayActive.length + completedJobs.length },
            { id: 'materials' as const, label: 'Materials', icon: Package, count: 0 },
            { id: 'map' as const, label: 'Map', icon: MapPin, count: activeJobs.length },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === t.id ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                <Icon className="h-3.5 w-3.5" /> {t.label}
                {t.count > 0 && <span className={`text-[11px] px-1 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-muted-foreground/15'}`}>{t.count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-3 pb-20">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* === JOBS === */}
            {tab === 'jobs' && (
              <div className="space-y-3">
                {/* Sub-tabs: Active | Completed */}
                <div className="flex gap-1">
                  <button onClick={() => setJobSubTab('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${jobSubTab === 'active' ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    Active ({displayActive.length})
                  </button>
                  <button onClick={() => setJobSubTab('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${jobSubTab === 'completed' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    Completed ({completedJobs.length})
                  </button>
                </div>

                {jobSubTab === 'active' && (
                  <div className="space-y-2">
                    {/* Surveys */}
                    {surveyJobs.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1"><Camera className="h-3 w-3" /> Surveys ({surveyJobs.length})</h3>
                        {surveyJobs.map(lead => <JobCard key={lead.id} lead={lead} variant="survey" onClick={() => navigate(`/job/${lead.id}`)} />)}
                      </div>
                    )}
                    {/* Installs */}
                    {activeJobs.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1"><Wrench className="h-3 w-3" /> Installs ({activeJobs.length})</h3>
                        {activeJobs.map(lead => <JobCard key={lead.id} lead={lead} variant="install" onClick={() => navigate(`/job/${lead.id}`)} />)}
                      </div>
                    )}
                    {/* Handovers */}
                    {handoverJobs.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Handovers ({handoverJobs.length})</h3>
                        {handoverJobs.map(lead => <JobCard key={lead.id} lead={lead} variant="handover" onClick={() => navigate(`/job/${lead.id}`)} />)}
                      </div>
                    )}
                    {displayActive.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No active jobs.</p>}
                  </div>
                )}

                {jobSubTab === 'completed' && (
                  <div className="space-y-2">
                    {completedJobs.map(lead => <JobCard key={lead.id} lead={lead} variant="completed" onClick={() => navigate(`/job/${lead.id}`)} />)}
                    {completedJobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No completed jobs yet.</p>}
                  </div>
                )}
              </div>
            )}

            {/* === MATERIALS === */}
            {tab === 'materials' && (
              <div className="space-y-3">
                {/* Sub-tabs: Per Customer | Stock */}
                <div className="flex gap-1">
                  <button onClick={() => setMatSubTab('per_customer')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${matSubTab === 'per_customer' ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    Per Customer
                  </button>
                  <button onClick={() => setMatSubTab('stock')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${matSubTab === 'stock' ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    Depot Stock
                  </button>
                </div>

                {matSubTab === 'per_customer' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Auto-generated BOM for each job. Click to expand + check off loaded items.</p>
                    {[...activeJobs, ...handoverJobs].map(lead => {
                      const proposal = lead.proposal;
                      const isExpanded = expandedJob === lead.id;
                      const hasBattery = !!proposal?.battery_model;
                      const bomItems = proposal ? [
                        { category: 'Panels', item: `${proposal.panel_count} × ${proposal.panel_model}`, qty: proposal.panel_count, critical: true },
                        { category: 'Inverter', item: proposal.inverter_model, qty: 1, critical: true },
                        ...(hasBattery ? [{ category: 'Battery', item: proposal.battery_model!, qty: 1, critical: true }] : []),
                        { category: 'Mounting', item: 'Rails + hooks + clamps', qty: Math.ceil(proposal.panel_count * 0.3), critical: true },
                        { category: 'Electrical', item: 'DC cable (6mm²)', qty: Math.ceil(8 + proposal.panel_count * 1.2), critical: true },
                        { category: 'Electrical', item: 'AC cable + isolators + SPD', qty: 4, critical: true },
                        { category: 'Safety', item: 'Harness + edge protection', qty: 2, critical: true },
                      ] : [];
                      return (
                        <Card key={lead.id} className={isExpanded ? 'border-amber-400' : ''}>
                          <button onClick={() => setExpandedJob(isExpanded ? null : lead.id)}
                            className="w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/30">
                            <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg"><Package className="h-4 w-4 text-amber-600" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{lead.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{lead.address.split(',').slice(-1)[0]?.trim()} · {proposal?.system_size_kw}kWp</div>
                            </div>
                            <Badge variant="outline" className="text-[11px]">{bomItems.length} items</Badge>
                          </button>
                          {isExpanded && (
                            <div className="border-t p-3 space-y-1">
                              {bomItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs">
                                  <input type="checkbox" className="h-3.5 w-3.5 rounded" />
                                  <Badge variant="outline" className="text-[11px] flex-shrink-0">{item.category}</Badge>
                                  <span className="flex-1 truncate">{item.qty} × {item.item}</span>
                                  {item.critical && <Badge variant="outline" className="text-[11px] bg-red-50 text-red-700 border-red-200">Critical</Badge>}
                                </div>
                              ))}
                              <Button size="sm" className="w-full mt-2 bg-amber-600 transition-colors hover:bg-amber-700" onClick={() => navigate(`/job/${lead.id}`)}>
                                Open job <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}

                {matSubTab === 'stock' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Dublin depot inventory. Auto-reorder triggers when stock &lt; 5.</p>
                    {[
                      { item: 'Longi Hi-MO 6 435W', stock: 48, alloc: 32, low: false },
                      { item: 'SolarEdge SE5K inverter', stock: 6, alloc: 4, low: false },
                      { item: 'Tesla Powerwall 3 (13.5kWh)', stock: 4, alloc: 3, low: false },
                      { item: 'Mounting rails (1.6m)', stock: 120, alloc: 84, low: false },
                      { item: 'DC cable (6mm²)', stock: 800, alloc: 400, low: false },
                      { item: 'Surge protector (Type 2)', stock: 8, alloc: 7, low: true },
                    ].map(row => {
                      const available = row.stock - row.alloc;
                      return (
                        <Card key={row.item} className={row.low ? 'border-red-300 dark:border-red-800' : ''}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">{row.item}</div>
                                <div className="text-xs text-muted-foreground">{row.stock} in stock · {row.alloc} allocated this week</div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${available < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{available}</div>
                                <div className="text-[11px] text-muted-foreground">available</div>
                              </div>
                            </div>
                            {row.low && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-red-700">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Auto-reorder triggered · PO sent to Setanta Solar</span>
                              </div>
                            )}
                            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${available < 5 ? 'bg-red-500' : available < 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (available / Math.max(1, row.stock)) * 100)}%` }} />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* === MAP === */}
            {tab === 'map' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold">Job map — Dublin area</h3>
                <Card className="overflow-hidden">
                  <div className="aspect-[4/3] bg-muted">
                    <iframe title="Job map" src="https://www.openstreetmap.org/export/embed.html?bbox=-6.27,53.34,-6.25,53.36&layer=mapnik&marker=53.35,-6.26"
                      className="w-full h-full border-0" loading="lazy" />
                  </div>
                  <CardContent className="p-2 text-xs text-center text-muted-foreground">© OpenStreetMap · {activeJobs.length} jobs pinned</CardContent>
                </Card>
                <div className="space-y-2">
                  {activeJobs.map(lead => (
                    <Card key={lead.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/job/${lead.id}`)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/40">
                          <MapPin className="h-4 w-4 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{lead.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{lead.address}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">{lead.proposal?.system_size_kw} kWp</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      <RoleBasedAICoach />
    </div>
  );
}

// ============= JOB CARD =============
function JobCard({ lead, variant, onClick }: { lead: DummyLead; variant: 'survey' | 'install' | 'handover' | 'completed'; onClick: () => void }) {
  const proposal = lead.proposal;
  const survey = lead.survey;
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const color = variant === 'survey' ? 'indigo' : variant === 'handover' ? 'blue' : variant === 'completed' ? 'emerald' : 'amber';

  return (
    <Card className={`mb-2 cursor-pointer hover:shadow-md border-l-4 border-l-${color}-500`} onClick={onClick}>
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
                <div className="text-xs text-indigo-600 mt-0.5">{survey.photo_count || 0}/8 photos · {survey.roof_type} roof</div>
              )}
              {variant === 'install' && proposal && (
                <div className="text-xs text-amber-600 mt-0.5">{proposal.system_size_kw} kWp · {proposal.panel_count} panels{proposal.battery_model ? ' + battery' : ''}</div>
              )}
              {variant === 'handover' && (
                <div className="text-xs text-blue-600 mt-0.5">Warranty sent · Final invoice pending</div>
              )}
              {variant === 'completed' && (
                <div className="text-xs text-emerald-600 mt-0.5">Completed · {lead.assignment?.completed_date ? new Date(lead.assignment.completed_date).toLocaleDateString('en-IE') : ''}</div>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              {lead.assignment?.scheduled_date ? new Date(lead.assignment.scheduled_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : 'TBD'}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
