/**
 * Onboarding Mode — for new installer signups.
 *
 * When a new installer signs up, they land here first. It walks them through
 * every view in the platform with a guided tour, so they can test-drive
 * before committing to a paid plan.
 *
 * This is the "browse all views, maybe we could adapt this for launch so
 * the installers can test how it feels when they sign up" feature.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sun, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Wrench,
  Calendar, Bot, Package, BarChart3, Settings, MessageSquare,
  ClipboardList, Zap, TrendingUp, Lock,
} from 'lucide-react';
import { brand } from '@/config/brand';
import { enableDemoMode, isDemoMode } from '@/lib/demoMode';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: typeof Sun;
  duration: string;
  whatToDo: string;
  whatToLook: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AISOLAR',
    description: 'Let\'s take a 5-minute tour of everything the platform does. You can click around — it\'s all demo data, nothing breaks.',
    route: '/demo',
    icon: Sparkles,
    duration: '1 min',
    whatToDo: 'Read the welcome screen, then click "Next" to start the tour.',
    whatToLook: 'Notice the floating "Browse Views" button (bottom-right) — you can use it anytime to jump between views.',
  },
  {
    id: 'installer',
    title: 'Installer Cockpit',
    description: 'This is where your installers live every day. Today\'s jobs, materials checklist, surveys, stock, handovers.',
    route: '/installer-v3',
    icon: Wrench,
    duration: '2 min',
    whatToDo: 'Click through the 5 tabs (Today, Map, Surveys, Stock, Handover). Try the AI Coach floating button (bottom-right).',
    whatToLook: 'The OSM map is free (no Mapbox token needed). Notice the weather strip — Met Éireann warnings auto-reschedule installs.',
  },
  {
    id: 'pipeline',
    title: 'Pipeline view',
    description: 'The kanban of every lead. Each card shows last touchpoint + the next automation that will fire.',
    route: '/pipeline',
    icon: TrendingUp,
    duration: '1 min',
    whatToDo: 'Click any lead card to open the detail drawer. See the touchpoint timeline + intake→survey→proposal data flow.',
    whatToLook: 'The "Next automation" badge on each card — that\'s the autonomous agent that will fire when the stage changes.',
  },
  {
    id: 'comms',
    title: 'Communication Hub',
    description: 'Every customer touchpoint in one inbox — emails, SMS, calls, AI chat history. Filterable + searchable.',
    route: '/comms',
    icon: MessageSquare,
    duration: '1 min',
    whatToDo: 'Click a lead in the left panel. See their full comms history. Try the channel filter (Email / SMS / AI Chat).',
    whatToLook: 'AI Chat touchpoints are tagged. You can see exactly what the customer asked the AI assistant.',
  },
  {
    id: 'bom',
    title: 'Bill of Materials',
    description: 'Auto-generated packing list per job. Installer ticks items off as they load the van. Persists across refreshes.',
    route: '/installer-bom',
    icon: ClipboardList,
    duration: '1 min',
    whatToDo: 'Tick some checkboxes. Add a custom item. Click "Print / PDF" to see the printable version.',
    whatToLook: 'Critical items are flagged. Low-stock items trigger a "Generate purchase order" CTA.',
  },
  {
    id: 'intelligence',
    title: 'Intelligence Builder',
    description: 'This is where YOU drop your expertise into the system. Custom products, pricing, rules, labour rates.',
    route: '/intelligence',
    icon: Zap,
    duration: '2 min',
    whatToDo: 'Add a custom product. Try the CSV import (drag-drop a spreadsheet). Edit a rule. Click "Save all".',
    whatToLook: 'Your custom products + rules are used by the Proposal Drafter Agent when it auto-drafts proposals.',
  },
  {
    id: 'products',
    title: 'Product Catalogue',
    description: 'Pre-configured products + bundles. "Add to proposal" integration with the proposal editor.',
    route: '/products',
    icon: Package,
    duration: '1 min',
    whatToDo: 'Search "Longi". Click a product. Click a bundle to see the component breakdown.',
    whatToLook: 'Each product has margin %, Dublin depot stock, SEAI-approval badge.',
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Real-time BI: revenue funnel, conversion rates, team performance, agent impact, SEAI pipeline.',
    route: '/analytics',
    icon: BarChart3,
    duration: '1 min',
    whatToDo: 'Click through all 5 tabs (Overview, Funnel, Team, Agents, SEAI). Notice the bottleneck detection.',
    whatToLook: 'The Agents tab shows how many hours + € the autonomous agents have saved.',
  },
  {
    id: 'agents',
    title: 'Agent Foundation',
    description: 'The 10 autonomous agents. Each has triggers, inputs, outputs, guardrails. You can manually trigger them.',
    route: '/agents',
    icon: Bot,
    duration: '1 min',
    whatToDo: 'Expand an agent\'s details. Click "Run now" on the Lead Intake Agent.',
    whatToLook: 'Guardrails per agent — e.g. "Never threatens legal action before T+45" on the Payment Reminder Agent.',
  },
  {
    id: 'settings',
    title: 'System Settings',
    description: 'The bedrock: email/SMS channels, Supabase kernel, Vault secrets, pg_cron schedules, integration health.',
    route: '/system-settings',
    icon: Settings,
    duration: '1 min',
    whatToDo: 'Click through all 6 tabs. Notice the integration health cards (Stripe, Coinbase, Postmark, Lovable AI, etc.).',
    whatToLook: 'The Vault Secrets card — secrets are encrypted at rest, never exposed to the client.',
  },
];

export default function OnboardingMode() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    enableDemoMode();
  }, []);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLast = currentStep === STEPS.length - 1;
  const demoActive = isDemoMode();

  const handleNext = () => {
    setCompleted(prev => new Set(prev).add(step.id));
    if (isLast) {
      navigate('/demo');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleVisit = () => {
    navigate(step.route);
  };

  const handleSkip = () => {
    navigate('/demo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50 dark:from-violet-950/20 dark:via-background dark:to-emerald-950/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 mb-4 shadow-lg"
          >
            <Sun className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Welcome to {brand.name}</h1>
          <p className="text-muted-foreground">
            Take a 5-minute tour. Click around — it's all demo data, nothing breaks.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{completed.size} completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="mb-4">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-violet-100 dark:bg-violet-950/40 rounded-xl flex-shrink-0">
                    <step.icon className="h-6 w-6 text-violet-700 dark:text-violet-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold">{step.title}</h2>
                      <Badge variant="outline" className="text-xs">{step.duration}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">What to do:</div>
                    <p className="text-sm text-blue-900 dark:text-blue-100">{step.whatToDo}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">What to look for:</div>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">{step.whatToLook}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleVisit} className="flex-1 bg-violet-600 hover:bg-violet-700 h-11">
                    Visit {step.title} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button onClick={handleNext} variant="outline" className="flex-1 h-11">
                    {isLast ? (
                      <>Finish tour <CheckCircle2 className="h-4 w-4 ml-2" /></>
                    ) : (
                      <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentStep ? 'w-8 bg-violet-600' :
                completed.has(s.id) ? 'w-2 bg-emerald-500' :
                'w-2 bg-muted-foreground/30'
              }`}
              aria-label={`Step ${i + 1}: ${s.title}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <button onClick={handleSkip} className="text-sm text-muted-foreground hover:text-foreground underline">
            Skip tour — just explore
          </button>
        </div>

        {/* Demo mode notice */}
        {demoActive && (
          <div className="mt-8 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg text-xs text-violet-800 dark:text-violet-300 text-center">
            <Lock className="h-3 w-3 inline mr-1" />
            You're in demo mode. No real data is loaded. When you sign up for real,
            you'll see your actual leads, products, and agents here.
          </div>
        )}
      </div>
    </div>
  );
}
