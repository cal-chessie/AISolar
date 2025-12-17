import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  User, 
  ClipboardList, 
  FileText, 
  CheckCircle, 
  Wrench, 
  CreditCard,
  X,
  ChevronRight,
  Calendar,
  MapPin,
  Zap,
  Sun,
  Battery,
  TrendingUp,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const demoCustomer = {
  name: 'Michael & Sarah O\'Brien',
  email: 'obriens@email.com',
  phone: '086 123 4567',
  address: '42 Sunnydale Drive, Blackrock, Dublin',
  monthlyBill: 245,
  annualConsumption: 8400,
};

const workflowStages = [
  {
    id: 'lead',
    title: 'Lead Captured',
    icon: User,
    date: '15 Nov 2024',
    status: 'completed',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    details: [
      'Customer submitted bill via AI Analyser',
      `Monthly bill: €${demoCustomer.monthlyBill}`,
      `Annual consumption: ${demoCustomer.annualConsumption.toLocaleString()} kWh`,
      'AI recommended: 6.6kW system',
    ],
  },
  {
    id: 'survey',
    title: 'Site Survey',
    icon: ClipboardList,
    date: '18 Nov 2024',
    status: 'completed',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
    details: [
      'Roof: South-facing pitched, slate tiles',
      'Condition: Excellent, no shading',
      'Electrical panel: 63A, good condition',
      '12 photos captured on-site',
      'Recommended: 16x 415W panels',
    ],
  },
  {
    id: 'proposal',
    title: 'Proposal Created',
    icon: FileText,
    date: '19 Nov 2024',
    status: 'completed',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
    details: [
      'System: 6.64kW (16x JA Solar 415W)',
      'Inverter: Huawei SUN2000-6KTL',
      'Battery: 10kWh Huawei LUNA2000',
      'Total cost: €14,200',
      'SEAI Grant: €2,100',
      'Net cost: €12,100',
    ],
  },
  {
    id: 'approved',
    title: 'Contract Signed',
    icon: CheckCircle,
    date: '22 Nov 2024',
    status: 'completed',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10 dark:bg-green-500/20',
    details: [
      'Customer reviewed proposal in portal',
      'Digital signature captured',
      'GDPR consent confirmed',
      '30% deposit paid: €3,630',
      'Installation dates selected',
    ],
  },
  {
    id: 'installation',
    title: 'Installation Complete',
    icon: Wrench,
    date: '5 Dec 2024',
    status: 'completed',
    color: 'text-primary',
    bgColor: 'bg-primary/10 dark:bg-primary/20',
    details: [
      '2-day installation completed',
      'All checklist items verified',
      'System commissioned & online',
      'Customer app configured',
      'Installer & customer signatures captured',
    ],
  },
  {
    id: 'paid',
    title: 'Paid & SEAI Filed',
    icon: CreditCard,
    date: '8 Dec 2024',
    status: 'completed',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    details: [
      'Final balance paid: €8,470',
      'SEAI application submitted',
      'Grant approved: €2,100',
      'BER certificate uploaded',
      'Customer satisfaction: ⭐⭐⭐⭐⭐',
    ],
  },
];

const savingsData = {
  monthlySavings: 165,
  annualSavings: 1980,
  paybackYears: 6.1,
  co2Saved: 3.2,
  treesEquivalent: 147,
  systemProduction: 6300,
};

export default function DemoWorkflowJourney() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5">
          <Play size={16} />
          View Demo Journey
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            Complete Customer Journey Demo
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Customer Info Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 mb-6"
          >
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{demoCustomer.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin size={14} />
                  {demoCustomer.address}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <Zap size={12} />
                  AI Lead
                </Badge>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Completed
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Workflow Timeline */}
          <div className="relative">
            {workflowStages.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex gap-4 pb-6"
              >
                {/* Timeline Line */}
                {index < workflowStages.length - 1 && (
                  <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-20px)] bg-gradient-to-b from-primary/50 to-primary/20" />
                )}

                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${stage.bgColor} flex items-center justify-center`}>
                  <stage.icon className={`h-5 w-5 ${stage.color}`} />
                </div>

                {/* Content */}
                <div 
                  className={`flex-1 p-4 rounded-xl border transition-all cursor-pointer ${
                    activeStage === stage.id 
                      ? 'bg-muted border-primary/30 shadow-md' 
                      : 'bg-card border-border hover:border-primary/20 hover:shadow-sm'
                  }`}
                  onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-foreground">{stage.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        <Calendar size={10} className="mr-1" />
                        {stage.date}
                      </Badge>
                    </div>
                    <ChevronRight 
                      size={18} 
                      className={`text-muted-foreground transition-transform ${activeStage === stage.id ? 'rotate-90' : ''}`} 
                    />
                  </div>
                  
                  <AnimatePresence>
                    {activeStage === stage.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <ul className="space-y-1.5">
                          {stage.details.map((detail, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle size={14} className="text-primary flex-shrink-0 mt-0.5" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Results Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-green-500/10 border border-primary/20"
          >
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Project Outcomes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-primary">€{savingsData.monthlySavings}</div>
                <div className="text-xs text-muted-foreground">Monthly Savings</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{savingsData.paybackYears} yrs</div>
                <div className="text-xs text-muted-foreground">Payback Period</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{savingsData.systemProduction.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">kWh/Year</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">€{savingsData.annualSavings.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Annual Savings</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{savingsData.co2Saved}t</div>
                <div className="text-xs text-muted-foreground">CO₂ Saved/Year</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">🌳 {savingsData.treesEquivalent}</div>
                <div className="text-xs text-muted-foreground">Trees Equivalent</div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <div className="mt-6 flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              This demo shows a typical 3-week journey from initial enquiry to installed solar system.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
