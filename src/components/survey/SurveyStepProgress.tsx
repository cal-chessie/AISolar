import { 
  CheckCircle, 
  User, 
  Home, 
  TreePine, 
  Zap, 
  Target, 
  Camera,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SurveyStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const SURVEY_STEPS: SurveyStep[] = [
  { id: 'customer', label: 'Customer Info', shortLabel: 'Info', icon: <User size={20} />, description: 'Basic lead information' },
  { id: 'goals', label: 'Customer Goals', shortLabel: 'Goals', icon: <Target size={20} />, description: 'Energy needs & preferences' },
  { id: 'roof', label: 'Roof Details', shortLabel: 'Roof', icon: <Home size={20} />, description: 'Roof type, condition & orientation' },
  { id: 'environmental', label: 'Environmental', shortLabel: 'Env', icon: <TreePine size={20} />, description: 'Shading & obstructions' },
  { id: 'electrical', label: 'Electrical', shortLabel: 'Elec', icon: <Zap size={20} />, description: 'Panel capacity & consumption' },
  { id: 'installation', label: 'Installation', shortLabel: 'Install', icon: <Settings size={20} />, description: 'Access & logistics' },
  { id: 'photos', label: 'Site Photos', shortLabel: 'Photos', icon: <Camera size={20} />, description: 'Capture required photos' },
];

interface SurveyStepProgressProps {
  currentStep: number;
  completedSteps: string[];
  onStepChange?: (step: number) => void;
  className?: string;
  showNavigation?: boolean;
}

// Export separate navigation component for bottom placement
export function SurveyStepNavigation({ 
  currentStep, 
  totalSteps,
  onStepChange 
}: { 
  currentStep: number; 
  totalSteps: number;
  onStepChange: (step: number) => void;
}) {
  const handlePrevious = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      onStepChange(currentStep + 1);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        onClick={handlePrevious}
        disabled={currentStep <= 1}
        className="flex-1 h-12 text-base"
      >
        <ChevronLeft className="mr-2 h-5 w-5" />
        Previous
      </Button>
      <Button
        onClick={handleNext}
        disabled={currentStep >= totalSteps}
        className="flex-1 h-12 text-base"
      >
        Next
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

export default function SurveyStepProgress({ 
  currentStep, 
  completedSteps,
  onStepChange,
  className,
  showNavigation = false
}: SurveyStepProgressProps) {
  const completionPercentage = (completedSteps.length / SURVEY_STEPS.length) * 100;
  const currentStepData = SURVEY_STEPS[currentStep - 1];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Step Card - Prominent display of current step */}
      <motion.div 
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        key={currentStep}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
              {currentStepData?.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Step {currentStep} of {SURVEY_STEPS.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(completionPercentage)}% complete
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mt-0.5">
                {currentStepData?.label || 'Survey'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentStepData?.description}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / SURVEY_STEPS.length) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Step Dots with Labels - Desktop */}
      <div className="hidden md:flex items-center justify-between px-2">
        {SURVEY_STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = stepNum === currentStep;
          const isPast = stepNum < currentStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepChange?.(stepNum)}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 relative group transition-all",
                onStepChange && "cursor-pointer hover:scale-105"
              )}
            >
              {/* Connector line */}
              {index < SURVEY_STEPS.length - 1 && (
                <div className={cn(
                  "absolute top-3 left-1/2 w-full h-0.5",
                  isPast || isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}
              
              {/* Step Circle */}
              <div 
                className={cn(
                  "relative z-10 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-medium",
                  isCurrent && "ring-4 ring-primary/20 bg-primary text-primary-foreground",
                  isCompleted && !isCurrent && "bg-green-500 text-white",
                  isPast && !isCompleted && "bg-primary/30 text-primary",
                  !isCurrent && !isCompleted && !isPast && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle size={14} /> : stepNum}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-[10px] font-medium text-center leading-tight",
                isCurrent && "text-primary",
                isCompleted && "text-green-600",
                !isCurrent && !isCompleted && "text-muted-foreground"
              )}>
                {step.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Step Indicator - Compact pills */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-1.5 py-1">
          {SURVEY_STEPS.map((step, index) => {
            const stepNum = index + 1;
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = stepNum === currentStep;

            return (
              <button
                key={step.id}
                onClick={() => onStepChange?.(stepNum)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  isCurrent ? "w-8 bg-primary" : "w-2",
                  isCompleted && !isCurrent && "bg-green-500",
                  !isCurrent && !isCompleted && "bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons - Only if showNavigation is true */}
      {showNavigation && onStepChange && (
        <SurveyStepNavigation 
          currentStep={currentStep} 
          totalSteps={SURVEY_STEPS.length}
          onStepChange={onStepChange}
        />
      )}
    </div>
  );
}

export { SURVEY_STEPS };
