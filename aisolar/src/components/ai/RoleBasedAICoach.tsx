/**
 * Role-Based AI Coach
 *
 * Replaces the old PersistentAICoach that served the same generic tips to everyone.
 * Now: installer gets installer tips, consultant gets consultant tips, etc.
 *
 * The coach detects the user's role from useAuth() and serves:
 *   - Role-specific tip cards (high/medium/low priority)
 *   - Role-specific one-line summary in the header pill
 *   - Role-specific copy-to-clipboard scripts (consultant only)
 *   - Role-specific CTAs (deep links to the right view)
 *
 * The coach is also context-aware: it knows which page the user is on and filters tips accordingly.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Bot, Sparkles, X, ChevronRight, ArrowRight, Send,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getCoachSummary, COACH_SYSTEM_PROMPTS, type CoachRole,
} from '@/lib/aiCoach';
// ONE BRAIN (5 Aug): the panel talks to the facade — same grounding as the
// customer portal, the coach voices, and the taught knowledge.
import { ask as brainAsk, briefing as brainBriefing, prompts as brainPrompts } from '@/lib/brain';
import type { CoachAnswer } from '@/lib/coachBrain';
import { aiReports, nextMove, type CoachPOV } from '@/lib/dealIntel';
import { useLeads } from '@/lib/realLeads';
import { isDemoMode } from '@/lib/demoMode';

// Facade adapters — the panel's old call shapes, served by the one brain.
const brainAskCompat = (role: Parameters<typeof brainAsk>[0], q: string): CoachAnswer => {
  const r = brainAsk(role, { question: q });
  return { text: r.text, actions: r.actions };
};
const brainPromptsCompat = new Proxy({} as Record<string, string[]>, {
  get: (_, role: string) => brainPrompts(role as Parameters<typeof brainPrompts>[0]),
});

interface ChatMsg { id: string; from: 'coach' | 'you'; text: string; actions?: CoachAnswer['actions']; }

/** Render **bold** spans without a markdown lib. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <span key={li} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={pi} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
              : <span key={pi}>{part}</span>,
          )}
        </span>
      ))}
    </>
  );
}

export default function RoleBasedAICoach() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  // Determine role from auth + page context
  const role: CoachRole = useMemo(() => {
    if (loading) return 'consultant'; // default during load
    if (isDemoMode()) {
      // In demo mode, infer role from URL
      if (location.pathname.startsWith('/installer')) return 'installer';
      if (location.pathname.startsWith('/admin')) return 'admin';
      if (location.pathname.startsWith('/customer')) return 'customer';
      if (location.pathname.startsWith('/my-projects')) return 'customer';
      return 'consultant';
    }
    if (!user) return 'consultant';
    // Real role resolution
    if (roles.includes('admin') && roles.includes('consultant') && roles.includes('installer')) return 'owner';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('installer')) return 'installer';
    if (roles.includes('consultant')) return 'consultant';
    if (roles.includes('customer')) return 'customer';
    return 'consultant';
  }, [user, roles, loading, location.pathname]);

  const summary = getCoachSummary(role);
  const prompts = brainPromptsCompat[role] ?? COACH_PROMPTS.consultant;

  // THE intelligence: every report is computed from the real book (dealIntel) —
  // deal value, days-in-stage, opens, tone, NC6 blockers. No vibes.
  const { leads } = useLeads();
  const reports = useMemo(() => aiReports(leads, role as CoachPOV), [leads, role]);
  const topMove = useMemo(() => {
    const moves = leads.map(l => nextMove(l, role as CoachPOV)).filter(Boolean);
    const rank = { now: 0, today: 1, soon: 2 } as const;
    return moves.sort((a, b) => rank[a!.severity] - rank[b!.severity])[0] ?? null;
  }, [leads, role]);

  // Seed the conversation with a live briefing the first time it opens.
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const brief = brainBriefing(role);
      const briefText = topMove
        ? `**The one move right now:** ${topMove.action}\n${topMove.reason}\n\n${brief.text}`
        : brief.text;
      const briefActions = topMove
        ? [{ label: `Open ${topMove.leadName.split(' ')[0]}`, route: topMove.route }, ...(brief.actions ?? [])]
        : brief.actions;
      setMessages([{ id: 'brief', from: 'coach', text: briefText, actions: briefActions }]);
    }
  }, [isOpen, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  const ask = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput('');
    setMessages(m => [...m, { id: `u${Date.now()}`, from: 'you', text }]);
    setThinking(true);
    // A short beat so it reads as a considered answer, not an instant lookup.
    window.setTimeout(() => {
      const a = brainAskCompat(role, text);
      setMessages(m => [...m, { id: `c${Date.now()}`, from: 'coach', text: a.text, actions: a.actions }]);
      setThinking(false);
    }, 450);
  };

  const runAction = (route: string) => { setIsOpen(false); navigate(route); };

  // Badge = REAL count of act-now insights from the book (was a demo-mode hack).
  const highPriorityCount = useMemo(() => reports.filter(r => r.severity === 'now').length, [reports]);

  return (
    <>
      {/* Floating button (always visible) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-40 bg-foreground text-background hover:opacity-90 rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105"
          aria-label={`Open ${role} AI coach`}
        >
          <Bot className="h-5 w-5" />
          <span className="hidden sm:inline">AI Coach</span>
          {highPriorityCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-pop text-pop-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {highPriorityCount}
            </span>
          )}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-16 right-4 bottom-4 z-40 w-full max-w-md"
          >
            <Card className="h-full flex flex-col shadow-2xl border-primary/40 dark:border-primary/40">
              {/* Header */}
              <div className="p-4 border-b bg-foreground text-background rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-90">
                      <Bot className="h-3 w-3" />
                      AI Coach · {role}
                    </div>
                    <h2 className="font-bold text-lg mt-1">{summary.headline}</h2>
                    <p className="text-xs opacity-90 mt-0.5">{summary.subtext}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-background hover:bg-background/10 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Conversation */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map(m => (
                  m.from === 'you' ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-start gap-2">
                      <span className="mt-0.5 shrink-0 size-6 rounded-full bg-foreground text-background grid place-items-center">
                        <Sparkles className="size-3.5" />
                      </span>
                      <div className="max-w-[85%] space-y-2">
                        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                          <RichText text={m.text} />
                        </div>
                        {m.actions?.map((a, i) => (
                          <button key={i} onClick={() => runAction(a.route)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 mr-1.5 rounded-full bg-card border border-border text-xs font-medium hover:bg-muted/60 transition-colors">
                            {a.label} <ArrowRight className="size-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {thinking && (
                  <div className="flex justify-start gap-2">
                    <span className="mt-0.5 shrink-0 size-6 rounded-full bg-foreground text-background grid place-items-center">
                      <Sparkles className="size-3.5" />
                    </span>
                    <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5 flex gap-1">
                      {[0, 150, 300].map(d => <span key={d} className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Suggested prompts + input */}
              <div className="border-t p-2.5 space-y-2">
                {messages.length <= 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {prompts.map(p => (
                      <button key={p} onClick={() => ask(p)}
                        className="text-2xs font-medium h-7 px-2.5 rounded-full bg-muted hover:bg-muted/70 transition-colors">
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                    placeholder="Ask about a lead, what's stuck, who to call…"
                    className="flex-1 h-9 rounded-control border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <Button onClick={() => ask(input)} disabled={!input.trim() || thinking} className="h-9 px-3">
                    <Send className="size-4" />
                  </Button>
                </div>
                {/* AI REPORTS — the live feed (Cal, 3 Aug). Every line is computed
                    from the book this second: value, days-in-stage, opens, tone,
                    NC6 blockers. Click a line, land on the deal. Honesty guard
                    (Cal 4 Aug): with nothing to flag it shows a calm all-clear —
                    never invents a report, never just vanishes. */}
                <div className="rounded-control border border-border bg-muted/20">
                  <div className="flex items-center gap-1.5 px-2.5 h-8 border-b border-border">
                    <span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-doc-deposit opacity-60" /><span className="relative inline-flex rounded-full size-2 bg-doc-deposit" /></span>
                    <span className="text-2xs font-semibold">AI reports · live</span>
                    <span className="ml-auto text-2xs text-muted-foreground tabular-nums">{reports.length}</span>
                  </div>
                  {reports.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto scroll-slim divide-y divide-border/60">
                      {reports.map((r, i) => (
                        <button key={i} onClick={() => r.route && runAction(r.route)} disabled={!r.route}
                          className="w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-muted/50 transition-colors disabled:cursor-default">
                          <span className={`mt-1 size-1.5 rounded-full shrink-0 ${r.severity === 'now' ? 'bg-pop' : r.severity === 'today' ? 'bg-doc-proposal' : r.severity === 'soon' ? 'bg-tech' : 'bg-muted-foreground/40'}`} />
                          <span className="text-2xs leading-snug text-muted-foreground">{r.text}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2.5 py-2.5 text-2xs text-muted-foreground leading-snug">
                      Nothing needs you right now — I'm watching the book and I'll flag anything the moment it does.
                    </p>
                  )}
                </div>
                <details className="group">
                  <summary className="text-2xs text-muted-foreground cursor-pointer hover:underline list-none flex items-center gap-1">
                    <ChevronRight className="size-3 group-open:rotate-90 transition-transform" />
                    How this coach thinks
                  </summary>
                  <div className="mt-1.5 p-2.5 bg-muted/30 rounded text-2xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {COACH_SYSTEM_PROMPTS[role]}
                  </div>
                </details>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
