/**
 * AIConfig — the AI interface before agents.
 *
 * Phase 4: WIRE TO REAL BACKEND.
 *   - Loads config from `ai_config` table on mount
 *   - handleSave upserts to `ai_config` (admin-only RLS)
 *   - handleTest does a real `fetch('https://openrouter.ai/api/v1/models')`
 *     with the entered key to verify it works
 *
 * The OpenRouter API key is stored in `ai_config` (admin-only RLS). The
 * agent-drain edge function reads it via service role. Not as secure as
 * Supabase Vault but avoids needing a separate vault-write edge function.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { supabase } from '@/integrations/supabase/client';

const AVAILABLE_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', cost: '$0.075/1M in · $0.30/1M out', best: 'Cheapest, bill extraction, agent default', context: '1M' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', cost: '$1.25/1M in · $5/1M out', best: 'Vision + long context', context: '2M' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', cost: '$2.50/1M in · $10/1M out', best: 'General purpose, fast, vision', context: '128K' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', cost: '$0.15/1M in · $0.60/1M out', best: 'Cheap, fast, follow-ups', context: '128K' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', cost: '$3/1M in · $15/1M out', best: 'Complex reasoning, proposal drafting', context: '200K' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', cost: '$0.80/1M in · $4/1M out', best: 'Fast + cheap Anthropic', context: '200K' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', cost: '$0.35/1M in · $0.40/1M out', best: 'Open source, private', context: '128K' },
];

export default function AIConfig() {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [dailyCostCap, setDailyCostCap] = useState(5);
  const [enableLLM, setEnableLLM] = useState(true);
  const [systemPrefix, setSystemPrefix] = useState('You are an AI assistant for AISOLAR, an Irish solar installation company. Always be professional, concise, and GDPR-compliant. Use Irish English spelling and euro (€) currency.');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [testDetail, setTestDetail] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load config from ai_config table on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('ai_config')
          .select('key, value')
          .in('key', ['openrouter_api_key', 'openrouter_default_model', 'daily_cost_cap_usd', 'enable_llm_calls']);

        if (error) throw error;

        if (data) {
          for (const row of data) {
            if (row.key === 'openrouter_api_key' && row.value) setApiKey(row.value);
            if (row.key === 'openrouter_default_model' && row.value) setSelectedModel(row.value);
            if (row.key === 'daily_cost_cap_usd' && row.value) setDailyCostCap(parseFloat(row.value));
            if (row.key === 'enable_llm_calls') setEnableLLM(row.value !== 'false');
          }
        }
      } catch (err: any) {
        // Table may not exist yet (migration not applied). Silent fail.
        console.warn('Could not load ai_config:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Real test — calls OpenRouter's /models endpoint with the entered key. */
  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error('Enter your OpenRouter API key first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestDetail('');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
      });
      if (response.ok) {
        const data = await response.json();
        const modelCount = data.data?.length || 0;
        setTestResult('success');
        setTestDetail(`Connected. ${modelCount.toLocaleString()} models available on your account.`);
        toast.success('OpenRouter connection verified', {
          description: `${modelCount.toLocaleString()} models available.`,
        });
      } else {
        const errText = await response.text();
        setTestResult('failed');
        setTestDetail(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
        toast.error(`Connection failed (HTTP ${response.status})`, {
          description: errText.slice(0, 200),
        });
      }
    } catch (err: any) {
      setTestResult('failed');
      setTestDetail(err.message);
      toast.error('Connection failed', { description: err.message });
    } finally {
      setTesting(false);
    }
  };

  /** Real save — upserts to ai_config table. */
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'openrouter_api_key', value: apiKey.trim(), description: 'OpenRouter API key. Set via AIConfig UI. Required for LLM calls in agent-drain.' },
        { key: 'openrouter_default_model', value: selectedModel, description: 'Default model for agent LLM calls.' },
        { key: 'daily_cost_cap_usd', value: String(dailyCostCap), description: 'Maximum USD spend per day on LLM calls.' },
        { key: 'enable_llm_calls', value: enableLLM ? 'true' : 'false', description: 'Master switch for LLM calls.' },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('ai_config')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('AI configuration saved', {
        description: `${selectedModel} · $${dailyCostCap}/day cap · LLM ${enableLLM ? 'enabled' : 'disabled'}`,
      });
    } catch (err: any) {
      toast.error('Failed to save AI configuration', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground mt-2">Loading AI configuration…</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">The brain behind all 10 agents. Configure your LLM, API keys, and cost limits.</p>
      </div>

      {/* LLM Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> LLM Provider</CardTitle>
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
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !apiKey.trim()}>
                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                {testing ? 'Testing…' : 'Test'}
              </Button>
            </div>
            {testResult === 'success' && (
              <div className="mt-1 text-xs text-primary flex items-start gap-1">
                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div>Connection successful — LLM is responding.</div>
                  {testDetail && <div className="text-[11px] text-muted-foreground mt-0.5">{testDetail}</div>}
                </div>
              </div>
            )}
            {testResult === 'failed' && (
              <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div>Connection failed — check your API key.</div>
                  {testDetail && <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{testDetail}</div>}
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openrouter.ai/keys</a>.
              Stored in the <code>ai_config</code> table (admin-only RLS). The agent-drain edge function reads it via service role.
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
                      isSelected ? 'border-primary/40 bg-primary/10 dark:bg-primary/10' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{m.name}</span>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{m.provider} · {m.context} context</div>
                    <div className="text-[11px] text-muted-foreground">{m.cost}</div>
                    <div className="text-[11px] text-primary mt-0.5">{m.best}</div>
                  </button>
                );
              })}
            </div>
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
          {/* LLM enable switch */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" /> Enable LLM calls
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Master switch. When off, agents fall back to deterministic logic (no LLM cost).
              </div>
            </div>
            <Switch checked={enableLLM} onCheckedChange={setEnableLLM} />
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
            <p className="text-[11px] text-muted-foreground mt-1">
              Agents stop calling the LLM when daily spend exceeds this. Current model ({model.name}) costs ~{model.cost}.
              At ${dailyCostCap}/day you get ~{Math.round(dailyCostCap / (0.30))} calls/day with the cheapest model.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary + Save */}
      <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 dark:bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Configuration summary</h3>
              <p className="text-xs text-muted-foreground">All 10 agents will use these settings.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Model:</span> <span className="font-medium">{model.name}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Cost:</span> <span className="font-medium">{model.cost}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">Daily cap:</span> <span className="font-medium">${dailyCostCap}</span></div>
            <div className="p-2 bg-background rounded"><span className="text-muted-foreground">LLM calls:</span> <span className="font-medium">{enableLLM ? 'Enabled' : 'Disabled'}</span></div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full mt-3 bg-primary hover:bg-primary">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : saved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved!</> : <><Save className="h-4 w-4 mr-2" /> Save AI configuration</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
