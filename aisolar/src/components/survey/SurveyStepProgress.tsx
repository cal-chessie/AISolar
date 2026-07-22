/**
 * Survey stepper — compact, cal.com-clear.
 *
 * Was: a gradient hero card (big icon tile + pills + description) stacked on a
 * progress bar, step dots AND a second "Step X of Y" block with two h-14
 * buttons in the fixed footer — chrome ate half the phone screen (Cal's exact
 * complaint). Now: ONE slim header row (dots + current step + % complete) and
 * ONE slim nav row. The content is the star, not the stepper.
 */
import {
  CheckCircle, User, Home, TreePine, Zap, Target, Camera, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SurveyStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const SURVEY_STEPS: SurveyStep[] = [
  { id: 'customer', label: 'Customer Info', shortLabel: 'Info', icon: <User size={16} />, description: 'Basic lead information' },
  { id: 'goals', label: 'Customer Goals', shortLabel: 'Goals', icon: <Target size={16} />, description: 'Energy needs & preferences' },
  { id: 'roof', label: 'Roof Details', shortLabel: 'Roof', icon: <Home size={16} />, description: 'Roof type, condition & orientation' },
  { id: 'environmental', label: 'Environmental', shortLabel: 'Env', icon: <TreePine size={16} />, description: 'Shading & obstructions' },
  { id: 'electrical', label: 'Electrical', shortLabel: 'Elec', icon: <Zap size={16} />, description: 'Panel capacity & consumption' },
  { id: 'installation', label: 'Installation', shortLabel: 'Install', icon: <Settings size={16} />, description: 'Access & logistics' },
  { id: 'photos', label: 'Site Photos', shortLabel: 'Photos', icon: <Camera size={16} />, description: 'Capture required photos' },
];

interface SurveyStepProgressProps {
  currentStep: number;
  completedSteps: string[];
  onStepChange?: (step: number) => void;
  className?: string;
  showNavigation?: boolean;
}

/** Slim prev/next — one row, normal-height controls, no duplicate step pill. */
export function SurveyStepNavigation({
  currentStep,
  totalSteps,
  onStepChange,
}: {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
}) {
  const next = SURVEY_STEPS[currentStep];
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => currentStep > 1 && onStepChange(currentStep - 1)}
        disabled={currentStep <= 1}
        className="h-9 px-3"
        aria-label="Previous step"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
        {currentStep}/{totalSteps}
      </span>
      <Button
        size="sm"
        onClick={() => currentStep < totalSteps && onStepChange(currentStep + 1)}
        disabled={currentStep >= totalSteps}
        className="h-9 px-3"
      >
        {currentStep < totalSteps ? <>Next{next ? `: ${next.shortLabel}` : ''} <ChevronRight className="ml-1 h-4 w-4" /></> : <>Review</>}
      </Button>
    </div>
  );
}

export default function SurveyStepProgress({
  currentStep,
  completedSteps,
  onStepChange,
  className,
  showNavigation = false,
}: SurveyStepProgressProps) {
  const currentStepData = SURVEY_STEPS[currentStep - 1];
  const pct = Math.round((completedSteps.length / SURVEY_STEPS.length) * 100);

  return (
    <div className={cn('space-y-2', className)}>
      {/* One row: current step identity + completion */}
      <div className="flex items-center gap-2.5">
        <span className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
          {currentStepData?.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold truncate">{currentStepData?.label || 'Survey'}</h3>
            <span className="text-2xs tabular-nums text-muted-foreground shrink-0">
              step {currentStep} of {SURVEY_STEPS.length} · {pct}% complete
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{currentStepData?.description}</p>
        </div>
      </div>

      {/* Step dots — clickable, one row, both breakpoints */}
      <div className="flex items-center gap-1">
        {SURVEY_STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = stepNum === currentStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange?.(stepNum)}
              aria-label={`${step.label}${isCompleted ? ' (complete)' : ''}`}
              className={cn(
                'group flex-1 h-7 rounded-md grid place-items-center transition-colors',
                onStepChange && 'cursor-pointer',
                isCurrent ? 'bg-primary text-primary-foreground'
                  : isCompleted ? 'bg-doc-deposit/15 text-doc-deposit hover:bg-doc-deposit/25'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              <span className="hidden sm:flex items-center gap-1 text-2xs font-medium">
                {isCompleted && !isCurrent ? <CheckCircle size={11} /> : null}
                {step.shortLabel}
              </span>
              <span className="sm:hidden text-2xs font-medium">{isCompleted && !isCurrent ? <CheckCircle size={11} /> : stepNum}</span>
            </button>
          );
        })}
      </div>

      {showNavigation && onStepChange && (
        <SurveyStepNavigation currentStep={currentStep} totalSteps={SURVEY_STEPS.length} onStepChange={onStepChange} />
      )}
    </div>
  );
}

export { SURVEY_STEPS };
