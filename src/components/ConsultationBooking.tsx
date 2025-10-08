import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

interface ConsultationBookingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00'
];

export default function ConsultationBooking({ open, onOpenChange }: ConsultationBookingProps) {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !selectedTime || !name || !email || !phone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields to book your consultation.',
        variant: 'destructive',
      });
      return;
    }

    // Mock API call - simulate booking
    console.log('Booking consultation:', {
      date: format(date, 'yyyy-MM-dd'),
      time: selectedTime,
      name,
      email,
      phone
    });

    toast({
      title: 'Consultation Booked! ✓',
      description: `Your consultation is scheduled for ${format(date, 'EEEE, MMMM d, yyyy')} at ${selectedTime}. Confirmation email sent to ${email}.`,
    });

    // Close dialog and navigate to upsell page
    setTimeout(() => {
      onOpenChange(false);
      setDate(undefined);
      setSelectedTime(undefined);
      setName('');
      setEmail('');
      setPhone('');
      navigate('/upsell');
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Schedule Your Free Consultation</DialogTitle>
          <DialogDescription>
            Choose a date and time that works best for you. Our solar expert will contact you to discuss your personalized proposal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Calendar Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Date</Label>
            <div className="flex justify-center border border-border rounded-lg p-4 bg-slate-50">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) =>
                  date < new Date() || date.getDay() === 0 || date.getDay() === 6
                }
                className={cn("pointer-events-auto")}
              />
            </div>
            {date && (
              <p className="text-sm text-slate-600 mt-2 flex items-center gap-2">
                <CalendarIcon size={16} />
                Selected: {format(date, 'PPPP')}
              </p>
            )}
          </div>

          {/* Time Slot Selection */}
          {date && (
            <div>
              <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                <Clock size={18} />
                Select Time
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "py-3 px-4 rounded-lg border-2 font-medium transition-all",
                      selectedTime === time
                        ? "border-primary bg-primary text-white"
                        : "border-slate-300 hover:border-primary hover:bg-slate-50"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {date && selectedTime && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Your Contact Information</h3>
              
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+353 1 234 5678"
                  required
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          {date && selectedTime && (
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 gradient-primary text-white py-6 text-lg font-semibold"
                size="lg"
              >
                Confirm Booking
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="py-6 text-lg"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
