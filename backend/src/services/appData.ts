import { pool } from "../db/pool";

export type UserRole = "psychologist" | "patient";

type PatientStatus = "new" | "active" | "scheduled" | "completed";
type AppointmentType = "session" | "initial" | "followup";
type AppointmentStatus = "available" | "confirmed" | "pending" | "completed" | "cancelled";
type PendingActor = "patient" | "psychologist";
type MoodType = "great" | "good" | "okay" | "bad" | "terrible";

type TranscriptEntry = {
  speaker: string;
  text: string;
  time: string;
};

type PsychologistPatientRow = {
  id: number;
  name: string;
  email: string;
  age: number | null;
  diagnosis: string | null;
  phone: string | null;
  status: PatientStatus | null;
  summary_topics: string[] | null;
  summary_progress: string | null;
  summary_actions: string | null;
  sessions: number;
  last_session_at: DbDateValue | null;
  next_session_at: DbDateValue | null;
  user_last_seen_at: DbDateValue | null;
};

type ProgressNoteRow = {
  id: number;
  patient_user_id: number;
  note_date: DbDateValue;
  session_number: number;
  body: string;
  image_url: string | null;
};

type PatientAIMsgRow = {
  id: number;
  role: "psychologist" | "assistant";
  body: string;
  created_at: DbDateValue;
};

type MessageRow = {
  patient_user_id: number;
  id: number;
  sender_user_id: number;
  body: string;
  created_at: DbDateValue;
  is_read: boolean;
};

type MoodEntryRow = {
  patient_user_id: number;
  entry_date: DbDateValue;
  mood: MoodType;
};

type SessionArtifactRow = {
  patient_user_id: number;
  started_at: DbDateValue;
  transcript: TranscriptEntry[];
  ai_notes: string[];
};

type AppointmentRow = {
  id: number;
  psychologist_user_id: number;
  patient_user_id: number | null;
  patient_name: string | null;
  starts_at: DbDateValue;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  pending_actor: PendingActor | null;
};

type TherapistConversationRow = {
  therapist_id: number;
  therapist_name: string;
  therapist_email: string;
  therapist_last_seen_at: DbDateValue | null;
  conversation_id: number | null;
};

type TherapistConversationMessageRow = {
  conversation_id: number;
  id: number;
  sender_user_id: number;
  body: string;
  created_at: DbDateValue;
  is_read: boolean;
};

type PatientSelfRow = {
  id: number;
  full_name: string;
  email: string;
  age: number | null;
  diagnosis: string | null;
  phone: string | null;
  onboarding_completed: boolean | null;
};

type TherapistRow = {
  id: number;
  full_name: string;
  email: string;
};

type JournalEntryRow = {
  id: number;
  body: string;
  created_at: DbDateValue;
};

type JournalChatRow = {
  id: number;
  sender_kind: "bot" | "user";
  body: string;
  created_at: DbDateValue;
};

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
    sender: "doctor" | "patient";
    text: string;
    time: string;
    createdAt: string;
    isRead: boolean;
  }>;
  videoSession: {
    startedAt: string;
    transcript: TranscriptEntry[];
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
    status: Exclude<AppointmentStatus, "available" | "cancelled">;
    pendingActor?: PendingActor | null;
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
  checkInMessages: Array<{ id: string; type: "bot" | "user"; text: string }>;
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
    status: "pending" | "confirmed" | "completed";
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
      sender: "patient" | "therapist";
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

export type PatientAnalyticsData = {
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
    role: "psychologist" | "assistant";
    text: string;
    time: string;
  }>;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit"
});

const shortDayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short"
});

type DbDateValue = string | Date | number;

const toDate = (value: DbDateValue | null | undefined): Date | null => {
  if (value == null) return null;
  const parsed = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateLabel = (value: DbDateValue | null): string | undefined => {
  const parsed = toDate(value);
  return parsed ? monthFormatter.format(parsed) : undefined;
};

const formatTimeLabel = (value: DbDateValue): string => {
  const parsed = toDate(value);
  return parsed ? timeFormatter.format(parsed) : "--:--";
};

const buildDateKey = (value: DbDateValue): string => {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
};

// pg parses DATE columns as local-midnight Date objects, so format with local getters.
const toLocalDateKey = (value: DbDateValue): string => {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const parsed = toDate(value);
  if (!parsed) return "";
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
};

const toSentimentScore = (mood: MoodType): number => {
  switch (mood) {
    case "great":
      return 9;
    case "good":
      return 7;
    case "okay":
      return 5;
    case "bad":
      return 3;
    case "terrible":
      return 1;
    default:
      return 5;
  }
};

const buildPreview = (text: string): string => {
  return text.length > 96 ? `${text.slice(0, 93).trimEnd()}...` : text;
};

const extractMainTopics = (topics: string[] | null): string[] => {
  return topics?.length ? topics : ["Clinical progress", "Care plan", "Follow-up"];
};

const getPsychologistDashboardData = async (userId: number): Promise<PsychologistDashboardData> => {
  const patientRows = await pool.query<PsychologistPatientRow>(
    `
      SELECT
        patient_user.id,
        patient_user.full_name AS name,
        patient_user.email,
        patient_user.last_seen_at AS user_last_seen_at,
        patient_profile.age,
        patient_profile.diagnosis,
        patient_profile.phone,
        patient_profile.status,
        patient_profile.summary_topics,
        patient_profile.summary_progress,
        patient_profile.summary_actions,
        COALESCE(completed.sessions, 0) AS sessions,
        completed.last_session_at,
        upcoming.next_session_at
      FROM therapist_patients relationship
      JOIN users patient_user ON patient_user.id = relationship.patient_user_id
      LEFT JOIN patient_profiles patient_profile ON patient_profile.user_id = patient_user.id
      LEFT JOIN (
        SELECT
          patient_user_id,
          COUNT(*)::int AS sessions,
          MAX(starts_at) AS last_session_at
        FROM appointments
        WHERE psychologist_user_id = $1 AND status = 'completed' AND patient_user_id IS NOT NULL
        GROUP BY patient_user_id
      ) completed ON completed.patient_user_id = patient_user.id
      LEFT JOIN (
        SELECT
          patient_user_id,
          MIN(starts_at) AS next_session_at
        FROM appointments
        WHERE psychologist_user_id = $1 AND status IN ('confirmed', 'pending') AND patient_user_id IS NOT NULL
        GROUP BY patient_user_id
      ) upcoming ON upcoming.patient_user_id = patient_user.id
      WHERE relationship.psychologist_user_id = $1
      ORDER BY patient_user.full_name
    `,
    [userId]
  );

  const patientIds = patientRows.rows.map((row) => row.id);

  if (patientIds.length === 0) {
    return { patients: [], appointments: [] };
  }

  const [noteResult, messageResult, moodResult, artifactResult, appointmentResult] = await Promise.all([
    pool.query<ProgressNoteRow>(
      `
        SELECT id, patient_user_id, note_date, session_number, body, image_url
        FROM progress_notes
        WHERE psychologist_user_id = $1 AND patient_user_id = ANY($2::int[])
        ORDER BY note_date DESC
      `,
      [userId, patientIds]
    ),
    pool.query<MessageRow>(
      `
        SELECT conversation.patient_user_id, message.id, message.sender_user_id, message.body, message.created_at, message.is_read
        FROM conversations conversation
        JOIN messages message ON message.conversation_id = conversation.id
        WHERE conversation.psychologist_user_id = $1 AND conversation.patient_user_id = ANY($2::int[])
        ORDER BY message.created_at ASC
      `,
      [userId, patientIds]
    ),
    pool.query<MoodEntryRow>(
      `
        SELECT patient_user_id, entry_date, mood
        FROM mood_entries
        WHERE patient_user_id = ANY($1::int[])
        ORDER BY entry_date ASC
      `,
      [patientIds]
    ),
    pool.query<SessionArtifactRow>(
      `
        SELECT patient_user_id, started_at, transcript, ai_notes
        FROM session_artifacts
        WHERE psychologist_user_id = $1 AND patient_user_id = ANY($2::int[])
        ORDER BY started_at DESC
      `,
      [userId, patientIds]
    ),
    pool.query<AppointmentRow>(
      `
        SELECT
          appointment.id,
          appointment.psychologist_user_id,
          appointment.patient_user_id,
          patient_user.full_name AS patient_name,
          appointment.starts_at,
          appointment.duration_minutes,
          appointment.type,
          appointment.status,
          appointment.pending_actor
        FROM appointments appointment
        JOIN users patient_user ON patient_user.id = appointment.patient_user_id
        WHERE appointment.psychologist_user_id = $1
          AND appointment.patient_user_id = ANY($2::int[])
          AND appointment.status IN ('confirmed', 'pending', 'completed')
        ORDER BY appointment.starts_at ASC
      `,
      [userId, patientIds]
    )
  ]);

  const notesByPatient = new Map<number, ProgressNoteRow[]>();
  for (const note of noteResult.rows) {
    const group = notesByPatient.get(note.patient_user_id) ?? [];
    group.push(note);
    notesByPatient.set(note.patient_user_id, group);
  }

  const messagesByPatient = new Map<number, MessageRow[]>();
  for (const message of messageResult.rows) {
    const group = messagesByPatient.get(message.patient_user_id) ?? [];
    group.push(message);
    messagesByPatient.set(message.patient_user_id, group);
  }

  const moodsByPatient = new Map<number, MoodEntryRow[]>();
  for (const moodEntry of moodResult.rows) {
    const group = moodsByPatient.get(moodEntry.patient_user_id) ?? [];
    group.push(moodEntry);
    moodsByPatient.set(moodEntry.patient_user_id, group);
  }

  const artifactByPatient = new Map<number, SessionArtifactRow>();
  for (const artifact of artifactResult.rows) {
    if (!artifactByPatient.has(artifact.patient_user_id)) {
      artifactByPatient.set(artifact.patient_user_id, artifact);
    }
  }

  const patients = patientRows.rows.map<PsychologistPatient>((row) => {
    const notes = notesByPatient.get(row.id) ?? [];
    const messages = messagesByPatient.get(row.id) ?? [];
    const moods = moodsByPatient.get(row.id) ?? [];
    const latestArtifact = artifactByPatient.get(row.id) ?? null;
    const lastMessageAt = messages.length ? toDate(messages[messages.length - 1].created_at)?.toISOString() : undefined;
    const unreadCount = messages.filter((message) => message.sender_user_id !== userId && !message.is_read).length;

    const userLastSeenAt = toDate(row.user_last_seen_at);
    const now = Date.now();
    const onlineWindowMs = 2 * 60 * 1000;
    const maxFutureSkewMs = 10 * 1000;
    const lastSeenMs = userLastSeenAt?.getTime() ?? null;
    const isOnline =
      lastSeenMs != null &&
      lastSeenMs <= now + maxFutureSkewMs &&
      lastSeenMs >= now - onlineWindowMs;

    return {
      id: String(row.id),
      name: row.name,
      email: row.email,
      phone: row.phone ?? "Not provided",
      age: row.age ?? 0,
      diagnosis: row.diagnosis ?? undefined,
      status: row.status ?? (row.next_session_at ? "scheduled" : row.sessions > 0 ? "active" : "new"),
      sessions: row.sessions,
      lastSession: formatDateLabel(row.last_session_at),
      nextSession: formatDateLabel(row.next_session_at),
      nextSessionAt: toDate(row.next_session_at)?.toISOString(),
      isOnline,
      lastSeenAt: userLastSeenAt?.toISOString(),
      unreadCount,
      lastMessageAt,
      sentimentData: moods.map((moodEntry) => ({
        date: monthFormatter.format(new Date(moodEntry.entry_date)),
        sentiment: toSentimentScore(moodEntry.mood)
      })),
      aiSummary: {
        mainTopics: extractMainTopics(row.summary_topics),
        progress: row.summary_progress ?? "Patient is still building a baseline care rhythm.",
        actionItems: row.summary_actions ?? "Confirm next steps and document a concrete homework item."
      },
      recentNotes: notes.map((note) => ({
        id: String(note.id),
        date: monthFormatter.format(new Date(note.note_date)),
        sessionNumber: note.session_number,
        preview: buildPreview(note.body),
        text: note.body,
        imageUrl: note.image_url ?? undefined
      })),
      messages: messages.map((message) => ({
        id: String(message.id),
        sender: message.sender_user_id === userId ? "doctor" : "patient",
        text: message.body,
        time: formatTimeLabel(message.created_at),
        createdAt: toDate(message.created_at)?.toISOString() ?? new Date(message.created_at).toISOString(),
        isRead: message.is_read
      })),
      videoSession: latestArtifact
        ? {
            startedAt: formatTimeLabel(latestArtifact.started_at),
            transcript: latestArtifact.transcript,
            aiNotes: latestArtifact.ai_notes
          }
        : null
    };
  });

  return {
    patients,
    appointments: appointmentResult.rows.map((appointment) => ({
      id: String(appointment.id),
      patientId: String(appointment.patient_user_id ?? ""),
      patientName: appointment.patient_name ?? "Unknown patient",
      startsAt: toDate(appointment.starts_at)?.toISOString() ?? new Date(appointment.starts_at).toISOString(),
      dateKey: buildDateKey(appointment.starts_at),
      dateLabel: monthFormatter.format(new Date(appointment.starts_at)),
      time: formatTimeLabel(appointment.starts_at),
      duration: appointment.duration_minutes,
      type: appointment.type,
      status: appointment.status as Exclude<AppointmentStatus, "available" | "cancelled">,
      pendingActor: appointment.pending_actor
    }))
  };
};

const getPatientMobileData = async (userId: number): Promise<PatientMobileData> => {
  const [selfResult, therapistResult, appointmentsResult, moodResult, journalResult, chatResult, therapistConversationResult] = await Promise.all([
    pool.query<PatientSelfRow>(
      `
        SELECT user_account.id, user_account.full_name, user_account.email, patient_profile.age, patient_profile.diagnosis, patient_profile.phone, patient_profile.onboarding_completed
        FROM users user_account
        LEFT JOIN patient_profiles patient_profile ON patient_profile.user_id = user_account.id
        WHERE user_account.id = $1
      `,
      [userId]
    ),
    pool.query<TherapistRow>(
      `
        SELECT therapist.id, therapist.full_name, therapist.email
        FROM therapist_patients relationship
        JOIN users therapist ON therapist.id = relationship.psychologist_user_id
        WHERE relationship.patient_user_id = $1
        ORDER BY relationship.created_at ASC
        LIMIT 1
      `,
      [userId]
    ),
    pool.query<AppointmentRow>(
      `
        SELECT
          appointment.id,
          appointment.psychologist_user_id,
          appointment.patient_user_id,
          therapist.full_name AS patient_name,
          appointment.starts_at,
          appointment.duration_minutes,
          appointment.type,
          appointment.status,
          appointment.pending_actor
        FROM appointments appointment
        JOIN users therapist ON therapist.id = appointment.psychologist_user_id
        WHERE appointment.patient_user_id = $1
           OR (
             appointment.patient_user_id IS NULL
             AND appointment.psychologist_user_id IN (
               SELECT psychologist_user_id FROM therapist_patients WHERE patient_user_id = $1
             )
             AND appointment.status = 'available'
           )
        ORDER BY appointment.starts_at ASC
      `,
      [userId]
    ),
    pool.query<MoodEntryRow>(
      `
        SELECT patient_user_id, entry_date, mood
        FROM mood_entries
        WHERE patient_user_id = $1
        ORDER BY entry_date ASC
      `,
      [userId]
    ),
    pool.query<JournalEntryRow>(
      `
        SELECT id, body, created_at
        FROM journal_entries
        WHERE patient_user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    ),
    pool.query<JournalChatRow>(
      `
        SELECT id, sender_kind, body, created_at
        FROM journal_chat_messages
        WHERE patient_user_id = $1
        ORDER BY created_at ASC
      `,
      [userId]
    ),
    pool.query<TherapistConversationRow>(
      `
        SELECT
          therapist.id AS therapist_id,
          therapist.full_name AS therapist_name,
          therapist.email AS therapist_email,
          therapist.last_seen_at AS therapist_last_seen_at,
          conversation.id AS conversation_id
        FROM therapist_patients relationship
        JOIN users therapist ON therapist.id = relationship.psychologist_user_id
        LEFT JOIN conversations conversation
          ON conversation.psychologist_user_id = relationship.psychologist_user_id
         AND conversation.patient_user_id = relationship.patient_user_id
        WHERE relationship.patient_user_id = $1
        ORDER BY relationship.created_at ASC
      `,
      [userId]
    )
  ]);

  const selfRow = selfResult.rows[0];
  if (!selfRow) {
    return {
      profile: {
        id: String(userId),
        name: "New Patient",
        email: "",
        phone: "",
        age: null,
        patientSince: monthFormatter.format(new Date()),
        totalSessions: 0,
        onboardingCompleted: false
      },
      moods: [],
      journalEntries: [],
      checkInMessages: [],
      pendingAppointments: [],
      myAppointments: [],
      availableSlots: [],
      chatThreads: []
    };
  }

  const therapists = therapistResult.rows;
  const therapist = therapists[0];
  const bookedAppointments = appointmentsResult.rows.filter((appointment) => appointment.patient_user_id === userId);
  const availableAppointments = appointmentsResult.rows.filter((appointment) => appointment.patient_user_id === null);
  const pendingAppointments = bookedAppointments.filter(
    (appointment) => appointment.status === "pending" && appointment.pending_actor === "patient"
  );
  const upcomingAppointment = bookedAppointments.find((appointment) => appointment.status === "confirmed" || appointment.status === "pending");
  const completedCount = bookedAppointments.filter((appointment) => appointment.status === "completed").length;

  const conversationIds = therapistConversationResult.rows
    .map((row) => row.conversation_id)
    .filter((conversationId): conversationId is number => typeof conversationId === "number");

  const conversationMessagesResult = conversationIds.length
    ? await pool.query<TherapistConversationMessageRow>(
      `
        SELECT conversation_id, id, sender_user_id, body, created_at
             , is_read
        FROM messages
        WHERE conversation_id = ANY($1::int[])
        ORDER BY created_at ASC
      `,
      [conversationIds]
    )
    : { rows: [] as TherapistConversationMessageRow[] };

  const messagesByConversation = new Map<number, TherapistConversationMessageRow[]>();
  for (const message of conversationMessagesResult.rows) {
    const group = messagesByConversation.get(message.conversation_id) ?? [];
    group.push(message);
    messagesByConversation.set(message.conversation_id, group);
  }

  return {
    profile: {
      id: String(selfRow.id),
      name: selfRow.full_name,
      email: selfRow.email,
      phone: selfRow.phone ?? "",
      age: selfRow.age,
      diagnosis: selfRow.diagnosis ?? undefined,
      therapistName: therapist?.full_name,
      therapistTitle: therapist ? "Licensed Clinical Psychologist" : undefined,
      patientSince: monthFormatter.format(new Date("2026-01-12T00:00:00.000Z")),
      nextSession: upcomingAppointment ? `${monthFormatter.format(new Date(upcomingAppointment.starts_at))} at ${formatTimeLabel(upcomingAppointment.starts_at)}` : undefined,
      totalSessions: completedCount,
      onboardingCompleted: selfRow.onboarding_completed ?? false
    },
    moods: moodResult.rows.map((entry) => ({
      date: toLocalDateKey(entry.entry_date),
      mood: entry.mood
    })),
    journalEntries: journalResult.rows.map((entry) => ({
      id: String(entry.id),
      createdAt: `${monthFormatter.format(new Date(entry.created_at))} • ${formatTimeLabel(entry.created_at)}`,
      body: entry.body
    })),
    checkInMessages: chatResult.rows.map((message) => ({
      id: String(message.id),
      type: message.sender_kind,
      text: message.body
    })),
    pendingAppointments: pendingAppointments.map((appointment) => ({
      id: String(appointment.id),
      startsAt: toDate(appointment.starts_at)?.toISOString() ?? new Date(appointment.starts_at).toISOString(),
      dateLabel: monthFormatter.format(new Date(appointment.starts_at)),
      time: formatTimeLabel(appointment.starts_at),
      type: appointment.type
    })),
    myAppointments: bookedAppointments
      .filter((appointment) => appointment.status === "pending" || appointment.status === "confirmed" || appointment.status === "completed")
      .map((appointment) => ({
        id: String(appointment.id),
        startsAt: toDate(appointment.starts_at)?.toISOString() ?? new Date(appointment.starts_at).toISOString(),
        dateLabel: monthFormatter.format(new Date(appointment.starts_at)),
        time: formatTimeLabel(appointment.starts_at),
        type: appointment.type,
        status: appointment.status as "pending" | "confirmed" | "completed",
        therapistName: appointment.patient_name ?? therapist?.full_name ?? "Your therapist",
        needsMyConfirmation: appointment.status === "pending" && appointment.pending_actor === "patient"
      })),
    availableSlots: availableAppointments.map((appointment) => ({
      id: String(appointment.id),
      day: shortDayFormatter.format(new Date(appointment.starts_at)),
      date: new Date(appointment.starts_at).getDate(),
      isoDate: buildDateKey(appointment.starts_at),
      time: formatTimeLabel(appointment.starts_at),
      therapistName: appointment.patient_name ?? therapist?.full_name ?? "Your therapist",
      therapistTitle: "Licensed Clinical Psychologist"
    })),
    chatThreads: therapistConversationResult.rows.map((row) => {
      const therapistLastSeenAt = toDate(row.therapist_last_seen_at);
      const now = Date.now();
      const onlineWindowMs = 2 * 60 * 1000;
      const maxFutureSkewMs = 10 * 1000;
      const lastSeenMs = therapistLastSeenAt?.getTime() ?? null;
      const isOnline =
        lastSeenMs != null &&
        lastSeenMs <= now + maxFutureSkewMs &&
        lastSeenMs >= now - onlineWindowMs;

      const threadMessages = row.conversation_id ? messagesByConversation.get(row.conversation_id) ?? [] : [];
      const lastMessageAt = threadMessages.length
        ? toDate(threadMessages[threadMessages.length - 1].created_at)?.toISOString()
        : undefined;
      const unreadCount = threadMessages.filter((message) => message.sender_user_id !== userId && !message.is_read).length;
      return {
        therapistId: String(row.therapist_id),
        therapistName: row.therapist_name,
        therapistEmail: row.therapist_email,
        conversationId: row.conversation_id ? String(row.conversation_id) : null,
        isOnline,
        therapistLastSeenAt: therapistLastSeenAt?.toISOString(),
        unreadCount,
        lastMessageAt,
        messages: threadMessages.map((message) => ({
          id: String(message.id),
          sender: message.sender_user_id === userId ? "patient" : "therapist",
          text: message.body,
          time: formatTimeLabel(message.created_at),
          createdAt: toDate(message.created_at)?.toISOString() ?? new Date(message.created_at).toISOString(),
          isRead: message.is_read
        }))
      };
    })
  };
};

export const getAppBootstrap = async (userId: number, roles: UserRole[]): Promise<AppBootstrap> => {
  const normalizedRoles = Array.from(new Set(roles));

  const [psychologistData, patientData] = await Promise.all([
    normalizedRoles.includes("psychologist") ? getPsychologistDashboardData(userId) : Promise.resolve(null),
    normalizedRoles.includes("patient") ? getPatientMobileData(userId) : Promise.resolve(null)
  ]);

  return { psychologistData, patientData };
};

export const createPsychologistMessage = async (psychologistUserId: number, patientUserId: number, text: string): Promise<void> => {
  await pool.query(
    `
      INSERT INTO therapist_patients (psychologist_user_id, patient_user_id)
      VALUES ($1, $2)
      ON CONFLICT (psychologist_user_id, patient_user_id) DO NOTHING
    `,
    [psychologistUserId, patientUserId]
  );

  const existingConversation = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM conversations
      WHERE psychologist_user_id = $1 AND patient_user_id = $2
      LIMIT 1
    `,
    [psychologistUserId, patientUserId]
  );

  const conversationId = existingConversation.rows[0]?.id ?? (
    await pool.query<{ id: number }>(
      `
        INSERT INTO conversations (psychologist_user_id, patient_user_id)
        VALUES ($1, $2)
        RETURNING id
      `,
      [psychologistUserId, patientUserId]
    )
  ).rows[0].id;

  await pool.query(
    `
      INSERT INTO messages (conversation_id, sender_user_id, body)
      VALUES ($1, $2, $3)
    `,
    [conversationId, psychologistUserId, text.trim()]
  );
};

export const attachPatientToPsychologist = async (psychologistUserId: number, patientUserId: number): Promise<void> => {
  await pool.query(
    `
      INSERT INTO therapist_patients (psychologist_user_id, patient_user_id)
      VALUES ($1, $2)
      ON CONFLICT (psychologist_user_id, patient_user_id) DO NOTHING
    `,
    [psychologistUserId, patientUserId]
  );
};

export const createMoodEntry = async (patientUserId: number, mood: MoodType, entryDate?: string): Promise<void> => {
  const normalizedDate = entryDate ? new Date(entryDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  await pool.query(
    `
      INSERT INTO mood_entries (patient_user_id, entry_date, mood)
      VALUES ($1, $2::date, $3)
      ON CONFLICT (patient_user_id, entry_date) DO UPDATE
      SET mood = EXCLUDED.mood
    `,
    [patientUserId, normalizedDate, mood]
  );
};

export const createJournalEntry = async (patientUserId: number, body: string): Promise<void> => {
  await pool.query(
    `
      INSERT INTO journal_entries (patient_user_id, body)
      VALUES ($1, $2)
    `,
    [patientUserId, body.trim()]
  );
};

export const updateJournalEntry = async (patientUserId: number, journalEntryId: number, body: string): Promise<boolean> => {
  const result = await pool.query(
    `
      UPDATE journal_entries
      SET body = $3
      WHERE id = $1 AND patient_user_id = $2
    `,
    [journalEntryId, patientUserId, body.trim()]
  );

  return (result.rowCount ?? 0) > 0;
};

export const deleteJournalEntry = async (patientUserId: number, journalEntryId: number): Promise<boolean> => {
  const result = await pool.query(
    `
      DELETE FROM journal_entries
      WHERE id = $1 AND patient_user_id = $2
    `,
    [journalEntryId, patientUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const createJournalChatReply = async (patientUserId: number, text: string): Promise<void> => {
  const trimmed = text.trim();
  await pool.query(
    `
      INSERT INTO journal_chat_messages (patient_user_id, sender_kind, body)
      VALUES ($1, 'user', $2)
    `,
    [patientUserId, trimmed]
  );

  const reply = trimmed.length < 40
    ? "Спасибо, что поделились этим. Можете добавить ещё одну деталь о том, что именно сегодня вызвало такое ощущение?"
    : "Спасибо, что рассказали. Что помогло бы вам сегодня чувствовать себя на 10% устойчивее завтра?";

  await pool.query(
    `
      INSERT INTO journal_chat_messages (patient_user_id, sender_kind, body)
      VALUES ($1, 'bot', $2)
    `,
    [patientUserId, reply]
  );
};

export const bookAvailableAppointment = async (patientUserId: number, appointmentId: number): Promise<boolean> => {
  const available = await pool.query<{
    psychologist_user_id: number;
    starts_at: string;
    duration_minutes: number;
    type: AppointmentType;
  }>(
    `
      SELECT psychologist_user_id, starts_at, duration_minutes, type
      FROM appointments
      WHERE id = $1 AND patient_user_id IS NULL AND status = 'available'
      LIMIT 1
    `,
    [appointmentId]
  );

  const source = available.rows[0];
  if (!source) {
    return false;
  }

  const duplicate = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM appointments
      WHERE psychologist_user_id = $1
        AND patient_user_id = $2
        AND status = 'pending'
        AND pending_actor = 'psychologist'
        AND starts_at = $3
      LIMIT 1
    `,
    [source.psychologist_user_id, patientUserId, source.starts_at]
  );

  if ((duplicate.rowCount ?? 0) > 0) {
    return true;
  }

  await pool.query(
    `
      INSERT INTO appointments (
        psychologist_user_id,
        patient_user_id,
        starts_at,
        duration_minutes,
        type,
        status,
        pending_actor
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', 'psychologist')
    `,
    [source.psychologist_user_id, patientUserId, source.starts_at, source.duration_minutes, source.type]
  );

  return true;
};

export const confirmPendingAppointment = async (patientUserId: number, appointmentId: number): Promise<boolean> => {
  const result = await pool.query(
    `
      UPDATE appointments
      SET status = 'confirmed', pending_actor = NULL
      WHERE id = $1 AND patient_user_id = $2 AND status = 'pending' AND pending_actor = 'patient'
    `,
    [appointmentId, patientUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const createPsychologistAppointment = async (
  psychologistUserId: number,
  patientUserId: number,
  startsAt: string,
  durationMinutes: number,
  type: "session" | "initial" | "followup"
): Promise<number> => {
  const conflict = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM appointments
      WHERE psychologist_user_id = $1
        AND status IN ('confirmed', 'pending')
        AND tstzrange(starts_at, starts_at + make_interval(mins => duration_minutes), '[)')
          && tstzrange($2::timestamptz, $2::timestamptz + make_interval(mins => $3), '[)')
      LIMIT 1
    `,
    [psychologistUserId, startsAt, durationMinutes]
  );

  if ((conflict.rowCount ?? 0) > 0) {
    throw new Error("APPOINTMENT_OVERLAP");
  }

  await pool.query(
    `
      INSERT INTO therapist_patients (psychologist_user_id, patient_user_id)
      VALUES ($1, $2)
      ON CONFLICT (psychologist_user_id, patient_user_id) DO NOTHING
    `,
    [psychologistUserId, patientUserId]
  );

  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO appointments (
        psychologist_user_id,
        patient_user_id,
        starts_at,
        duration_minutes,
        type,
        status,
        pending_actor
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', 'patient')
      RETURNING id
    `,
    [psychologistUserId, patientUserId, startsAt, durationMinutes, type]
  );

  return result.rows[0].id;
};

export const updatePsychologistAppointment = async (
  psychologistUserId: number,
  appointmentId: number,
  payload: {
    patientUserId: number;
    startsAt: string;
    durationMinutes: number;
    type: "session" | "initial" | "followup";
  }
): Promise<boolean> => {
  const conflict = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM appointments
      WHERE psychologist_user_id = $1
        AND id <> $2
        AND status IN ('confirmed', 'pending')
        AND tstzrange(starts_at, starts_at + make_interval(mins => duration_minutes), '[)')
          && tstzrange($3::timestamptz, $3::timestamptz + make_interval(mins => $4), '[)')
      LIMIT 1
    `,
    [psychologistUserId, appointmentId, payload.startsAt, payload.durationMinutes]
  );

  if ((conflict.rowCount ?? 0) > 0) {
    throw new Error("APPOINTMENT_OVERLAP");
  }

  await pool.query(
    `
      INSERT INTO therapist_patients (psychologist_user_id, patient_user_id)
      VALUES ($1, $2)
      ON CONFLICT (psychologist_user_id, patient_user_id) DO NOTHING
    `,
    [psychologistUserId, payload.patientUserId]
  );

  const result = await pool.query(
    `
      UPDATE appointments
      SET
        patient_user_id = $3,
        starts_at = $4,
        duration_minutes = $5,
        type = $6,
        status = CASE WHEN status = 'cancelled' THEN 'pending' ELSE status END,
        pending_actor = CASE WHEN status = 'cancelled' THEN 'patient' ELSE pending_actor END
      WHERE id = $1 AND psychologist_user_id = $2
    `,
    [
      appointmentId,
      psychologistUserId,
      payload.patientUserId,
      payload.startsAt,
      payload.durationMinutes,
      payload.type
    ]
  );

  return (result.rowCount ?? 0) > 0;
};

export const deletePsychologistAppointment = async (
  psychologistUserId: number,
  appointmentId: number
): Promise<boolean> => {
  const result = await pool.query(
    `
      DELETE FROM appointments
      WHERE id = $1 AND psychologist_user_id = $2
    `,
    [appointmentId, psychologistUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const acceptPatientAppointmentRequest = async (
  psychologistUserId: number,
  appointmentId: number
): Promise<boolean> => {
  const pendingRequest = await pool.query<{
    id: number;
    starts_at: string;
    duration_minutes: number;
  }>(
    `
      SELECT id, starts_at, duration_minutes
      FROM appointments
      WHERE id = $1
        AND psychologist_user_id = $2
        AND status = 'pending'
        AND pending_actor = 'psychologist'
      LIMIT 1
    `,
    [appointmentId, psychologistUserId]
  );

  const request = pendingRequest.rows[0];
  if (!request) {
    return false;
  }

  await pool.query(
    `
      UPDATE appointments
      SET status = 'confirmed', pending_actor = NULL
      WHERE id = $1
    `,
    [appointmentId]
  );

  await pool.query(
    `
      UPDATE appointments
      SET status = 'cancelled', pending_actor = NULL
      WHERE psychologist_user_id = $1
        AND id <> $2
        AND status = 'pending'
        AND pending_actor = 'psychologist'
        AND tstzrange(starts_at, starts_at + make_interval(mins => duration_minutes), '[)')
          && tstzrange($3::timestamptz, $3::timestamptz + make_interval(mins => $4), '[)')
    `,
    [psychologistUserId, appointmentId, request.starts_at, request.duration_minutes]
  );

  await pool.query(
    `
      UPDATE appointments
      SET status = 'cancelled'
      WHERE psychologist_user_id = $1
        AND status = 'available'
        AND tstzrange(starts_at, starts_at + make_interval(mins => duration_minutes), '[)')
          && tstzrange($2::timestamptz, $2::timestamptz + make_interval(mins => $3), '[)')
    `,
    [psychologistUserId, request.starts_at, request.duration_minutes]
  );

  return true;
};

export const rejectPatientAppointmentRequest = async (
  psychologistUserId: number,
  appointmentId: number
): Promise<boolean> => {
  const result = await pool.query(
    `
      UPDATE appointments
      SET status = 'cancelled', pending_actor = NULL
      WHERE id = $1
        AND psychologist_user_id = $2
        AND status = 'pending'
        AND pending_actor = 'psychologist'
    `,
    [appointmentId, psychologistUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const completeAppointment = async (
  psychologistUserId: number,
  appointmentId: number
): Promise<boolean> => {
  const result = await pool.query(
    `
      UPDATE appointments
      SET status = 'completed', pending_actor = NULL
      WHERE id = $1
        AND psychologist_user_id = $2
        AND status IN ('confirmed', 'pending')
        AND starts_at <= NOW()
    `,
    [appointmentId, psychologistUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const cancelAppointment = async (
  psychologistUserId: number,
  appointmentId: number
): Promise<boolean> => {
  const result = await pool.query(
    `
      UPDATE appointments
      SET status = 'cancelled', pending_actor = NULL
      WHERE id = $1
        AND psychologist_user_id = $2
        AND status IN ('confirmed', 'pending')
        AND starts_at <= NOW()
    `,
    [appointmentId, psychologistUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

export const markConversationRead = async (psychologistUserId: number, patientUserId: number): Promise<void> => {
  await pool.query(
    `
      UPDATE messages SET is_read = true
      WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE psychologist_user_id = $1 AND patient_user_id = $2
      )
      AND sender_user_id = $2
      AND is_read = false
    `,
    [psychologistUserId, patientUserId]
  );
};

export const markConversationReadForPatient = async (patientUserId: number, therapistUserId: number): Promise<void> => {
  await pool.query(
    `
      UPDATE messages SET is_read = true
      WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE psychologist_user_id = $1 AND patient_user_id = $2
      )
      AND sender_user_id = $1
      AND is_read = false
    `,
    [therapistUserId, patientUserId]
  );
};

export const createProgressNote = async (
  psychologistUserId: number,
  payload: {
    patientUserId: number;
    body: string;
    noteDate?: string;
    sessionNumber?: number;
    imageUrl?: string | null;
  }
): Promise<number> => {
  const nextSessionNumberResult = await pool.query<{ next_session_number: number }>(
    `
      SELECT COALESCE(MAX(session_number), 0) + 1 AS next_session_number
      FROM progress_notes
      WHERE psychologist_user_id = $1 AND patient_user_id = $2
    `,
    [psychologistUserId, payload.patientUserId]
  );

  const sessionNumber = payload.sessionNumber ?? nextSessionNumberResult.rows[0].next_session_number;
  const noteDate = payload.noteDate ?? new Date().toISOString();

  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO progress_notes (
        psychologist_user_id,
        patient_user_id,
        note_date,
        session_number,
        body,
        image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      psychologistUserId,
      payload.patientUserId,
      noteDate,
      sessionNumber,
      payload.body.trim(),
      payload.imageUrl ?? null
    ]
  );

  return result.rows[0].id;
};

export const updateProgressNote = async (
  psychologistUserId: number,
  noteId: number,
  payload: {
    patientUserId: number;
    body: string;
    noteDate: string;
    sessionNumber: number;
    imageUrl?: string | null;
  }
): Promise<boolean> => {
  const result = await pool.query(
    `
      UPDATE progress_notes
      SET
        patient_user_id = $3,
        body = $4,
        note_date = $5,
        session_number = $6,
        image_url = $7
      WHERE id = $1 AND psychologist_user_id = $2
    `,
    [
      noteId,
      psychologistUserId,
      payload.patientUserId,
      payload.body.trim(),
      payload.noteDate,
      payload.sessionNumber,
      payload.imageUrl ?? null
    ]
  );

  return (result.rowCount ?? 0) > 0;
};

export const deleteProgressNote = async (psychologistUserId: number, noteId: number): Promise<boolean> => {
  const result = await pool.query(
    `
      DELETE FROM progress_notes
      WHERE id = $1 AND psychologist_user_id = $2
    `,
    [noteId, psychologistUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

const buildAiOverview = (patientName: string, sentimentData: Array<{ date: string; sentiment: number }>, notesCount: number): string => {
  if (sentimentData.length === 0) {
    return `${patientName}: недостаточно данных по настроению. Добавьте больше отметок и заметок после сессий.`;
  }

  const values = sentimentData.map((entry) => entry.sentiment);
  const latest = values[values.length - 1];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const trend = latest >= avg ? "стабильно/улучшается" : "есть просадка";

  return `${patientName}: средний показатель настроения ${avg.toFixed(1)}/10, текущее состояние ${latest}/10, тренд ${trend}. В анализ включено заметок: ${notesCount}.`;
};

const buildAiRecommendations = (sentimentData: Array<{ date: string; sentiment: number }>, notes: Array<{ text: string }>): string[] => {
  const recs: string[] = [];
  if (sentimentData.length > 0) {
    const latest = sentimentData[sentimentData.length - 1].sentiment;
    if (latest <= 4) {
      recs.push("Проверить факторы риска и усилить поддерживающий план на ближайшую неделю.");
    } else {
      recs.push("Закрепить рабочие техники и определить метрику прогресса до следующей встречи.");
    }
  }

  if (notes.some((note) => /sleep|insomnia|сон|тревог/i.test(note.text))) {
    recs.push("Отдельно оценить сон/тревогу и добавить домашнее упражнение на регуляцию.");
  }

  if (recs.length === 0) {
    recs.push("Сформулировать 1-2 измеримых цели к следующей сессии.");
  }

  return recs;
};

export const getPatientAnalytics = async (
  psychologistUserId: number,
  patientUserId: number
): Promise<PatientAnalyticsData | null> => {
  const [patientResult, moodResult, notesResult, aiChatResult] = await Promise.all([
    pool.query<{ id: number; full_name: string }>(
      `
        SELECT patient.id, patient.full_name
        FROM therapist_patients relationship
        JOIN users patient ON patient.id = relationship.patient_user_id
        WHERE relationship.psychologist_user_id = $1 AND relationship.patient_user_id = $2
        LIMIT 1
      `,
      [psychologistUserId, patientUserId]
    ),
    pool.query<MoodEntryRow>(
      `
        SELECT patient_user_id, entry_date, mood
        FROM mood_entries
        WHERE patient_user_id = $1
        ORDER BY entry_date ASC
      `,
      [patientUserId]
    ),
    pool.query<ProgressNoteRow>(
      `
        SELECT id, patient_user_id, note_date, session_number, body, image_url
        FROM progress_notes
        WHERE psychologist_user_id = $1 AND patient_user_id = $2
        ORDER BY note_date DESC
      `,
      [psychologistUserId, patientUserId]
    ),
    pool.query<PatientAIMsgRow>(
      `
        SELECT id, role, body, created_at
        FROM patient_ai_messages
        WHERE psychologist_user_id = $1 AND patient_user_id = $2
        ORDER BY created_at ASC
      `,
      [psychologistUserId, patientUserId]
    )
  ]);

  const patient = patientResult.rows[0];
  if (!patient) {
    return null;
  }

  const sentimentData = moodResult.rows.map((moodEntry) => ({
    date: monthFormatter.format(new Date(moodEntry.entry_date)),
    sentiment: toSentimentScore(moodEntry.mood)
  }));

  const notes = notesResult.rows.map((note) => ({
    id: String(note.id),
    date: monthFormatter.format(new Date(note.note_date)),
    sessionNumber: note.session_number,
    text: note.body,
    imageUrl: note.image_url ?? undefined
  }));

  return {
    patient: {
      id: String(patient.id),
      name: patient.full_name
    },
    sentimentData,
    notes,
    aiOverview: buildAiOverview(patient.full_name, sentimentData, notes.length),
    aiRecommendations: buildAiRecommendations(sentimentData, notes),
    chat: aiChatResult.rows.map((row) => ({
      id: String(row.id),
      role: row.role,
      text: row.body,
      time: formatTimeLabel(row.created_at)
    }))
  };
};

export const askPatientAnalyticsAssistant = async (
  psychologistUserId: number,
  patientUserId: number,
  question: string
): Promise<{ id: string; role: "assistant"; text: string; time: string }> => {
  const analytics = await getPatientAnalytics(psychologistUserId, patientUserId);
  if (!analytics) {
    throw new Error("PATIENT_NOT_FOUND");
  }

  const trimmedQuestion = question.trim();

  await pool.query(
    `
      INSERT INTO patient_ai_messages (psychologist_user_id, patient_user_id, role, body)
      VALUES ($1, $2, 'psychologist', $3)
    `,
    [psychologistUserId, patientUserId, trimmedQuestion]
  );

  const response = `По пациенту ${analytics.patient.name}: ${analytics.aiOverview} Рекомендация по вашему вопросу: начните с уточнения конкретной ситуации и закрепите следующую наблюдаемую цель до следующей сессии.`;

  const inserted = await pool.query<{ id: number; created_at: DbDateValue }>(
    `
      INSERT INTO patient_ai_messages (psychologist_user_id, patient_user_id, role, body)
      VALUES ($1, $2, 'assistant', $3)
      RETURNING id, created_at
    `,
    [psychologistUserId, patientUserId, response]
  );

  return {
    id: String(inserted.rows[0].id),
    role: "assistant",
    text: response,
    time: formatTimeLabel(inserted.rows[0].created_at)
  };
};
