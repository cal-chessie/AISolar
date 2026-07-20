import React from 'react';
import { LucideIcon, FileX, Users, ClipboardList, FileText, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center',
          isCompact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-4'
        )}
      >
        <Icon className={cn('text-muted-foreground', isCompact ? 'h-6 w-6' : 'h-8 w-8')} />
      </div>
      <h3
        className={cn(
          'font-semibold text-foreground',
          isCompact ? 'text-base mb-1' : 'text-lg mb-2'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-muted-foreground max-w-sm',
            isCompact ? 'text-sm mb-3' : 'text-sm mb-4'
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size={isCompact ? 'sm' : 'default'}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptyLeadsState({ onAddLead }: { onAddLead?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No leads yet"
      description="Start by adding your first lead to begin tracking potential customers."
      action={onAddLead ? { label: 'Add Lead', onClick: onAddLead } : undefined}
    />
  );
}

export function EmptyProposalsState({ onCreateProposal }: { onCreateProposal?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No proposals"
      description="Create your first proposal after completing a site survey."
      action={onCreateProposal ? { label: 'Create Proposal', onClick: onCreateProposal } : undefined}
    />
  );
}

export function EmptySurveysState({ onStartSurvey }: { onStartSurvey?: () => void }) {
  return (
    <EmptyState
      icon={ClipboardList}
      title="No surveys"
      description="Site surveys help you gather information for accurate proposals."
      action={onStartSurvey ? { label: 'Start Survey', onClick: onStartSurvey } : undefined}
    />
  );
}

export function EmptyInstallationsState() {
  return (
    <EmptyState
      icon={Calendar}
      title="No installations scheduled"
      description="Installations will appear here once proposals are approved and scheduled."
    />
  );
}

export function EmptySearchResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={FileX}
      title="No results found"
      description={`No matches found for "${query}". Try adjusting your search terms.`}
      variant="compact"
    />
  );
}

export function EmptyDocumentsState({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No documents"
      description="Upload project documents, certifications, and files here."
      action={onUpload ? { label: 'Upload Document', onClick: onUpload } : undefined}
    />
  );
}

export function EmptyMapState() {
  return (
    <EmptyState
      icon={MapPin}
      title="No location set"
      description="Enter an address or Eircode to view the property location."
      variant="compact"
    />
  );
}

export default EmptyState;
