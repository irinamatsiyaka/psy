import { X, Phone, Video, Search, MoreVertical, Calendar, Mail, FileText } from 'lucide-react';
import { SentimentChart } from './SentimentChart';
import type { PsychologistPatient } from '../types/app';
import { useTranslation } from '../hooks/useTranslation';

interface PatientProfileProps {
  patient: PsychologistPatient;
  psychologistName: string;
  onClose: () => void;
  onStartVideoCall: () => void;
  onStartAudioCall: () => void;
  onOpenNotes: () => void;
  onScheduleAppointment: () => void;
}

export function PatientProfile({
  patient,
  psychologistName,
  onClose,
  onStartVideoCall,
  onStartAudioCall,
  onOpenNotes,
  onScheduleAppointment,
}: PatientProfileProps) {
  const { t } = useTranslation();
  return (
    <div className="w-[400px] border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <h3>{t('patient.profile')}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl mb-3">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <h2 className="mb-1">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">{t('chat.wasOnlineRecently')}</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onStartAudioCall}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-center">{t('common.call')}</span>
          </button>

          <button
            onClick={onStartVideoCall}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-center">{t('common.video')}</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-center">{t('common.search')}</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <MoreVertical className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-center">{t('common.more')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h4 className="mb-3 text-muted-foreground text-sm">{t('patient.info')}</h4>
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('auth.email')}</p>
                  <p className="text-sm">{patient.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.phone')}</p>
                  <p className="text-sm">{patient.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('patient.age')}</p>
                  <p className="text-sm">{patient.age} {t('patient.yearsOld')}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-muted-foreground text-sm">{t('patient.medicalInfo')}</h4>
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.diagnosis')}</p>
                <p className="text-sm">{patient.diagnosis || t('common.notSpecified')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('patient.totalSessions')}</p>
                <p className="text-sm">{patient.sessions} {t('patient.completed')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.lastSession')}</p>
                <p className="text-sm">{patient.lastSession || t('common.notAvailable')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.nextSession')}</p>
                <p className="text-sm">{patient.nextSession || t('patient.notScheduled')}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-muted-foreground text-sm">{t('patient.moodTrend')}</h4>
            <div className="bg-muted/30 rounded-xl p-4">
              {patient.sentimentData.length > 0 ? <SentimentChart data={patient.sentimentData} /> : (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 text-center text-sm text-muted-foreground">
                  {t('patient.moodTrendEmpty')}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {patient.sentimentData.length > 0 ? t('patient.moodTrendSynced') : t('patient.moodTrendWaiting')}
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-muted-foreground text-sm">{t('common.quickActions')}</h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenNotes}
                className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted transition-colors"
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{t('patient.viewNotesBy', { psychologist: psychologistName })}</span>
              </button>
              <button
                type="button"
                onClick={onScheduleAppointment}
                className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted transition-colors"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{t('calendar.scheduleAppointment')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
