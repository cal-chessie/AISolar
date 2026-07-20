import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarDays, Clock, User, CheckCircle2 } from 'lucide-react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';

interface Installation {
  id: string;
  lead_id: string;
  scheduled_date: string;
  status: string;
  lead?: {
    name: string;
    address: string;
  };
}

interface InstallerAvailabilityCalendarProps {
  installerId?: string;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  mode?: 'view' | 'select';
}

export function InstallerAvailabilityCalendar({
  installerId,
  onDateSelect,
  selectedDate,
  mode = 'view',
}: InstallerAvailabilityCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstaller, setSelectedInstaller] = useState<string>(installerId || '');
  const [installers, setInstallers] = useState<Array<{ id: string; user_id: string; profile?: { full_name: string } }>>([]);

  useEffect(() => {
    fetchInstallers();
  }, []);

  useEffect(() => {
    if (selectedInstaller) {
      fetchInstallations();
    }
  }, [selectedInstaller]);

  const fetchInstallers = async () => {
    try {
      const { data, error } = await supabase
        .from('installers')
        .select('id, user_id')
        .eq('availability_status', 'available');

      if (error) throw error;

      // Fetch profiles for installers
      if (data && data.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', data.map(i => i.user_id));

        const installersWithProfiles = data.map(installer => ({
          ...installer,
          profile: profiles?.find(p => p.user_id === installer.user_id),
        }));

        setInstallers(installersWithProfiles);
        
        if (!selectedInstaller && installersWithProfiles.length > 0) {
          setSelectedInstaller(installersWithProfiles[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching installers:', error);
    }
  };

  const fetchInstallations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id,
          lead_id,
          scheduled_date,
          status,
          leads:lead_id (name, address)
        `)
        .eq('installer_id', selectedInstaller)
        .eq('assignment_type', 'installation')
        .not('scheduled_date', 'is', null);

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        id: item.id,
        lead_id: item.lead_id,
        scheduled_date: item.scheduled_date,
        status: item.status || 'pending',
        lead: item.leads as any,
      }));

      setInstallations(formattedData);
    } catch (error) {
      console.error('Error fetching installations:', error);
      toast.error('Failed to load installations');
    } finally {
      setLoading(false);
    }
  };

  const getInstallationsForDate = (checkDate: Date) => {
    return installations.filter(inst => 
      inst.scheduled_date && isSameDay(new Date(inst.scheduled_date), checkDate)
    );
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate && onDateSelect) {
      onDateSelect(newDate);
    }
  };

  const getDateClassName = (checkDate: Date) => {
    const dayInstallations = getInstallationsForDate(checkDate);
    if (dayInstallations.length > 0) {
      return 'bg-primary/20 text-primary font-semibold';
    }
    return '';
  };

  const selectedDateInstallations = date ? getInstallationsForDate(date) : [];

  // Generate next 14 available dates (excluding dates with 2+ installations)
  const getAvailableDates = () => {
    const availableDates: Date[] = [];
    let currentDate = startOfDay(new Date());
    
    while (availableDates.length < 14) {
      currentDate = addDays(currentDate, 1);
      const dayInstallations = getInstallationsForDate(currentDate);
      if (dayInstallations.length < 2) {
        availableDates.push(new Date(currentDate));
      }
    }
    
    return availableDates;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {mode === 'select' ? 'Select Installation Date' : 'Installation Calendar'}
        </CardTitle>
        <CardDescription>
          {mode === 'select' 
            ? 'Choose an available date for the installation'
            : 'View scheduled installations and availability'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!installerId && installers.length > 0 && (
          <Select value={selectedInstaller} onValueChange={setSelectedInstaller}>
            <SelectTrigger>
              <SelectValue placeholder="Select installer" />
            </SelectTrigger>
            <SelectContent>
              {installers.map((installer) => (
                <SelectItem key={installer.id} value={installer.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {installer.profile?.full_name || 'Installer'}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              modifiersClassNames={{
                selected: 'bg-primary text-primary-foreground',
              }}
              className="rounded-md border"
            />
          </div>

          <div className="flex-1 space-y-3">
            {mode === 'select' ? (
              <>
                <h4 className="font-medium text-sm">Quick Select Available Dates</h4>
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableDates().slice(0, 6).map((availableDate) => (
                    <Button
                      key={availableDate.toISOString()}
                      variant={date && isSameDay(date, availableDate) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => handleDateSelect(availableDate)}
                    >
                      {format(availableDate, 'EEE, MMM d')}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4 className="font-medium text-sm">
                  {date ? format(date, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                </h4>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : selectedDateInstallations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDateInstallations.map((inst) => (
                      <div
                        key={inst.id}
                        className="p-3 bg-muted rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{inst.lead?.name || 'Unknown'}</span>
                          <Badge variant={inst.status === 'completed' ? 'default' : 'secondary'}>
                            {inst.status}
                          </Badge>
                        </div>
                        {inst.lead?.address && (
                          <p className="text-xs text-muted-foreground mt-1">{inst.lead.address}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : date ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    No installations scheduled - Available
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InstallerAvailabilityCalendar;
