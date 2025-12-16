import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { CalendarIcon, CheckCircle, Loader2 } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { sendStageChangeNotification } from '@/lib/stageNotifications';

interface InstallationCalendarProps {
  proposalId: string;
  leadId: string;
  currentDate?: string | null;
  onDateSelected?: (date: Date) => void;
}

export default function InstallationCalendar({ 
  proposalId, 
  leadId,
  currentDate, 
  onDateSelected 
}: InstallationCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(!!currentDate);
  const [open, setOpen] = useState(false);

  // Disable dates in the past and within the next 14 days
  const minDate = addDays(new Date(), 14);
  
  const disabledDays = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(minDate));
  };

  const handleConfirmDate = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      // Update proposal with preferred install date
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          preferred_install_dates: [selectedDate.toISOString()],
          installation_status: 'scheduled'
        })
        .eq('id', proposalId);

      if (proposalError) throw proposalError;

      // Update lead workflow stage
      await supabase
        .from('leads')
        .update({ workflow_stage: 'installation_scheduled' })
        .eq('id', leadId);

      // Send stage change notification (in addition to specific installation email)
      await sendStageChangeNotification(leadId, 'approved', 'installation_scheduled');

      // Send notification email
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'installation_scheduled',
            leadId,
            installationDate: selectedDate.toISOString()
          }
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the whole operation if email fails
      }

      setConfirmed(true);
      toast({
        title: 'Installation Date Selected',
        description: `Your preferred date of ${format(selectedDate, 'PPP')} has been submitted. We'll confirm shortly.`,
      });

      onDateSelected?.(selectedDate);
    } catch (error: any) {
      console.error('Error saving date:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save installation date.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (confirmed && selectedDate) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                Installation Date Requested
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                We'll contact you to confirm this date within 24-48 hours.
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
          Select Installation Date
        </CardTitle>
        <CardDescription>
          Choose your preferred installation date. Dates must be at least 2 weeks from today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setOpen(false);
              }}
              disabled={disabledDays}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {selectedDate && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">Selected Date:</p>
            <p className="text-lg font-semibold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleConfirmDate}
          disabled={!selectedDate || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Confirm Installation Date'
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Our team will contact you within 24-48 hours to confirm your installation slot.
        </p>
      </CardContent>
    </Card>
  );
}
