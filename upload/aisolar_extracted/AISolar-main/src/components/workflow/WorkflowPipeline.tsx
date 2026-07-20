import { cn } from '@/lib/utils';
import { WORKFLOW_STAGES } from '@/lib/surveyValidation';
import { CheckCircle, Circle } from 'lucide-react';

interface WorkflowPipelineProps {
  currentStage: string;
  className?: string;
  compact?: boolean;
}

export default function WorkflowPipeline({ currentStage, className, compact = false }: WorkflowPipelineProps) {
  const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === currentStage);
  
  if (compact) {
    const current = WORKFLOW_STAGES.find(s => s.id === currentStage);
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', current?.color || 'bg-slate-100 text-slate-700')}>
        {current?.label || currentStage}
      </span>
    );
  }

  // Show simplified pipeline for mobile
  const stages = WORKFLOW_STAGES.filter(s => 
    ['new', 'survey_complete', 'proposal_draft', 'presented', 'approved'].includes(s.id)
  );

  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto pb-2', className)}>
      {stages.map((stage, idx) => {
        const stageIndex = WORKFLOW_STAGES.findIndex(s => s.id === stage.id);
        const isComplete = currentIndex > stageIndex;
        const isCurrent = stage.id === currentStage || 
          (currentIndex > stageIndex && currentIndex < (stages[idx + 1] ? WORKFLOW_STAGES.findIndex(s => s.id === stages[idx + 1].id) : 999));
        
        return (
          <div key={stage.id} className="flex items-center">
            <div 
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                isComplete ? 'bg-green-100 text-green-700' :
                isCurrent ? stage.color :
                'bg-slate-100 text-slate-400'
              )}
            >
              {isComplete ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{stage.label}</span>
            </div>
            {idx < stages.length - 1 && (
              <div className={cn(
                'w-4 h-0.5 mx-1',
                isComplete ? 'bg-green-300' : 'bg-slate-200'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
