import { Search, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PsychologistPatient } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';

type SortMode = 'name' | 'nextSession' | 'lastMessage';

interface PatientListProps {
  patients: PsychologistPatient[];
  onSelectPatient: (patient: PsychologistPatient) => void;
  onOpenSearch?: () => void;
}

export function PatientList({ patients, onSelectPatient, onOpenSearch }: PatientListProps) {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('nextSession');

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  const formatPresence = (isOnline: boolean, lastSeenAt?: string): string => {
    if (isOnline) {
      return t('chat.online');
    }

    if (!lastSeenAt) {
      return t('chat.offline');
    }

    const lastSeen = new Date(lastSeenAt);
    if (Number.isNaN(lastSeen.getTime())) {
      return t('chat.offline');
    }

    const diffMs = Date.now() - lastSeen.getTime();
    if (diffMs < 0) {
      return t('chat.offline');
    }

    const dayMs = 24 * 60 * 60 * 1000;
    if (diffMs >= dayMs) {
      return t('chat.lastSeenLongAgo');
    }

    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (language === 'ru') {
      return `${t('chat.lastSeenPrefix')} ${minutes} ${t('chat.minutesAgo')}`;
    }
    return `${t('chat.lastSeenPrefix')} ${minutes} ${t('chat.minutesAgo')}`;
  };

  const toTimeValue = (value?: string): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  };

  const toSessionSortValue = (value?: string): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  };

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = !normalizedQuery
      ? patients
      : patients.filter((patient) => {
          return [patient.name, patient.diagnosis, patient.email]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery));
        });

    return [...base].sort((left, right) => {
      if (sortMode === 'lastMessage') {
        return toTimeValue(right.lastMessageAt) - toTimeValue(left.lastMessageAt);
      }

      if (sortMode === 'nextSession') {
        const diff = toSessionSortValue(left.nextSessionAt) - toSessionSortValue(right.nextSessionAt);
        if (diff !== 0) return diff;
        return left.name.localeCompare(right.name, locale);
      }

      return left.name.localeCompare(right.name, locale);
    });
  }, [patients, query, sortMode, locale]);

  return (
    <div className="flex-1 p-8 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2>{t('dashboard.patients')}</h2>
              <p className="text-muted-foreground">{t('dashboard.managePatients')}</p>
            </div>
            {onOpenSearch ? (
              <button
                type="button"
                onClick={onOpenSearch}
                className="rounded-xl border border-border px-4 py-2 text-sm text-foreground transition-all hover:border-primary/40 hover:bg-muted/50"
              >
                {t('dashboard.addPatient')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-6">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('dashboard.searchPatients')}
                className="w-full bg-card rounded-2xl pl-12 pr-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="w-full bg-card rounded-2xl px-4 py-3 border border-border text-sm"
            >
              <option value="nextSession">{t('dashboard.sortByNextSession')}</option>
              <option value="lastMessage">{t('dashboard.sortByLastMessage')}</option>
              <option value="name">{t('dashboard.sortByName')}</option>
            </select>
          </div>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="space-y-4">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        {patient.name.split(' ').map((namePart) => namePart[0]).join('')}
                      </div>
                      {patient.isOnline && (
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3>{patient.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs ${patient.isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {patient.isOnline ? t('chat.online') : t('chat.offline')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p>{t('patient.age')}: {patient.age} • {patient.sessions} {t('dashboard.sessions').toLowerCase()}</p>
                          <p className="mt-1">{t('dashboard.diagnosis')}: {patient.diagnosis || t('patient.carePlanInProgress')}</p>
                        </div>
                        <div>
                          <p>{t('dashboard.lastSession')}: {patient.lastSession || t('patient.notStarted')}</p>
                          <p className="mt-1">{t('dashboard.nextSession')}: {patient.nextSession || t('patient.notScheduled')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {patient.unreadCount > 0 ? (
                      <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" title={t('chat.unreadMessages')} />
                    ) : null}
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatPresence(patient.isOnline, patient.lastSeenAt)}</span>
                  {patient.unreadCount > 0 ? <span>{patient.unreadCount}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border bg-card/70 p-10 text-center shadow-sm">
            <p className="text-lg text-foreground">{t('dashboard.noPatients')}</p>
            <p className="mt-2 max-w-xl mx-auto text-sm text-muted-foreground">
              {t('dashboard.noPatientsHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
