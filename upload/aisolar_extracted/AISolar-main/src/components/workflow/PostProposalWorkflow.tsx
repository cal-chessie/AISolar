import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Circle, 
  FileSignature, 
  CreditCard, 
  Calendar, 
  Award,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InstallationCalendar from '@/components/customer/InstallationCalendar';
import SEAIGrantTracker from '@/components/seai/SEAIGrantTracker';

interface PostProposalWorkflowProps {
  proposalId: string;
  leadId: string;
  contractSigned: boolean;
  depositPaid: boolean;
  installationScheduled: boolean;
  seaiStarted: boolean;
  systemSizeKw?: number;
  grantAmount?: number;
  propertyType?: string;
  preferredDates?: string[];
  onStepComplete?: (step: string) => void;
}

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  icon: typeof CheckCircle;
  completed: boolean;
}

export default function PostProposalWorkflow({
  proposalId,
  leadId,
  contractSigned,
  depositPaid,
  installationScheduled,
  seaiStarted,
  systemSizeKw,
  grantAmount,
  propertyType,
  preferredDates,
  onStepComplete
}: PostProposalWorkflowProps) {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const steps: WorkflowStep[] = [
    {
      id: 'contract',
      label: 'Sign Contract',
      description: 'Review and digitally sign the installation contract',
      icon: FileSignature,
      completed: contractSigned
    },
    {
      id: 'deposit',
      label: 'Pay Deposit',
      description: 'Secure your installation slot with a deposit payment',
      icon: CreditCard,
      completed: depositPaid
    },
    {
      id: 'schedule',
      label: 'Schedule Installation',
      description: 'Select your preferred installation dates',
      icon: Calendar,
      completed: installationScheduled
    },
    {
      id: 'seai',
      label: 'SEAI Grant Application',
      description: 'Start your grant application process',
      icon: Award,
      completed: seaiStarted
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const nextIncompleteStep = steps.find(s => !s.completed);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Installation Progress</CardTitle>
              <CardDescription>Complete these steps to proceed with your installation</CardDescription>
            </div>
            <Badge variant={completedCount === steps.length ? 'default' : 'secondary'}>
              {completedCount}/{steps.length} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg transition-colors",
                      activeStep === step.id && "bg-muted",
                      !step.completed && step.id === nextIncompleteStep?.id && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      step.completed 
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center max-w-[80px]",
                      step.completed && "text-green-600 dark:text-green-400"
                    )}>
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Active step content */}
          {activeStep === 'schedule' && (
            <div className="pt-4 border-t">
              <InstallationCalendar
                proposalId={proposalId}
                leadId={leadId}
                preferredDates={preferredDates}
                onDateSelected={() => onStepComplete?.('schedule')}
              />
            </div>
          )}

          {activeStep === 'seai' && (
            <div className="pt-4 border-t">
              <SEAIGrantTracker
                proposalId={proposalId}
                leadId={leadId}
                systemSizeKw={systemSizeKw}
                grantAmount={grantAmount}
                propertyType={propertyType}
              />
            </div>
          )}

          {activeStep === 'contract' && !contractSigned && (
            <div className="pt-4 border-t">
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center">
                  <FileSignature className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    The contract signing feature is available in the customer portal.
                  </p>
                  <Button variant="outline" disabled>
                    Contract signing available via customer portal
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeStep === 'deposit' && !depositPaid && (
            <div className="pt-4 border-t">
              <Card className="bg-muted/50">
                <CardContent className="pt-6 text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Deposit payment is available in the customer portal.
                  </p>
                  <Button variant="outline" disabled>
                    Payment available via customer portal
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Next action prompt */}
          {!activeStep && nextIncompleteStep && (
            <div className="pt-4 border-t">
              <Button 
                className="w-full" 
                onClick={() => setActiveStep(nextIncompleteStep.id)}
              >
                Continue: {nextIncompleteStep.label}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {completedCount === steps.length && (
            <div className="pt-4 border-t text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">All steps complete! Installation ready to proceed.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
