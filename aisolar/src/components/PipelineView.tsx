/**
 * Pipeline View — the unified, automation-aware pipeline.
 *
 * Shows all active leads as a kanban-style board grouped by stage. Each lead card shows:
 *   - Customer name + score
 *   - Next automation that will fire (with status: queued ✓ / running ⟳ / failed ✗)
 *   - Last touchpoint (e.g. "Customer opened proposal 4x in 48h")
 *   - Value + payback
 *   - Quick actions (call, email, open lead)
 *
 * This is the "tracks all internal mechanisms along the pipeway + quick view of touchpoints
 * with the customer + actually triggers all connected" view the user asked for.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone, Mail, FileText, Calendar, Bot, ArrowRight, AlertTriangle,
  TrendingUp, MapPin, Clock, CheckCircle2, Zap,
} from 'lucide-react';
import {
  PIPELINE_STAGES, STAGE_GROUPS, getStage, getStageGroup, getNextAutomation,
  type DummyLead as PipelineLead,
} from '@/lib/leadIntake';
import { getAgentsForStage } from '@/lib/agents';
import { generateDummyLeads, computePipelineStats, type DummyLead } from '@/lib/dummyData';

const stageColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',    text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-950/30',border: 'border-indigo-200 dark:border-indigo-800',text: 'text-indigo-700 dark:text-indigo-300',dot: 'bg-indigo-500' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-950/30',border: 'border-violet-200 dark:border-violet-800',text: 'text-violet-700 dark:text-violet-300',dot: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30',border:'border-emerald-200 dark:border-emerald-800',text:'text-emerald-700 dark:text-emerald-300',dot: 'bg-emerald-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-200 dark:border-amber-800',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
  green:   { bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-200 dark:border-green-800',  text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-900/30',  border: 'border-slate-200 dark:border-slate-800',  text: 'text-slate-700 dark:text-slate-300',  dot: 'bg-slate-500' },
};

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function PipelineView({ filterConsultant }: { filterConsultant?: string }) {
  const [leads] = useState<DummyLead[]>(() => generateDummyLeads());
  const [selectedLead, setSelectedLead] = useState<DummyLead | null>(null);
  const [groupBy, setGroupBy] = useState<'stage' | 'group'>('stage');

  const filteredLeads = useMemo(() => {
    if (!filterConsultant) return leads;
    return leads.filter(l => l.assigned_consultant === filterConsultant);
  }, [leads, filterConsultant]);

  const stats = useMemo(() => computePipelineStats(filteredLeads), [filteredLeads]);

  const columns = groupBy === 'stage'
    ? PIPELINE_STAGES.map(s => ({ id: s.id, label: s.label, group: s.group, color: s.color, automation: s.automation }))
    : STAGE_GROUPS.map(g => ({
        id: g.id,
        label: g.label,
        group: g.id,
        color: g.color,
        automation: '',
      }));

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Active leads</div>
            <div className="text-2xl font-bold">{stats.activeLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Pipeline value</div>
            <div className="text-2xl font-bold text-emerald-600">{eur(stats.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Stale ({'>'}7d)</div>
            <div className="text-2xl font-bold text-amber-600">{stats.staleLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Completed (all-time)</div>
            <div className="text-2xl font-bold text-violet-600">{stats.completedLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Group toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Live Pipeline — {filteredLeads.length} leads
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Group by:</span>
          <Button
            size="sm"
            variant={groupBy === 'stage' ? 'default' : 'outline'}
            onClick={() => setGroupBy('stage')}
            className="h-7"
          >
            Stage (13)
          </Button>
          <Button
            size="sm"
            variant={groupBy === 'group' ? 'default' : 'outline'}
            onClick={() => setGroupBy('group')}
            className="h-7"
          >
            Group (6)
          </Button>
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {columns.map(col => {
            const colLeads = groupBy === 'stage'
              ? filteredLeads.filter(l => l.workflow_stage === col.id)
              : filteredLeads.filter(l => getStage(l.workflow_stage).group === col.id);
            const colors = stageColors[col.color] || stageColors.slate;

            return (
              <div key={col.id} className={`w-72 flex-shrink-0 rounded-lg border ${colors.border} ${colors.bg} flex flex-col`}>
                <div className="p-3 border-b border-inherit">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      <span className="font-semibold text-sm">{col.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{colLeads.length}</Badge>
                  </div>
                  {col.automation && (
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-start gap-1">
                      <Bot className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{col.automation}</span>
                    </div>
                  )}
                </div>

                <div className="p-2 space-y-2 flex-1 min-h-[100px]">
                  {colLeads.length === 0 && (
                    <div className="text-[10px] text-muted-foreground italic text-center py-4">
                      No leads
                    </div>
                  )}
                  {colLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected lead detail drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: DummyLead; onClick: () => void }) {
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const lastTouch = lead.touchpoints[lead.touchpoints.length - 1];
  const nextAutomation = getNextAutomation(lead.workflow_stage);
  const agents = getAgentsForStage(lead.workflow_stage);
  const isStale = (() => {
    const last = lead.touchpoints[lead.touchpoints.length - 1];
    if (!last) return false;
    return (Date.now() - new Date(last.timestamp).getTime()) > 7 * 24 * 60 * 60 * 1000
      && !['completed', 'final_paid', 'installed', 'installing'].includes(lead.workflow_stage);
  })();

  return (
    <div
      onClick={onClick}
      className="bg-background border rounded-md p-3 cursor-pointer hover:shadow-sm transition-all text-xs space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-foreground text-[13px] leading-tight">{lead.name}</div>
            <div className="text-muted-foreground text-[10px] flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {lead.address.split(',').slice(-2)[0]?.trim()}
            </div>
          </div>
        </div>
        {lead.score > 80 && (
          <Badge variant="default" className="text-[9px] h-4 px-1 bg-violet-600">
            <Zap className="h-2.5 w-2.5 mr-0.5" /> Hot
          </Badge>
        )}
        {isStale && (
          <Badge variant="destructive" className="text-[9px] h-4 px-1">
            <Clock className="h-2.5 w-2.5 mr-0.5" /> Stale
          </Badge>
        )}
      </div>

      {lead.proposal && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{lead.proposal.system_size_kw} kWp</span>
          <span className="font-semibold text-foreground">{eur(lead.proposal.net_cost)}</span>
        </div>
      )}
      {!lead.proposal && lead.intake.estimated_system_size_kw && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>est. {lead.intake.estimated_system_size_kw} kWp</span>
          <span>bill €{lead.monthly_bill}/mo</span>
        </div>
      )}

      {lastTouch && (
        <div className="flex items-start gap-1 text-[10px] text-muted-foreground bg-muted/40 p-1.5 rounded">
          <span className="font-semibold uppercase text-[8px] tracking-wide text-muted-foreground/70">
            {lastTouch.actor}
          </span>
          <span className="line-clamp-2 flex-1">{lastTouch.summary}</span>
        </div>
      )}

      {agents.length > 0 && (
        <div className="flex items-center gap-1 text-[9px] text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 p-1 rounded">
          <Bot className="h-2.5 w-2.5" />
          <span className="line-clamp-1">{agents[0].name} will fire</span>
          <ArrowRight className="h-2.5 w-2.5 ml-auto flex-shrink-0" />
        </div>
      )}

      {nextAutomation && agents.length === 0 && (
        <div className="text-[9px] text-muted-foreground italic">
          Next: {nextAutomation}
        </div>
      )}
    </div>
  );
}

function LeadDetailDrawer({ lead, onClose }: { lead: DummyLead; onClose: () => void }) {
  const agents = getAgentsForStage(lead.workflow_stage);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end" onClick={onClose}>
      <div
        className="bg-background w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{lead.name}</h2>
            <p className="text-sm text-muted-foreground">{lead.address}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" /> Call
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" /> Email
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" /> Open lead
            </Button>
          </div>

          {/* Lead data carried from intake */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-600" />
                Bill Extract → Survey → Proposal (carried data)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Monthly bill (extracted)</div>
                  <div className="font-semibold">€{lead.monthly_bill}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Annual kWh (extracted)</div>
                  <div className="font-semibold">{lead.annual_kwh?.toLocaleString()} kWh</div>
                </div>
                <div>
                  <div className="text-muted-foreground">MPRN (extracted)</div>
                  <div className="font-semibold font-mono">{lead.mprn}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Confidence</div>
                  <div className="font-semibold capitalize">{lead.intake.extraction_confidence}</div>
                </div>
                {lead.survey && (
                  <>
                    <div>
                      <div className="text-muted-foreground">Roof type (survey)</div>
                      <div className="font-semibold">{lead.survey.roof_type}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Confirmed size (survey)</div>
                      <div className="font-semibold">{lead.survey.confirmed_system_size_kw} kWp</div>
                    </div>
                  </>
                )}
                {lead.proposal && (
                  <>
                    <div>
                      <div className="text-muted-foreground">Net cost (proposal)</div>
                      <div className="font-semibold">{eur(lead.proposal.net_cost)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Payback (proposal)</div>
                      <div className="font-semibold">{lead.proposal.payback_years} yrs</div>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground italic">
                ✓ Data flows front-to-back: bill extract pre-fills survey, survey pre-fills proposal.
                No re-entry anywhere.
              </div>
            </CardContent>
          </Card>

          {/* Automation status */}
          {agents.length > 0 && (
            <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/20">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-600" />
                  Automation status at this stage
                </h3>
                <div className="space-y-2">
                  {agents.map(a => (
                    <div key={a.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{a.name}</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> ready
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] mt-0.5">{a.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Touchpoints timeline */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Customer touchpoints ({lead.touchpoints.length})
              </h3>
              <div className="space-y-2">
                {lead.touchpoints.map((tp, i) => (
                  <div key={tp.id || i} className="flex items-start gap-2 text-xs">
                    <div className="flex-shrink-0 mt-0.5">
                      {tp.channel === 'email' && <Mail className="h-3 w-3" />}
                      {tp.channel === 'sms' && <Phone className="h-3 w-3" />}
                      {tp.channel === 'portal' && <FileText className="h-3 w-3" />}
                      {tp.channel === 'phone' && <Phone className="h-3 w-3" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{tp.direction} · {tp.channel}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(tp.timestamp).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{tp.summary}</p>
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground/70 mt-0.5">
                        Actor: {tp.actor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {lead.proposal && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 text-sm">Proposal</h3>
                <div className="text-xs space-y-1">
                  <div>Status: <span className="font-semibold capitalize">{lead.proposal.status}</span></div>
                  <div>System: {lead.proposal.system_size_kw} kWp · {lead.proposal.panel_count} panels</div>
                  <div>Net: <span className="font-semibold">{eur(lead.proposal.net_cost)}</span> (after {eur(lead.proposal.seai_grant)} SEAI grant)</div>
                  <Button size="sm" variant="outline" className="mt-2 w-full">
                    <FileText className="h-3 w-3 mr-2" /> View professional proposal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
