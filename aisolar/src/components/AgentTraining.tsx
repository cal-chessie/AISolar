/**
 * AgentTraining — interactive prompt feeding for agents.
 *
 * Phase 4: WIRE TO REAL BACKEND.
 *   - Loads the active prompt for each agent from `agent_prompts` table
 *   - handleSavePrompt upserts a new version (is_active = true, deactivates
 *     previous versions)
 *   - handleTest calls OpenRouter directly with the system prompt + test input
 *     (the API key is read from `ai_config` which is admin-only)
 *
 * The learned patterns + stats are still deterministic mock data for now —
 * Phase 5+ will derive them from real agent_runs data.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Bot, Sparkles, Save, Play, Brain, TrendingUp, CheckCircle2,
  AlertTriangle, Clock, MessageSquare, Zap, RefreshCw, Loader2,
} from 'lucide-react';
import { AGENTS, type AgentId } from '@/lib/agents';
import { supabase } from '@/integrations/supabase/client';

interface AgentLearning {
  agentId: AgentId;
  systemPrompt: string;
  /** Phase 4: user prompt template (for agents that use LLM calls) */
  userPromptTemplate: string;
  /** Phase 4: model override (null = use ai_config default) */
  model: string | null;
  /** Phase 4: version number from agent_prompts table */
  version: number;
  behaviouralRules: string[];
  learnedPatterns: Array<{ pattern: string; confidence: number; source: string }>;
  successRate: number;
  totalRuns: number;
  lastAdjusted: string;
}

const DEFAULT_LEARNING: Record<AgentId, AgentLearning> = {
  lead_intake: {
    agentId: 'lead_intake', systemPrompt: '', userPromptTemplate: '', model: null, version: 0,
    behaviouralRules: ['Never overwrite higher-confidence data with lower', 'Flag duplicate MPRNs for review', 'Score > 80 for bills > €300 + MPRN present'],
    learnedPatterns: [
      { pattern: 'Leads with MPRN convert 35% better', confidence: 0.82, source: 'Last 30 days outcomes' },
      { pattern: 'Bills > €300 → recommend 8kWp+ system', confidence: 0.91, source: 'Proposal acceptance data' },
    ],
    successRate: 100, totalRuns: 312, lastAdjusted: '2 days ago',
  },
  proposal_drafter: {
    agentId: 'proposal_drafter', systemPrompt: '', userPromptTemplate: '', model: null, version: 0,
    behaviouralRules: ['Use only products in stock', 'Cap grant at SEAI max', 'Add 15% contingency for moderate/heavy shading'],
    learnedPatterns: [
      { pattern: 'Proposals with battery have 61% acceptance vs 38% without', confidence: 0.87, source: 'Acceptance rates' },
      { pattern: 'Leading with SEAI grant in proposal summary increases acceptance', confidence: 0.73, source: 'A/B testing' },
    ],
    successRate: 96, totalRuns: 67, lastAdjusted: '1 week ago',
  },
  follow_up: {
    agentId: 'follow_up', systemPrompt: '', userPromptTemplate: '', model: null, version: 0,
    behaviouralRules: ['Pause if customer replied in last 7 days', 'Escalate to human at 2x threshold', 'Personalize subject line with customer name'],
    learnedPatterns: [
      { pattern: 'Emails sent between 9-11am have 42% open rate vs 22% after 3pm', confidence: 0.89, source: 'Open rate analytics' },
      { pattern: 'Subject line with first name → +18% open rate', confidence: 0.81, source: 'A/B testing' },
    ],
    successRate: 100, totalRuns: 31, lastAdjusted: '3 days ago',
  },
  survey_scheduler: { agentId: 'survey_scheduler', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 100, totalRuns: 89, lastAdjusted: '1 week ago' },
  grant_submitter: { agentId: 'grant_submitter', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 92, totalRuns: 24, lastAdjusted: '4 days ago' },
  install_coordinator: { agentId: 'install_coordinator', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 96, totalRuns: 28, lastAdjusted: '2 days ago' },
  post_install: { agentId: 'post_install', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 100, totalRuns: 18, lastAdjusted: '1 week ago' },
  customer_digest: { agentId: 'customer_digest', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 100, totalRuns: 4, lastAdjusted: '2 weeks ago' },
  stale_lead_escalator: { agentId: 'stale_lead_escalator', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 100, totalRuns: 31, lastAdjusted: '5 days ago' },
  payment_reminder: { agentId: 'payment_reminder', systemPrompt: '', userPromptTemplate: '', model: null, version: 0, behaviouralRules: [], learnedPatterns: [], successRate: 88, totalRuns: 31, lastAdjusted: '1 week ago' },
};

export default function AgentTraining() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('lead_intake');
  const [learning, setLearning] = useState(DEFAULT_LEARNING);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRule, setNewRule] = useState('');

  const agent = AGENTS.find(a => a.id === selectedAgent)!;
  const agentLearning = learning[selectedAgent];

  // Phase 4: load the active prompt for the selected agent from agent_prompts table
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('agent_prompts')
          .select('system_prompt, user_prompt_template, model, version')
          .eq('agent_id', selectedAgent)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.warn('Could not load agent_prompts:', error.message);
          return;
        }

        if (data) {
          setLearning(prev => ({
            ...prev,
            [selectedAgent]: {
              ...prev[selectedAgent],
              systemPrompt: data.system_prompt || prev[selectedAgent].systemPrompt,
              userPromptTemplate: data.user_prompt_template || prev[selectedAgent].userPromptTemplate,
              model: data.model,
              version: data.version || 0,
              lastAdjusted: `v${data.version} (saved)`,
            },
          }));
        }
      } catch (err: any) {
        console.warn('agent_prompts table not available:', err.message);
      }
    })();
  }, [selectedAgent]);

  /** Phase 4: save a new version of the prompt to agent_prompts table. */
  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      const newVersion = agentLearning.version + 1;

      // Deactivate previous versions
      const { error: deactivateError } = await supabase
        .from('agent_prompts')
        .update({ is_active: false })
        .eq('agent_id', selectedAgent)
        .eq('is_active', true);
      if (deactivateError) throw deactivateError;

      // Insert the new active version
      const { error: insertError } = await supabase
        .from('agent_prompts')
        .insert({
          agent_id: selectedAgent,
          version: newVersion,
          system_prompt: agentLearning.systemPrompt,
          user_prompt_template: agentLearning.userPromptTemplate || 'Lead: {lead_name}\n\nProcess:',
          model: agentLearning.model,
          is_active: true,
          notes: `Saved via AgentTraining UI at ${new Date().toISOString()}`,
        });
      if (insertError) throw insertError;

      setLearning(prev => ({
        ...prev,
        [selectedAgent]: { ...prev[selectedAgent], version: newVersion, lastAdjusted: `v${newVersion} (just now)` },
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success(`Prompt saved as v${newVersion}`, {
        description: `${agent.name} will use this prompt on its next run.`,
      });
    } catch (err: any) {
      toast.error('Failed to save prompt', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setLearning(prev => ({
      ...prev,
      [selectedAgent]: {
        ...prev[selectedAgent],
        behaviouralRules: [...prev[selectedAgent].behaviouralRules, newRule],
        lastAdjusted: 'just now',
      },
    }));
    setNewRule('');
  };

  /** Phase 4: real LLM test — reads the OpenRouter key from ai_config and
   * calls OpenRouter directly with the agent's system prompt + test input. */
  const handleTest = async () => {
    if (!testPrompt.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      // Read the API key + default model from ai_config
      const { data: cfgData, error: cfgError } = await supabase
        .from('ai_config')
        .select('key, value')
        .in('key', ['openrouter_api_key', 'openrouter_default_model', 'enable_llm_calls']);

      if (cfgError) throw new Error(`Could not read AI config: ${cfgError.message}`);

      const cfg: Record<string, string> = {};
      for (const row of cfgData || []) cfg[row.key] = row.value;

      if (cfg.enable_llm_calls === 'false') {
        throw new Error('LLM calls are disabled. Enable them in AI Config first.');
      }
      if (!cfg.openrouter_api_key) {
        throw new Error('No OpenRouter API key set. Add one in AI Config first.');
      }

      const model = agentLearning.model || cfg.openrouter_default_model || 'google/gemini-2.5-flash';

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.openrouter_api_key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aisolar.ie',
          'X-Title': 'AISOLAR AgentTraining',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: agentLearning.systemPrompt || `You are the ${agent.name} for AISOLAR.` },
            { role: 'user', content: testPrompt },
          ],
          max_tokens: 500,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '(empty response)';
      const usage = data.usage || {};
      setTestResult(`[${model} · ${usage.prompt_tokens || 0} in / ${usage.completion_tokens || 0} out tokens]\n\n${content}`);
    } catch (err: any) {
      setTestResult(`❌ ${err.message}`);
      toast.error('Test failed', { description: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Agent Training</h2>
        <p className="text-sm text-muted-foreground mt-1">Feed prompts to agents to make them smarter. They also learn automatically from system outcomes.</p>
      </div>

      {/* Agent picker */}
      <div className="flex flex-wrap gap-1.5">
        {AGENTS.map(a => {
          const isSelected = a.id === selectedAgent;
          const al = learning[a.id];
          return (
            <button
              key={a.id}
              onClick={() => { setSelectedAgent(a.id); setTestResult(null); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSelected ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/70 text-muted-foreground'
              }`}
            >
              <Bot className="h-3 w-3" />
              {a.name.replace(' Agent', '')}
              <span className={`text-[11px] px-1 rounded ${al.successRate >= 95 ? 'bg-doc-deposit/10 text-doc-deposit' : 'bg-doc-proposal-subtle text-doc-proposal'}`}>
                {al.successRate}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Left: prompt + rules editor */}
        <div className="space-y-3">
          {/* System prompt */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> System prompt</CardTitle>
              <p className="text-xs text-muted-foreground">What the agent should know + how it should behave.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={agentLearning.systemPrompt}
                onChange={e => setLearning(prev => ({ ...prev, [selectedAgent]: { ...prev[selectedAgent], systemPrompt: e.target.value } }))}
                placeholder={`Tell the ${agent.name} how to think…`}
                rows={4}
                className="text-xs"
              />
              <Button size="sm" onClick={handleSavePrompt} disabled={saving}>
                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving…</>
                  : saved ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Saved v{agentLearning.version}!</>
                  : <><Save className="h-3 w-3 mr-1" /> Save prompt</>}
              </Button>
              {agentLearning.version > 0 && <span className="text-[11px] text-muted-foreground">v{agentLearning.version} active</span>}
              <p className="text-[11px] text-muted-foreground">Last adjusted: {agentLearning.lastAdjusted}</p>
            </CardContent>
          </Card>

          {/* Behavioural rules */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" /> Behavioural rules</CardTitle>
              <p className="text-xs text-muted-foreground">Hard constraints the agent must follow.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {agentLearning.behaviouralRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                  <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{rule}</span>
                  <button onClick={() => setLearning(prev => ({ ...prev, [selectedAgent]: { ...prev[selectedAgent], behaviouralRules: prev[selectedAgent].behaviouralRules.filter((_, idx) => idx !== i) } }))} className="text-muted-foreground hover:text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1">
                <input
                  type="text" value={newRule} onChange={e => setNewRule(e.target.value)}
                  placeholder="Add a rule…"
                  className="flex-1 h-8 px-2 text-xs rounded border border-input bg-background"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddRule(); }}
                />
                <Button size="sm" variant="outline" onClick={handleAddRule}>Add</Button>
              </div>
            </CardContent>
          </Card>

          {/* Test prompt */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Play className="h-4 w-4 text-primary" /> Test prompt (dry run)</CardTitle>
              <p className="text-xs text-muted-foreground">Run a prompt against this agent without side effects.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={testPrompt} onChange={e => setTestPrompt(e.target.value)}
                placeholder={`e.g. "A lead with €350 monthly bill, MPRN 12345678901, south-facing roof in Dublin — what should the ${agent.name} do?"`}
                rows={3}
                className="text-xs"
              />
              <Button size="sm" onClick={handleTest} disabled={testing || !testPrompt.trim()} className="bg-primary hover:bg-primary">
                {testing ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Running…</> : <><Play className="h-3 w-3 mr-1" /> Test</>}
              </Button>
              {testResult && (
                <div className="p-2 bg-primary/10 dark:bg-primary/10 rounded text-xs whitespace-pre-wrap">{testResult}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: learned patterns + stats */}
        <div className="space-y-3">
          {/* Agent stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{agentLearning.totalRuns}</div>
                  <div className="text-[11px] text-muted-foreground">total runs</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${agentLearning.successRate >= 95 ? 'text-doc-deposit' : 'text-doc-proposal'}`}>{agentLearning.successRate}%</div>
                  <div className="text-[11px] text-muted-foreground">success rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{agentLearning.learnedPatterns.length}</div>
                  <div className="text-[11px] text-muted-foreground">patterns learned</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learned patterns */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Learned patterns (auto)</CardTitle>
              <p className="text-xs text-muted-foreground">The agent discovered these from outcome data. No manual input.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {agentLearning.learnedPatterns.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No patterns learned yet. The agent will discover patterns as it runs more.</p>
              ) : (
                agentLearning.learnedPatterns.map((pattern, i) => (
                  <div key={i} className="p-2 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs font-medium">{pattern.pattern}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Confidence: {Math.round(pattern.confidence * 100)}% · Source: {pattern.source}
                        </div>
                      </div>
                    </div>
                    {/* Confidence bar */}
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pattern.confidence * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* How learning works */}
          <Card className="border-primary/40 dark:border-primary/40 bg-primary/10 dark:bg-primary/10">
            <CardContent className="p-3">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-1"><Bot className="h-3 w-3 text-primary" /> How agents learn</h4>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>Manual:</strong> You set the system prompt + behavioural rules (left panel)</span></div>
                <div className="flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>Auto:</strong> Agents track outcomes (accepted/rejected proposals, opened emails, conversion rates)</span></div>
                <div className="flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>Pattern discovery:</strong> After 50+ runs, agents identify correlations (e.g. "battery proposals convert better")</span></div>
                <div className="flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>Feedback loop:</strong> Failed runs adjust the agent's approach automatically</span></div>
                <div className="flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>LLM integration:</strong> In production, agents call an LLM with their system prompt + learned patterns as context</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
