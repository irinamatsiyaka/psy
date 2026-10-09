import type { UserRole } from './auth';

export type PatientStatus = 'new' | 'active' | 'scheduled' | 'completed';
export type AppointmentType = 'session' | 'initial' | 'followup';
export type AppointmentStatus = 'confirmed' | 'pending' | 'completed';
export type MoodType = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export type PsychologistPatient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  diagnosis?: string;
  status: PatientStatus;
  sessions: number;
  lastSession?: string;
  nextSession?: string;
  nextSessionAt?: string;
  isOnline: boolean;
  lastSeenAt?: string;
  unreadCount: number;
  lastMessageAt?: string;
  sentimentData: Array<{ date: string; sentiment: number }>;
  aiSummary: {
    mainTopics: string[];
    progress: string;
    actionItems: string;
  };
  recentNotes: Array<{
    id: string;
    date: string;
    sessionNumber: number;
    preview: string;
    text: string;
    imageUrl?: string;
  }>;
  messages: Array<{
    id: string;
    sender: 'doctor' | 'patient';
    text: string;
    time: string;
    createdAt: string;
    isRead: boolean;
  }>;
  videoSession: {
    startedAt: string;
    transcript: Array<{
      speaker: string;
      text: string;
      time: string;
    }>;
    aiNotes: string[];
  } | null;
};

export type PsychologistDashboardData = {
  patients: PsychologistPatient[];
  appointments: Array<{
    id: string;
    patientId: string;
    patientName: string;
    startsAt: string;
    dateKey: string;
    dateLabel: string;
    time: string;
    duration: number;
    type: AppointmentType;
    status: AppointmentStatus;
    pendingActor?: 'patient' | 'psychologist' | null;
  }>;
};

export type PatientMobileData = {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
    age: number | null;
    diagnosis?: string;
    therapistName?: string;
    therapistTitle?: string;
    patientSince: string;
    nextSession?: string;
    totalSessions: number;
    onboardingCompleted: boolean;
  };
  moods: Array<{ date: string; mood: MoodType }>;
  journalEntries: Array<{ id: string; createdAt: string; body: string }>;
  checkInMessages: Array<{ id: string; type: 'bot' | 'user'; text: string }>;
  pendingAppointments: Array<{
    id: string;
    startsAt: string;
    dateLabel: string;
    time: string;
    type: AppointmentType;
  }>;
  myAppointments: Array<{
    id: string;
    startsAt: string;
    dateLabel: string;
    time: string;
    type: AppointmentType;
    status: 'pending' | 'confirmed' | 'completed';
    therapistName: string;
    needsMyConfirmation: boolean;
  }>;
  availableSlots: Array<{
    id: string;
    day: string;
    date: number;
    isoDate: string;
    time: string;
    therapistName: string;
    therapistTitle: string;
  }>;
  chatThreads: Array<{
    therapistId: string;
    therapistName: string;
    therapistEmail: string;
    conversationId: string | null;
    isOnline: boolean;
    therapistLastSeenAt?: string;
    unreadCount: number;
    lastMessageAt?: string;
    messages: Array<{
      id: string;
      sender: 'patient' | 'therapist';
      text: string;
      time: string;
      createdAt: string;
      isRead: boolean;
    }>;
  }>;
};

export type AppBootstrap = {
  psychologistData: PsychologistDashboardData | null;
  patientData: PatientMobileData | null;
};

export type PatientAnalytics = {
  patient: {
    id: string;
    name: string;
  };
  sentimentData: Array<{ date: string; sentiment: number }>;
  notes: Array<{
    id: string;
    date: string;
    sessionNumber: number;
    text: string;
    imageUrl?: string;
  }>;
  aiOverview: string;
  aiRecommendations: string[];
  chat: Array<{
    id: string;
    role: 'psychologist' | 'assistant';
    text: string;
    time: string;
  }>;
};

export const hasRole = (roles: UserRole[], role: UserRole): boolean => roles.includes(role);
