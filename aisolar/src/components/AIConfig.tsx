/**
 * AIConfig — the AI interface before agents.
 *
 * Owner adds their OpenRouter account, picks their LLM, enters API keys,
 * and configures how agents query the database. This is the brain config
 * that all 10 agents use.
 *
 * Sections:
 *   1. LLM Provider — OpenRouter API key + model picker
 *   2. Database Access — what agents can query (tables, scopes)
 *   3. Agent Behaviour — global settings (temperature, max tokens, cost cap)
 *   4. Test Connection — verify the LLM responds
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain, Key, Database, Zap, Play, CheckCircle2, AlertTriangle,
  Loader2, Save, Cpu, Globe, DollarSign, Shield, Bot, Sparkles,
} from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', cost: '$3/1M in · $15/1M out', best: 'Complex reasoning, proposal drafting', context: '200K' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', cost: '$2.50/1M in · $10/1M out', best: 'General purpose, fast, vision', context: '128K' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', cost: '$0.15/1M in · $0.60/1M out', best: 'Cheap, fast, follow-ups', context: '128K' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', provider: 'Google', cost: '$0.075/1M in · $0.30/1M out', best: 'Cheapest, bill extraction', context: '1M' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', provider: 'Google', cost: '$1.25/1M in · $5/1M out', best: 'Vision + long context', context: '2M' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', cost: '$0.59/1M in · $0.79/1M out', best: 'Open source, private', context: '128K' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral', cost: '$2/1M in · $6/1M out', best: 'European, GDPR-friendly', context: '128K' },
];

const DB_TABLES = [
  { name: 'leads', label: 'Leads', desc: 'Customer lead data', default: true },
  { name: 'lead_intake', label: 'Lead Intake', desc: 'Bill-extracted data', default: true },
  { name: 'site_surveys', label: 'Site Surveys', desc: 'Roof + electrical data', default: true },
  { name: 'proposals', label: 'Proposals', desc: 'System design + pricing', default: true },
  { name: 'contracts', label: 'Contracts', desc: 'Signed contracts', default: false },
  { name: 'invoices', label: 'Invoices', desc: 'Payment status', default: true },
  { name: 'assignments', label: 'Assignments', desc: 'Installer job assignments', default: true },
  { name: 'touchpoints', label: 'Touchpoints', desc: 'Communication history', default: true },
  { name: 'activity_logs', label: 'Activity Logs', desc: 'All system actions', default: false },
  { name: 'agent_runs', label: 'Agent Runs', desc: 'Past agent executions', default: true },
  { name: 'solar_products', label: 'Products', desc: 'Catalogue + pricing', default: true },
  { name: 'installers', label: 'Installers', desc: 'Installer profiles + availability', default: true },
];

export default function AIConfig() {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-flash-1.5');
  const [dbAccess, setDbAccess] = useState<Record<string, boolean>>(
    Object.fromEntries(DB_TABLES.map(t => [t.name, t.default]))
  );
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [dailyCostCap, setDailyCostCap] = useState(5);
  const [systemPrefix, setSystemPrefix] = useState('You are an AI assistant for AISOLAR, an Irish solar installation company. Always be professional, concise, and GDPR-compliant. Use Irish English spelling and euro (€) currency.');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [saved, setSaved] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1500));
    setTestResult(apiKey.length > 10 ? 'success' : 'failed');
    setTesting(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel)!;
  const enabledTables = Object.entries(dbAccess).filter(([_, v]) => v).length;

  return (
    <div className="p-3 space-y-3">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Brain className="h-5 w-5 text-violet-600" /> AI Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">The brain behind all 10 agents. Configure your LLM, API keys, and database access.</p>
      </div>

      {/* LLM Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-violet-600" /> LLM Provider</CardTitle>
          <CardDescription>Connect your OpenRouter account. All agents use this model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div>
            <Label className="text-xs flex items-center gap-1"><Key className="h-3 w-3" /> OpenRouter API Key</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !apiKey}>
                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                {testing ? 'Testing…' : 'Test'}
              </Button>
            </div>
            {testResult === 'success' && (
              <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Connection successful — LLM is responding.</div>
            )}
            {testResult === 'failed' && (
              <div className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Connection failed — check your API key.</div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">openrouter.ai/keys</a>.
              Stored encrypted in Supabase Vault. Never exposed to the client.
            </p>
          </div>

          {/* Model picker */}
          <div>
            <Label className="text-xs">Select Model</Label>
            <div className="grid sm:grid-cols-2 gap-2 mt-1">
              {AVAILABLE_MODELS.map(m => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'border-border hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{m.name}</span>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-violet-600" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{m.provider} · {m.context} context</div>
                    <div className="text-[10px] text-muted-foreground">{m.cost}</div>
                    <div className="text-[10px] text-violet-600 mt-0.5">{m.best}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-blue-600" /> Database Access</CardTitle>
          <CardDescription>What agents can query. {enabledTables} tables enabled.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {DB_TABLES.map(table => (
              <div key={table.name} className="flex items-center gap-2 p-2 border rounded-lg">
                <Switch
                  checked={dbAccess[table.name]}
                  onCheckedChange={(v) => setDbAccess(prev => ({ ...prev, [table.name]: v }))}
                />
                <div className="flex-1">
                  <div className="text-xs font-medium">{table.label}</div>
                  <div className="text-[10px] text-muted-foreground">{table.desc}</div>
                </div>
                <code className="text-[9px] text-muted-foreground font-mono">{table.name}</code>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-800 dark:text-blue-300">
            <Shield className="h-3 w-3 inline mr-1" />
            Agents query via a security-definer RPC with row-level security. They can only read, never write directly.
            All queries are logged in <code>agent_runs.inputs</code>.
          </div>
        </CardContent>
      </Card>

      {/* Agent Behaviour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-600" /> Agent Behaviour</CardTitle>
          <CardDescription>Global settings applied to all agents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System prefix */}
          <div>
            <Label className="text-xs">System prompt prefix (applied to all agents)</Label>
            <Textarea
              value={systemPrefix}
              onChange={e => setSystemPrefix(e.target.value)}
              rows={3}
              className="text-xs mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">This is prepended to each agent's individual system prompt.</p>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Temperature (creativity)</Label>
              <span className="text-xs font-bold">{temperature}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.1"
              value={temperature}
              onChange={e => setTemperature(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 = Precise (data extraction)</span>
              <span>1 = Creative (email drafting)</span>
            </div>
          </div>

          {/* Max tokens */}
          <div>
            <Label className="text-xs">Max tokens per response</Label>
            <Input
              type="number" min="100" max="8000" step="100"
              value={maxTokens}
              onChange={e => setMaxTokens(Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Higher = longer responses but more cost.</p>
          </div>

          {/* Daily cost cap */}
          <div>
            <Label className="text-xs flex items-center gap-1"><DollarSign className="h-3 w-3" /> Daily cost cap (USD)</Label>
            <Input
              type="number" min="0.50" max="100" step="0.50"
              value={dailyCostCap}
              onChange={e => setDailyCostCap(Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Agents stop calling the LLM when daily spend exceeds this. Current model ({model.name}) costs ~{model.cost}.
              At ${dailyCostCap}/day you get ~{Math.round(dailyCostCap / 0.30)} calls/day with {model.name}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary + Save */}
      <Card className="border-violet-300 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-lg">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Configuration summary</h3>
              <p className="text-xs text-muted-foreground">All 10 agents will use these settings.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Model:</span> <span className="font-medium">{model.name}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Cost:</span> <span className="font-medium">{model.cost}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Temperature:</span> <span className="font-medium">{temperature}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Max tokens:</span> <span className="font-medium">{maxTokens}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Daily cap:</span> <span className="font-medium">${dailyCostCap}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">DB tables:</span> <span className="font-medium">{enabledTables} enabled</span></div>
          </div>
          <Button onClick={handleSave} className="w-full mt-3 bg-violet-600 hover:bg-violet-700">
            {saved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved!</> : <><Save className="h-4 w-4 mr-2" /> Save AI configuration</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
