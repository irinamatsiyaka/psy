import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Monitor, Smartphone } from 'lucide-react';
import { PsychologistDashboard } from './components/PsychologistDashboard';
import { PatientMobileView } from './components/PatientMobileView';
import { AuthScreen } from './components/AuthScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { authStorageKey, logout, me, refresh } from './services/auth';
import { acceptAppointmentRequest, askPatientAnalytics, attachPatient, bookAppointment, cancelAppointment, confirmAppointment, createManualAppointment, createProgressNote, deleteJournalEntry, deleteManualAppointment, deleteProgressNote, fetchAppBootstrap, fetchPatientAnalytics, markAppointmentCompleted, markConversationRead, markTherapistConversationRead, rejectAppointmentRequest, saveJournalEntry, saveMood, searchUsers, sendHeartbeat, sendJournalMessage, sendPatientMessageToTherapist, sendPsychologistMessage, updateJournalEntry, updateManualAppointment, updateProgressNote } from './services/app';
import type { AuthResponse, AuthUser, Language } from './types/auth';
import type { AppBootstrap, MoodType, PatientAnalytics } from './types/app';
import { hasRole } from './types/app';
import { useTranslation } from './hooks/useTranslation';
import { updateUserProfile } from './services/users';

type ViewMode = 'desktop' | 'mobile';

const isStoredTokenUsable = (token: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== 'number') {
      return false;
    }
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export default function App() {
  const { language, setLanguage, t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [appData, setAppData] = useState<AppBootstrap | null>(null);

  const loadAppData = async (token: string, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoadingData(true);
    }
    try {
      const bootstrap = await fetchAppBootstrap(token);
      setAppData(bootstrap);
    } finally {
      if (!options?.silent) {
        setIsLoadingData(false);
      }
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(authStorageKey);
      if (!storedToken) {
        setIsLoadingSession(false);
        return;
      }

      if (!isStoredTokenUsable(storedToken)) {
        localStorage.removeItem(authStorageKey);
        setAccessToken(null);
        setUser(null);
        setIsLoadingSession(false);
        return;
      }

      try {
        const currentUser = await me(storedToken);
        setAccessToken(storedToken);
        setUser(currentUser);
        await loadAppData(storedToken);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem(authStorageKey);
          setAccessToken(null);
          setUser(null);
          setAppData(null);
          setIsLoadingSession(false);
          return;
        }

        try {
          const refreshed = await refresh();
          localStorage.setItem(authStorageKey, refreshed.accessToken);
          setAccessToken(refreshed.accessToken);
          setUser(refreshed.user);
          await loadAppData(refreshed.accessToken);
        } catch {
          localStorage.removeItem(authStorageKey);
          setAccessToken(null);
          setUser(null);
          setAppData(null);
        }
      } finally {
        setIsLoadingSession(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (hasRole(user.roles, 'patient') && !hasRole(user.roles, 'psychologist')) {
      setViewMode('mobile');
      return;
    }

    setViewMode('desktop');
  }, [user]);

  useEffect(() => {
    if (!user?.preferredLanguage) {
      return;
    }

    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage === 'en' || storedLanguage === 'ru') {
      setLanguage(storedLanguage);
      return;
    }

    const preferredLanguage = user.preferredLanguage as Language;
    if (preferredLanguage === 'en' || preferredLanguage === 'ru') {
      setLanguage(preferredLanguage);
    }
  }, [setLanguage, user?.preferredLanguage]);

  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }

    const beat = () => {
      void sendHeartbeat(accessToken).catch(() => {});
    };
    beat();
    const beatId = window.setInterval(beat, 30_000);
    return () => window.clearInterval(beatId);
  }, [accessToken, user]);

  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }

    const pollId = window.setInterval(() => {
      if (isMutating || isLoadingData) {
        return;
      }
      void loadAppData(accessToken, { silent: true });
    }, 5000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [accessToken, isLoadingData, isMutating, user]);

  const handleLanguageChange = async (nextLanguage: Language) => {
    setLanguage(nextLanguage);

    if (!accessToken || !user || user.preferredLanguage === nextLanguage) {
      return;
    }

    try {
      const updated = await updateUserProfile(accessToken, { preferredLanguage: nextLanguage });
      setUser(updated);
    } catch {
      // Keep local language choice even if profile sync fails.
    }
  };

  const handleAuthenticated = (payload: AuthResponse) => {
    localStorage.setItem(authStorageKey, payload.accessToken);
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    setViewMode(hasRole(payload.user.roles, 'patient') && !hasRole(payload.user.roles, 'psychologist') ? 'mobile' : 'desktop');
    void loadAppData(payload.accessToken);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      localStorage.removeItem(authStorageKey);
      setAccessToken(null);
      setUser(null);
      setAppData(null);
      setViewMode('desktop');
    }
  };

  const canSeePsychologist = useMemo(() => Boolean(user && hasRole(user.roles, 'psychologist')), [user]);
  const canSeePatient = useMemo(() => Boolean(user && hasRole(user.roles, 'patient')), [user]);
  const canSwitchViews = useMemo(() => Boolean(user && hasRole(user.roles, 'patient') && hasRole(user.roles, 'psychologist')), [user]);

  const runMutation = async (mutation: () => Promise<void>) => {
    if (!accessToken) {
      return;
    }

    setIsMutating(true);
    try {
      await mutation();
      await loadAppData(accessToken, { silent: true });
    } finally {
      setIsMutating(false);
    }
  };

  const handleSendPsychologistMessage = async (patientId: string, text: string) => {
    await runMutation(async () => {
      await sendPsychologistMessage(accessToken!, patientId, text);
    });
  };

  const handleSaveMood = async (mood: MoodType, entryDate?: string) => {
    await runMutation(async () => {
      await saveMood(accessToken!, mood, entryDate);
    });
  };

  const handleSaveJournalEntry = async (body: string) => {
    await runMutation(async () => {
      await saveJournalEntry(accessToken!, body);
    });
  };

  const handleUpdateJournalEntry = async (journalEntryId: string, body: string) => {
    await runMutation(async () => {
      await updateJournalEntry(accessToken!, journalEntryId, body);
    });
  };

  const handleDeleteJournalEntry = async (journalEntryId: string) => {
    await runMutation(async () => {
      await deleteJournalEntry(accessToken!, journalEntryId);
    });
  };

  const handleSendJournalMessage = async (body: string) => {
    await runMutation(async () => {
      await sendJournalMessage(accessToken!, body);
    });
  };

  const handleSendPatientMessage = async (therapistId: string, conversationId: string | null, text: string) => {
    await runMutation(async () => {
      await sendPatientMessageToTherapist(accessToken!, therapistId, conversationId, text);
    });
  };

  const handleBookAppointment = async (appointmentId: string) => {
    await runMutation(async () => {
      await bookAppointment(accessToken!, appointmentId);
    });
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    await runMutation(async () => {
      await confirmAppointment(accessToken!, appointmentId);
    });
  };

  const handleAcceptAppointmentRequest = async (appointmentId: string) => {
    await runMutation(async () => {
      await acceptAppointmentRequest(accessToken!, appointmentId);
    });
  };

  const handleRejectAppointmentRequest = async (appointmentId: string) => {
    await runMutation(async () => {
      await rejectAppointmentRequest(accessToken!, appointmentId);
    });
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    await runMutation(async () => {
      await markAppointmentCompleted(accessToken!, appointmentId);
    });
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    await runMutation(async () => {
      await cancelAppointment(accessToken!, appointmentId);
    });
  };

  const handleSearchPatients = async (query: string) => {
    if (!accessToken) {
      return [];
    }
    return searchUsers(accessToken, query, 'patient');
  };

  const handleCreateManualAppointment = async (payload: {
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    type: 'session' | 'initial' | 'followup';
  }) => {
    await runMutation(async () => {
      await createManualAppointment(accessToken!, payload);
    });
  };

  const handleUpdateManualAppointment = async (appointmentId: string, payload: {
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    type: 'session' | 'initial' | 'followup';
  }) => {
    await runMutation(async () => {
      await updateManualAppointment(accessToken!, appointmentId, payload);
    });
  };

  const handleDeleteManualAppointment = async (appointmentId: string) => {
    await runMutation(async () => {
      await deleteManualAppointment(accessToken!, appointmentId);
    });
  };

  const handleAttachPatient = async (patientId: number) => {
    await runMutation(async () => {
      await attachPatient(accessToken!, patientId);
    });
  };

  const handleMarkConversationRead = async (patientId: string) => {
    if (!accessToken) return;
    try {
      await markConversationRead(accessToken, patientId);
      await loadAppData(accessToken, { silent: true });
    } catch {
      // ignore — read state is best-effort
    }
  };

  const handleMarkTherapistConversationRead = async (therapistId: string) => {
    if (!accessToken) return;
    try {
      await markTherapistConversationRead(accessToken, therapistId);
      await loadAppData(accessToken, { silent: true });
    } catch {
      // ignore — read state is best-effort
    }
  };

  const handleCreateProgressNote = async (payload: {
    patientId: string;
    body: string;
    noteDate?: string;
    sessionNumber?: number;
    imageUrl?: string | null;
  }) => {
    await runMutation(async () => {
      await createProgressNote(accessToken!, payload);
    });
  };

  const handleUpdateProgressNote = async (
    noteId: string,
    payload: {
      patientId: string;
      body: string;
      noteDate: string;
      sessionNumber: number;
      imageUrl?: string | null;
    }
  ) => {
    await runMutation(async () => {
      await updateProgressNote(accessToken!, noteId, payload);
    });
  };

  const handleDeleteProgressNote = async (noteId: string) => {
    await runMutation(async () => {
      await deleteProgressNote(accessToken!, noteId);
    });
  };

  const handleFetchPatientAnalytics = async (patientId: string): Promise<PatientAnalytics> => {
    return fetchPatientAnalytics(accessToken!, patientId);
  };

  const handleAskPatientAnalytics = async (
    patientId: string,
    question: string
  ): Promise<{ id: string; role: 'assistant'; text: string; time: string }> => {
    return askPatientAnalytics(accessToken!, patientId, question);
  };

  const handleSaveProfile = async (payload: {
    fullName: string;
    username: string;
    contactPhone: string | null;
    about: string;
    avatarUrl: string | null;
  }) => {
    if (!accessToken || !user) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await updateUserProfile(accessToken, payload);
      setUser(updated);
      if (updated.preferredLanguage === 'en' || updated.preferredLanguage === 'ru') {
        setLanguage(updated.preferredLanguage);
      }
      setShowUserProfile(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingSession || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-[2rem] border border-border bg-card px-8 py-10 text-center shadow-lg">
          <p className="text-foreground">{t('common.loading')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('common.loadingData')}</p>
        </div>
      </div>
    );
  }

  if (!user || !accessToken) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="size-full">
      <div className="fixed left-4 top-4 z-50">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            disabled={!canSwitchViews}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${
              viewMode === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            } ${!canSwitchViews ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : ''}`}
          >
            <Monitor className="h-3.5 w-3.5" />
            {t('role.psychologist')}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            disabled={!canSwitchViews}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${
              viewMode === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            } ${!canSwitchViews ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : ''}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {t('role.patient')}
          </button>
        </div>
      </div>

      {!(viewMode === 'desktop' && canSeePsychologist) ? (
        <div className="fixed right-4 top-4 z-50">
          <button
            type="button"
            onClick={() => setShowUserProfile(true)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-lg transition-all hover:bg-muted"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm text-foreground">
                {user.fullName.split(' ').map((namePart) => namePart[0]).join('')}
              </div>
            )}
            <div>
              <p className="text-sm leading-tight">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.username ? `@${user.username}` : user.roles.join(' + ')}</p>
            </div>
          </button>
        </div>
      ) : null}

      {viewMode === 'desktop' && canSeePsychologist ? (
        <PsychologistDashboard
          data={appData?.psychologistData ?? null}
          currentUserName={user.fullName}
          currentUsername={user.username}
          currentAvatarUrl={user.avatarUrl}
          onOpenOwnProfile={() => setShowUserProfile(true)}
          onSendMessage={handleSendPsychologistMessage}
          onSearchPatients={handleSearchPatients}
          onAttachPatient={handleAttachPatient}
          onCreateManualAppointment={handleCreateManualAppointment}
          onUpdateManualAppointment={handleUpdateManualAppointment}
          onDeleteManualAppointment={handleDeleteManualAppointment}
          onAcceptAppointmentRequest={handleAcceptAppointmentRequest}
          onRejectAppointmentRequest={handleRejectAppointmentRequest}
          onCompleteAppointment={handleCompleteAppointment}
          onCancelAppointment={handleCancelAppointment}
          onCreateProgressNote={handleCreateProgressNote}
          onUpdateProgressNote={handleUpdateProgressNote}
          onDeleteProgressNote={handleDeleteProgressNote}
          onFetchPatientAnalytics={handleFetchPatientAnalytics}
          onAskPatientAnalytics={handleAskPatientAnalytics}
          onMarkConversationRead={handleMarkConversationRead}
          isMutating={isMutating}
        />
      ) : null}

      {viewMode === 'mobile' && canSeePatient ? (
        <PatientMobileView
          data={appData?.patientData ?? null}
          onSaveMood={handleSaveMood}
          onSaveJournalEntry={handleSaveJournalEntry}
          onUpdateJournalEntry={handleUpdateJournalEntry}
          onDeleteJournalEntry={handleDeleteJournalEntry}
          onSendCheckIn={handleSendJournalMessage}
          onBookAppointment={handleBookAppointment}
          onConfirmAppointment={handleConfirmAppointment}
          onSendMessageToTherapist={handleSendPatientMessage}
          onMarkThreadRead={handleMarkTherapistConversationRead}
          isMutating={isMutating}
        />
      ) : null}

      {!canSwitchViews && viewMode === 'desktop' && !canSeePsychologist ? (
        <PatientMobileView
          data={appData?.patientData ?? null}
          onSaveMood={handleSaveMood}
          onSaveJournalEntry={handleSaveJournalEntry}
          onUpdateJournalEntry={handleUpdateJournalEntry}
          onDeleteJournalEntry={handleDeleteJournalEntry}
          onSendCheckIn={handleSendJournalMessage}
          onBookAppointment={handleBookAppointment}
          onConfirmAppointment={handleConfirmAppointment}
          onSendMessageToTherapist={handleSendPatientMessage}
          onMarkThreadRead={handleMarkTherapistConversationRead}
          isMutating={isMutating}
        />
      ) : null}

      {!canSwitchViews && viewMode === 'mobile' && !canSeePatient ? (
        <PsychologistDashboard
          data={appData?.psychologistData ?? null}
          currentUserName={user.fullName}
          currentUsername={user.username}
          currentAvatarUrl={user.avatarUrl}
          onOpenOwnProfile={() => setShowUserProfile(true)}
          onSendMessage={handleSendPsychologistMessage}
          onSearchPatients={handleSearchPatients}
          onAttachPatient={handleAttachPatient}
          onCreateManualAppointment={handleCreateManualAppointment}
          onUpdateManualAppointment={handleUpdateManualAppointment}
          onDeleteManualAppointment={handleDeleteManualAppointment}
          onAcceptAppointmentRequest={handleAcceptAppointmentRequest}
          onRejectAppointmentRequest={handleRejectAppointmentRequest}
          onCompleteAppointment={handleCompleteAppointment}
          onCancelAppointment={handleCancelAppointment}
          onCreateProgressNote={handleCreateProgressNote}
          onUpdateProgressNote={handleUpdateProgressNote}
          onDeleteProgressNote={handleDeleteProgressNote}
          onFetchPatientAnalytics={handleFetchPatientAnalytics}
          onAskPatientAnalytics={handleAskPatientAnalytics}
          onMarkConversationRead={handleMarkConversationRead}
          isMutating={isMutating}
        />
      ) : null}

      <UserProfileModal
        isOpen={showUserProfile}
        user={user}
        canSwitchViews={canSwitchViews}
        viewMode={viewMode}
        language={language as Language}
        onClose={() => setShowUserProfile(false)}
        onViewModeChange={setViewMode}
        onToggleLanguage={() => handleLanguageChange(language === 'en' ? 'ru' : 'en')}
        onLogout={handleLogout}
        onSave={handleSaveProfile}
        isSaving={isSavingProfile}
      />
    </div>
  );
}