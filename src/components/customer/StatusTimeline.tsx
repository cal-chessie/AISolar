import { CheckCircle, Circle, Clock, FileText, Calendar, CreditCard, Wrench, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusTimelineProps {
  currentStage: string;
  proposalStatus?: string;
  contractSigned?: boolean;
  depositPaid?: boolean;
  installationScheduled?: boolean;
}

const CUSTOMER_STAGES = [
  { id: 'proposal', label: 'Proposal Sent', icon: FileText, description: 'Your solar proposal is ready' },
  { id: 'contract', label: 'Contract Signed', icon: CheckCircle, description: 'Agreement confirmed' },
  { id: 'deposit', label: 'Deposit Paid', icon: CreditCard, description: '30% deposit received' },
  { id: 'scheduled', label: 'Installation Scheduled', icon: Calendar, description: 'Date confirmed' },
  { id: 'installing', label: 'Installation', icon: Wrench, description: 'Work in progress' },
  { id: 'complete', label: 'Complete', icon: PartyPopper, description: 'Enjoy your solar!' },
];

export default function StatusTimeline({ 
  currentStage, 
  proposalStatus,
  contractSigned,
  depositPaid,
  installationScheduled 
}: StatusTimelineProps) {
  // Determine current step based on actual data
  const getCurrentStep = () => {
    if (currentStage === 'installed' || currentStage === 'complete') return 5;
    if (installationScheduled) return 4;
    if (depositPaid) return 3;
    if (contractSigned || proposalStatus === 'approved') return 2;
    if (proposalStatus === 'presented' || proposalStatus === 'ready') return 1;
    return 0;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="w-full">
      {/* Desktop Timeline */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute left-0 right-0 top-6 h-0.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStep / (CUSTOMER_STAGES.length - 1)) * 100}%` }}
          />
        </div>

        {CUSTOMER_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={stage.id} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/30",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className={cn(
                "mt-2 text-xs font-medium text-center max-w-[80px]",
                isCurrent && "text-primary",
                isPending && "text-muted-foreground"
              )}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile Timeline */}
      <div className="md:hidden space-y-4">
        {CUSTOMER_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={stage.id} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/30",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {index < CUSTOMER_STAGES.length - 1 && (
                  <div className={cn(
                    "w-0.5 h-8 mt-2",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
              <div className="flex-1 pt-1">
                <h4 className={cn(
                  "font-medium text-sm",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}>
                  {stage.label}
                </h4>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}