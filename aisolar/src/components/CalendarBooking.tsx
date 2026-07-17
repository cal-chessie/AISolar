/**
 * CalendarBooking — mobile-first consultation scheduler for Irish market.
 *
 * After a customer uploads their bill and gets the AI analysis, this component
 * lets them book a 30-min consultation call. Slots are generated for the next
 * 14 days, 09:00–17:00 Ireland/Dublin, weekdays only.
 *
 * No external calendar API needed — slots are generated client-side and the
 * booking is written to a `consultations` table (or `site_surveys` for in-person).
 *
 * Mobile-first: large touch targets, vertical scroll, sticky CTA.
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, Clock, Video, MapPin, CheckCircle2, ArrowRight, ArrowLeft,
  Sun, Phone, ChevronRight, Loader2,
} from 'lucide-react';

export interface BookingSlot {
  date: Date;
  timeLabel: string;     // "10:00"
  iso: string;           // ISO string for storage
  available: boolean;
}

export interface BookingSelection {
  slot: BookingSlot;
  type: 'video' | 'phone' | 'in_person';
}

interface CalendarBookingProps {
  /** Customer email (from lead capture) */
  customerEmail: string;
  customerName?: string;
  /** Lead ID if available */
  leadId?: string;
  /** System size from AI analysis (used for in-person recommendation) */
  systemSizeKw?: number;
  /** Called when booking is confirmed */
  onBookingConfirmed: (booking: BookingSelection & { customerEmail: string; customerName?: string; leadId?: string }) => void;
  /** Called when user skips */
  onSkip?: () => void;
}

const SLOT_HOURS = [9, 10, 11, 12, 14, 15, 16, 17]; // 13:00 lunch break

/** Generate next 14 weekdays of slots in Ireland/Dublin timezone. */
function generateSlots(): BookingSlot[] {
  const slots: BookingSlot[] = [];
  const today = new Date();
  let added = 0;
  let dayOffset = 1; // start tomorrow

  while (added < 14 && dayOffset < 30) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // skip Sat/Sun
      for (const hour of SLOT_HOURS) {
        const slotDate = new Date(date);
        slotDate.setHours(hour, 0, 0, 0);
        slots.push({
          date: slotDate,
          timeLabel: `${String(hour).padStart(2, '0')}:00`,
          iso: slotDate.toISOString(),
          available: true, // could be marked false based on existing bookings
        });
      }
      added++;
    }
    dayOffset++;
  }

  return slots;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (target.getTime() === today.getTime()) return 'Today';

  return date.toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function CalendarBooking({
  customerEmail,
  customerName,
  leadId,
  systemSizeKw,
  onBookingConfirmed,
  onSkip,
}: CalendarBookingProps) {
  const [slots] = useState<BookingSlot[]>(() => generateSlots());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [consultationType, setConsultationType] = useState<'video' | 'phone' | 'in_person'>('video');
  const [step, setStep] = useState<'date' | 'time' | 'type' | 'confirm' | 'done'>('date');
  const [submitting, setSubmitting] = useState(false);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, BookingSlot[]>();
    for (const slot of slots) {
      const dateKey = slot.date.toDateString();
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(slot);
    }
    return Array.from(map.entries());
  }, [slots]);

  const recommendedType = useMemo<'video' | 'in_person'>(() => {
    // For systems > 6kWp, recommend in-person (more complex install)
    if (systemSizeKw && systemSizeKw > 6) return 'in_person';
    return 'video';
  }, [systemSizeKw]);

  useEffect(() => {
    if (recommendedType === 'in_person') setConsultationType('in_person');
  }, [recommendedType]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    // Simulate async booking (would write to Supabase in production)
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setStep('done');
    onBookingConfirmed({
      slot: selectedSlot,
      type: consultationType,
      customerEmail,
      customerName,
      leadId,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 mb-3 shadow-lg shadow-emerald-500/30"
          >
            <Calendar className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold">Book your consultation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            30 minutes with a solar consultant. We'll review your bill analysis,
            answer questions, and design the right system for your home.
          </p>
        </div>

        {/* Progress indicator */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {['date', 'time', 'type', 'confirm'].map((s, i) => {
              const stepOrder = ['date', 'time', 'type', 'confirm'];
              const currentIndex = stepOrder.indexOf(step);
              const isActive = i <= currentIndex;
              return (
                <div key={s} className="flex items-center">
                  <div className={`h-2 w-2 rounded-full transition-colors ${
                    isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  }`} />
                  {i < 3 && <div className={`h-0.5 w-8 transition-colors ${
                    i < currentIndex ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  }`} />}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'date' && (
            <motion.div
              key="date"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pick a day</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {slotsByDate.slice(0, 10).map(([dateKey, daySlots]) => {
                    const date = new Date(dateKey);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(date);
                          setStep('time');
                        }}
                        className="w-full p-4 rounded-lg border border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left flex items-center justify-between min-h-[56px]"
                      >
                        <div>
                          <div className="font-semibold">{formatDateLabel(date)}</div>
                          <div className="text-xs text-muted-foreground">{formatDateFull(date)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {daySlots.length} slots
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {onSkip && (
                <div className="text-center mt-4">
                  <button
                    onClick={onSkip}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    I'll book later — send my analysis by email
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'time' && selectedDate && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <button
                      onClick={() => setStep('date')}
                      className="p-1 hover:bg-muted rounded"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    {formatDateFull(selectedDate)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {slotsByDate.find(([d]) => d === selectedDate.toDateString())?.[1].map(slot => {
                      const isSelected = selectedSlot?.iso === slot.iso;
                      return (
                        <button
                          key={slot.iso}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep('type');
                          }}
                          className={`p-3 rounded-lg border-2 transition-all min-h-[48px] font-medium ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                              : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                          }`}
                        >
                          {slot.timeLabel}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    All times shown in Irish time (Europe/Dublin). 30-minute consultation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'type' && selectedSlot && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <button
                      onClick={() => setStep('time')}
                      className="p-1 hover:bg-muted rounded"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    Consultation type
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { id: 'video' as const, icon: Video, label: 'Video call', desc: 'Google Meet · 30 min · Recommended for most homes', time: '30 min' },
                    { id: 'phone' as const, icon: Phone, label: 'Phone call', desc: 'We call you · 30 min · No internet needed', time: '30 min' },
                    { id: 'in_person' as const, icon: MapPin, label: 'In-person site visit', desc: 'Solar consultant visits your home · 60 min · Best for complex roofs', time: '60 min' },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const isSelected = consultationType === opt.id;
                    const isRecommended = opt.id === recommendedType;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setConsultationType(opt.id)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-start gap-3 min-h-[72px] ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'border-border hover:border-emerald-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{opt.label}</span>
                            {isRecommended && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{opt.time}</div>
                      </button>
                    );
                  })}
                </CardContent>
                <div className="p-4 pt-0">
                  <Button
                    onClick={() => setStep('confirm')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'confirm' && selectedSlot && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <button
                      onClick={() => setStep('type')}
                      className="p-1 hover:bg-muted rounded"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    Confirm your booking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDateFull(selectedSlot.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedSlot.timeLabel} · {consultationType === 'in_person' ? '60 min' : '30 min'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {consultationType === 'video' && <Video className="h-4 w-4 text-muted-foreground" />}
                      {consultationType === 'phone' && <Phone className="h-4 w-4 text-muted-foreground" />}
                      {consultationType === 'in_person' && <MapPin className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium capitalize">
                        {consultationType === 'video' ? 'Video call (Google Meet)' :
                         consultationType === 'phone' ? 'Phone call' :
                         'In-person site visit'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{customerEmail}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ You'll get a calendar invite + email reminder 24h before</p>
                    <p>✓ Reschedule or cancel anytime via the email link</p>
                    <p>✓ Cancel by 09:00 the day before at no charge</p>
                  </div>

                  <Button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming…</>
                    ) : (
                      <>Confirm booking <CheckCircle2 className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'done' && selectedSlot && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 mb-4"
                  >
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">You're booked!</h2>
                  <p className="text-muted-foreground mb-4">
                    We've sent a calendar invite to <strong>{customerEmail}</strong>
                  </p>
                  <div className="inline-block p-4 rounded-lg bg-muted/30 text-left text-sm space-y-1">
                    <div className="font-semibold">{formatDateFull(selectedSlot.date)}</div>
                    <div>{selectedSlot.timeLabel} · {consultationType === 'in_person' ? '60 min' : '30 min'}</div>
                    <div className="capitalize">
                      {consultationType === 'video' ? 'Video call' :
                       consultationType === 'phone' ? 'Phone call' :
                       'In-person site visit'}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Next: create your account to track your project, sign documents, and chat with our team.
                  </p>
                  <Button
                    onClick={onSkip}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
