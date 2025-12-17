import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, MessageSquare, Phone, Calendar, FileText, 
  TrendingUp, AlertTriangle, Lightbulb, Copy, Check, ChevronDown,
  Target, Zap, DollarSign, Users, Award, ThumbsUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

interface CoachContext {
  page: string;
  leadId?: string;
  stage?: string;
  leadData?: LeadData | null;
}

interface LeadData {
  name: string;
  email: string;
  monthly_bill: number | null;
  property_type: string | null;
  workflow_stage: string | null;
  address: string | null;
  score: number | null;
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
  category: 'price' | 'timing' | 'technical' | 'trust';
}

interface ClosingTechnique {
  name: string;
  description: string;
  script: string;
  bestFor: string;
}

export default function PersistentAICoach() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<CoachContext>({ page: 'dashboard' });
  const [tips, setTips] = useState<Tip[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showObjections, setShowObjections] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  const [activeSection, setActiveSection] = useState<'tips' | 'objections' | 'closing' | 'stats'>('tips');
  const location = useLocation();

  // Extract lead ID from URL if present
  useEffect(() => {
    const path = location.pathname;
    let page = 'dashboard';
    let leadId: string | undefined;
    
    if (path.includes('/survey')) page = 'survey';
    else if (path.includes('/proposal')) page = 'proposal';
    else if (path.includes('/lead')) {
      page = 'lead';
      // Extract lead ID from path like /lead/123
      const match = path.match(/\/lead\/([^/]+)/);
      if (match) leadId = match[1];
    }
    else if (path.includes('/installer')) page = 'installer';
    else if (path.includes('/calendar')) page = 'calendar';
    else if (path.includes('/consultant')) page = 'dashboard';

    setContext(prev => ({ ...prev, page, leadId }));
    
    if (leadId) {
      fetchLeadData(leadId);
    } else {
      setContext(prev => ({ ...prev, leadData: null }));
      generateContextualTips(page, null);
    }
  }, [location.pathname]);

  const fetchLeadData = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('name, email, monthly_bill, property_type, workflow_stage, address, score')
        .eq('id', leadId)
        .single();

      if (!error && data) {
        setContext(prev => ({ ...prev, leadData: data }));
        generateContextualTips(context.page, data);
      }
    } catch (error) {
      console.error('Error fetching lead data:', error);
    }
  };

  const generateContextualTips = (page: string, leadData: LeadData | null) => {
    const baseTips: Record<string, Tip[]> = {
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

    let contextualTips = [...(baseTips[page] || baseTips.dashboard)];

    // Add lead-specific tips based on data
    if (leadData) {
      if (leadData.monthly_bill && leadData.monthly_bill >= 200) {
        contextualTips.unshift({
          id: 'lead-high-bill',
          title: `High-Value Lead: €${leadData.monthly_bill}/month`,
          content: `${leadData.name} pays €${leadData.monthly_bill} monthly - emphasise ROI and quick payback. Estimated annual savings: €${Math.round(leadData.monthly_bill * 12 * 0.7)}.`,
          type: 'opportunity'
        });
      }

      if (leadData.property_type === 'commercial') {
        contextualTips.unshift({
          id: 'lead-commercial',
          title: 'Commercial Property',
          content: 'Larger system potential with higher grants. Mention accelerated capital allowances for business tax benefits.',
          type: 'opportunity',
          copyText: '"As a business, you can claim accelerated capital allowances, effectively reducing your tax bill while generating free electricity."'
        });
      }

      if (leadData.score && leadData.score >= 4) {
        contextualTips.unshift({
          id: 'lead-hot',
          title: '⭐ Hot Lead - Act Fast!',
          content: `${leadData.name} is rated ${leadData.score}/5 stars. Prioritise this lead - schedule survey or present proposal today.`,
          type: 'action'
        });
      }

      if (leadData.workflow_stage === 'proposal' || leadData.workflow_stage === 'approved') {
        contextualTips.push({
          id: 'lead-closing',
          title: 'Closing Time',
          content: 'This lead is in proposal stage - use assumptive close: "When would you like us to schedule the installation?"',
          type: 'action',
          copyText: '"So the system looks perfect for your home. Let\'s get the installation booked - do mornings or afternoons work better for you?"'
        });
      }
    }

    setTips(contextualTips);
  };

  const objectionHandlers: ObjectionHandler[] = [
    {
      objection: '"It\'s too expensive"',
      response: 'With the €1,800 SEAI grant and 8-year payback, you\'re essentially getting free electricity for 17+ years. The system pays for itself, then keeps saving you money.',
      category: 'price'
    },
    {
      objection: '"I\'ll wait for technology to improve"',
      response: 'Solar technology is already mature at 21%+ efficiency. Waiting means missing today\'s grants and paying higher electricity costs. Panels from 10 years ago are still performing at 95%.',
      category: 'timing'
    },
    {
      objection: '"What about Irish weather?"',
      response: 'Ireland gets sufficient diffuse sunlight - our systems average 900kWh per kW annually. Germany, with similar weather, is Europe\'s solar leader. Panels work in cloudy conditions.',
      category: 'technical'
    },
    {
      objection: '"My roof isn\'t suitable"',
      response: 'Modern panels work on most roofs including east/west facing. Let\'s do a free site survey - we\'ll give you an honest assessment and exact figures for your situation.',
      category: 'technical'
    },
    {
      objection: '"I need to think about it"',
      response: 'Absolutely, it\'s a significant decision. What specific concerns can I address today? Many customers find that once they see the numbers, the decision becomes clearer.',
      category: 'timing'
    },
    {
      objection: '"I\'ve seen cheaper quotes"',
      response: 'Quality varies significantly. We use tier-1 panels with 25-year warranties and RECI-certified installers. Cheaper systems often use lower-grade equipment with shorter lifespans.',
      category: 'trust'
    },
    {
      objection: '"What if the company goes bust?"',
      response: 'Our manufacturer warranties are backed globally - they\'re from billion-euro companies like JA Solar and GoodWe. The panels themselves will last 25+ years regardless.',
      category: 'trust'
    },
    {
      objection: '"I\'m renting / planning to move"',
      response: 'Solar adds 4-6% to property value. Many homeowners install before selling to increase their asking price. For landlords, it attracts quality tenants and justifies higher rent.',
      category: 'price'
    }
  ];

  const closingTechniques: ClosingTechnique[] = [
    {
      name: 'Assumptive Close',
      description: 'Assume the sale and move to logistics',
      script: '"Great, so let\'s get your installation scheduled. Do mornings or afternoons work better for you?"',
      bestFor: 'Warm leads who have shown strong interest'
    },
    {
      name: 'Summary Close',
      description: 'Recap all benefits before asking for commitment',
      script: '"So to summarise: you\'ll save €[X] annually, get €1,800 off with the SEAI grant, and have a 6-year payback. The system then generates free electricity for 20+ years. Shall we proceed?"',
      bestFor: 'Detail-oriented customers who need reassurance'
    },
    {
      name: 'Urgency Close',
      description: 'Create time-sensitive motivation',
      script: '"The SEAI grant is currently €1,800, but budgets are reviewed annually. By booking now, you lock in today\'s rates. When can we schedule your installation?"',
      bestFor: 'Procrastinators or price-sensitive leads'
    },
    {
      name: 'Alternative Choice Close',
      description: 'Offer two positive options',
      script: '"Would you prefer the 10-panel system with battery, or the 14-panel system without? Both give excellent savings."',
      bestFor: 'Indecisive customers who need guidance'
    },
    {
      name: 'Deposit Close',
      description: 'Secure commitment with small upfront payment',
      script: '"A €500 deposit today secures your installation slot and current pricing. The balance isn\'t due until after completion. Does that work for you?"',
      bestFor: 'Converting interest to action in-person'
    }
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
      case 'action': return <Zap className="h-4 w-4" />;
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

  const getCategoryColor = (category: ObjectionHandler['category']) => {
    switch (category) {
      case 'price': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'timing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'technical': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'trust': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
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
                  <p className="text-xs text-muted-foreground">
                    {context.leadData ? context.leadData.name : getPageLabel(context.page)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Lead Context Banner */}
            {context.leadData && (
              <div className="px-4 py-3 bg-primary/5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{context.leadData.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {context.leadData.monthly_bill && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />€{context.leadData.monthly_bill}/mo
                        </span>
                      )}
                      {context.leadData.property_type && (
                        <Badge variant="outline" className="text-xs py-0">
                          {context.leadData.property_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {context.leadData.score && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < context.leadData!.score! ? 'text-yellow-500' : 'text-muted'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b px-2">
              {[
                { key: 'tips', label: 'Tips', icon: Lightbulb },
                { key: 'objections', label: 'Objections', icon: MessageSquare },
                { key: 'closing', label: 'Closing', icon: Target },
                { key: 'stats', label: 'Stats', icon: Award },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as typeof activeSection)}
                  className={`flex-1 py-2.5 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                    activeSection === key 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Contextual Tips */}
              {activeSection === 'tips' && (
                <div className="space-y-3">
                  {tips.map((tip) => (
                    <motion.div 
                      key={tip.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border ${getTipColor(tip.type)}`}
                    >
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
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Objection Handlers */}
              {activeSection === 'objections' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {['all', 'price', 'timing', 'technical', 'trust'].map((cat) => (
                      <Badge 
                        key={cat} 
                        variant="outline" 
                        className="cursor-pointer text-xs capitalize"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  {objectionHandlers.map((handler, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm text-foreground">{handler.objection}</p>
                        <Badge className={`text-xs ${getCategoryColor(handler.category)}`}>
                          {handler.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{handler.response}</p>
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
                </div>
              )}

              {/* Closing Techniques */}
              {activeSection === 'closing' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-4">
                    Choose the right closing technique based on your customer's personality and buying signals.
                  </p>
                  {closingTechniques.map((technique, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <p className="font-medium text-sm">{technique.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{technique.description}</p>
                      <div className="bg-muted/50 rounded p-2 mb-2">
                        <p className="text-xs italic">"{technique.script}"</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {technique.bestFor}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleCopy(technique.script, `close-${idx}`)}
                        >
                          {copiedId === `close-${idx}` ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              {activeSection === 'stats' && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-3">Key Numbers to Remember</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">SEAI Grant (Domestic)</p>
                        <p className="font-bold text-foreground text-lg">€1,800</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Typical Payback</p>
                        <p className="font-bold text-foreground text-lg">6-9 years</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Export Rate</p>
                        <p className="font-bold text-foreground text-lg">€0.21/kWh</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Panel Warranty</p>
                        <p className="font-bold text-foreground text-lg">25 years</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-3">Typical Annual Savings</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">€100/month bill</span>
                        <span className="font-medium">€600-€720/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">€200/month bill</span>
                        <span className="font-medium">€1,200-€1,440/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">€300/month bill</span>
                        <span className="font-medium">€1,800-€2,160/year</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-3">System Sizing Guide</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">1-2 bed apartment</span>
                        <span className="font-medium">2-3 kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">3-4 bed house</span>
                        <span className="font-medium">4-6 kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Large house / EV</span>
                        <span className="font-medium">8-10 kW</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
