import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, MessageSquare, Phone, Calendar, FileText, 
  TrendingUp, AlertTriangle, Lightbulb, Copy, Check, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface CoachContext {
  page: string;
  leadId?: string;
  stage?: string;
}

interface Tip {
  id: string;
  title: string;
  content: string;
  type: 'tip' | 'action' | 'warning' | 'opportunity';
  copyText?: string;
}

interface ObjectionHandler {
  objection: string;
  response: string;
}

export default function PersistentAICoach() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<CoachContext>({ page: 'dashboard' });
  const [tips, setTips] = useState<Tip[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showObjections, setShowObjections] = useState(false);
  const location = useLocation();

  // Determine context from current route
  useEffect(() => {
    const path = location.pathname;
    let page = 'dashboard';
    
    if (path.includes('/survey')) page = 'survey';
    else if (path.includes('/proposal')) page = 'proposal';
    else if (path.includes('/lead')) page = 'lead';
    else if (path.includes('/installer')) page = 'installer';
    else if (path.includes('/calendar')) page = 'calendar';

    setContext(prev => ({ ...prev, page }));
    generateContextualTips(page);
  }, [location.pathname]);

  const generateContextualTips = (page: string) => {
    const contextTips: Record<string, Tip[]> = {
      dashboard: [
        {
          id: '1',
          title: 'Prioritise Hot Leads',
          content: 'Focus on leads with €200+ monthly bills first - they have the strongest ROI case and convert 2x faster.',
          type: 'opportunity'
        },
        {
          id: '2',
          title: 'Follow-up Timing',
          content: 'Best response rates are Tuesday-Thursday, 10am-12pm and 2pm-4pm. Avoid Monday mornings.',
          type: 'tip'
        },
        {
          id: '3',
          title: 'Quick Action',
          content: 'Leads contacted within 5 minutes of enquiry are 9x more likely to convert.',
          type: 'action'
        }
      ],
      survey: [
        {
          id: '1',
          title: 'Photo Documentation',
          content: 'Take photos of the roof from multiple angles. Clear photos reduce installation delays by 40%.',
          type: 'action'
        },
        {
          id: '2',
          title: 'Electrical Assessment',
          content: 'Check main fuse size (63A+ ideal). Upgrades needed for 80% of 40A systems.',
          type: 'warning'
        },
        {
          id: '3',
          title: 'Customer Engagement',
          content: 'Explain what you\'re checking as you go - builds trust and reduces objections later.',
          type: 'tip'
        },
        {
          id: '4',
          title: 'Upsell Opportunity',
          content: 'If they have an EV or plan to get one, mention the diverter integration savings.',
          type: 'opportunity',
          copyText: '"With your electric vehicle, a hot water diverter could save an additional €300-400 annually by using excess solar."'
        }
      ],
      proposal: [
        {
          id: '1',
          title: 'Present Savings First',
          content: 'Lead with annual savings (€600-1,200), then system cost. Positive framing increases acceptance by 35%.',
          type: 'tip'
        },
        {
          id: '2',
          title: 'SEAI Grant Urgency',
          content: 'Grant budgets can change annually. Emphasise securing current rates.',
          type: 'opportunity',
          copyText: '"The €1,800 SEAI grant is available now - locking in today means you\'re guaranteed this rate."'
        },
        {
          id: '3',
          title: 'Payment Options',
          content: 'Offering a deposit option increases same-day close rate by 60%.',
          type: 'action'
        },
        {
          id: '4',
          title: 'Comparison Anchor',
          content: 'Compare monthly savings to a familiar expense: "That\'s like getting free Netflix, gym, and streaming for 25 years."',
          type: 'tip',
          copyText: '"Your €85 monthly savings is like getting Netflix, a gym membership, and your streaming services completely free - for 25 years."'
        }
      ],
      lead: [
        {
          id: '1',
          title: 'Build Rapport First',
          content: 'Ask about their home and energy usage before discussing solar. People buy from people they trust.',
          type: 'tip'
        },
        {
          id: '2',
          title: 'Qualify the Lead',
          content: 'Key questions: Bill amount? Roof condition? Timeline? Ownership status?',
          type: 'action',
          copyText: '"Before we dive in, could you tell me roughly what you\'re paying on electricity monthly? And are you the homeowner?"'
        },
        {
          id: '3',
          title: 'Site Survey Pitch',
          content: 'Offer the free survey as the next step - removes commitment pressure while advancing the sale.',
          type: 'opportunity',
          copyText: '"The next step is a free, no-obligation site survey. We\'ll give you exact figures for your home - no commitment needed."'
        }
      ],
      calendar: [
        {
          id: '1',
          title: 'Schedule Efficiently',
          content: 'Group surveys by area to maximise daily capacity. 4-5 surveys per day is optimal.',
          type: 'tip'
        },
        {
          id: '2',
          title: 'Confirmation Calls',
          content: 'Call the day before to confirm. Reduces no-shows by 70%.',
          type: 'action'
        }
      ],
      installer: [
        {
          id: '1',
          title: 'Pre-Install Check',
          content: 'Review survey photos and notes before arrival. Reduces surprises on-site.',
          type: 'action'
        },
        {
          id: '2',
          title: 'Customer Handover',
          content: 'Walk customer through app setup before leaving. Reduces support calls by 50%.',
          type: 'tip'
        }
      ]
    };

    setTips(contextTips[page] || contextTips.dashboard);
  };

  const objectionHandlers: ObjectionHandler[] = [
    {
      objection: '"It\'s too expensive"',
      response: 'With the €1,800 SEAI grant and 8-year payback, you\'re essentially getting free electricity for 17+ years. The system pays for itself, then keeps saving you money.',
    },
    {
      objection: '"I\'ll wait for technology to improve"',
      response: 'Solar technology is already mature at 21%+ efficiency. Waiting means missing today\'s grants and paying higher electricity costs. Panels from 10 years ago are still performing at 95%.',
    },
    {
      objection: '"What about Irish weather?"',
      response: 'Ireland gets sufficient diffuse sunlight - our systems average 900kWh per kW annually. Germany, with similar weather, is Europe\'s solar leader. Panels work in cloudy conditions.',
    },
    {
      objection: '"My roof isn\'t suitable"',
      response: 'Modern panels work on most roofs including east/west facing. Let\'s do a free site survey - we\'ll give you an honest assessment and exact figures for your situation.',
    },
    {
      objection: '"I need to think about it"',
      response: 'Absolutely, it\'s a significant decision. What specific concerns can I address today? Many customers find that once they see the numbers, the decision becomes clearer.',
    },
    {
      objection: '"I\'ve seen cheaper quotes"',
      response: 'Quality varies significantly. We use tier-1 panels with 25-year warranties and RECI-certified installers. Cheaper systems often use lower-grade equipment with shorter lifespans.',
    },
  ];

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTipIcon = (type: Tip['type']) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'action': return <Phone className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'tip': return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTipColor = (type: Tip['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300';
      case 'action': return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300';
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300';
      case 'tip': return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300';
    }
  };

  const getPageLabel = (page: string) => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      survey: 'Site Survey',
      proposal: 'Proposal',
      lead: 'Lead Details',
      calendar: 'Calendar',
      installer: 'Installation'
    };
    return labels[page] || 'General';
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-emerald-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform lg:bottom-6"
          >
            <Sparkles size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Coach Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-emerald-500/10">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-emerald-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">AI Sales Coach</h2>
                  <p className="text-xs text-muted-foreground">Context: {getPageLabel(context.page)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Contextual Tips */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Tips for {getPageLabel(context.page)}
                </h3>
                {tips.map((tip) => (
                  <div key={tip.id} className={`p-3 rounded-lg border ${getTipColor(tip.type)}`}>
                    <div className="flex items-start gap-2">
                      {getTipIcon(tip.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{tip.title}</p>
                        <p className="text-xs mt-1 opacity-90">{tip.content}</p>
                        {tip.copyText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => handleCopy(tip.copyText!, tip.id)}
                          >
                            {copiedId === tip.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copy Script
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Objection Handlers */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowObjections(!showObjections)}
                  className="w-full text-sm font-semibold text-foreground flex items-center justify-between py-2"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Objection Handlers
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showObjections ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showObjections && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {objectionHandlers.map((handler, idx) => (
                        <Card key={idx} className="p-3">
                          <p className="font-medium text-sm text-foreground">{handler.objection}</p>
                          <p className="text-xs text-muted-foreground mt-1">{handler.response}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => handleCopy(handler.response, `obj-${idx}`)}
                          >
                            {copiedId === `obj-${idx}` ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copy Response
                          </Button>
                        </Card>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Stats */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Key Numbers to Remember</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">SEAI Grant (Domestic)</p>
                    <p className="font-bold text-foreground">€1,800</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Typical Payback</p>
                    <p className="font-bold text-foreground">6-9 years</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Export Rate</p>
                    <p className="font-bold text-foreground">€0.21/kWh</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Panel Warranty</p>
                    <p className="font-bold text-foreground">25 years</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
