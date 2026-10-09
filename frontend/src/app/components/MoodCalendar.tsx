import { useMemo, useState } from 'react';
import type { MoodType } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';

interface MoodDay {
  date: string;
  mood: Exclude<MoodType, null>;
}

interface MoodCalendarProps {
  moodDays: MoodDay[];
  onSaveMood: (mood: MoodType, entryDate?: string) => Promise<void>;
  isSaving: boolean;
}

const moodPalette = [
  { type: 'great' as const, emoji: '😊', label: 'mood.great', color: 'bg-[#7FB3A0]' },
  { type: 'good' as const, emoji: '🙂', label: 'mood.good', color: 'bg-[#A8C5DA]' },
  { type: 'okay' as const, emoji: '😐', label: 'mood.okay', color: 'bg-[#D4C5B9]' },
  { type: 'bad' as const, emoji: '😔', label: 'mood.bad', color: 'bg-[#E8B4A3]' },
  { type: 'terrible' as const, emoji: '😢', label: 'mood.terrible', color: 'bg-[#E07C7C]' },
];

const toIsoDate = (date: Date): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const isDateEditable = (date: Date, today: Date): boolean => {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return target <= current;
};

export function MoodCalendar({ moodDays, onSaveMood, isSaving }: MoodCalendarProps) {
  const { t, language } = useTranslation();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const monthNameFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale]
  );

  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale]
  );

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = firstOfMonth.getDay();
    const cells: Array<{ day: number | null; isoDate: string | null }> = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ day: null, isoDate: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isoDate = toIsoDate(new Date(year, month, day));
      cells.push({ day, isoDate });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, isoDate: null });
    }

    return cells;
  }, [currentMonth]);

  const moodByDate = useMemo(() => {
    const map = new Map<string, MoodType>();
    for (const entry of moodDays) {
      map.set(entry.date, entry.mood);
    }
    return map;
  }, [moodDays]);

  const selectedMood = moodByDate.get(toIsoDate(selectedDate)) ?? null;

  const getMoodColor = (mood: MoodType | null) => {
    const found = moodPalette.find((item) => item.type === mood);
    return found ? found.color : 'bg-muted/50';
  };

  const getMoodEmoji = (mood: MoodType | null) => {
    const found = moodPalette.find((item) => item.type === mood);
    return found ? found.emoji : '';
  };

  const handleSelectDate = (date: Date) => {
    if (!isDateEditable(date, today)) {
      return;
    }
    setSelectedDate(date);
  };

  const handleSelectMood = async (mood: MoodType) => {
    const isoDate = toIsoDate(selectedDate);
    if (!isDateEditable(selectedDate, today)) {
      return;
    }

    const previousMood = moodByDate.get(isoDate);
    if (previousMood && previousMood !== mood) {
      const confirmed = window.confirm(t('mood.confirmOverwrite'));
      if (!confirmed) {
        return;
      }
    }

    await onSaveMood(mood, isoDate);
  };

  const shiftMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{t('mood.howFeeling')}</h3>
        <div className="flex items-center gap-2 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          <button type="button" className="h-7 w-7 rounded-full hover:bg-background" onClick={() => shiftMonth(-1)} aria-label={t('calendar.previousMonth')}>‹</button>
          <span>{monthNameFormatter.format(currentMonth)}</span>
          <button type="button" className="h-7 w-7 rounded-full hover:bg-background" onClick={() => shiftMonth(1)} aria-label={t('calendar.nextMonth')}>›</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/40 p-2">
        {moodPalette.map((mood) => (
          <button
            key={mood.type}
            type="button"
            onClick={() => {
              void handleSelectMood(mood.type);
            }}
            disabled={isSaving || !isDateEditable(selectedDate, today)}
            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs transition-all ${
              selectedMood === mood.type ? `${mood.color} text-white shadow-sm` : 'bg-background/60 text-foreground hover:bg-background'
            } ${isSaving || !isDateEditable(selectedDate, today) ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span className="text-lg">{mood.emoji}</span>
            <span>{t(mood.label as 'mood.great' | 'mood.good' | 'mood.okay' | 'mood.bad' | 'mood.terrible')}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {Array.from({ length: 7 }, (_, index) => {
          const weekday = new Date(2026, 0, 4 + index);
          return (
            <div key={weekday.toISOString()} className="py-1">{weekdayFormatter.format(weekday)}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {monthDays.map(({ day, isoDate }, index) => {
          const isCurrentMonth = day !== null;
          const isSelected = isoDate && isoDate === toIsoDate(selectedDate);
          const mood = isoDate ? moodByDate.get(isoDate) ?? null : null;
          const editable = isoDate ? isDateEditable(new Date(`${isoDate}T12:00:00`), today) : false;
          const cellClass = isCurrentMonth
            ? (mood ? `${getMoodColor(mood)} text-white` : isSelected ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-muted/30 text-foreground')
            : 'bg-transparent text-muted-foreground/50';

          return (
            <button
              key={isoDate ?? `empty-${index}`}
              type="button"
              disabled={!isoDate || !editable}
              onClick={() => isoDate && handleSelectDate(new Date(`${isoDate}T12:00:00`))}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-[11px] font-medium transition-all ${cellClass} ${!editable ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <span>{day ?? ''}</span>
              {mood && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px]">{getMoodEmoji(mood)}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate)}</div>
        {selectedMood ? (
          <div className="flex items-center gap-2">
            <span>{getMoodEmoji(selectedMood)}</span>
            <span>{t(`mood.${selectedMood}` as 'mood.great' | 'mood.good' | 'mood.okay' | 'mood.bad' | 'mood.terrible')}</span>
          </div>
        ) : (
          <span>{!isDateEditable(selectedDate, today) ? t('mood.futureDisabled') : t('mood.emptyHint')}</span>
        )}
      </div>
    </div>
  );
}
