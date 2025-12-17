import { useState, useEffect } from 'react';
import { Zap, TrendingUp, Phone, Calendar, AlertTriangle, Lightbulb, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { calculateGrant, calculateROI, type PropertyType } from '@/lib/grantCalculations';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  monthly_bill?: number;
  score?: number;
  workflow_stage?: string;
  property_type?: PropertyType;
  created_at: string;
}

interface DynamicAISalesCoachProps {
  leadId: string;
}

interface CoachingInsight {
  type: 'opportunity' | 'action' | 'warning' | 'tip';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

export default function DynamicAISalesCoach({ leadId }: DynamicAISalesCoachProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leadId) {
      loadLeadData();
    }
  }, [leadId]);

  const loadLeadData = async () => {
    setLoading(true);
    try {
      // Fetch lead with related data
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadData) {
        setLead({
          ...leadData,
          property_type: (leadData.property_type as PropertyType) || 'residential'
        });

        // Fetch survey
        const { data: surveyData } = await supabase
          .from('site_surveys')
          .select('*')
          .eq('lead_id', leadId)
          .maybeSingle();
        setSurvey(surveyData);

        // Fetch proposal
        const { data: proposalData } = await supabase
          .from('proposals')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .maybeSingle();
        setProposal(proposalData);
      }
    } catch (error) {
      console.error('Error loading lead data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (): CoachingInsight[] => {
    if (!lead) return [];

    const insights: CoachingInsight[] = [];
    const monthlyBill = lead.monthly_bill || 0;
    const propertyType = (lead.property_type || 'residential') as PropertyType;
    const daysSinceCreation = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

    // High-value opportunity
    if (monthlyBill >= 200) {
      const estimatedSystemSize = Math.round((monthlyBill / 0.35 * 12) / 900);
      const roi = calculateROI(estimatedSystemSize, monthlyBill / 0.35 * 12, 0.35, propertyType);
      const grant = calculateGrant(estimatedSystemSize, propertyType);

      insights.push({
        type: 'opportunity',
        title: 'High-Value Opportunity',
        content: `€${monthlyBill}/month bill suggests ${estimatedSystemSize}kW system. Potential savings of €${roi.annualSavings}/year with €${grant.grantAmount} SEAI grant.`,
        priority: 'high'
      });
    }

    // Survey status insights
    if (!survey) {
      insights.push({
        type: 'action',
        title: 'Schedule Site Survey',
        content: 'No site survey completed. Schedule within 48 hours to maintain momentum. Surveys convert 3x better than phone quotes.',
        priority: 'high'
      });
    } else if (survey.status === 'draft' || survey.status === 'in_progress') {
      insights.push({
        type: 'warning',
        title: 'Incomplete Survey',
        content: `Survey is ${survey.status === 'draft' ? 'started but not progressed' : 'in progress'}. Follow up to complete assessment.`,
        priority: 'medium'
      });
    }

    // Proposal status
    if (survey?.status === 'completed' && !proposal) {
      insights.push({
        type: 'action',
        title: 'Generate Proposal',
        content: 'Survey complete but no proposal created. Generate proposal immediately to maintain sales momentum.',
        priority: 'high'
      });
    }

    if (proposal?.status === 'draft' && daysSinceCreation > 3) {
      insights.push({
        type: 'warning',
        title: 'Stale Proposal',
        content: `Draft proposal pending for ${daysSinceCreation} days. Present to customer within 48 hours or risk losing interest.`,
        priority: 'high'
      });
    }

    // Commercial-specific insights
    if (propertyType !== 'residential') {
      insights.push({
        type: 'tip',
        title: 'Commercial Opportunity',
        content: 'Commercial installations have higher margins. Emphasize tax benefits (accelerated capital allowances) and operational cost savings.',
        priority: 'medium'
      });
    }

    // Lead score insights
    if (lead.score && lead.score >= 4) {
      insights.push({
        type: 'opportunity',
        title: 'Hot Lead',
        content: `${lead.score}-star rating indicates high intent. Prioritize this lead and consider offering installation timeline guarantee.`,
        priority: 'high'
      });
    } else if (lead.score && lead.score <= 2) {
      insights.push({
        type: 'tip',
        title: 'Nurture Required',
        content: 'Lower lead score. Focus on education: share case studies, ROI calculators, and testimonials to build confidence.',
        priority: 'low'
      });
    }

    // Time-based urgency
    if (daysSinceCreation > 7 && lead.workflow_stage === 'new') {
      insights.push({
        type: 'warning',
        title: 'Follow-Up Overdue',
        content: `Lead created ${daysSinceCreation} days ago with no stage change. Contact immediately - response rate drops 80% after 7 days.`,
        priority: 'high'
      });
    }

    // Grant deadline awareness (seasonal)
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 9 || currentMonth <= 2) { // Oct-Feb
      insights.push({
        type: 'tip',
        title: 'Year-End Push',
        content: 'Mention SEAI grant budget cycles. Customers who commit now can lock in current grant rates before potential changes.',
        priority: 'medium'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const generateTalkingPoints = () => {
    if (!lead) return [];
    
    const points = [];
    const monthlyBill = lead.monthly_bill || 0;
    const propertyType = (lead.property_type || 'residential') as PropertyType;
    const grant = calculateGrant(6, propertyType);

    points.push(`€${grant.grantAmount} SEAI grant available now`);
    
    if (monthlyBill > 0) {
      const annualBill = monthlyBill * 12;
      points.push(`Currently spending €${annualBill.toLocaleString()}/year on electricity`);
    }

    points.push('8-10 year typical payback period');
    points.push('25-year panel warranty standard');
    points.push('Microgeneration export scheme (€0.21/kWh)');

    if (propertyType !== 'residential') {
      points.push('Accelerated capital allowances for businesses');
    }

    return points;
  };

  const generateObjectionHandlers = () => {
    return [
      {
        objection: '"It\'s too expensive"',
        response: 'With the €1,800 SEAI grant and 8-year payback, you\'re essentially getting free electricity for 17+ years. The system pays for itself, then keeps saving.',
      },
      {
        objection: '"I\'ll wait for technology to improve"',
        response: 'Solar technology is mature and efficient. Current panels achieve 21%+ efficiency. Waiting means missing out on today\'s grants and rising electricity costs.',
      },
      {
        objection: '"My roof isn\'t suitable"',
        response: 'Let\'s do a free site survey. Modern panels work on most roofs including east/west facing. We\'ll give you an honest assessment.',
      },
      {
        objection: '"What about cloudy Irish weather?"',
        response: 'Ireland gets sufficient diffuse sunlight. Our systems average 900kWh per kW annually. Panels work in cloudy conditions - just at reduced output.',
      },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="mx-auto mb-4 text-muted-foreground/50" size={48} />
        <p>Select a lead to get AI coaching</p>
      </div>
    );
  }

  const insights = generateInsights();
  const talkingPoints = generateTalkingPoints();
  const objectionHandlers = generateObjectionHandlers();

  const getInsightIcon = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'action': return <Phone className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'tip': return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300';
      case 'action': return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300';
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300';
      case 'tip': return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="text-primary" size={24} />
        <h3 className="text-xl font-bold text-foreground">AI Sales Coach</h3>
      </div>

      {/* Lead Summary */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="font-medium text-foreground">{lead.name}</p>
        <p className="text-sm text-muted-foreground">
          {lead.monthly_bill ? `€${lead.monthly_bill}/month` : 'No bill data'} • {lead.property_type || 'Residential'}
        </p>
        {lead.score && (
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={star <= lead.score! ? 'text-yellow-400' : 'text-gray-300'}>★</span>
            ))}
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1">
          <Lightbulb className="h-4 w-4" />
          Insights & Actions
        </h4>
        {insights.slice(0, 4).map((insight, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
          >
            <div className="flex items-start gap-2">
              {getInsightIcon(insight.type)}
              <div>
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs mt-1 opacity-90">{insight.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Talking Points */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Key Points
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <ul className="text-sm space-y-1">
            {talkingPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-primary mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Objection Handlers */}
      <details className="group">
        <summary className="cursor-pointer font-semibold text-sm text-foreground flex items-center gap-1 py-2">
          <AlertTriangle className="h-4 w-4" />
          Objection Handlers
          <span className="text-xs text-muted-foreground ml-auto group-open:hidden">Show</span>
        </summary>
        <div className="space-y-2 mt-2">
          {objectionHandlers.map((handler, idx) => (
            <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium text-foreground">{handler.objection}</p>
              <p className="text-muted-foreground mt-1 text-xs">{handler.response}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
