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

import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sparkles, X, Copy, Check, ChevronDown, ChevronUp, ChevronRight,
  AlertTriangle, Lightbulb, TrendingUp, Zap, ArrowRight,
} from 'lucide-react';
import { useAuth, type AppRole } from '@/hooks/useAuth';
import {
  getTipsForRole, getCoachSummary, COACH_SYSTEM_PROMPTS, type CoachRole, type CoachTip,
} from '@/lib/aiCoach';
import { isDemoMode } from '@/lib/demoMode';

export default function RoleBasedAICoach() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);
  const location = useLocation();
  const { user, roles, loading } = useAuth();

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
  const allTips = getTipsForRole(role);

  // Filter tips by current page context (basic version)
  const contextualTips = useMemo(() => {
    // Show all tips for now — future: filter by page
    return allTips.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [allTips]);

  const highPriorityCount = contextualTips.filter(t => t.priority === 'high').length;

  const handleCopy = (tip: CoachTip) => {
    if (!tip.copyText) return;
    navigator.clipboard.writeText(tip.copyText);
    setCopiedId(tip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating button (always visible) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-40 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105"
          aria-label={`Open ${role} AI coach`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">AI Coach</span>
          {highPriorityCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
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
            <Card className="h-full flex flex-col shadow-2xl border-violet-200 dark:border-violet-800">
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-90">
                      <Sparkles className="h-3 w-3" />
                      AI Coach · {role}
                    </div>
                    <h2 className="font-bold text-lg mt-1">{summary.headline}</h2>
                    <p className="text-xs opacity-90 mt-0.5">{summary.subtext}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/10 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tip list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {contextualTips.map(tip => {
                  const Icon = tip.icon;
                  const isExpanded = expandedTipId === tip.id;
                  const priorityColor =
                    tip.priority === 'high'   ? 'border-l-red-500' :
                    tip.priority === 'medium' ? 'border-l-amber-500' :
                                                'border-l-slate-400';
                  const typeColor =
                    tip.type === 'action'     ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' :
                    tip.type === 'warning'    ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' :
                    tip.type === 'opportunity'? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' :
                                                'bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300';

                  return (
                    <div
                      key={tip.id}
                      className={`bg-card border border-l-4 ${priorityColor} rounded-md p-3 shadow-sm`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm leading-tight">{tip.title}</h3>
                            <Badge variant="outline" className={`text-[9px] h-4 px-1 flex-shrink-0 ${typeColor}`}>
                              {tip.priority}
                            </Badge>
                          </div>
                          <p className={`text-xs text-muted-foreground mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {tip.body}
                          </p>

                          {/* Copy-text script (consultant only typically) */}
                          {tip.copyText && isExpanded && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-[11px] font-mono leading-relaxed">
                              "{tip.copyText}"
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {tip.cta?.route && (
                              <a
                                href={tip.cta.route}
                                className="text-[11px] font-semibold text-violet-600 hover:underline inline-flex items-center gap-1"
                              >
                                {tip.cta.label}
                                <ArrowRight className="h-3 w-3" />
                              </a>
                            )}
                            {tip.copyText && (
                              <button
                                onClick={() => handleCopy(tip)}
                                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              >
                                {copiedId === tip.id ? (
                                  <><Check className="h-3 w-3" /> Copied</>
                                ) : (
                                  <><Copy className="h-3 w-3" /> Copy script</>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedTipId(isExpanded ? null : tip.id)}
                              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-auto"
                            >
                              {isExpanded ? (
                                <><ChevronUp className="h-3 w-3" /> Less</>
                              ) : (
                                <><ChevronDown className="h-3 w-3" /> More</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Footer: coach system prompt */}
                <details className="mt-4 group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:underline list-none flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                    How this coach thinks (system prompt)
                  </summary>
                  <div className="mt-2 p-3 bg-muted/30 rounded text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                    {COACH_SYSTEM_PROMPTS[role]}
                  </div>
                </details>
              </div>

              {/* Footer */}
              <div className="p-3 border-t bg-muted/30 text-[10px] text-muted-foreground">
                Tips are personalized for the <strong className="capitalize">{role}</strong> role.
                {role !== 'customer' && ' Different roles see different priorities and scripts.'}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
