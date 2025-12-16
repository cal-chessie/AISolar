import { 
  CheckCircle, 
  User, 
  Home, 
  TreePine, 
  Zap, 
  Target, 
  Camera,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SurveyStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const SURVEY_STEPS: SurveyStep[] = [
  { id: 'customer', label: 'Customer Info', shortLabel: 'Info', icon: <User size={16} /> },
  { id: 'roof', label: 'Roof Details', shortLabel: 'Roof', icon: <Home size={16} /> },
  { id: 'environmental', label: 'Environmental', shortLabel: 'Env', icon: <TreePine size={16} /> },
  { id: 'electrical', label: 'Electrical', shortLabel: 'Elec', icon: <Zap size={16} /> },
  { id: 'recommendations', label: 'System Goals', shortLabel: 'Goals', icon: <Target size={16} /> },
  { id: 'logistics', label: 'Installation', shortLabel: 'Install', icon: <Settings size={16} /> },
  { id: 'photos', label: 'Photos', shortLabel: 'Photos', icon: <Camera size={16} /> },
];

interface SurveyStepProgressProps {
  currentStep: number;
  completedSteps: string[];
  className?: string;
}

export default function SurveyStepProgress({ 
  currentStep, 
  completedSteps,
  className 
}: SurveyStepProgressProps) {
  const completionPercentage = (completedSteps.length / SURVEY_STEPS.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with step counter and percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Step {currentStep} of {SURVEY_STEPS.length}
          </span>
          <span className="text-xs text-muted-foreground">
            ({SURVEY_STEPS[currentStep - 1]?.label || 'Survey'})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            {Math.round(completionPercentage)}% complete
          </span>
        </div>
      </div>

      {/* Main Progress Bar with animated fill */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / SURVEY_STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {/* Completion overlay */}
        <motion.div 
          className="absolute inset-y-0 left-0 bg-green-500/30 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${completionPercentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step Icons Row - Desktop */}
      <div className="hidden sm:flex items-center justify-between px-1">
        {SURVEY_STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = stepNum === currentStep;
          const isPast = stepNum < currentStep;

          return (
            <motion.div 
              key={step.id}
              className="flex flex-col items-center gap-1.5 flex-1 relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Connector line */}
              {index < SURVEY_STEPS.length - 1 && (
                <div className={cn(
                  "absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2",
                  isPast || isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}
              
              {/* Step Icon Circle */}
              <motion.div 
                className={cn(
                  "relative z-10 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCurrent && "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                  isCompleted && !isCurrent && "border-green-500 bg-green-500 text-white",
                  isPast && !isCompleted && "border-primary/50 bg-primary/10 text-primary",
                  !isCurrent && !isCompleted && !isPast && "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isCompleted ? (
                  <CheckCircle size={16} />
                ) : (
                  step.icon
                )}
              </motion.div>
              
              {/* Label */}
              <span className={cn(
                "text-[10px] font-medium text-center leading-tight max-w-[60px]",
                isCurrent && "text-primary font-semibold",
                isCompleted && "text-green-600",
                !isCurrent && !isCompleted && "text-muted-foreground"
              )}>
                {step.shortLabel}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile Step Indicator - Compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
          {SURVEY_STEPS.map((step, index) => {
            const stepNum = index + 1;
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = stepNum === currentStep;

            return (
              <motion.div
                key={step.id}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  isCurrent ? "w-6 bg-primary" : "w-2",
                  isCompleted && !isCurrent && "bg-green-500",
                  !isCurrent && !isCompleted && "bg-muted-foreground/30"
                )}
                whileTap={{ scale: 0.9 }}
              />
            );
          })}
        </div>
        {/* Current step label - mobile */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            "bg-primary/10 text-primary"
          )}>
            {SURVEY_STEPS[currentStep - 1]?.icon}
          </div>
          <span className="text-sm font-medium">
            {SURVEY_STEPS[currentStep - 1]?.label || 'Survey'}
          </span>
        </div>
      </div>
    </div>
  );
}

export { SURVEY_STEPS };
