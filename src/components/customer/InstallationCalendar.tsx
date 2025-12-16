import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { CalendarIcon, CheckCircle, Loader2, X } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { sendStageChangeNotification } from '@/lib/stageNotifications';
import { Badge } from '@/components/ui/badge';

interface InstallationCalendarProps {
  proposalId: string;
  leadId: string;
  currentDate?: string | null;
  preferredDates?: string[] | null;
  onDateSelected?: (dates: Date[]) => void;
  mode?: 'single' | 'multi';
}

export default function InstallationCalendar({ 
  proposalId, 
  leadId,
  currentDate,
  preferredDates,
  onDateSelected,
  mode = 'multi'
}: InstallationCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    if (preferredDates && preferredDates.length > 0) {
      return preferredDates.map(d => new Date(d));
    }
    if (currentDate) {
      return [new Date(currentDate)];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(!!currentDate);

  // Disable dates in the past and within the next 14 days
  const minDate = addDays(new Date(), 14);
  
  const disabledDays = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(minDate));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (mode === 'single') {
      setSelectedDates([date]);
    } else {
      // Multi-select: toggle date
      const exists = selectedDates.some(d => 
        d.toDateString() === date.toDateString()
      );
      
      if (exists) {
        setSelectedDates(prev => prev.filter(d => d.toDateString() !== date.toDateString()));
      } else if (selectedDates.length < 3) {
        setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
      } else {
        toast({
          title: 'Maximum 3 dates',
          description: 'You can select up to 3 preferred installation dates.',
          variant: 'destructive'
        });
      }
    }
  };

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(d => d.toDateString() !== dateToRemove.toDateString()));
  };

  const handleConfirmDates = async () => {
    if (selectedDates.length === 0) return;

    setLoading(true);
    try {
      // Update proposal with preferred install dates
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          preferred_install_dates: selectedDates.map(d => d.toISOString()),
          installation_status: 'dates_selected'
        })
        .eq('id', proposalId);

      if (proposalError) throw proposalError;

      // Update lead workflow stage
      await supabase
        .from('leads')
        .update({ workflow_stage: 'installation_pending' })
        .eq('id', leadId);

      // Send stage change notification
      await sendStageChangeNotification(leadId, 'approved', 'installation_pending');

      // Send notification email
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'installation_dates_selected',
            leadId,
            preferredDates: selectedDates.map(d => d.toISOString())
          }
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      setConfirmed(true);
      toast({
        title: 'Dates Submitted',
        description: `Your ${selectedDates.length} preferred date${selectedDates.length > 1 ? 's have' : ' has'} been submitted. We'll confirm shortly.`,
      });

      onDateSelected?.(selectedDates);
    } catch (error: any) {
      console.error('Error saving dates:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save installation dates.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (confirmed && selectedDates.length > 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-300">
                Installation Dates Submitted
              </p>
              <div className="mt-2 space-y-1">
                {selectedDates.map((date, i) => (
                  <p key={i} className="text-sm text-green-700 dark:text-green-400">
                    {i + 1}. {format(date, 'EEEE, MMMM d, yyyy')}
                  </p>
                ))}
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                We'll contact you to confirm one of these dates within 24-48 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Select Installation Dates
        </CardTitle>
        <CardDescription>
          Choose up to 3 preferred installation dates. Dates must be at least 2 weeks from today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected dates display */}
        {selectedDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, i) => (
              <Badge 
                key={i} 
                variant="secondary"
                className="flex items-center gap-1 py-1.5 px-3"
              >
                {format(date, 'MMM d, yyyy')}
                <button
                  onClick={() => removeDate(date)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div className="border rounded-lg p-3">
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            modifiers={{
              selected: selectedDates
            }}
            modifiersStyles={{
              selected: { 
                backgroundColor: 'hsl(var(--primary))', 
                color: 'hsl(var(--primary-foreground))' 
              }
            }}
            className={cn("p-0")}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Click dates to select/deselect. {mode === 'multi' ? 'Select up to 3 dates.' : ''}
        </p>

        <Button
          className="w-full"
          onClick={handleConfirmDates}
          disabled={selectedDates.length === 0 || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            `Confirm ${selectedDates.length} Date${selectedDates.length !== 1 ? 's' : ''}`
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Our team will contact you within 24-48 hours to confirm your installation slot.
        </p>
      </CardContent>
    </Card>
  );
}
