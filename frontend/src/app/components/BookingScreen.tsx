import { useState } from 'react';
import { Clock, Check } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface BookingScreenProps {
  availableSlots: Array<{
    id: string;
    day: string;
    date: number;
    isoDate: string;
    time: string;
    therapistName: string;
    therapistTitle: string;
  }>;
  therapistName?: string;
  therapistTitle?: string;
  onBookAppointment: (appointmentId: string) => Promise<void>;
  isBooking: boolean;
}

export function BookingScreen({ availableSlots, therapistName, therapistTitle, onBookAppointment, isBooking }: BookingScreenProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<number | null>(availableSlots[0]?.date ?? null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const weekDays = Array.from(
    new Map(availableSlots.map((slot) => [slot.date, { day: slot.day, date: slot.date }])).values()
  );

  const timeSlots = availableSlots.filter((slot) => slot.date === selectedDate);

  const selectedSlot = availableSlots.find((slot) => slot.id === selectedTime);

  return (
    <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
      <h3 className="mb-6">{t('booking.title')}</h3>

      {weekDays.length > 0 ? (
        <>
          <div className="mb-6">
            <h4 className="mb-4">{t('booking.selectDate')}</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {weekDays.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex flex-col items-center min-w-[60px] px-4 py-3 rounded-2xl transition-all ${
                    selectedDate === day.date
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="text-xs mb-1">{day.day}</span>
                  <span>{day.date}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="mb-4">{t('booking.availableTimes')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedTime(slot.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all ${
                    selectedTime === slot.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {slot.time}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0">
                {(therapistName || selectedSlot?.therapistName || 'Care').split(' ').map((namePart) => namePart[0]).join('')}
              </div>
              <div>
                <h4>{therapistName || selectedSlot?.therapistName || 'Your therapist'}</h4>
                <p className="text-sm text-muted-foreground">{therapistTitle || selectedSlot?.therapistTitle || t('booking.defaultTherapistTitle')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('booking.sessionHint')}</p>
              </div>
            </div>
          </div>

          <button
            disabled={!selectedTime || isBooking}
            onClick={() => {
              if (selectedTime) {
                void onBookAppointment(selectedTime);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all ${
              selectedTime
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            {t('booking.confirm')}
          </button>
        </>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-background/60 p-6 text-center">
          <p className="text-foreground">{t('booking.noSlots')}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('booking.noSlotsHint')}
          </p>
        </div>
      )}
    </div>
  );
}
