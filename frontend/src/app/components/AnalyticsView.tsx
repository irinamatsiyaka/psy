import { useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquare, Send } from 'lucide-react';
import type { PatientAnalytics, PsychologistDashboardData, PsychologistPatient } from '../types/app';
import { SentimentChart } from './SentimentChart';
import { useTranslation } from '../hooks/useTranslation';

interface AnalyticsViewProps {
  patients: PsychologistPatient[];
  appointments: PsychologistDashboardData['appointments'];
  onFetchPatientAnalytics: (patientId: string) => Promise<PatientAnalytics>;
  onAskPatientAnalytics: (
    patientId: string,
    question: string
  ) => Promise<{ id: string; role: 'assistant'; text: string; time: string }>;
  isLoading: boolean;
}

export function AnalyticsView({
  patients,
  appointments,
  onFetchPatientAnalytics,
  onAskPatientAnalytics,
  isLoading,
}: AnalyticsViewProps) {
  const { t } = useTranslation();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [analytics, setAnalytics] = useState<PatientAnalytics | null>(null);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const lastSessionPatientId = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    return sorted[0]?.patientId ?? patients[0]?.id ?? '';
  }, [appointments, patients]);

  useEffect(() => {
    if (!selectedPatientId && lastSessionPatientId) {
      setSelectedPatientId(lastSessionPatientId);
    }
  }, [lastSessionPatientId, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }

    void onFetchPatientAnalytics(selectedPatientId).then(setAnalytics).catch(() => {
      setAnalytics(null);
    });
  }, [onFetchPatientAnalytics, selectedPatientId]);

  const handleAsk = async () => {
    if (!selectedPatientId || !question.trim()) {
      return;
    }

    setIsAsking(true);
    try {
      const reply = await onAskPatientAnalytics(selectedPatientId, question);
      setAnalytics((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          chat: [
            ...current.chat,
            {
              id: `tmp-${Date.now()}`,
              role: 'psychologist',
              text: question,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            reply,
          ],
        };
      });
      setQuestion('');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2>{t('dashboard.analytics')}</h2>
              <p className="text-sm text-muted-foreground">{t('analytics.autoPatientHint')}</p>
            </div>

            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className="h-11 min-w-64 rounded-xl border border-border bg-input-background px-3"
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
            <h3 className="mb-4">{t('analytics.moodChart')}</h3>
            {analytics?.sentimentData.length ? (
              <SentimentChart data={analytics.sentimentData} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('analytics.noMoodData')}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3">{t('analytics.aiOverview')}</h3>
            <p className="text-sm text-muted-foreground">{analytics?.aiOverview ?? t('common.loading')}</p>

            <div className="mt-4 space-y-2">
              {(analytics?.aiRecommendations ?? []).map((item) => (
                <div key={item} className="rounded-xl bg-muted p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h3>{t('analytics.aiChat')}</h3>
          </div>

          <div className="mb-4 max-h-80 space-y-3 overflow-auto rounded-xl border border-border p-3">
            {analytics?.chat.length ? (
              analytics.chat.map((message) => (
                <div key={message.id} className={`rounded-xl p-3 text-sm ${message.role === 'assistant' ? 'bg-muted' : 'bg-primary/10'}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{message.role === 'assistant' ? 'AI' : t('role.psychologist')}</span>
                    <span>{message.time}</span>
                  </div>
                  <p>{message.text}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t('analytics.noChat')}</p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t('analytics.askPlaceholder')}
              className="h-11 flex-1 rounded-xl border border-border bg-input-background px-3"
            />
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-60"
              onClick={() => {
                void handleAsk();
              }}
              disabled={isAsking || isLoading || !selectedPatientId || !question.trim()}
            >
              <Send className="h-4 w-4" />
              {t('chat.sendMessage')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
