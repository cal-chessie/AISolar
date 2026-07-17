import { CheckCircle, Circle, Clock, FileText, Calendar, CreditCard, Wrench, PartyPopper, FileCheck, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusTimelineProps {
  currentStage: string;
  proposalStatus?: string;
  contractSigned?: boolean;
  depositPaid?: boolean;
  installationScheduled?: boolean;
  installationInProgress?: boolean;
  installationComplete?: boolean;
  finalPaymentPaid?: boolean;
  seaiApplicationStarted?: boolean;
}

const CUSTOMER_STAGES = [
  { id: 'proposal', label: 'Proposal Sent', icon: FileText, description: 'Your solar proposal is ready' },
  { id: 'contract', label: 'Contract Signed', icon: CheckCircle, description: 'Agreement confirmed' },
  { id: 'deposit', label: 'Deposit Paid', icon: CreditCard, description: '30% deposit received' },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar, description: 'Installation date confirmed' },
  { id: 'installing', label: 'Installing', icon: Wrench, description: 'Work in progress' },
  { id: 'installed', label: 'Installed', icon: CheckCircle, description: 'Installation complete' },
  { id: 'final_payment', label: 'Final Payment', icon: Banknote, description: 'Balance paid' },
  { id: 'seai', label: 'SEAI Grant', icon: FileCheck, description: 'Grant application' },
  { id: 'complete', label: 'Complete', icon: PartyPopper, description: 'Enjoy your solar!' },
];

export default function StatusTimeline({ 
  currentStage, 
  proposalStatus,
  contractSigned,
  depositPaid,
  installationScheduled,
  installationInProgress,
  installationComplete,
  finalPaymentPaid,
  seaiApplicationStarted
}: StatusTimelineProps) {
  // Determine current step based on actual data
  const getCurrentStep = () => {
    if (currentStage === 'complete' || (finalPaymentPaid && seaiApplicationStarted)) return 8;
    if (seaiApplicationStarted) return 7;
    if (finalPaymentPaid) return 6;
    if (installationComplete) return 5;
    if (installationInProgress) return 4;
    if (installationScheduled) return 3;
    if (depositPaid) return 2;
    if (contractSigned || proposalStatus === 'approved') return 1;
    if (proposalStatus === 'presented' || proposalStatus === 'ready') return 0;
    return 0;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="w-full">
      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative">
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
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
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
                <span className={cn(
                  "mt-2 text-[10px] font-medium text-center max-w-[60px] leading-tight",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Timeline - Compact */}
      <div className="md:hidden">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{Math.round((currentStep / (CUSTOMER_STAGES.length - 1)) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep / (CUSTOMER_STAGES.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Current stage highlight */}
        <div className="bg-primary/10 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              {(() => {
                const CurrentIcon = CUSTOMER_STAGES[currentStep]?.icon || Circle;
                return <CurrentIcon className="h-5 w-5" />;
              })()}
            </div>
            <div>
              <p className="font-semibold text-sm">{CUSTOMER_STAGES[currentStep]?.label || 'In Progress'}</p>
              <p className="text-xs text-muted-foreground">{CUSTOMER_STAGES[currentStep]?.description}</p>
            </div>
          </div>
        </div>

        {/* Stage pills */}
        <div className="flex flex-wrap gap-1.5">
          {CUSTOMER_STAGES.map((stage, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div 
                key={stage.id}
                className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-medium transition-all",
                  isCompleted && "bg-primary/20 text-primary",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? '✓' : ''} {stage.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
