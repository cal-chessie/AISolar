/**
 * System Settings V2 — the owner's dials, truth-passed (3 Aug).
 *
 * Tab order = the owner's setup journey: Brand → Pricing & Terms → Integrations
 * → Sequences → Audit → Kernel. (Channels merged INTO Integrations 3 Aug — each
 * vendor card now carries who-speaks-on-it; one surface, no duplicate list.) What's REAL vs reference:
 *   - HOOKED (save localStorage + tenant_settings, DB-backed since the cutover):
 *     Brand · Company & Compliance · Pricing dial · Proposal terms.
 *   - REFERENCE (deliberately not inputs): integration KEYS live in deploy
 *     secrets, never the browser — cards show the exact `supabase secrets set`
 *     command to copy. No connect/test theatre; no fabricated audit events.
 *     The audit tab reads empty until it's wired to real activity_logs.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getProposalTerms, saveProposalTerms, type ProposalTerms } from '@/lib/proposalTerms';
import { getPricingConfig, savePricingConfig, DEFAULT_PRICING, type PricingConfig } from '@/lib/pricing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings, Mail, MessageSquare, Bot, Database, Shield, CheckCircle2,
  AlertCircle, AlertTriangle, Save, Zap, Cloud, Phone, Lock, Key,
  Activity, Cpu, Server, Globe, Bell, Palette, FileText, Users,
  TrendingUp, DollarSign, Clock, RefreshCw, Power, ExternalLink, ArrowRight, XCircle,
  HardHat, Plus, Trash2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { brand } from '@/config/brand';
import { useCompanyCompliance, saveCompanyCompliance, complianceGaps, type CompanyCompliance } from '@/lib/companyCompliance';
import { useInstallers, saveInstallers, type Installer } from '@/lib/installerRoster';
import { getKnowledge, saveKnowledge, teachAnswer, unansweredQuestions, type BrainKnowledge, type AskEntry } from '@/lib/brainKnowledge';
import { saveTenantBrand, getTenantBrand } from '@/lib/tenantBrand';

type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Cloud;
  status: IntegrationStatus;
  configFields?: Array<{ key: string; label: string; type: string; placeholder: string; value?: string }>;
  testEndpoint?: string;
  docsUrl?: string;
  /** Who speaks on this channel (merged from the old Channels tab — one surface). */
  agents?: string[];
  entry?: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 'stripe', name: 'Stripe', description: 'Card payments — deposits + final invoices',
    icon: Cloud, status: 'connected',
    configFields: [
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
    ],
    docsUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    id: 'coinbase', name: 'Coinbase Commerce', description: 'Crypto payments (BTC, ETH, USDC)',
    icon: Cloud, status: 'connected',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '...' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: '...' },
    ],
  },
  {
    id: 'postmark', name: 'Postmark', description: 'Transactional email delivery',
    icon: Mail, status: 'connected',
    agents: ['The greeter', 'The chaser', 'The correspondent', 'The closer', 'The bookkeeper'],
    entry: 'Owner: campaigns + digests · Consultant: proposals + follow-ups',
    configFields: [
      { key: 'server_token', label: 'Server Token', type: 'password', placeholder: '...' },
      { key: 'sender_email', label: 'Sender Email', type: 'email', placeholder: 'hello@aisolar.ie' },
    ],
    docsUrl: 'https://account.postmarkapp.com',
  },
  {
    id: 'twilio', name: 'Twilio (SMS)', description: 'SMS reminders — install T-7, T-1',
    icon: Phone, status: 'disconnected',
    agents: ['The scheduler (T-7 / T-1 reminders)'],
    entry: 'Install reminders only — opt-in, no marketing',
    configFields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '...' },
      { key: 'from_number', label: 'From Number', type: 'tel', placeholder: '+353...' },
    ],
    docsUrl: 'https://console.twilio.com',
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business', description: 'Customer chat, document delivery, reminders',
    icon: MessageSquare, status: 'disconnected',
    agents: ['The correspondent (phase 2 nudges)'],
    entry: 'Notification nudge → portal thread. Never a second inbox.',
    configFields: [
      { key: 'phone_number', label: 'Phone Number', type: 'tel', placeholder: '+353...' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'EAAG...' },
      { key: 'business_id', label: 'Business ID', type: 'text', placeholder: '123456...' },
    ],
    docsUrl: 'https://business.facebook.com/whatsapp',
  },
  {
    id: 'openrouter', name: 'OpenRouter (AI)', description: 'LLM access for all 10 agents',
    icon: Bot, status: 'disconnected',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-or-v1-...' },
    ],
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'google_maps', name: 'Google Maps Platform', description: 'Satellite imagery, Eircode geocoding, installer routing',
    icon: Globe, status: 'connected',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIza...' },
    ],
    docsUrl: 'https://console.cloud.google.com/google/maps-apis',
  },
  {
    id: 'met_eireann', name: 'Met Éireann', description: 'Weather warnings — auto-reschedule installs',
    icon: Cloud, status: 'disconnected',
    configFields: [],
    docsUrl: 'https://data.gov.ie/dataset/met-eireann-weather-api',
  },
];

type AuditEvent = { time: string; actor: string; action: string; severity: string; meta: Record<string, unknown> };
// TRUTH-PASS (3 Aug): the synthetic demo feed is DEAD — fabricated events with
// fake actors were in-app fiction. Empty until this reads real activity_logs.
const AUDIT_EVENTS: AuditEvent[] = [];

export default function SystemSettingsV2() {
  const [integrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [tab, setTab] = useState('brand'); // owner's own things FIRST (Cal: 'settings is a mess')
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState({ severity: 'all', actor: 'all', search: '' });

  const filteredAudit = AUDIT_EVENTS.filter(e => {
    if (auditFilter.severity !== 'all' && e.severity !== auditFilter.severity) return false;
    if (auditFilter.actor !== 'all' && !e.actor.includes(auditFilter.actor)) return false;
    if (auditFilter.search && !e.action.toLowerCase().includes(auditFilter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">The bedrock: integrations, branding, audit, kernel.</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="brand" className="text-xs sm:text-sm">Brand</TabsTrigger>
          <TabsTrigger value="terms" className="text-xs sm:text-sm">Pricing &amp; Terms</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">Integrations</TabsTrigger>
          <TabsTrigger value="channels" className="text-xs sm:text-sm">Sequences</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">Audit Log</TabsTrigger>
          <TabsTrigger value="kernel" className="text-xs sm:text-sm">Kernel</TabsTrigger>
        </TabsList>

        {/* === INTEGRATIONS === */}
        <TabsContent value="integrations" className="space-y-3">
          <p className="text-xs text-muted-foreground">Where each service lives + who speaks on it. Keys are set at DEPLOY (never in the browser) — a card opens for the exact command. Portal chat is built-in — always on, no vendor.</p>
          <div className="grid gap-3 lg:grid-cols-2 items-start">
          {integrations.map(integration => {
            const Icon = integration.icon;
            const isSelected = selectedIntegration === integration.id;
            return (
              <Card key={integration.id} className={isSelected ? 'border-primary/40' : ''}>
                <CardContent className="p-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelectedIntegration(isSelected ? null : integration.id)}
                  >
                    <div className={`p-2 rounded-lg ${
                      integration.status === 'connected' ? 'bg-doc-deposit/10' :
                      integration.status === 'error' ? 'bg-pop/10' :
                      integration.status === 'connecting' ? 'bg-tech-subtle' :
                      'bg-muted'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        integration.status === 'connected' ? 'text-doc-deposit' :
                        integration.status === 'error' ? 'text-pop' :
                        integration.status === 'connecting' ? 'text-tech animate-pulse' :
                        'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{integration.name}</div>
                      <div className="text-xs text-muted-foreground">{integration.description}</div>
                    </div>
                    <Badge variant="outline" className={`text-[11px] ${
                      integration.status === 'connected' ? 'bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30' :
                      integration.status === 'error' ? 'bg-pop/10 text-pop border-pop/30' :
                      integration.status === 'connecting' ? 'bg-tech-subtle text-tech border-tech/30' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {integration.status === 'connecting' && <RefreshCw className="h-2.5 w-2.5 mr-0.5 animate-spin" />}
                      {integration.status === 'connected' ? 'managed at deploy' : integration.status === 'disconnected' ? 'not configured' : integration.status}
                    </Badge>
                  </div>

                  {integration.agents && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Agents:</span> {integration.agents.join(' · ')}
                      {integration.entry && <span className="block mt-0.5">{integration.entry}</span>}
                    </div>
                  )}

                  {/* Expanded config */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {integration.configFields && integration.configFields.length > 0 ? (
                        <>
                          <p className="text-2xs text-muted-foreground">Keys are NEVER stored in the browser — each is set once at deploy. Copy the command, paste your real value (canonical names: <code className="font-mono">docs/SECRETS.md</code>).</p>
                          {integration.configFields.map(field => {
                            const cmd = `supabase secrets set ${integration.id.toUpperCase()}_${field.key.toUpperCase()}=YOUR-VALUE`;
                            return (
                              <div key={field.key} className="flex items-end gap-2">
                                <div className="flex-1 min-w-0">
                                  <Label className="text-xs">{field.label}</Label>
                                  <code className="mt-1 block truncate rounded-control bg-muted/60 px-2 py-1.5 text-2xs font-mono text-muted-foreground">{cmd}</code>
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                                  onClick={() => { navigator.clipboard.writeText(cmd); toast.success('Command copied', { description: 'Paste in Terminal with your real value.' }); }}>
                                  Copy
                                </Button>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No configuration needed — uses API key from Vault.</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {integration.docsUrl && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                            <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> Docs
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        </TabsContent>

        {/* === BRAND — touches all branding touchpoints === */}
        <TabsContent value="brand" className="space-y-3">
          <BrandConfigFull />
        </TabsContent>

        {/* === CHANNELS === */}
        {/* === SEQUENCES (was Channels — the vendor list merged into Integrations, 3 Aug) === */}
        <TabsContent value="channels" className="space-y-3">
          <MarketingSequencesEditor />
        </TabsContent>

        {/* === AUDIT LOG — detailed + filterable === */}
        <TabsContent value="terms" className="grid gap-4 lg:grid-cols-2 items-start">
          {/* Cal (3 Aug): terms first, equipment pricing BELOW it. */}
          <div className="space-y-4">
            <ProposalTermsCard />
            <PricingCard />
          </div>
          <EstimateBasisCard />
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          <Card>
            <CardContent className="p-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Input
                  placeholder="Search actions…"
                  value={auditFilter.search}
                  onChange={e => setAuditFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="h-8 text-xs max-w-xs"
                />
                <select
                  value={auditFilter.severity}
                  onChange={e => setAuditFilter(prev => ({ ...prev, severity: e.target.value }))}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="all">All severity</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
                <select
                  value={auditFilter.actor}
                  onChange={e => setAuditFilter(prev => ({ ...prev, actor: e.target.value }))}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="all">All actors</option>
                  <option value="system">System/Agent</option>
                  <option value="@">Staff</option>
                  <option value="customer">Customer</option>
                </select>
                <Badge variant="outline" className="text-[11px] h-7 px-2 flex items-center">
                  {filteredAudit.length} events
                </Badge>
              </div>

              {/* Event list */}
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredAudit.length === 0 && (
                  <div className="rounded-panel border border-border bg-muted/20 p-6 text-center">
                    <p className="text-sm font-medium">The audit trail starts recording at deployment</p>
                    <p className="mt-1 text-xs text-muted-foreground">Every real action — agent runs, role changes, sends — lands here from <code className="font-mono">activity_logs</code>. Nothing synthetic is ever shown.</p>
                  </div>
                )}
                {filteredAudit.map((event, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 border rounded text-xs transition-colors hover:bg-muted/30">
                    <Badge variant="outline" className={`text-[11px] flex-shrink-0 ${
                      event.severity === 'error' ? 'bg-pop-subtle text-pop border-pop/30' :
                      event.severity === 'warn' ? 'bg-doc-proposal-subtle text-doc-proposal border-doc-proposal/30' :
                      'bg-tech-subtle text-tech border-tech/30'
                    }`}>
                      {event.severity}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0 w-32">{event.time}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground">{event.action}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Actor: {event.actor}
                        {event.meta && Object.entries(event.meta).slice(0, 4).map(([k, v]) => ` · ${k}: ${String(v)}`).join('')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-center text-xs">
                <div><div className="font-bold text-tech">{filteredAudit.filter(e => e.severity === 'info').length}</div><div className="text-[11px] text-muted-foreground">info</div></div>
                <div><div className="font-bold text-doc-proposal">{filteredAudit.filter(e => e.severity === 'warn').length}</div><div className="text-[11px] text-muted-foreground">warnings</div></div>
                <div><div className="font-bold text-pop">{filteredAudit.filter(e => e.severity === 'error').length}</div><div className="text-[11px] text-muted-foreground">errors</div></div>
                <div><div className="font-bold text-doc-deposit">{filteredAudit.filter(e => e.actor === 'system').length}</div><div className="text-[11px] text-muted-foreground">agent actions</div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === KERNEL === */}
        <TabsContent value="kernel" className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><span className="p-1.5 rounded-lg bg-tech-subtle"><Server className="h-4 w-4 text-tech" /></span> Supabase Configuration</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Project URL:</span> <code className="font-mono">https://coxmtpnqjybwlrfwkols.supabase.co</code></div>
                <div><span className="text-muted-foreground">Region:</span> Frankfurt (eu-west-1)</div>
                <div><span className="text-muted-foreground">Postgres:</span> 15.6</div>
                <div><span className="text-muted-foreground">RLS:</span> <Badge variant="outline" className="text-[11px] bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30">Enabled</Badge></div>
                <div><span className="text-muted-foreground">Migrations:</span> 28 applied</div>
                <div><span className="text-muted-foreground">pg_cron jobs:</span> 7 scheduled</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><span className="p-1.5 rounded-lg bg-pop-subtle"><Lock className="h-4 w-4 text-pop" /></span> Vault Secrets</h3>
              <p className="text-xs text-muted-foreground -mt-1 mb-3">Names only, never values. Rotation is the habit that kept GATE 0 closed.</p>
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground border-b"><th className="text-left py-2">Secret</th><th className="text-left">Last rotated</th><th className="text-right">Status</th></tr></thead>
                <tbody>
                  {['supabase_service_role', 'stripe_secret_key', 'stripe_webhook_secret', 'coinbase_api_key', 'postmark_server_token', 'ai_api_key', 'openrouter_api_key'].map(s => (
                    <tr key={s} className="border-b last:border-0">
                      <td className="py-2 font-mono">{s}</td>
                      <td>2026-07-17</td>
                      <td className="text-right"><Badge variant="outline" className="text-[11px] bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> OK</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= BRAND CONFIG — touches everything =============
function BrandConfigFull() {
  const stored = getTenantBrand();
  const [brandData, setBrandData] = useState<{
    name: string; tagline: string; domain: string;
    primaryColor: string; accentColor: string;
    logo: string | null;
    emailFromName: string; emailFromAddress: string; emailFooter: string;
    proposalHeaderColor: string; proposalShowLogo: boolean; proposalCompanyName: string;
    portalTitle: string; portalColor: string;
    landingHeadline: string; landingSubheadline: string;
    smsSender: string; whatsappDisplayName: string;
  }>({
    name: brand.name,
    tagline: brand.tagline,
    domain: brand.domain,
    primaryColor: '#10b981',
    accentColor: '#3b82f6',
    logo: null as string | null,
    emailFromName: brand.name,
    emailFromAddress: brand.contact.email,
    emailFooter: `${brand.name} · ${brand.contact.address} · ${brand.contact.phoneDisplay}`,
    proposalHeaderColor: '#10b981',
    proposalShowLogo: true,
    proposalCompanyName: brand.name,
    portalTitle: `${brand.name} · My Solar Project`,
    portalColor: '#10b981',
    landingHeadline: 'Run your solar business on autopilot',
    landingSubheadline: 'Bill extract at the front door. Autonomous agents handle the rest.',
    smsSender: brand.name.slice(0, 11),
    whatsappDisplayName: brand.name,
  });

  const touchpoints = [
    { label: 'Email templates', desc: 'From name, from address, footer, colors', icon: Mail },
    { label: 'Proposal PDF', desc: 'Header color, logo, company name, branding', icon: FileText },
    { label: 'Customer portal', desc: 'Title, accent color, logo', icon: Globe },
    { label: 'Landing page', desc: 'Headline, subheadline, colors', icon: Palette },
    { label: 'SMS messages', desc: 'Sender ID (max 11 chars)', icon: Phone },
    { label: 'WhatsApp', desc: 'Display name, profile photo', icon: MessageSquare },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Brand Configuration</h3>
        <p className="text-xs text-muted-foreground">These settings touch every customer-facing touchpoint.</p>

        {/* Touchpoint preview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {touchpoints.map(tp => {
            const Icon = tp.icon;
            return (
              <div key={tp.label} className="p-2 border rounded-lg flex items-center gap-2">
                <div className="p-1.5 rounded bg-primary/10 dark:bg-primary/10">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium">{tp.label}</div>
                  <div className="text-[11px] text-muted-foreground">{tp.desc}</div>
                </div>
                <CheckCircle2 className="h-3 w-3 text-primary ml-auto" />
              </div>
            );
          })}
        </div>

        {/* ── COMPANY & COMPLIANCE ────────────────────────────────────────────
            The registration numbers every statutory form needs. These used to
            live in brand.legal as empty strings with no way to fill them, which
            meant the RECI number silently blocked EVERY NC6. Set once here and
            every form, on every job, fills itself. */}
        <CompanyComplianceCard />

        {/* ── INSTALLERS ──────────────────────────────────────────────────────
            Per-installer facts that aren't company-wide — today just the Safe
            Electric Cert Number the NC7-01 wants for whoever signed the job. */}
        <InstallerRosterCard />

        {/* ── TEACH YOUR AI ───────────────────────────────────────────────────
            The owner's business-intelligence feed (story/edge/offer, woven
            softly into customer answers) + the SELF-LEARNING loop: questions
            the AI couldn't answer queue here; answer once, it knows forever. */}
        <TeachYourAiCard />

        {/* Basic brand */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Brand name</Label><Input value={brandData.name} onChange={e => setBrandData({...brandData, name: e.target.value})} className="mt-1 h-8 text-sm" /></div>
          <div><Label className="text-xs">Tagline</Label><Input value={brandData.tagline} onChange={e => setBrandData({...brandData, tagline: e.target.value})} className="mt-1 h-8 text-sm" /></div>
          <div><Label className="text-xs">Domain</Label><Input value={brandData.domain} onChange={e => setBrandData({...brandData, domain: e.target.value})} className="mt-1 h-8 text-sm" /></div>
          <div><Label className="text-xs">SMS sender ID (max 11)</Label><Input value={brandData.smsSender} onChange={e => setBrandData({...brandData, smsSender: e.target.value.slice(0, 11)})} className="mt-1 h-8 text-sm" /></div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Primary color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={brandData.primaryColor} onChange={e => setBrandData({...brandData, primaryColor: e.target.value})} className="h-8 w-12 rounded border" />
              <Input value={brandData.primaryColor} onChange={e => setBrandData({...brandData, primaryColor: e.target.value})} className="font-mono text-xs h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Accent color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={brandData.accentColor} onChange={e => setBrandData({...brandData, accentColor: e.target.value})} className="h-8 w-12 rounded border" />
              <Input value={brandData.accentColor} onChange={e => setBrandData({...brandData, accentColor: e.target.value})} className="font-mono text-xs h-8" />
            </div>
          </div>
        </div>

        {/* Logo upload */}
        <div>
          <Label className="text-xs">Logo (SVG/PNG, max 200KB)</Label>
          <div className="mt-1 p-4 border-2 border-dashed rounded-lg text-center text-xs text-muted-foreground cursor-pointer hover:border-primary/40">
            Drop logo here or click to upload
          </div>
        </div>

        {/* Email branding */}
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Mail className="h-3 w-3" /> Email branding</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">From name</Label><Input value={brandData.emailFromName} onChange={e => setBrandData({...brandData, emailFromName: e.target.value})} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs">From address</Label><Input type="email" value={brandData.emailFromAddress} onChange={e => setBrandData({...brandData, emailFromAddress: e.target.value})} className="mt-1 h-8 text-sm" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Email footer</Label><Input value={brandData.emailFooter} onChange={e => setBrandData({...brandData, emailFooter: e.target.value})} className="mt-1 h-8 text-sm" /></div>
          </div>
        </div>

        {/* Proposal branding */}
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Proposal branding</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Header color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={brandData.proposalHeaderColor} onChange={e => setBrandData({...brandData, proposalHeaderColor: e.target.value})} className="h-8 w-12 rounded border" />
                <Input value={brandData.proposalHeaderColor} onChange={e => setBrandData({...brandData, proposalHeaderColor: e.target.value})} className="font-mono text-xs h-8" />
              </div>
            </div>
            <div><Label className="text-xs">Company name on proposal</Label><Input value={brandData.proposalCompanyName} onChange={e => setBrandData({...brandData, proposalCompanyName: e.target.value})} className="mt-1 h-8 text-sm" /></div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Switch checked={brandData.proposalShowLogo} onCheckedChange={v => setBrandData({...brandData, proposalShowLogo: v})} />
              <Label className="text-xs">Show logo on proposal header</Label>
            </div>
          </div>
        </div>

        {/* Portal branding */}
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Globe className="h-3 w-3" /> Customer portal branding</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Portal title</Label><Input value={brandData.portalTitle} onChange={e => setBrandData({...brandData, portalTitle: e.target.value})} className="mt-1 h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Portal accent color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={brandData.portalColor} onChange={e => setBrandData({...brandData, portalColor: e.target.value})} className="h-8 w-12 rounded border" />
                <Input value={brandData.portalColor} onChange={e => setBrandData({...brandData, portalColor: e.target.value})} className="font-mono text-xs h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Landing page branding */}
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Palette className="h-3 w-3" /> Landing page branding</h4>
          <div className="space-y-2">
            <div><Label className="text-xs">Headline</Label><Input value={brandData.landingHeadline} onChange={e => setBrandData({...brandData, landingHeadline: e.target.value})} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs">Subheadline</Label><Textarea value={brandData.landingSubheadline} onChange={e => setBrandData({...brandData, landingSubheadline: e.target.value})} rows={2} className="mt-1 text-sm" /></div>
          </div>
        </div>

        <Button className="w-full bg-primary transition-colors hover:bg-primary"
          onClick={() => {
            saveTenantBrand({
              name: brandData.name,
              tagline: brandData.tagline,
              logoDataUrl: brandData.logo,
              proposalCompanyName: brandData.proposalCompanyName,
              portalTitle: brandData.portalTitle,
            });
            toast.success('Branding saved', { description: 'Applied across the app for this tenant.' });
          }}>
          <Save className="h-4 w-4 mr-2" /> Save all branding
        </Button>
      </CardContent>
    </Card>
  );
}

// ============= CHANNEL CONFIGS =============
/* ── CHANNELS = the agent window (Cal). One source of truth: connection state
   is PULLED from Integrations — no duplicate config here. Each channel shows
   which agents speak on it and where the owner/consultant entry points are. */
/* ── Marketing sequences — EDITABLE, all touchpoints in view (Cal). Expand a
   sequence to see every step; edit day + subject inline; add steps; pause. */
interface SeqStep { day: number; subject: string }
interface Sequence { name: string; trigger: string; active: boolean; steps: SeqStep[] }

const INITIAL_SEQUENCES: Sequence[] = [
  { name: 'Welcome sequence', trigger: 'New lead', active: true, steps: [
    { day: 0, subject: 'Your solar estimate is ready — see your numbers' },
    { day: 2, subject: 'What your bill told us (21 details, explained)' },
    { day: 5, subject: 'Book your free survey — slots this week' },
  ]},
  { name: 'Proposal follow-up', trigger: 'Proposal sent', active: true, steps: [
    { day: 2, subject: 'Any questions on your proposal?' },
    { day: 5, subject: 'Your SEAI grant — what happens next' },
    { day: 9, subject: 'Your day/night split — why your battery case is honest' },
    { day: 14, subject: 'Proposal expiring soon — want to talk it through?' },
  ]},
  { name: 'Contract reminder', trigger: 'Proposal + 7d no sign', active: true, steps: [
    { day: 7, subject: 'Ready when you are — your install slot is held' },
    { day: 12, subject: 'Last call on this quarter\'s install schedule' },
  ]},
  { name: 'Post-install NPS', trigger: 'Install + 7d', active: true, steps: [
    { day: 7, subject: 'How did we do? 60 seconds, honestly' },
  ]},
  { name: 'Referral request', trigger: 'Completed + 30d', active: true, steps: [
    { day: 30, subject: 'Know a neighbour thinking about solar?' },
  ]},
];

function MarketingSequencesEditor() {
  const [seqs, setSeqs] = useState<Sequence[]>(INITIAL_SEQUENCES);
  const [open, setOpen] = useState<string | null>(null);

  const update = (name: string, fn: (s: Sequence) => Sequence) =>
    setSeqs(prev => prev.map(s => s.name === name ? fn(s) : s));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Marketing sequences</CardTitle>
        <p className="text-xs text-muted-foreground">Every touchpoint in view. Edit the day or the subject in place — the chaser sends what you write here.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {seqs.map(seq => (
          <div key={seq.name} className="border rounded-lg">
            <button type="button" className="w-full flex items-center justify-between p-2.5 text-left cursor-pointer"
              onClick={() => setOpen(o => o === seq.name ? null : seq.name)}>
              <div className="text-xs"><span className="font-medium text-sm">{seq.name}</span><span className="text-muted-foreground ml-2">{seq.trigger} · {seq.steps.length} touchpoints</span></div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[11px] ${seq.active ? 'bg-doc-deposit/10 text-doc-deposit border-doc-deposit/30' : 'text-muted-foreground'}`}>{seq.active ? 'active' : 'paused'}</Badge>
                <ArrowRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open === seq.name ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {open === seq.name && (
              <div className="border-t px-2.5 py-2 space-y-1.5">
                {seq.steps.map((st, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground shrink-0">Day</span>
                    <Input type="number" value={st.day} className="h-7 w-14 text-xs tabular-nums"
                      onChange={e => update(seq.name, s => ({ ...s, steps: s.steps.map((x, j) => j === i ? { ...x, day: parseInt(e.target.value) || 0 } : x) }))} />
                    <Input value={st.subject} className="h-7 flex-1 text-xs"
                      onChange={e => update(seq.name, s => ({ ...s, steps: s.steps.map((x, j) => j === i ? { ...x, subject: e.target.value } : x) }))} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Remove step"
                      onClick={() => update(seq.name, s => ({ ...s, steps: s.steps.filter((_, j) => j !== i) }))}>
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => update(seq.name, s => ({ ...s, steps: [...s.steps, { day: (s.steps.at(-1)?.day ?? 0) + 3, subject: 'New touchpoint' }] }))}>
                    + Add touchpoint
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => update(seq.name, s => ({ ...s, active: !s.active }))}>
                    {seq.active ? 'Pause' : 'Activate'}
                  </Button>
                  <span className="ml-auto text-[11px] text-muted-foreground">Saved locally — syncs at launch</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


/* Cal (3 Aug): "put the estimate overview below the equipment pricing… with
   the 21 data points collected and named so user can see what the proposal is
   then based on." This is the receipt: every field the bill reader captures,
   in plain English, flagged where it MOVES the money. Read-only by design —
   these are read off the customer's bill, not typed by the owner. */
const BILL_POINTS: Array<{ group: string; items: Array<[string, string, boolean]> }> = [
  { group: 'Who + where', items: [
    ['Account name', 'the bill holder', false],
    ['Address', 'site address off the bill', false],
    ['Eircode', 'pins the roof for the design', true],
    ['MPRN', 'the meter — required on the ESB NC6', true],
  ]},
  { group: 'What they use', items: [
    ['Monthly bill (€)', 'the headline they recognise', true],
    ['Annual usage (kWh)', 'sizes the system', true],
    ['Billing period', 'bi-monthly, monthly…', false],
    ['Usage this period (kWh)', 'the read behind the annual figure', false],
    ['Day usage (kWh)', 'the day half of the split', true],
    ['Night usage (kWh)', 'the night half — argues the battery', true],
  ]},
  { group: 'What they pay', items: [
    ['Supplier', 'sets the export (CEG) rate we credit', true],
    ['Tariff name', 'the plan they are on', false],
    ['Day unit rate (€/kWh)', 'what every self-used unit saves', true],
    ['Night unit rate (€/kWh)', 'battery charging maths', true],
    ['Standing charge', 'daily fee — never counted as a saving', false],
    ['Standing charge unit', 'per day / per period', false],
    ['VAT rate on the bill', '9% domestic · 13.5% business', false],
    ['Day/night meter', 'unlocks night-rate arbitrage', true],
  ]},
  { group: 'How sure we are', items: [
    ['Estimated reading', 'flags an E-marked bill', false],
    ['Notes', 'anything odd the reader saw', false],
    ['Read confidence', 'high · medium · low', false],
  ]},
];

function EstimateBasisCard() {
  const driving = BILL_POINTS.flatMap(g => g.items).filter(([, , d]) => d).length;
  return (
    <div className="rounded-panel bg-card shadow-card p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-doc-proposal/10"><FileText className="h-4 w-4 text-doc-proposal" /></span>
        What an estimate is built from
      </h3>
      <p className="text-xs text-muted-foreground mb-4 leading-body">
        Every proposal starts with the customer's own bill — <strong className="text-foreground">21 points</strong> read
        automatically, <strong className="text-foreground">{driving}</strong> of which move the money. Your rates above
        supply the cost; these supply the savings. Nothing here is typed by you or invented by us.
      </p>
      <div className="space-y-3">
        {BILL_POINTS.map(g => (
          <div key={g.group}>
            <div className="label-micro mb-1.5">{g.group}</div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {g.items.map(([name, why, drives]) => (
                <div key={name} className="flex items-baseline gap-1.5 text-xs py-0.5">
                  <span className={`size-1.5 rounded-full shrink-0 translate-y-1 ${drives ? 'bg-doc-deposit' : 'bg-muted-foreground/30'}`} />
                  <span className="font-medium shrink-0">{name}</span>
                  <span className="text-muted-foreground truncate">— {why}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* The chain, made explicit: what goes IN, what computes, what lands on
          the customer's proposal. This is the card's whole job — an owner
          should never wonder where a number came from. */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="label-micro mb-2">How it becomes a proposal</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-2xs font-bold">1</span>
            <span><strong>The bill</strong> gives usage, rates, the day/night split and the supplier's export rate.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-2xs font-bold">2</span>
            <span><strong>The survey</strong> confirms roof orientation, pitch, shading and who's home during the day — that's what turns a guess into a number.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-2xs font-bold">3</span>
            <span><strong>Your rates above</strong> supply the cost; the SEAI grant and VAT are applied by property type — domestic tiers vs the commercial NDMG at 13%.</span>
          </div>
        </div>
        <div className="mt-3 rounded-control bg-muted/40 p-3">
          <div className="label-micro mb-1.5">What the customer then sees</div>
          <p className="text-xs text-muted-foreground leading-body">
            System size · gross cost · <strong className="text-foreground">grant</strong> · net cost ·
            annual saving (self-use + export + any battery arbitrage) · payback — plus the honest second
            line: payback on self-use alone, with no export income counted.
          </p>
        </div>
        <p className="text-2xs text-muted-foreground mt-3">
          <span className="inline-block size-1.5 rounded-full bg-doc-deposit align-middle mr-1" />
          drives the numbers · one engine computes every screen, so the estimate, the proposal and the
          stored contract figure can never disagree · a missing point never blocks an estimate — it widens the caveat.
        </p>
      </div>
    </div>
  );
}

/* Cal: "terms of service? that means there needs to be that setup in owners
   settings" — the owner's terms, rendered verbatim on every proposal. */
function ProposalTermsCard() {
  const [t, setT] = useState<ProposalTerms>(() => getProposalTerms());
  const num = (k: keyof ProposalTerms) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT(s => ({ ...s, [k]: Number(e.target.value) }));
  return (
    <div className="rounded-panel bg-card shadow-card p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><span className="p-1.5 rounded-lg bg-doc-proposal/10"><FileText className="h-4 w-4 text-doc-proposal" /></span> Proposal terms</h3>
      <p className="text-xs text-muted-foreground mb-4">These render on every proposal and its PDF — your words, your terms.</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div>
          <Label className="text-xs">Price holds for (days)</Label>
          <Input type="number" min={1} value={t.validityDays} onChange={num('validityDays')} className="mt-1.5 h-9" />
        </div>
        <div>
          <Label className="text-xs">Cooling-off (days)</Label>
          <Input type="number" min={14} value={t.coolingOffDays} onChange={num('coolingOffDays')} className="mt-1.5 h-9" />
          <p className="text-2xs text-muted-foreground mt-1">14 is the statutory EU minimum — can't go lower.</p>
        </div>
        <div>
          <Label className="text-xs">Workmanship warranty (years)</Label>
          <Input type="number" min={1} value={t.workmanshipYears} onChange={num('workmanshipYears')} className="mt-1.5 h-9" />
        </div>
      </div>
      <div className="mb-3">
        <Label className="text-xs">Your terms (rendered word-for-word on the proposal)</Label>
        <Textarea value={t.customTerms} onChange={e => setT(s => ({ ...s, customTerms: e.target.value }))}
          placeholder="e.g. Deposit refundable until materials are ordered. Installation date confirmed after deposit…"
          rows={4} className="mt-1.5 text-sm" />
      </div>
      <div className="mb-3">
        <Label className="text-xs">BER assessor email</Label>
        <Input value={t.berAssessorEmail} onChange={e => setT(s => ({ ...s, berAssessorEmail: e.target.value }))}
          placeholder="assessments@berteam.ie" className="mt-1.5 h-9 text-xs" />
        <p className="text-2xs text-muted-foreground mt-1">Every completed Declaration of Works is emailed here automatically — it's the trigger for the post-works BER.</p>
      </div>
      <div className="mb-4">
        <Label className="text-xs">Link to full terms (optional)</Label>
        <Input value={t.termsUrl} onChange={e => setT(s => ({ ...s, termsUrl: e.target.value }))}
          placeholder="https://yourcompany.ie/terms" className="mt-1.5 h-9 text-xs" />
      </div>
      <Button size="sm" className="h-9 font-semibold bg-tech text-white hover:bg-tech/90" onClick={() => { saveProposalTerms(t); toast.success('Proposal terms saved', { description: 'Every new proposal renders these.' }); }}>
        Save terms
      </Button>
    </div>
  );
}

/* Cal (1 Aug): "the equipment pricing can be set by the user… make sure that's
   possible for the admin." The ONE cost dial. estimate · design · proposal · AND
   the drafting agent all resolve cost through getPricingConfig() (the edge mirror
   reads the same tenant_settings 'pricing'), so a change here moves every quote —
   shown AND stored. Kills the old three-screens-disagree drift for good. */
function PricingCard() {
  const [p, setP] = useState<PricingConfig>(() => getPricingConfig());
  const [dirty, setDirty] = useState(false);
  const num = (k: keyof PricingConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setP(s => ({ ...s, [k]: Number(e.target.value) })); setDirty(true);
  };
  const invalid = !(p.perKwp > 0) || !(p.batteryPerKwh >= 0) || !(p.panelWatts > 0);
  const FIELDS: Array<{ k: keyof PricingConfig; label: string; unit: string; hint: string; min: number; step: number }> = [
    { k: 'perKwp', label: 'System price', unit: '€ / kWp installed', hint: `hardware + standard install, all-in — default €${DEFAULT_PRICING.perKwp}`, min: 1, step: 10 },
    { k: 'batteryPerKwh', label: 'Battery storage', unit: '€ / kWh', hint: `added per usable kWh of storage — default €${DEFAULT_PRICING.batteryPerKwh}`, min: 0, step: 10 },
    { k: 'panelWatts', label: 'Panel wattage', unit: 'W', hint: `converts panel count ↔ kWp — default ${DEFAULT_PRICING.panelWatts}W`, min: 1, step: 5 },
  ];
  return (
    <div className="rounded-panel bg-card shadow-card p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><span className="p-1.5 rounded-lg bg-tech/10"><Zap className="h-4 w-4 text-tech" /></span> Equipment pricing</h3>
      <p className="text-xs text-muted-foreground mb-4">The one cost dial. Every estimate, the design step, the proposal, <strong>and</strong> the drafting agent resolve cost through these — change a rate once and every quote moves together, on screen and in the stored proposal.</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {FIELDS.map(f => (
          <div key={f.k}>
            <Label className="text-xs">{f.label} <span className="font-normal text-muted-foreground">({f.unit})</span></Label>
            <Input type="number" min={f.min} step={f.step} value={p[f.k]} onChange={num(f.k)} className="mt-1.5 h-9" />
            <p className="text-2xs text-muted-foreground mt-1">{f.hint}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-9 font-semibold bg-tech text-white hover:bg-tech/90" disabled={!dirty || invalid}
          onClick={() => { savePricingConfig(p); setDirty(false); toast.success('Pricing saved', { description: 'Every new estimate and proposal uses these rates now.' }); }}>
          Save pricing
        </Button>
        {invalid && <span className="text-2xs text-doc-proposal">Enter prices greater than zero.</span>}
        {dirty && !invalid && <span className="text-2xs text-muted-foreground">unsaved changes</span>}
      </div>
    </div>
  );
}

/**
 * CompanyComplianceCard — the registration numbers every statutory form needs.
 *
 * Deliberately shows what each field UNBLOCKS, because otherwise these read as
 * bureaucratic box-filling. A missing RECI number isn't an empty field, it's
 * every ESB notification on the system stuck.
 */
function CompanyComplianceCard() {
  const saved = useCompanyCompliance();
  const [form, setForm] = useState<CompanyCompliance>(saved);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setForm(saved); setDirty(false); }, [saved]);

  const set = (k: keyof CompanyCompliance) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value })); setDirty(true);
  };

  const gaps = complianceGaps();

  const FIELDS: Array<{ k: keyof CompanyCompliance; label: string; unblocks: string; placeholder: string }> = [
    { k: 'reciNumber', label: 'Safe Electric / RECI number', unblocks: 'every ESB NC6/NC7 + the RECI cert', placeholder: 'e.g. 12345' },
    { k: 'seaiInstallerId', label: 'SEAI registered installer ID', unblocks: 'the SEAI grant application', placeholder: 'e.g. SEAI-00000' },
    { k: 'croNumber', label: 'CRO company number', unblocks: 'Declaration of Works, invoices', placeholder: 'e.g. 654321' },
    { k: 'vatNumber', label: 'VAT number', unblocks: 'invoices', placeholder: 'e.g. IE1234567X' },
    { k: 'companyLandline', label: 'Company phone', unblocks: 'NC6 §3 installer correspondence', placeholder: '01 234 5678' },
    { k: 'companyEmail', label: 'Company email', unblocks: 'NC6 §3 installer correspondence', placeholder: 'hello@…' },
    { k: 'authorisedSignatory', label: 'Authorised signatory', unblocks: 'NC7 §7 — who signs applications for the customer', placeholder: 'e.g. Cal Chesters' },
    { k: 'signatoryPosition', label: 'Signatory position', unblocks: 'NC7 §7 position held', placeholder: 'e.g. Director' },
    { k: 'registeredAddress', label: 'Registered address', unblocks: 'all statutory forms', placeholder: 'Dublin, Ireland' },
  ];

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="size-4 text-doc-contract shrink-0" /> Company &amp; compliance
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set once. Every SEAI and ESB form on every job reads these.
          </p>
        </div>
        {gaps.length > 0 && (
          <span className="ml-auto shrink-0 text-2xs font-semibold rounded-full bg-doc-proposal/10 text-doc-proposal px-2 py-1">
            {gaps.length} blocking {gaps.length === 1 ? 'form' : 'forms'}
          </span>
        )}
      </div>

      {gaps.length > 0 && (
        <ul className="mt-3 rounded-control bg-doc-proposal/5 border border-doc-proposal/30 p-2.5 space-y-1">
          {gaps.map(g => (
            <li key={g.field} className="text-2xs leading-snug">
              <strong>{g.field}</strong> — {g.why}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.k} className={f.k === 'registeredAddress' ? 'sm:col-span-2' : ''}>
            <Label className="text-xs">{f.label}</Label>
            <Input value={form[f.k]} onChange={set(f.k)} placeholder={f.placeholder} className="mt-1 h-8 text-sm" />
            <p className="mt-0.5 text-2xs text-muted-foreground">Unblocks: {f.unblocks}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="h-8 text-xs" disabled={!dirty}
          onClick={() => { saveCompanyCompliance(form); setDirty(false); toast.success('Company details saved', { description: 'Every open form just picked these up.' }); }}>
          Save
        </Button>
        {dirty && <span className="text-2xs text-muted-foreground">unsaved changes</span>}
      </div>
    </div>
  );
}

/**
 * TeachYourAiCard — the owner feeds the brain (Cal, 5 Aug): the business story,
 * the edge, the current offer — woven SOFTLY into customer answers — plus the
 * self-learning loop: questions the AI couldn't answer queue here; the owner
 * answers once and the brain gives it like an FAQ from then on.
 */
function TeachYourAiCard() {
  const [k, setK] = useState<BrainKnowledge>(() => getKnowledge());
  const [dirty, setDirty] = useState(false);
  const [queue, setQueue] = useState<AskEntry[]>(() => unansweredQuestions());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newQ, setNewQ] = useState(''); const [newA, setNewA] = useState('');

  useEffect(() => {
    const update = () => { setK(getKnowledge()); setQueue(unansweredQuestions()); };
    window.addEventListener('ai-knowledge-changed', update);
    window.addEventListener('ai-asklog-changed', update);
    return () => { window.removeEventListener('ai-knowledge-changed', update); window.removeEventListener('ai-asklog-changed', update); };
  }, []);

  const FIELDS: Array<{ key: 'businessStory' | 'edge' | 'offer'; label: string; hint: string; placeholder: string }> = [
    { key: 'businessStory', label: 'Your story', hint: 'Woven into early conversations — who you are, in a line or two.', placeholder: "e.g. We're a family firm out of Roscommon — 400 roofs on, and the same crew that quotes you fits you." },
    { key: 'edge', label: 'Your edge', hint: 'Said when a customer is weighing it up — why you over the next quote.', placeholder: 'e.g. Every install is handed over with the grant paperwork done and a 10-year workmanship warranty — no chasing us after.' },
    { key: 'offer', label: 'Current offer', hint: 'Mentioned once where it fits, never pushed.', placeholder: 'e.g. Book this month and the hot-water diverter goes in free.' },
  ];

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-tech shrink-0" /> Teach your AI
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What you write here, your AI says — softly, in the right moments, as your business. It only ever uses your words.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {FIELDS.map(f => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            <Textarea value={k[f.key]} placeholder={f.placeholder}
              onChange={e => { setK(prev => ({ ...prev, [f.key]: e.target.value })); setDirty(true); }}
              className="mt-1 min-h-14 text-sm" />
            <p className="mt-0.5 text-2xs text-muted-foreground">{f.hint}</p>
          </div>
        ))}
      </div>

      {/* The teach queue — the learning loop's misses, most-asked first. */}
      {queue.length > 0 && (
        <div className="mt-4 rounded-control border border-doc-proposal/30 bg-doc-proposal/5 p-3">
          <p className="text-xs font-semibold text-doc-proposal">Your AI was asked these and had to hand off — teach it the answer once:</p>
          <div className="mt-2 space-y-2.5">
            {queue.map(q => (
              <div key={q.q}>
                <p className="text-xs font-medium">"{q.q}" <span className="text-2xs text-muted-foreground">· asked {q.count}×</span></p>
                <div className="mt-1 flex items-center gap-2">
                  <Input value={answers[q.q] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.q]: e.target.value }))}
                    placeholder="Write the answer your AI should give…" className="h-8 text-sm flex-1" />
                  <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" disabled={!(answers[q.q] ?? '').trim()}
                    onClick={() => { teachAnswer(q.q, answers[q.q]); setAnswers(a => ({ ...a, [q.q]: '' })); toast.success('Taught — your AI answers this itself now'); }}>
                    Teach
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taught FAQs — the brain's learned answers, editable by removal. */}
      <div className="mt-4">
        <Label className="text-xs">Taught answers ({k.faqs.length})</Label>
        {k.faqs.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {k.faqs.map((f, i) => (
              <div key={i} className="flex items-start gap-2 rounded-control border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{f.q}</p>
                  <p className="text-2xs text-muted-foreground line-clamp-2">{f.a}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-pop shrink-0"
                  onClick={() => { saveKnowledge({ faqs: k.faqs.filter((_, j) => j !== i) }); }} aria-label="Remove taught answer">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 grid sm:grid-cols-[1fr_1fr_auto] gap-2">
          <Input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="A question customers ask…" className="h-8 text-sm" />
          <Input value={newA} onChange={e => setNewA(e.target.value)} placeholder="The answer, in your voice" className="h-8 text-sm" />
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!newQ.trim() || !newA.trim()}
            onClick={() => { teachAnswer(newQ, newA); setNewQ(''); setNewA(''); toast.success('Taught'); }}>
            <Plus className="size-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="h-8 text-xs" disabled={!dirty}
          onClick={() => { saveKnowledge({ businessStory: k.businessStory, edge: k.edge, offer: k.offer }); setDirty(false); toast.success('Saved — your AI speaks with this from now on'); }}>
          Save
        </Button>
        {dirty && <span className="text-2xs text-muted-foreground">unsaved changes</span>}
      </div>
    </div>
  );
}


/**
 * InstallerRosterCard — the named installers the owner works with. The one
 * per-installer fact a statutory form needs is the Safe Electric Cert Number
 * (the certifier/completion-cert number of the electrician who signs off),
 * which differs per installer, unlike the company's single RECI registration.
 * Captured here once, read onto the NC7-01 for whoever the job is assigned to.
 */
function InstallerRosterCard() {
  const saved = useInstallers();
  const [rows, setRows] = useState<Installer[]>(saved);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setRows(saved); setDirty(false); }, [saved]);

  const set = (id: string, k: keyof Installer) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [k]: e.target.value } : r)); setDirty(true);
  };
  const add = () => {
    setRows(rs => [...rs, { id: crypto.randomUUID(), name: '', safeElectricCert: '' }]); setDirty(true);
  };
  const remove = (id: string) => { setRows(rs => rs.filter(r => r.id !== id)); setDirty(true); };

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HardHat className="size-4 text-tech shrink-0" /> Installers
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each installer's Safe Electric Cert Number rides onto the NC7-01 for the jobs they're assigned.
          </p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto h-8 text-xs shrink-0" onClick={add}>
          <Plus className="size-3.5 mr-1" /> Add installer
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-control border border-dashed border-border p-3 text-2xs text-muted-foreground text-center">
          No installers yet. Add the electricians who sign off your jobs.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map(r => (
            <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-2xs text-muted-foreground">Installer name</Label>
                <Input value={r.name} onChange={set(r.id, 'name')} placeholder="e.g. Liam Murphy" className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-2xs text-muted-foreground">Safe Electric Cert Number</Label>
                <Input value={r.safeElectricCert} onChange={set(r.id, 'safeElectricCert')} placeholder="e.g. SEC-004821" className="mt-1 h-8 text-sm font-mono" />
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-pop shrink-0" onClick={() => remove(r.id)} aria-label={`Remove ${r.name || 'installer'}`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="h-8 text-xs" disabled={!dirty}
          onClick={() => { const clean = saveInstallers(rows); setRows(clean); setDirty(false); toast.success('Installers saved', { description: 'Their cert numbers now fill the NC7-01 on assigned jobs.' }); }}>
          Save
        </Button>
        {dirty && <span className="text-2xs text-muted-foreground">unsaved changes</span>}
      </div>
    </div>
  );
}
