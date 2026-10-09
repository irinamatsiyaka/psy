import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { PatientList } from './PatientList';
import { PatientChat } from './PatientChat';
import { PatientProfile } from './PatientProfile';
import { NotesView } from './NotesView';
import { CalendarView } from './CalendarView';
import { VideoCallInterface } from './VideoCallInterface';
import type { CallKind } from '../hooks/useCallSession';
import type { PatientAnalytics, PsychologistDashboardData, PsychologistPatient } from '../types/app';
import { AnalyticsView } from './AnalyticsView';
import { SearchPatientsModal } from './SearchPatientsModal';
import type { SearchUser } from '../services/app';

type ViewMode = 'list' | 'chat' | 'video';

interface PsychologistDashboardProps {
  data: PsychologistDashboardData | null;
  currentUserName: string;
  currentUsername?: string | null;
  currentAvatarUrl?: string | null;
  onOpenOwnProfile: () => void;
  onSendMessage: (patientId: string, text: string) => Promise<void>;
  onSearchPatients: (query: string) => Promise<SearchUser[]>;
  onAttachPatient: (patientId: number) => Promise<void>;
  onCreateManualAppointment: (payload: {
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    type: 'session' | 'initial' | 'followup';
  }) => Promise<void>;
  onUpdateManualAppointment: (appointmentId: string, payload: {
    patientId: string;
    startsAt: string;
    durationMinutes: number;
    type: 'session' | 'initial' | 'followup';
  }) => Promise<void>;
  onDeleteManualAppointment: (appointmentId: string) => Promise<void>;
  onAcceptAppointmentRequest: (appointmentId: string) => Promise<void>;
  onRejectAppointmentRequest: (appointmentId: string) => Promise<void>;
  onCompleteAppointment: (appointmentId: string) => Promise<void>;
  onCancelAppointment: (appointmentId: string) => Promise<void>;
  onCreateProgressNote: (payload: {
    patientId: string;
    body: string;
    noteDate?: string;
    sessionNumber?: number;
    imageUrl?: string | null;
  }) => Promise<void>;
  onUpdateProgressNote: (noteId: string, payload: {
    patientId: string;
    body: string;
    noteDate: string;
    sessionNumber: number;
    imageUrl?: string | null;
  }) => Promise<void>;
  onDeleteProgressNote: (noteId: string) => Promise<void>;
  onFetchPatientAnalytics: (patientId: string) => Promise<PatientAnalytics>;
  onAskPatientAnalytics: (
    patientId: string,
    question: string
  ) => Promise<{ id: string; role: 'assistant'; text: string; time: string }>;
  onMarkConversationRead: (patientId: string) => Promise<void>;
  isMutating: boolean;
}

export function PsychologistDashboard({
  data,
  currentUserName,
  currentUsername,
  currentAvatarUrl,
  onOpenOwnProfile,
  onSendMessage,
  onSearchPatients,
  onAttachPatient,
  onCreateManualAppointment,
  onUpdateManualAppointment,
  onDeleteManualAppointment,
  onAcceptAppointmentRequest,
  onRejectAppointmentRequest,
  onCompleteAppointment,
  onCancelAppointment,
  onCreateProgressNote,
  onUpdateProgressNote,
  onDeleteProgressNote,
  onFetchPatientAnalytics,
  onAskPatientAnalytics,
  onMarkConversationRead,
  isMutating,
}: PsychologistDashboardProps) {
  const [activeView, setActiveView] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState<PsychologistPatient | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [callKind, setCallKind] = useState<CallKind>('video');
  const [showProfile, setShowProfile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const patients = data?.patients ?? [];
  const appointments = data?.appointments ?? [];

  const handleSelectPatient = (patient: PsychologistPatient) => {
    setSelectedPatient(patient);
    setViewMode('chat');
    setShowProfile(false);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setViewMode('list');
    setShowProfile(false);
  };

  const handleStartVideoCall = () => {
    setCallKind('video');
    setViewMode('video');
    setShowProfile(false);
  };

  const handleStartAudioCall = () => {
    setCallKind('audio');
    setViewMode('video');
    setShowProfile(false);
  };

  const handleSelectSearchedPatient = (user: SearchUser) => {
    const existingPatient = patients.find((patient) => Number(patient.id) === user.id);
    if (existingPatient) {
      handleSelectPatient(existingPatient);
      return;
    }

    const virtualPatient: PsychologistPatient = {
      id: String(user.id),
      name: user.fullName,
      email: user.email,
      phone: '',
      age: 0,
      diagnosis: undefined,
      status: 'new',
      sessions: 0,
      isOnline: false,
      unreadCount: 0,
      sentimentData: [],
      aiSummary: {
        mainTopics: [],
        progress: '',
        actionItems: '',
      },
      recentNotes: [],
      messages: [],
      videoSession: null,
    };

    handleSelectPatient(virtualPatient);
  };

  const handleBackToChat = () => {
    setViewMode('chat');
  };

  const openNotesForPatient = () => {
    setActiveView('notes');
    setShowProfile(false);
  };

  const openCalendarForPatient = () => {
    setActiveView('calendar');
    setShowProfile(false);
  };

  useEffect(() => {
    if (!selectedPatient) {
      return;
    }

    const updatedPatient = patients.find((patient) => patient.id === selectedPatient.id);
    if (updatedPatient) {
      setSelectedPatient(updatedPatient);
    }
  }, [patients, selectedPatient]);

  return (
    <div className="flex h-screen min-h-0">
      <Sidebar activeView={activeView} onViewChange={(view) => {
        setActiveView(view);
        setViewMode('list');
        setSelectedPatient(null);
        setShowProfile(false);
      }} fullName={currentUserName} username={currentUsername} avatarUrl={currentAvatarUrl} onProfileOpen={onOpenOwnProfile} />

      {activeView === 'patients' && viewMode === 'list' && (
        <PatientList
          patients={patients}
          onSelectPatient={handleSelectPatient}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}

      {activeView === 'patients' && viewMode === 'chat' && selectedPatient && (
        <>
          <PatientChat
            patient={selectedPatient}
            onBack={handleBackToList}
            onShowProfile={() => setShowProfile(true)}
            onStartVideoCall={handleStartVideoCall}
            onStartAudioCall={handleStartAudioCall}
            onSendMessage={onSendMessage}
            onMarkRead={onMarkConversationRead}
            isSending={isMutating}
          />
          {showProfile && (
            <PatientProfile
              patient={selectedPatient}
              psychologistName={currentUserName}
              onClose={() => setShowProfile(false)}
              onStartVideoCall={handleStartVideoCall}
              onStartAudioCall={handleStartAudioCall}
              onOpenNotes={openNotesForPatient}
              onScheduleAppointment={openCalendarForPatient}
            />
          )}
        </>
      )}

      {activeView === 'patients' && viewMode === 'video' && selectedPatient && (
        <VideoCallInterface
          patient={selectedPatient}
          psychologistName={currentUserName}
          kind={callKind}
          onBack={handleBackToChat}
        />
      )}

      {activeView === 'calendar' && (
        <CalendarView
          appointments={appointments}
          patients={patients}
          onCreateAppointment={onCreateManualAppointment}
          onUpdateAppointment={onUpdateManualAppointment}
          onDeleteAppointment={onDeleteManualAppointment}
          onAcceptRequest={onAcceptAppointmentRequest}
          onRejectRequest={onRejectAppointmentRequest}
          onCompleteSession={onCompleteAppointment}
          onCancelSession={onCancelAppointment}
          isCreating={isMutating}
        />
      )}
      {activeView === 'notes' && (
        <NotesView
          patients={patients}
          onCreateNote={onCreateProgressNote}
          onUpdateNote={onUpdateProgressNote}
          onDeleteNote={onDeleteProgressNote}
          isSaving={isMutating}
        />
      )}

      {activeView === 'analytics' && (
        <AnalyticsView
          patients={patients}
          appointments={appointments}
          onFetchPatientAnalytics={onFetchPatientAnalytics}
          onAskPatientAnalytics={onAskPatientAnalytics}
          isLoading={isMutating}
        />
      )}

      <SearchPatientsModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPatient={handleSelectSearchedPatient}
        onAttachPatient={onAttachPatient}
        onSearch={onSearchPatients}
        isLoading={isMutating}
      />
    </div>
  );
}
