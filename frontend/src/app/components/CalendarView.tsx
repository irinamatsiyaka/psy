import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Video, Plus } from 'lucide-react';
import type { PsychologistDashboardData, PsychologistPatient } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';

interface CalendarViewProps {
  appointments: PsychologistDashboardData['appointments'];
  patients: PsychologistPatient[];
  onCreateAppointment: (payload: {
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    type: 'session' | 'initial' | 'followup';
  }) => Promise<void>;
  onUpdateAppointment: (appointmentId: string, payload: {
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    type: 'session' | 'initial' | 'followup';
  }) => Promise<void>;
  onDeleteAppointment: (appointmentId: string) => Promise<void>;
  onAcceptRequest: (appointmentId: string) => Promise<void>;
  onRejectRequest: (appointmentId: string) => Promise<void>;
  onCompleteSession: (appointmentId: string) => Promise<void>;
  onCancelSession: (appointmentId: string) => Promise<void>;
  isCreating: boolean;
}

const PRESET_TIME_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

const toTimeValue = (date: Date): string => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const parseLocalDateTime = (year: number, month: number, day: number, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month, day, hours ?? 0, minutes ?? 0, 0, 0);
};

const rangesOverlap = (leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean => {
  return leftStart.getTime() < rightEnd.getTime() && rightStart.getTime() < leftEnd.getTime();
};

export function CalendarView({
  appointments,
  patients,
  onCreateAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onAcceptRequest,
  onRejectRequest,
  onCompleteSession,
  onCancelSession,
  isCreating,
}: CalendarViewProps) {
  const { t, language } = useTranslation();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState('');
  const [time, setTime] = useState<string | null>(null);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState('12:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [type, setType] = useState<'session' | 'initial' | 'followup'>('session');

  const monthTitleFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale]
  );

  const selectedDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }),
    [locale]
  );

  const weekDayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale]
  );

  const weekDayHeaders = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekDayFormatter.format(new Date(2026, 0, 4 + index))),
    [weekDayFormatter]
  );

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const events = appointments.reduce<Record<number, typeof appointments>>((accumulator, appointment) => {
    if (!appointment.dateKey.startsWith(currentMonthPrefix)) {
      return accumulator;
    }
    const day = Number(appointment.dateKey.slice(-2));
    const group = accumulator[day] ?? [];
    group.push(appointment);
    accumulator[day] = group;
    return accumulator;
  }, {});

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const selectedEvents = events[selectedDay] || [];

  const resetModalState = () => {
    setEditingAppointmentId(null);
    setPatientId('');
    setTime(null);
    setIsCustomTime(false);
    setCustomTime('12:00');
    setDurationMinutes(60);
    setType('session');
  };

  const openCreateModalForDay = (day: number) => {
    setSelectedDay(day);
    resetModalState();
    setIsModalOpen(true);
  };

  const openEditModal = (appointment: PsychologistDashboardData['appointments'][number]) => {
    const startsAtDate = new Date(appointment.startsAt);
    const appointmentDay = startsAtDate.getDate();
    const appointmentTime = toTimeValue(startsAtDate);
    const isPresetTime = PRESET_TIME_SLOTS.includes(appointmentTime);

    setSelectedDay(appointmentDay);
    setEditingAppointmentId(appointment.id);
    setPatientId(appointment.patientId);
    setDurationMinutes(appointment.duration);
    setType(appointment.type);
    setTime(isPresetTime ? appointmentTime : null);
    setIsCustomTime(!isPresetTime);
    setCustomTime(appointmentTime);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalState();
  };

  const selectedTime = isCustomTime ? customTime : time;

  const hasTimeOverlap = (candidateTime: string, ignoreAppointmentId?: string): boolean => {
    const candidateStart = parseLocalDateTime(currentYear, currentMonth, selectedDay, candidateTime);
    const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60_000);

    return (events[selectedDay] || []).some((appointment) => {
      if (ignoreAppointmentId && appointment.id === ignoreAppointmentId) {
        return false;
      }

      if (!(appointment.status === 'confirmed' || appointment.status === 'pending')) {
        return false;
      }

      const existingStart = new Date(appointment.startsAt);
      const existingEnd = new Date(existingStart.getTime() + appointment.duration * 60_000);
      return rangesOverlap(candidateStart, candidateEnd, existingStart, existingEnd);
    });
  };

  const isSelectedTimeOverlapping = Boolean(
    selectedTime && hasTimeOverlap(selectedTime, editingAppointmentId ?? undefined)
  );

  const handleCreate = async () => {
    if (!patientId || !selectedTime || isSelectedTimeOverlapping) {
      return;
    }

    const startsAtDate = parseLocalDateTime(currentYear, currentMonth, selectedDay, selectedTime);
    const payload = {
      patientId,
      startsAt: startsAtDate.toISOString(),
      durationMinutes,
      type,
    };

    if (editingAppointmentId) {
      await onUpdateAppointment(editingAppointmentId, payload);
    } else {
      await onCreateAppointment(payload);
    }

    closeModal();
  };

  const handleDelete = async (appointmentId: string) => {
    await onDeleteAppointment(appointmentId);
    if (editingAppointmentId === appointmentId) {
      closeModal();
    }
  };

  const shiftMonth = (delta: number) => {
    const nextDate = new Date(currentYear, currentMonth + delta, 1);
    const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    setCurrentDate(nextDate);
    setSelectedDay((current) => Math.min(current, maxDay));
  };

  const getTypeLabel = (appointmentType: 'session' | 'initial' | 'followup') => {
    if (appointmentType === 'initial') return t('calendar.type.initial');
    if (appointmentType === 'followup') return t('calendar.type.followup');
    return t('calendar.type.session');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return t('calendar.status.confirmed');
      case 'pending':
        return t('calendar.status.pending');
      case 'completed':
        return t('calendar.status.completed');
      case 'cancelled':
        return t('calendar.status.cancelled');
      case 'available':
        return t('calendar.status.available');
      default:
        return status;
    }
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary text-primary-foreground';
      case 'pending':
        return 'bg-secondary text-secondary-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const hasEvents = (day: number) => {
    return events[day] && events[day].length > 0;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2>{t('calendar.title')}</h2>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
              onClick={() => openCreateModalForDay(selectedDay)}
            >
              <Plus className="w-4 h-4" />
              {t('calendar.newAppointment')}
            </button>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="capitalize">{monthTitleFormatter.format(currentDate)}</h3>
              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors"
                  onClick={() => shiftMonth(-1)}
                  aria-label={t('calendar.previousMonth')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors"
                  onClick={() => shiftMonth(1)}
                  aria-label={t('calendar.nextMonth')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDayHeaders.map((day) => (
                <div key={day} className="text-center text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const today = new Date();
                const isToday =
                  day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear();
                const isSelected = day === selectedDay;
                const dayHasEvents = hasEvents(day);

                return (
                  <button
                    key={day}
                    onClick={() => openCreateModalForDay(day)}
                    className={`aspect-square rounded-xl p-2 transition-all relative ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : isToday
                        ? 'bg-secondary/20 text-foreground border-2 border-secondary'
                        : 'bg-muted/30 hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="text-sm">{day}</span>
                    {dayHasEvents && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {events[day].slice(0, 3).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-primary-foreground' : 'bg-primary'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 border-l border-border bg-card p-6 overflow-auto">
        <h3 className="mb-4">
          {selectedDateFormatter.format(new Date(currentYear, currentMonth, selectedDay))}
        </h3>

        {selectedEvents.length > 0 ? (
          <div className="space-y-3">
            {selectedEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-xl ${getEventColor(event.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4>{event.patientName}</h4>
                  <span className="text-xs px-2 py-1 bg-white/20 rounded-full">
                    {getStatusLabel(event.status)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm opacity-90 mb-1">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
                  <span>•</span>
                  <span>{event.duration} min</span>
                </div>

                <div className="flex items-center gap-2 text-sm opacity-90">
                  <Video className="w-4 h-4" />
                  <span>{getTypeLabel(event.type)}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-white/20 py-2 text-sm hover:bg-white/30 transition-colors"
                    onClick={() => openEditModal(event)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white/20 py-2 text-sm hover:bg-white/30 transition-colors"
                    onClick={() => {
                      void handleDelete(event.id);
                    }}
                    disabled={isCreating}
                  >
                    {t('common.delete')}
                  </button>
                </div>

                {event.status === 'pending' && event.pendingActor === 'psychologist' ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-500/85 py-2 text-sm text-white hover:bg-emerald-500"
                      onClick={() => {
                        void onAcceptRequest(event.id);
                      }}
                      disabled={isCreating}
                    >
                      {t('calendar.acceptRequest')}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-rose-500/85 py-2 text-sm text-white hover:bg-rose-500"
                      onClick={() => {
                        void onRejectRequest(event.id);
                      }}
                      disabled={isCreating}
                    >
                      {t('calendar.rejectRequest')}
                    </button>
                  </div>
                ) : null}

                {(event.status === 'confirmed' || event.status === 'pending') && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-500/85 py-2 text-sm text-white hover:bg-emerald-500"
                      onClick={() => {
                        void onCompleteSession(event.id);
                      }}
                      disabled={isCreating}
                    >
                      {t('calendar.status.completed')}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-rose-500/85 py-2 text-sm text-white hover:bg-rose-500"
                      onClick={() => {
                        void onCancelSession(event.id);
                      }}
                      disabled={isCreating}
                    >
                      {t('calendar.status.cancelled')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="rounded-[2rem] border border-dashed border-border bg-background/60 px-6 py-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t('calendar.noAppointments')}</p>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                {t('calendar.noAppointmentsHint')}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="mb-3">{t('calendar.upcomingWeek')}</h4>
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, index) => selectedDay + index).flatMap((day) => {
              if (day > daysInMonth) {
                return [];
              }
              const dayEvents = events[day] || [];
              return dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 bg-muted rounded-xl text-sm"
                >
                  <p className="text-muted-foreground text-xs mb-1">
                    {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(currentYear, currentMonth, day))}
                  </p>
                  <p>{event.patientName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{event.time}</p>
                </div>
              ));
            })}
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="mb-1">
              {editingAppointmentId ? t('calendar.editAppointment') : t('calendar.scheduleAppointment')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedDateFormatter.format(new Date(currentYear, currentMonth, selectedDay))}
            </p>

            <div className="space-y-4">
              <select
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-input-background px-3"
              >
                <option value="">{t('calendar.selectPatient')}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('calendar.selectTime')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_TIME_SLOTS.map((slot) => {
                    const isTaken = hasTimeOverlap(slot, editingAppointmentId ?? undefined);
                    const isSelected = !isCustomTime && time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isTaken}
                        onClick={() => {
                          setIsCustomTime(false);
                          setTime(slot);
                        }}
                        className={`py-2 rounded-xl text-sm font-medium transition-all ${
                          isTaken
                            ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCustomTime((value) => !value)}
                    className={`py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                      isCustomTime
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    {t('calendar.customTime')}
                  </button>
                </div>

                {isCustomTime && (
                  <div className="mt-3">
                    <input
                      type="time"
                      step={60}
                      value={customTime}
                      onChange={(event) => setCustomTime(event.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-input-background px-3"
                    />
                  </div>
                )}

                {isSelectedTimeOverlapping && (
                  <p className="mt-2 text-xs text-destructive">{t('calendar.timeOverlaps')}</p>
                )}
              </div>

              <select
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-input-background px-3"
              >
                <option value={30}>30 {t('calendar.minutes')}</option>
                <option value={45}>45 {t('calendar.minutes')}</option>
                <option value={60}>60 {t('calendar.minutes')}</option>
                <option value={90}>90 {t('calendar.minutes')}</option>
              </select>

              <select
                value={type}
                onChange={(event) => setType(event.target.value as 'session' | 'initial' | 'followup')}
                className="h-11 w-full rounded-xl border border-border bg-input-background px-3"
              >
                <option value="session">{t('calendar.type.session')}</option>
                <option value="initial">{t('calendar.type.initial')}</option>
                <option value="followup">{t('calendar.type.followup')}</option>
              </select>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded-xl px-4 py-2 text-sm hover:bg-muted"
                onClick={closeModal}
              >
                {t('common.cancel')}
              </button>
              <button
                className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
                onClick={() => {
                  void handleCreate();
                }}
                disabled={!patientId || !selectedTime || isSelectedTimeOverlapping || isCreating}
              >
                {isCreating
                  ? t('calendar.creating')
                  : editingAppointmentId
                  ? t('calendar.saveChanges')
                  : t('calendar.create')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
