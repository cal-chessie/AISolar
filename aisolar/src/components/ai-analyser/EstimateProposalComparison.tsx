/**
 * Estimate vs Proposal Comparison
 *
 * Pops up after the bill-extract estimate is shown. Heavily incentivizes
 * booking a consultation / getting the real proposal by showing what the
 * estimate MISSES that the proposal includes:
 *   - Roof-specific design (panel layout, orientation, shading)
 *   - Surveyor-confirmed system size (vs bill-only estimate)
 *   - Real product selection (vs generic assumption)
 *   - SEAI grant paperwork handled
 *   - 20-year cashflow with inflation
 *   - Professional PDF proposal
 *   - Direct chat with solar expert
 *
 * Side-by-side: "Your free estimate" vs "What you get with a real proposal"
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  X, Check, ArrowRight, Sparkles, FileText, Calendar, Bot, Shield,
  TrendingUp, Zap, Sun, Award, MessageSquare, Lock,
} from 'lucide-react';
import type { AnalysisData } from '@/components/ai-analyser/AIBillAnalyser';
import { eur } from '@/lib/seaiPipeline';

interface Props {
  open: boolean;
  onClose: () => void;
  analysisData: AnalysisData | null;
  onBookConsultation: () => void;
  onContinue: () => void;
}

export default function EstimateProposalComparison({ open, onClose, analysisData, onBookConsultation, onContinue }: Props) {
  if (!analysisData) return null;

  const estimateRows = [
    { label: 'System size', estimate: `${analysisData.estimatedSystemSize} kWp (rough estimate)`, proposal: `${analysisData.estimatedSystemSize} kWp (surveyor-confirmed)` },
    { label: 'Annual savings', estimate: eur(analysisData.annualSavings) + ' (generic)', proposal: eur(analysisData.annualSavings) + ' (roof-specific)' },
    { label: 'Panel model', estimate: 'Generic assumption', proposal: 'Longi Hi-MO 6 435W (or equivalent)' },
    { label: 'Roof layout', estimate: <Lock className="h-3 w-3 inline" /> + ' Requires survey', proposal: 'SVG diagram + photo of your roof' },
    { label: 'SEAI grant', estimate: eur(1800) + ' (estimated)', proposal: eur(1800) + ' (paperwork handled for you)' },
    { label: 'Payback period', estimate: `${analysisData.paybackYears} yrs (basic)`, proposal: `${analysisData.paybackYears} yrs (inflation-adjusted)` },
    { label: '20-year cashflow', estimate: <Lock className="h-3 w-3 inline" /> + ' Requires proposal', proposal: 'Year-by-year projection (Year 1 → 20)' },
    { label: 'Battery analysis', estimate: 'Not included', proposal: 'Right-sized for your usage pattern' },
    { label: 'PDF document', estimate: 'On-screen only', proposal: 'Branded 4-page proposal PDF' },
    { label: 'Direct chat with expert', estimate: <Lock className="h-3 w-3 inline" /> + ' Book consultation', proposal: 'AI assistant + human consultant' },
    { label: 'Grant paperwork', estimate: 'You handle it', proposal: 'We handle it end-to-end' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-background w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-4 sm:p-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-90">
                  <Sparkles className="h-3 w-3" />
                  Your free estimate is ready
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mt-1">
                  See what's in your real proposal
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  Your estimate gives you a rough idea. Your real proposal — built after a 30-min consultation — gives you certainty.
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* KPI summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <CardContent className="p-3 text-center">
                    <Sun className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                    <div className="text-xs text-muted-foreground">System size</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {analysisData.estimatedSystemSize} kWp
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
                  <CardContent className="p-3 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <div className="text-xs text-muted-foreground">Annual savings</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {eur(analysisData.annualSavings)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10">
                  <CardContent className="p-3 text-center">
                    <Award className="h-5 w-5 mx-auto text-violet-600 mb-1" />
                    <div className="text-xs text-muted-foreground">SEAI grant</div>
                    <div className="text-xl font-bold text-violet-700 dark:text-violet-300">
                      {eur(1800)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison table */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] gap-2 mb-6">
                {/* Header row */}
                <div className="hidden sm:block" />
                <div className="bg-slate-100 dark:bg-slate-900 rounded-t-lg p-3 text-center">
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
                    Your free estimate
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">What you see now</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-950/40 dark:to-blue-950/40 rounded-t-lg p-3 text-center border-2 border-emerald-400">
                  <Badge variant="default" className="bg-emerald-600">
                    <Sparkles className="h-3 w-3 mr-1" /> Real proposal
                  </Badge>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-medium">Free with consultation</div>
                </div>

                {/* Rows */}
                {estimateRows.map((row, i) => (
                  <div key={i} className="contents">
                    <div className="text-xs text-muted-foreground p-2 self-center font-medium">{row.label}</div>
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-2 text-xs border-x border-slate-200 dark:border-slate-800 flex items-center gap-1">
                      <span className="text-slate-600 dark:text-slate-400">{row.estimate}</span>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 text-xs border-x border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium">{row.proposal}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* What you get with consultation */}
              <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 mb-6">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    What happens in your free 30-min consultation
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { icon: MessageSquare, text: 'Live video call with a solar expert (Google Meet)' },
                      { icon: Sun, text: 'We review your roof on satellite imagery + your bill together' },
                      { icon: FileText, text: 'You get a full proposal PDF within 24 hours' },
                      { icon: Bot, text: 'AI assistant available 24/7 for follow-up questions' },
                      { icon: Shield, text: 'No obligation. No spam. We answer your real questions.' },
                      { icon: Award, text: 'SEAI grant pre-qualified during the call' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <Icon className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* CTAs */}
              <div className="space-y-3">
                <Button
                  onClick={onBookConsultation}
                  className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold h-12 text-base shadow-lg"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Book my free consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <button
                  onClick={onContinue}
                  className="w-full text-sm text-muted-foreground hover:text-foreground underline"
                >
                  No thanks — just email me the estimate
                </button>
                <p className="text-xs text-center text-muted-foreground">
                  🔒 No credit card. No spam. We respect your data — see our <a href="/privacy" className="underline">privacy policy</a>.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
