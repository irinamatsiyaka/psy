import axios from 'axios';
import type { AppBootstrap, MoodType, PatientAnalytics } from '../types/app';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5012';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});
export type SearchUser = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  preferredLanguage: string;
  username?: string | null;
  isInPatientList?: boolean;
  hasPsychologist?: boolean;
};

export type Conversation = {
  id: number;
  psychologistId: number;
  psychologistName: string;
  psychologistEmail: string;
  patientId: number;
  patientName: string;
  patientEmail: string;
  createdAt: string;
};

export type Message = {
  id: number;
  senderId: number;
  senderName: string;
  body: string;
  createdAt: string;
};


export const fetchAppBootstrap = async (accessToken: string): Promise<AppBootstrap> => {
  const { data } = await api.get<AppBootstrap>('/app/bootstrap', {
    headers: authHeaders(accessToken),
  });
  return data;
};
export const searchUsers = async (accessToken: string, query: string, role?: string): Promise<SearchUser[]> => {
  const { data } = await api.get<{ users: SearchUser[] }>('/users/search', {
    params: { q: query, role },
    headers: authHeaders(accessToken),
  });
  return data.users;
};

export const getOrCreateConversation = async (accessToken: string, otherUserId: number): Promise<number> => {
  const { data } = await api.post<{ conversationId: number }>(
    '/conversations',
    { otherUserId },
    {
      headers: authHeaders(accessToken),
    }
  );
  return data.conversationId;
};

export const listConversations = async (accessToken: string): Promise<Conversation[]> => {
  const { data } = await api.get<{ conversations: Conversation[] }>('/conversations', {
    headers: authHeaders(accessToken),
  });
  return data.conversations;
};

export const getConversationMessages = async (accessToken: string, conversationId: number): Promise<Message[]> => {
  const { data } = await api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`, {
    headers: authHeaders(accessToken),
  });
  return data.messages;
};

export const sendConversationMessage = async (accessToken: string, conversationId: number, body: string): Promise<Message> => {
  const { data } = await api.post<Message>(
    `/conversations/${conversationId}/messages`,
    { body },
    {
      headers: authHeaders(accessToken),
    }
  );
  return data;
};


export const sendPsychologistMessage = async (accessToken: string, patientId: string, text: string): Promise<void> => {
  await api.post(
    '/app/messages',
    { patientId, text },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const saveMood = async (accessToken: string, mood: MoodType, entryDate?: string): Promise<void> => {
  await api.post(
    '/app/moods',
    { mood, entryDate },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const saveJournalEntry = async (accessToken: string, body: string): Promise<void> => {
  await api.post(
    '/app/journal-entries',
    { body },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const updateJournalEntry = async (accessToken: string, journalEntryId: string, body: string): Promise<void> => {
  await api.patch(
    `/app/journal-entries/${journalEntryId}`,
    { body },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const deleteJournalEntry = async (accessToken: string, journalEntryId: string): Promise<void> => {
  await api.delete(`/app/journal-entries/${journalEntryId}`, {
    headers: authHeaders(accessToken),
  });
};

export const sendJournalMessage = async (accessToken: string, body: string): Promise<void> => {
  await api.post(
    '/app/journal-chat',
    { body },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const bookAppointment = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.post(
    '/app/appointments/book',
    { appointmentId },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const confirmAppointment = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.post(
    '/app/appointments/confirm',
    { appointmentId },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const acceptAppointmentRequest = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.post(
    `/app/appointments/${appointmentId}/accept-request`,
    {},
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const markAppointmentCompleted = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.post(
    `/app/appointments/${appointmentId}/complete`,
    {},
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const cancelAppointment = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.post(
    `/app/appointments/${appointmentId}/cancel`,
    {},
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const rejectAppointmentRequest = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.post(
    `/app/appointments/${appointmentId}/reject-request`,
    {},
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const createManualAppointment = async (
  accessToken: string,
  payload: { patientId: string; startsAt: string; durationMinutes: number; type: 'session' | 'initial' | 'followup' }
): Promise<void> => {
  await api.post('/app/appointments/manual', payload, {
    headers: authHeaders(accessToken),
  });
};

export const updateManualAppointment = async (
  accessToken: string,
  appointmentId: string,
  payload: { patientId: string; startsAt: string; durationMinutes: number; type: 'session' | 'initial' | 'followup' }
): Promise<void> => {
  await api.patch(`/app/appointments/${appointmentId}`, payload, {
    headers: authHeaders(accessToken),
  });
};

export const deleteManualAppointment = async (accessToken: string, appointmentId: string): Promise<void> => {
  await api.delete(`/app/appointments/${appointmentId}`, {
    headers: authHeaders(accessToken),
  });
};

export const attachPatient = async (accessToken: string, patientId: number): Promise<void> => {
  await api.post(
    '/app/patients/attach',
    { patientId },
    {
      headers: authHeaders(accessToken),
    }
  );
};

export const sendHeartbeat = async (accessToken: string): Promise<void> => {
  await api.post('/users/heartbeat', {}, { headers: authHeaders(accessToken) });
};

export const markConversationRead = async (accessToken: string, patientId: string): Promise<void> => {
  await api.post(`/app/conversations/${patientId}/read`, {}, { headers: authHeaders(accessToken) });
};

export const markTherapistConversationRead = async (accessToken: string, therapistId: string): Promise<void> => {
  await api.post(`/app/conversations/therapists/${therapistId}/read`, {}, { headers: authHeaders(accessToken) });
};

export const createProgressNote = async (
  accessToken: string,
  payload: {
    patientId: string;
    body: string;
    noteDate?: string;
    sessionNumber?: number;
    imageUrl?: string | null;
  }
): Promise<void> => {
  await api.post('/app/notes', payload, { headers: authHeaders(accessToken) });
};

export const updateProgressNote = async (
  accessToken: string,
  noteId: string,
  payload: {
    patientId: string;
    body: string;
    noteDate: string;
    sessionNumber: number;
    imageUrl?: string | null;
  }
): Promise<void> => {
  await api.patch(`/app/notes/${noteId}`, payload, { headers: authHeaders(accessToken) });
};

export const deleteProgressNote = async (accessToken: string, noteId: string): Promise<void> => {
  await api.delete(`/app/notes/${noteId}`, { headers: authHeaders(accessToken) });
};

export const fetchPatientAnalytics = async (accessToken: string, patientId: string): Promise<PatientAnalytics> => {
  const { data } = await api.get<PatientAnalytics>(`/app/analytics/${patientId}`, {
    headers: authHeaders(accessToken),
  });
  return data;
};

export const askPatientAnalytics = async (
  accessToken: string,
  patientId: string,
  question: string
): Promise<{ id: string; role: 'assistant'; text: string; time: string }> => {
  const { data } = await api.post<{ ok: true; reply: { id: string; role: 'assistant'; text: string; time: string } }>(
    `/app/analytics/${patientId}/chat`,
    { question },
    { headers: authHeaders(accessToken) }
  );
  return data.reply;
};

export const sendPatientMessageToTherapist = async (
  accessToken: string,
  therapistUserId: string,
  conversationId: string | null,
  body: string
): Promise<void> => {
  const targetConversationId = conversationId
    ? Number(conversationId)
    : await getOrCreateConversation(accessToken, Number(therapistUserId));

  await sendConversationMessage(accessToken, targetConversationId, body);
};
