import type { PoolClient } from "pg";

type SeedUserInput = {
  email: string;
  fullName: string;
  passwordHash: string;
  roles: Array<"psychologist" | "patient">;
  preferredLanguage?: string;
};

type SeedPatientProfileInput = {
  age: number;
  diagnosis: string;
  phone: string;
  onboardingCompleted?: boolean;
  status?: "new" | "active" | "scheduled" | "completed";
  summaryTopics?: string[];
  summaryProgress?: string;
  summaryActions?: string;
};

type SeedAppointmentInput = {
  psychologistUserId: number;
  patientUserId: number | null;
  startsAt: string;
  durationMinutes: number;
  type: "session" | "initial" | "followup";
  status: "available" | "confirmed" | "pending" | "completed" | "cancelled";
};

const DEMO_EMAIL = "alex.rivera@mindcare.app";

const upsertUser = async (client: PoolClient, input: SeedUserInput): Promise<number> => {
  const primaryRole = input.roles[0] ?? "patient";
  const preferredLanguage = input.preferredLanguage ?? "en";
  const result = await client.query<{ id: number }>(
    `
      INSERT INTO users (email, full_name, password_hash, role, roles, preferred_language)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE
      SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        roles = EXCLUDED.roles,
        preferred_language = EXCLUDED.preferred_language
      RETURNING id
    `,
    [input.email, input.fullName, input.passwordHash, primaryRole, input.roles, preferredLanguage]
  );

  return result.rows[0].id;
};

const upsertPatientProfile = async (
  client: PoolClient,
  userId: number,
  input: SeedPatientProfileInput
): Promise<void> => {
  await client.query(
    `
      INSERT INTO patient_profiles (
        user_id,
        age,
        diagnosis,
        phone,
        onboarding_completed,
        status,
        summary_topics,
        summary_progress,
        summary_actions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE
      SET
        age = EXCLUDED.age,
        diagnosis = EXCLUDED.diagnosis,
        phone = EXCLUDED.phone,
        onboarding_completed = EXCLUDED.onboarding_completed,
        status = EXCLUDED.status,
        summary_topics = EXCLUDED.summary_topics,
        summary_progress = EXCLUDED.summary_progress,
        summary_actions = EXCLUDED.summary_actions
    `,
    [
      userId,
      input.age,
      input.diagnosis,
      input.phone,
      input.onboardingCompleted ?? true,
      input.status ?? "active",
      input.summaryTopics ?? [],
      input.summaryProgress ?? "",
      input.summaryActions ?? ""
    ]
  );
};

const ensureRelationship = async (client: PoolClient, psychologistUserId: number, patientUserId: number): Promise<void> => {
  await client.query(
    `
      INSERT INTO therapist_patients (psychologist_user_id, patient_user_id)
      VALUES ($1, $2)
      ON CONFLICT (psychologist_user_id, patient_user_id) DO NOTHING
    `,
    [psychologistUserId, patientUserId]
  );
};

const ensureConversation = async (client: PoolClient, psychologistUserId: number, patientUserId: number): Promise<number> => {
  const result = await client.query<{ id: number }>(
    `
      INSERT INTO conversations (psychologist_user_id, patient_user_id)
      VALUES ($1, $2)
      ON CONFLICT (psychologist_user_id, patient_user_id) DO UPDATE
      SET psychologist_user_id = EXCLUDED.psychologist_user_id
      RETURNING id
    `,
    [psychologistUserId, patientUserId]
  );

  return result.rows[0].id;
};

const clearSeedData = async (client: PoolClient, userIds: number[]): Promise<void> => {
  await client.query("DELETE FROM journal_chat_messages WHERE patient_user_id = ANY($1::int[])", [userIds]);
  await client.query("DELETE FROM journal_entries WHERE patient_user_id = ANY($1::int[])", [userIds]);
  await client.query("DELETE FROM mood_entries WHERE patient_user_id = ANY($1::int[])", [userIds]);
  await client.query(
    "DELETE FROM session_artifacts WHERE psychologist_user_id = ANY($1::int[]) OR patient_user_id = ANY($1::int[])",
    [userIds]
  );
  await client.query(
    "DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE psychologist_user_id = ANY($1::int[]) OR patient_user_id = ANY($1::int[]))",
    [userIds]
  );
  await client.query(
    "DELETE FROM conversations WHERE psychologist_user_id = ANY($1::int[]) OR patient_user_id = ANY($1::int[])",
    [userIds]
  );
  await client.query(
    "DELETE FROM progress_notes WHERE psychologist_user_id = ANY($1::int[]) OR patient_user_id = ANY($1::int[])",
    [userIds]
  );
  await client.query(
    "DELETE FROM appointments WHERE psychologist_user_id = ANY($1::int[]) OR patient_user_id = ANY($1::int[])",
    [userIds]
  );
  await client.query(
    "DELETE FROM therapist_patients WHERE psychologist_user_id = ANY($1::int[]) OR patient_user_id = ANY($1::int[])",
    [userIds]
  );
};

export const seedDatabase = async (client: PoolClient, passwordHash: string): Promise<void> => {
  const alexRiveraId = await upsertUser(client, {
    email: DEMO_EMAIL,
    fullName: "Алекс Ривера",
    passwordHash,
    roles: ["psychologist", "patient"],
    preferredLanguage: "ru"
  });

  const mayaBrooksId = await upsertUser(client, {
    email: "maya.brooks@mindcare.app",
    fullName: "Доктор Майя Брукс",
    passwordHash,
    roles: ["psychologist"],
    preferredLanguage: "ru"
  });

  const patientInputs = [
    {
      email: "sarah.martinez@mindcare.app",
      fullName: "Сара Мартинес",
      age: 28,
      diagnosis: "Generalized Anxiety Disorder",
      phone: "+1 (555) 201-4410",
      summaryTopics: ["workplace anxiety", "presentations", "breathing practice"],
      summaryProgress: "Steady improvement with breathing techniques and stronger confidence before high-stakes meetings.",
      summaryActions: "Practice presentation rehearsal twice before Friday and keep a short pre-meeting grounding routine.",
      noteBodies: [
        "Patient reported significant improvement in managing workplace anxiety. Discussed strategies for handling an upcoming presentation. Homework assigned: practice the presentation with a trusted friend.",
        "Focused on cognitive restructuring techniques. Patient identified negative thought patterns related to perfectionism and made good progress in challenging automatic thoughts.",
        "Discussion centered on work-life balance and setting boundaries with colleagues. Explored assertiveness techniques and role-played difficult conversations."
      ],
      sentiment: [4, 5, 6, 5, 7, 8, 7],
      chat: [
        "Привет, Алекс. Я хотела бы обсудить нашу последнюю сессию.",
        "Конечно. Как ты чувствуешь себя после нее?",
        "Я практикую дыхательные упражнения, и они действительно помогают перед встречами.",
        "Это хороший прогресс. Какие ситуации стали легче?",
        "В основном командные встречи. Я чувствую себя увереннее и быстрее восстанавливаюсь, если нервничаю."
      ],
      lastSession: "2026-04-18T10:00:00.000Z",
      nextSession: "2026-04-25T15:00:00.000Z"
    },
    {
      email: "john.doe@mindcare.app",
      fullName: "Джон Доу",
      age: 32,
      diagnosis: "Depression, Work-related Stress",
      phone: "+1 (555) 201-4411",
      summaryTopics: ["behavioral activation", "sleep quality", "stress recovery"],
      summaryProgress: "Mood stability improved on days with more structure and consistent sleep.",
      summaryActions: "Keep the activity schedule and add one restorative evening routine this week.",
      noteBodies: [
        "Patient showed improvement in managing depression symptoms. Sleep quality has improved. Discussed coping mechanisms for work stressors.",
        "Continued work on behavioral activation. Patient completed activity schedule with 60% compliance and noticed better mood on high-activity days."
      ],
      sentiment: [3, 4, 4, 5, 5, 6, 6],
      chat: [
        "Привет, Алекс, на этой неделе работа стала менее утомительной.",
        "Это очень хорошо слышать. Что изменилось больше всего?",
        "Я сохранил привычку вечерней прогулки и перестал проверять почту после 20:00.",
        "Отличное правило. Это помогло и со сном?",
        "Да, я быстрее засыпаю и просыпаюсь с большей энергией."
      ],
      lastSession: "2026-04-17T09:00:00.000Z",
      nextSession: "2026-04-24T09:00:00.000Z"
    },
    {
      email: "emily.chen@mindcare.app",
      fullName: "Эмили Чен",
      age: 45,
      diagnosis: "PTSD",
      phone: "+1 (555) 201-4412",
      summaryTopics: ["grounding", "flashbacks", "social reintegration"],
      summaryProgress: "Grounding techniques are reducing the intensity of flashbacks and supporting more social activity.",
      summaryActions: "Continue 5-4-3-2-1 grounding and attend one more low-pressure social event.",
      noteBodies: [
        "EMDR session focused on processing a traumatic memory. Patient tolerated it well with minimal distress and SUDS decreased from 8 to 4.",
        "Checked in on grounding techniques. Patient is using the 5-4-3-2-1 method effectively during flashbacks and reduced avoidance behaviors."
      ],
      sentiment: [2, 3, 4, 4, 5, 6, 6],
      chat: [
        "Вчера я сходила на небольшой ужин с друзьями.",
        "Это важный шаг. Как реагировало тело?",
        "Сначала я напряглась, но заземление помогло, и я осталась до конца.",
        "Это очень сильная работа с экспозицией. Что помогло больше всего в тот момент?",
        "Называние предметов вокруг меня и замедление дыхания."
      ],
      lastSession: "2026-04-19T14:00:00.000Z",
      nextSession: "2026-04-26T13:00:00.000Z"
    },
    {
      email: "michael.brown@mindcare.app",
      fullName: "Майкл Браун",
      age: 38,
      diagnosis: "Social Anxiety",
      phone: "+1 (555) 201-4413",
      summaryTopics: ["exposure therapy", "group settings", "self-talk"],
      summaryProgress: "In-session exposure is becoming more manageable, with faster recovery after anxiety spikes.",
      summaryActions: "Repeat one low-stakes group interaction before the next session.",
      noteBodies: [
        "Exposure therapy continued. Patient successfully completed in-session exposure to a small group interaction. Anxiety peaked at 7/10 then decreased to 3/10."
      ],
      sentiment: [3, 3, 4, 4, 5, 5, 6],
      chat: [
        "Сегодня я один раз высказался на совещании по проекту.",
        "Это настоящий успех. Насколько тревожно было до и после?",
        "Около 8 до, 5 после. Это снизилось быстрее обычного.",
        "Быстрое восстановление важно. Давай продолжим это на следующей сессии.",
        "Да, думаю, я могу попробовать ещё раз, но сначала в более маленькой группе."
      ],
      lastSession: "2026-04-16T11:00:00.000Z",
      nextSession: "2026-04-23T11:00:00.000Z"
    },
    {
      email: "lisa.johnson@mindcare.app",
      fullName: "Лиза Джонсон",
      age: 29,
      diagnosis: "Panic Disorder",
      phone: "+1 (555) 201-4414",
      summaryTopics: ["panic cycle", "interoceptive exposure", "medication response"],
      summaryProgress: "No panic attacks this week and much stronger confidence during exposure exercises.",
      summaryActions: "Maintain exposure reps and keep tracking body sensations without avoidance.",
      noteBodies: [
        "Patient reported zero panic attacks this week. Medication adjustment appears effective. Reviewed panic cycle and safety behaviors."
      ],
      sentiment: [4, 4, 5, 6, 6, 7, 7],
      chat: [
        "У меня снова было сжатие в груди, но это не переросло в полноценную панику.",
        "Это важный прогресс. Что ты сделал по-другому?",
        "Я оставался с этим чувством и использовал счёт до упражнения.",
        "Отлично. Именно такой ответ мы и хотим закреплять.",
        "Это было неприятно, но не так страшно, как раньше."
      ],
      lastSession: "2026-04-15T10:00:00.000Z",
      nextSession: "2026-04-22T10:00:00.000Z"
    },
    {
      email: "david.kim@mindcare.app",
      fullName: "Дэвид Ким",
      age: 41,
      diagnosis: "Adjustment Disorder",
      phone: "+1 (555) 201-4415",
      summaryTopics: ["job transition", "imposter syndrome", "reframing"],
      summaryProgress: "Patient is adapting to a new role and catching distorted self-talk earlier.",
      summaryActions: "Write down one piece of evidence each day that counters imposter thoughts.",
      noteBodies: [
        "Discussed recent job transition challenges. Patient is adapting well to a new role but experiencing imposter syndrome. Worked on reframing negative self-talk."
      ],
      sentiment: [4, 4, 5, 5, 6, 6, 6],
      chat: [
        "Мне всё ещё кажется, что я отстаю в новой роли.",
        "Какие факты это подтверждают, а какие говорят против?",
        "Мой менеджер сказал, что я хорошо справился со сложным клиентом.",
        "Это сильное контр-доказательство. Продолжай собирать такие моменты.",
        "Обязательно. Это помогает видеть полную картину, а не только ошибки."
      ],
      lastSession: "2026-04-14T09:00:00.000Z",
      nextSession: "2026-04-21T09:00:00.000Z"
    }
  ] as const;

  const unassignedPatientInput = {
    email: "nina.volkova@mindcare.app",
    fullName: "Нина Волкова",
    age: 26,
    diagnosis: "Not assigned yet",
    phone: "+1 (555) 201-4499",
    summaryTopics: ["first contact", "onboarding"],
    summaryProgress: "Waiting for the first psychologist assignment.",
    summaryActions: "Complete intake and select a psychologist.",
  } as const;

  const patientIds: number[] = [alexRiveraId, mayaBrooksId];
  const createdPatients: Array<{ userId: number; fullName: string }> = [];

  for (const patientInput of patientInputs) {
    const patientUserId = await upsertUser(client, {
      email: patientInput.email,
      fullName: patientInput.fullName,
      passwordHash,
      roles: ["patient"],
      preferredLanguage: "ru"
    });

    patientIds.push(patientUserId);
    createdPatients.push({ userId: patientUserId, fullName: patientInput.fullName });

    await upsertPatientProfile(client, patientUserId, {
      age: patientInput.age,
      diagnosis: patientInput.diagnosis,
      phone: patientInput.phone,
      summaryTopics: [...patientInput.summaryTopics],
      summaryProgress: patientInput.summaryProgress,
      summaryActions: patientInput.summaryActions,
      status: "active"
    });
  }

  const unassignedPatientUserId = await upsertUser(client, {
    email: unassignedPatientInput.email,
    fullName: unassignedPatientInput.fullName,
    passwordHash,
    roles: ["patient"],
    preferredLanguage: "ru"
  });

  patientIds.push(unassignedPatientUserId);

  await upsertPatientProfile(client, unassignedPatientUserId, {
    age: unassignedPatientInput.age,
    diagnosis: unassignedPatientInput.diagnosis,
    phone: unassignedPatientInput.phone,
    summaryTopics: [...unassignedPatientInput.summaryTopics],
    summaryProgress: unassignedPatientInput.summaryProgress,
    summaryActions: unassignedPatientInput.summaryActions,
    status: "new"
  });

  await upsertPatientProfile(client, alexRiveraId, {
    age: 34,
    diagnosis: "Stress management and burnout prevention",
    phone: "+1 (555) 991-1200",
    onboardingCompleted: true,
    status: "scheduled",
    summaryTopics: ["boundaries", "rest", "energy recovery"],
    summaryProgress: "Building healthier recovery rituals after heavy clinical weeks.",
    summaryActions: "Protect two evenings this week from work and keep the evening journal routine."
  });

  await clearSeedData(client, patientIds);

  for (const createdPatient of createdPatients) {
    await ensureRelationship(client, alexRiveraId, createdPatient.userId);
  }
  await ensureRelationship(client, mayaBrooksId, alexRiveraId);

  const appointments: SeedAppointmentInput[] = [
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[5].userId, startsAt: "2026-04-14T09:00:00.000Z", durationMinutes: 60, type: "session", status: "completed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[4].userId, startsAt: "2026-04-15T10:00:00.000Z", durationMinutes: 60, type: "followup", status: "completed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[3].userId, startsAt: "2026-04-16T11:00:00.000Z", durationMinutes: 60, type: "session", status: "completed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[1].userId, startsAt: "2026-04-17T09:00:00.000Z", durationMinutes: 60, type: "session", status: "completed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[0].userId, startsAt: "2026-04-18T10:00:00.000Z", durationMinutes: 60, type: "session", status: "completed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[2].userId, startsAt: "2026-04-19T13:00:00.000Z", durationMinutes: 90, type: "session", status: "completed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[5].userId, startsAt: "2026-04-21T09:00:00.000Z", durationMinutes: 60, type: "session", status: "confirmed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[4].userId, startsAt: "2026-04-22T10:00:00.000Z", durationMinutes: 60, type: "session", status: "confirmed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[3].userId, startsAt: "2026-04-23T11:00:00.000Z", durationMinutes: 60, type: "session", status: "pending" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[1].userId, startsAt: "2026-04-24T09:00:00.000Z", durationMinutes: 60, type: "session", status: "confirmed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[0].userId, startsAt: "2026-04-25T15:00:00.000Z", durationMinutes: 60, type: "session", status: "confirmed" },
    { psychologistUserId: alexRiveraId, patientUserId: createdPatients[2].userId, startsAt: "2026-04-26T13:00:00.000Z", durationMinutes: 90, type: "session", status: "confirmed" },
    { psychologistUserId: mayaBrooksId, patientUserId: alexRiveraId, startsAt: "2026-04-24T15:00:00.000Z", durationMinutes: 60, type: "followup", status: "confirmed" },
    { psychologistUserId: mayaBrooksId, patientUserId: null, startsAt: "2026-04-27T09:00:00.000Z", durationMinutes: 60, type: "session", status: "available" },
    { psychologistUserId: mayaBrooksId, patientUserId: null, startsAt: "2026-04-27T11:00:00.000Z", durationMinutes: 60, type: "session", status: "available" },
    { psychologistUserId: mayaBrooksId, patientUserId: null, startsAt: "2026-04-28T14:00:00.000Z", durationMinutes: 60, type: "session", status: "available" },
    { psychologistUserId: mayaBrooksId, patientUserId: null, startsAt: "2026-04-29T16:00:00.000Z", durationMinutes: 60, type: "session", status: "available" }
  ];

  const insertedAppointmentIds: number[] = [];
  for (const appointment of appointments) {
    const result = await client.query<{ id: number }>(
      `
        INSERT INTO appointments (
          psychologist_user_id,
          patient_user_id,
          starts_at,
          duration_minutes,
          type,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        appointment.psychologistUserId,
        appointment.patientUserId,
        appointment.startsAt,
        appointment.durationMinutes,
        appointment.type,
        appointment.status
      ]
    );
    insertedAppointmentIds.push(result.rows[0].id);
  }

  let noteCursor = 0;
  for (const [patientIndex, patientInput] of patientInputs.entries()) {
    const patientUserId = createdPatients[patientIndex].userId;
    for (const [noteIndex, noteBody] of patientInput.noteBodies.entries()) {
      await client.query(
        `
          INSERT INTO progress_notes (
            psychologist_user_id,
            patient_user_id,
            appointment_id,
            note_date,
            session_number,
            body
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          alexRiveraId,
          patientUserId,
          insertedAppointmentIds[noteCursor],
          patientInput.lastSession,
          patientInput.noteBodies.length - noteIndex + 9,
          noteBody
        ]
      );
      noteCursor += 1;
    }

    const conversationId = await ensureConversation(client, alexRiveraId, patientUserId);
    const chatTimes = ["10:23:00", "10:25:00", "10:27:00", "10:29:00", "10:31:00"];
    for (const [messageIndex, messageText] of patientInput.chat.entries()) {
      const senderUserId = messageIndex % 2 === 0 ? patientUserId : alexRiveraId;
      await client.query(
        `
          INSERT INTO messages (conversation_id, sender_user_id, body, created_at)
          VALUES ($1, $2, $3, $4)
        `,
        [conversationId, senderUserId, messageText, `2026-04-20T${chatTimes[messageIndex]}.000Z`]
      );
    }

    await client.query(
      `
        INSERT INTO session_artifacts (
          psychologist_user_id,
          patient_user_id,
          started_at,
          transcript,
          ai_notes
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
      `,
      [
        alexRiveraId,
        patientUserId,
        patientInput.lastSession,
        JSON.stringify([
          { speaker: patientInput.fullName, text: patientInput.chat[0], time: "14:23" },
          { speaker: "Алекс Ривера", text: patientInput.chat[1], time: "14:24" },
          { speaker: patientInput.fullName, text: patientInput.chat[2], time: "14:25" }
        ]),
        JSON.stringify([
          `${patientInput.fullName} is engaging consistently in treatment recommendations.`,
          patientInput.summaryProgress,
          patientInput.summaryActions
        ])
      ]
    );

    const moodDates = ["2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17", "2026-04-18", "2026-04-19", "2026-04-20"];
    const moodMap = ["bad", "bad", "okay", "good", "good", "great", "great"] as const;
    for (const [moodIndex, moodValue] of patientInput.sentiment.entries()) {
      const normalizedMood = moodValue >= 8 ? "great" : moodValue >= 6 ? "good" : moodValue >= 5 ? "okay" : moodValue >= 4 ? "bad" : "terrible";
      await client.query(
        `
          INSERT INTO mood_entries (patient_user_id, entry_date, mood)
          VALUES ($1, $2, $3)
        `,
        [patientUserId, moodDates[moodIndex] ?? moodDates[0], normalizedMood ?? moodMap[moodIndex] ?? "okay"]
      );
    }
  }

  await client.query(
    `
      INSERT INTO journal_entries (patient_user_id, body, created_at)
      VALUES
        ($1, $2, $3),
        ($1, $4, $5)
    `,
    [
      alexRiveraId,
      "Насыщенная неделя в клинике, но я наконец выделил один вечер на отдых, и общий стресс снизился.",
      "2026-04-18T20:10:00.000Z",
      "Заметил, что чувствую себя лучше в дни, когда заканчиваю документы к 19:00 и выхожу на короткую прогулку.",
      "2026-04-19T20:25:00.000Z"
    ]
  );

  await client.query(
    `
      INSERT INTO journal_chat_messages (patient_user_id, sender_kind, body, created_at)
      VALUES
        ($1, 'bot', $2, $3),
        ($1, 'user', $4, $5),
        ($1, 'bot', $6, $7)
    `,
    [
      alexRiveraId,
      "Привет, Алекс. Давай быстро сделаем эмоциональную проверку. Что сегодня было самым тяжёлым?",
      "2026-04-20T09:00:00.000Z",
      "Сложнее всего было держать границы с сообщениями после рабочего дня.",
      "2026-04-20T09:02:00.000Z",
      "Это похоже на полезный прогресс. Что помогло вам хотя бы немного защитить эту границу?",
      "2026-04-20T09:03:00.000Z"
    ]
  );

  // Seed conversation between Maya Brooks (psychologist) and Alex Rivera (patient)
  const mayaAlexConversationId = await ensureConversation(client, mayaBrooksId, alexRiveraId);
  const mayaAlexChat = [
    { senderUserId: alexRiveraId, text: "Привет, Майя, у меня была тяжёлая неделя в клинике. Слишком много сложных случаев подряд.", time: "09:10:00" },
    { senderUserId: mayaBrooksId, text: "Понимаю. Когда ты несёшь боль так многих людей, это накапливается. Что было самым тяжёлым?", time: "09:12:00" },
    { senderUserId: alexRiveraId, text: "Пожалуй, это был пациент в очень тяжёлом состоянии. Я оставался присутствующим, но это меня вымотало.", time: "09:14:00" },
    { senderUserId: mayaBrooksId, text: "Такой эмпатический груз действительно тяжёлый. Была ли у тебя возможность восстановиться после этого?", time: "09:16:00" },
    { senderUserId: alexRiveraId, text: "Не совсем. Я сразу перешёл к документам и следующей встрече.", time: "09:18:00" },
    { senderUserId: mayaBrooksId, text: "Давай создадим короткий ритуал восстановления между сложными сессиями. Даже пять минут уже важно.", time: "09:20:00" },
  ];
  for (const [idx, msg] of mayaAlexChat.entries()) {
    await client.query(
      `INSERT INTO messages (conversation_id, sender_user_id, body, created_at)
       VALUES ($1, $2, $3, $4)`,
      [mayaAlexConversationId, msg.senderUserId, msg.text, `2026-04-21T${mayaAlexChat[idx].time}.000Z`]
    );
  }
};

export const demoSeedAccount = {
  email: DEMO_EMAIL,
fullName: "Алекс Ривера"
} as const;
