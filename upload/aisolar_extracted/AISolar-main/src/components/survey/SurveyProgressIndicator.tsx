import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SurveyCompletionStatus } from '@/lib/surveyValidation';

interface SurveyProgressIndicatorProps {
  status: SurveyCompletionStatus;
  className?: string;
}

export default function SurveyProgressIndicator({ status, className }: SurveyProgressIndicatorProps) {
  const sections = [
    { key: 'roof', label: 'Roof Details', data: status.sections.roof },
    { key: 'electrical', label: 'Electrical', data: status.sections.electrical },
    { key: 'recommendations', label: 'System Recommendations', data: status.sections.recommendations },
    { key: 'photos', label: `Photos (${status.sections.photos.count}/${status.sections.photos.required})`, data: status.sections.photos },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">Survey Completion</span>
          <span className={cn(
            'font-semibold',
            status.completionPercentage === 100 ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {status.completionPercentage}%
          </span>
        </div>
        <Progress value={status.completionPercentage} className="h-2" />
      </div>

      {/* Section Status */}
      <div className="grid grid-cols-2 gap-2">
        {sections.map((section) => (
          <div 
            key={section.key}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-sm',
              section.data.complete 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
            )}
          >
            {section.data.complete ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate">{section.label}</span>
          </div>
        ))}
      </div>

      {/* Missing Fields Alert */}
      {!status.isComplete && status.missingFields.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Complete these fields to finish the survey:
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-0.5">
                {status.missingFields.slice(0, 5).map((field, i) => (
                  <li key={i}>• {field}</li>
                ))}
                {status.missingFields.length > 5 && (
                  <li>• ...and {status.missingFields.length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
