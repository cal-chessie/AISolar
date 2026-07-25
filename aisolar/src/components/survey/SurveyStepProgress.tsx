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
  CheckCircle, User, Home, Zap, Target, Camera, Settings, Users,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type StepTone = 'tech' | 'deposit' | 'pop';

interface SurveyStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
  tone: StepTone;
}

// Cal's family-colour map: confirm/roof/electrical = blue, occupancy/goal =
// green, installation/photos = red. Each step's chip lights up in its own hue.
const SURVEY_STEPS: SurveyStep[] = [
  { id: 'confirm', label: 'Confirm details', shortLabel: 'Confirm', icon: <CheckCircle size={16} />, description: "Check the bill pulled their details through", tone: 'tech' },
  { id: 'occupancy', label: "Who's in the home", shortLabel: 'Occupancy', icon: <Users size={16} />, description: 'The answer that drives the savings', tone: 'deposit' },
  { id: 'goal', label: "What's the goal?", shortLabel: 'Goal', icon: <Target size={16} />, description: 'Battery, EV, hot water, priorities', tone: 'deposit' },
  { id: 'roof', label: 'Roof & shading', shortLabel: 'Roof', icon: <Home size={16} />, description: 'Type, pitch, orientation, shading', tone: 'tech' },
  { id: 'electrical', label: 'Electrical', shortLabel: 'Electrical', icon: <Zap size={16} />, description: 'Panel, meter, grid connection', tone: 'tech' },
  { id: 'installation', label: 'Installation', shortLabel: 'Install', icon: <Settings size={16} />, description: 'Access, scaffolding, logistics', tone: 'pop' },
  { id: 'photos', label: 'Site photos', shortLabel: 'Photos', icon: <Camera size={16} />, description: 'The evidence pack', tone: 'pop' },
];

const STEP_TONE: Record<StepTone, { active: string; done: string; iconBg: string }> = {
  tech:    { active: 'bg-tech text-white ring-2 ring-tech/30 shadow-md shadow-tech/20',                   done: 'bg-tech/15 text-tech hover:bg-tech/25',                   iconBg: 'bg-tech' },
  deposit: { active: 'bg-doc-deposit text-white ring-2 ring-doc-deposit/30 shadow-md shadow-doc-deposit/20', done: 'bg-doc-deposit/15 text-doc-deposit hover:bg-doc-deposit/25', iconBg: 'bg-doc-deposit' },
  pop:     { active: 'bg-pop text-white ring-2 ring-pop/30 shadow-md shadow-pop/20',                      done: 'bg-pop/15 text-pop hover:bg-pop/25',                     iconBg: 'bg-pop' },
};

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

  const currentTone = STEP_TONE[currentStepData?.tone ?? 'tech'];

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Current step identity — the icon tile lights up in the step's colour */}
      <div className="flex items-center gap-2.5">
        <span className={cn('size-9 rounded-lg grid place-items-center shrink-0 text-white shadow-sm', currentTone.iconBg)}>
          {currentStepData?.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold truncate">{currentStepData?.label || 'Survey'}</h3>
            <span className="ml-auto text-2xs tabular-nums text-muted-foreground shrink-0">
              step {currentStep}/{SURVEY_STEPS.length} · {pct}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{currentStepData?.description}</p>
        </div>
      </div>

      {/* Step chips — done stays lit in its colour, current glows, ahead is grey */}
      <div className="flex items-center gap-1.5">
        {SURVEY_STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = stepNum === currentStep;
          const t = STEP_TONE[step.tone];
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange?.(stepNum)}
              aria-label={`${step.label}${isCompleted ? ' (complete)' : ''}`}
              className={cn(
                'flex-1 h-9 rounded-lg grid place-items-center transition-all text-2xs font-semibold',
                onStepChange && 'cursor-pointer',
                isCurrent ? t.active : isCompleted ? t.done : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              <span className="hidden sm:flex items-center gap-1">
                {isCompleted && !isCurrent ? <CheckCircle size={12} /> : null}
                {step.shortLabel}
              </span>
              <span className="sm:hidden">{isCompleted && !isCurrent ? <CheckCircle size={12} /> : stepNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { SURVEY_STEPS };
