import { pool } from "./pool";

/**
 * Additive backfill of demo data from the end of the original seed (late April 2026) up to "today".
 * Never deletes anything. Safe to re-run: it exits early if backfilled data already exists.
 *
 * Run: npm run backfill
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_END = new Date("2026-04-21T00:00:00.000Z");
const WEEKS_AHEAD = 3;

const PSYCHOLOGIST_EMAIL = "alex.rivera@mindcare.app";
const SUPERVISOR_EMAIL = "maya.brooks@mindcare.app";

type MoodType = "great" | "good" | "okay" | "bad" | "terrible";

type PatientPlan = {
  email: string;
  baseScore: number;
  trend: number;
  notes: string[];
  topics: string[];
  quotes: [string, string, string];
  recentChat: [string, string];
};

const patientPlans: PatientPlan[] = [
  {
    email: "sarah.martinez@mindcare.app",
    baseScore: 3.0,
    trend: 0.012,
    notes: [
      "Пациентка стала увереннее на рабочих встречах. Отработали технику дыхания 4-7-8 и короткий ритуал заземления перед выступлениями.",
      "Разобрали перфекционистские установки. Пациентка самостоятельно заметила два автоматических мысленных паттерна и переформулировала их.",
      "Обсудили границы с коллегами. Провели ролевую игру сложного разговора, пациентка отметила снижение напряжения.",
      "Тревога перед презентацией снизилась с 7 до 4 баллов. Закрепили домашнее задание: репетиция выступления с доверенным человеком."
    ],
    topics: ["тревога на работе", "перфекционизм", "границы"],
    quotes: [
      "На этой неделе я выступила на встрече и почти не волновалась.",
      "Отлично. Что помогло вам сохранить спокойствие?",
      "Дыхание и пауза перед началом. Раньше я об этом даже не думала."
    ],
    recentChat: [
      "Алекс, добрый вечер! Дыхательное упражнение перед встречей снова сработало.",
      "Рад это слышать, Сара. Давайте обсудим это подробнее на ближайшей сессии."
    ]
  },
  {
    email: "john.doe@mindcare.app",
    baseScore: 2.4,
    trend: 0.014,
    notes: [
      "Продолжаем поведенческую активацию. Расписание активностей выполнено примерно на 70%, настроение лучше в дни с прогулкой.",
      "Сон стабилизировался. Обсудили вечерний ритуал и ограничение рабочей почты после 20:00.",
      "Пациент отметил снижение утренней апатии. Добавили один восстанавливающий вечер в неделю.",
      "Разобрали стрессовые ситуации на работе, отработали стратегию приоритизации задач."
    ],
    topics: ["поведенческая активация", "сон", "восстановление"],
    quotes: [
      "Я стал чаще выходить гулять после работы.",
      "Это отличная привычка. Как вы замечаете её влияние на настроение?",
      "Вечером я меньше застреваю в мыслях о задачах и быстрее засыпаю."
    ],
    recentChat: [
      "Алекс, привет. Вечерние прогулки получаются уже пятую неделю подряд.",
      "Это серьёзный результат, Джон. Давайте закрепим его на встрече."
    ]
  },
  {
    email: "emily.chen@mindcare.app",
    baseScore: 2.0,
    trend: 0.016,
    notes: [
      "Продолжили работу с травматическими воспоминаниями. Уровень дистресса (SUDS) в сессии снизился с 6 до 3.",
      "Техника 5-4-3-2-1 используется самостоятельно. Количество эпизодов флешбэков заметно уменьшилось.",
      "Пациентка посетила два социальных мероприятия и осталась до конца. Обсудили, что помогало справляться с напряжением.",
      "Работа над ощущением безопасности в теле. Добавили упражнения на расслабление мышц."
    ],
    topics: ["заземление", "флешбэки", "социальная активность"],
    quotes: [
      "Флешбэков на этой неделе почти не было.",
      "Это важный результат. Что изменилось в ваших действиях?",
      "Я сразу включаю заземление и называю предметы вокруг."
    ],
    recentChat: [
      "Алекс, я ходила на встречу с друзьями и осталась до конца.",
      "Эмили, это большой шаг. Горжусь вашей работой, обсудим на сессии."
    ]
  },
  {
    email: "michael.brown@mindcare.app",
    baseScore: 2.3,
    trend: 0.013,
    notes: [
      "Экспозиция в малой группе прошла успешно. Тревога достигла 6 из 10 и быстро снизилась до 3.",
      "Отработали работу с внутренним диалогом. Пациент самостоятельно заметил катастрофизацию перед выступлением.",
      "Пациент высказался на двух совещаниях. Составили план следующего шага экспозиции.",
      "Обсудили избегающее поведение. Договорились о небольшом социальном эксперименте на неделю."
    ],
    topics: ["экспозиция", "групповое общение", "внутренний диалог"],
    quotes: [
      "Я задал вопрос на совещании, хотя очень волновался.",
      "Отличный шаг. Как вы себя чувствовали после?",
      "Сначала сильно переживал, но потом стало легче, чем я ожидал."
    ],
    recentChat: [
      "Алекс, сегодня выступил перед отделом, было волнительно, но справился.",
      "Майкл, отличный результат. Расскажете подробности на сессии?"
    ]
  },
  {
    email: "lisa.johnson@mindcare.app",
    baseScore: 3.2,
    trend: 0.010,
    notes: [
      "Панических атак нет уже несколько недель. Продолжаем интероцептивную экспозицию, пациентка выполняет упражнения самостоятельно.",
      "Обсудили снижение страха телесных ощущений. Пациентка использует технику принятия вместо избегания.",
      "Закрепляем результат. Пациентка вернулась к привычным нагрузкам, включая занятия спортом.",
      "Разобрали профилактику рецидива и план действий на случай тревожного эпизода."
    ],
    topics: ["панический цикл", "интероцептивная экспозиция", "профилактика рецидива"],
    quotes: [
      "На прошлой неделе было сжатие в груди, но оно быстро прошло.",
      "Что вы сделали в этот момент?",
      "Просто остановилась и наблюдала, не убегая от ощущения."
    ],
    recentChat: [
      "Алекс, добрый день. Снова прошла неделя без панических эпизодов.",
      "Лиза, это прекрасно. Продолжаем в том же ритме."
    ]
  },
  {
    email: "david.kim@mindcare.app",
    baseScore: 2.8,
    trend: 0.011,
    notes: [
      "Пациент увереннее чувствует себя в новой роли. Продолжаем работу с синдромом самозванца и когнитивным реструктурированием.",
      "Дневник доказательств ведётся ежедневно. Пациент отметил, что искажённые мысли возникают реже.",
      "Обсудили обратную связь от руководителя и способы использовать её без самокритики.",
      "Работа над границами нагрузки. Пациент договорился о более реалистичных сроках по проекту."
    ],
    topics: ["новая роль", "синдром самозванца", "реструктурирование"],
    quotes: [
      "Руководитель похвалил мой отчёт по клиенту.",
      "Как вы восприняли эту похвалу?",
      "Раньше я бы обесценил её, а теперь записал в дневник доказательств."
    ],
    recentChat: [
      "Алекс, на этой неделе записал уже три факта в дневник доказательств.",
      "Дэвид, отличная динамика. Обязательно вернёмся к этому на сессии."
    ]
  }
];

const supervisorExtraTopics = "восстановление после тяжёлых случаев, границы, профилактика выгорания";

const journalBodies = [
  "Насыщенная неделя в клинике, но я заранее запланировал время на отдых и это помогло не выгореть.",
  "Заметил, что чувствую себя лучше, когда заканчиваю документы до 19:00 и выхожу на короткую прогулку.",
  "Сегодня удалось не отвечать на сообщения после работы. Непривычно, но спокойнее.",
  "Провёл выходные без рабочих задач. Появилось больше энергии на понедельник.",
  "Сложный случай на этой неделе. После сессии выделил десять минут на восстановление, это сработало.",
  "Начал вести короткий вечерний дневник. Удобно фиксировать, что именно истощает, а что наполняет.",
  "Сходил на супервизию. Обсудили границы и распределение нагрузки на следующий месяц.",
  "Стало легче говорить «нет» новым запросам, когда график плотный."
];

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const scoreToMood = (score: number): MoodType => {
  if (score >= 4.5) return "great";
  if (score >= 3.5) return "good";
  if (score >= 2.5) return "okay";
  if (score >= 1.5) return "bad";
  return "terrible";
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

type UserRow = { id: number; email: string };

const main = async (): Promise<void> => {
  const now = new Date();
  const today = startOfUtcDay(now);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const emails = [PSYCHOLOGIST_EMAIL, SUPERVISOR_EMAIL, ...patientPlans.map((plan) => plan.email)];
    const usersResult = await client.query<UserRow>("SELECT id, email FROM users WHERE email = ANY($1::text[])", [emails]);
    const idByEmail = new Map(usersResult.rows.map((row) => [row.email, row.id]));

    const alexId = idByEmail.get(PSYCHOLOGIST_EMAIL);
    const mayaId = idByEmail.get(SUPERVISOR_EMAIL);
    if (!alexId || !mayaId) {
      console.log("Demo users not found, nothing to backfill.");
      await client.query("ROLLBACK");
      return;
    }

    const existing = await client.query<{ cnt: string }>(
      "SELECT COUNT(*)::text AS cnt FROM appointments WHERE psychologist_user_id = $1 AND starts_at > $2",
      [alexId, new Date(SEED_END.getTime() + 14 * DAY_MS).toISOString()]
    );
    if (Number(existing.rows[0].cnt) > 0) {
      console.log("Backfill already applied, skipping.");
      await client.query("ROLLBACK");
      return;
    }

    // 1. Past seeded appointments that were left "confirmed"/"pending" are now in the past.
    await client.query(
      `UPDATE appointments SET status = 'completed', pending_actor = NULL
       WHERE psychologist_user_id = ANY($1::int[]) AND starts_at < $2 AND status IN ('confirmed', 'pending')`,
      [[alexId, mayaId], now.toISOString()]
    );

    const horizon = new Date(today.getTime() + WEEKS_AHEAD * 7 * DAY_MS);
    let pendingAssigned = false;

    for (const [planIndex, plan] of patientPlans.entries()) {
      const patientId = idByEmail.get(plan.email);
      if (!patientId) continue;
      const rand = mulberry32(1000 + planIndex * 17);

      // 2. Mood entries for every day after the original seed up to yesterday.
      for (let day = new Date(SEED_END); day < today; day = new Date(day.getTime() + DAY_MS)) {
        if (rand() < 0.14) continue;
        const daysSince = (day.getTime() - SEED_END.getTime()) / DAY_MS;
        const wave = Math.sin(daysSince / 4.5 + planIndex) * 0.5;
        const noise = (rand() - 0.5) * 1.3;
        const score = Math.max(1, Math.min(5, plan.baseScore + plan.trend * daysSince + wave + noise));
        await client.query(
          `INSERT INTO mood_entries (patient_user_id, entry_date, mood)
           VALUES ($1, $2::date, $3)
           ON CONFLICT (patient_user_id, entry_date) DO NOTHING`,
          [patientId, toDateKey(day), scoreToMood(score)]
        );
      }

      // 3. Weekly sessions continuing the existing weekly rhythm.
      const lastResult = await client.query<{ starts_at: Date; duration_minutes: number }>(
        `SELECT starts_at, duration_minutes FROM appointments
         WHERE psychologist_user_id = $1 AND patient_user_id = $2
         ORDER BY starts_at DESC LIMIT 1`,
        [alexId, patientId]
      );
      if (lastResult.rows.length === 0) continue;
      const base = new Date(lastResult.rows[0].starts_at);
      const duration = lastResult.rows[0].duration_minutes;

      const noteNumberResult = await client.query<{ max: number | null }>(
        "SELECT MAX(session_number) AS max FROM progress_notes WHERE psychologist_user_id = $1 AND patient_user_id = $2",
        [alexId, patientId]
      );
      let sessionNumber = (noteNumberResult.rows[0].max ?? 9) + 1;

      const conversationResult = await client.query<{ id: number }>(
        "SELECT id FROM conversations WHERE psychologist_user_id = $1 AND patient_user_id = $2",
        [alexId, patientId]
      );
      const conversationId = conversationResult.rows[0]?.id;

      let completedCounter = 0;
      for (let week = 1; ; week += 1) {
        const startsAt = new Date(base.getTime() + week * 7 * DAY_MS);
        if (startsAt > horizon) break;

        const isPast = startsAt < now;
        let status: "completed" | "cancelled" | "confirmed" | "pending" = "confirmed";
        let pendingActor: "patient" | "psychologist" | null = null;
        if (isPast) {
          status = rand() < 0.08 ? "cancelled" : "completed";
        } else if (!pendingAssigned && startsAt.getTime() - now.getTime() > 2 * DAY_MS) {
          status = "pending";
          pendingActor = "patient";
          pendingAssigned = true;
        }

        const appointmentResult = await client.query<{ id: number }>(
          `INSERT INTO appointments (psychologist_user_id, patient_user_id, starts_at, duration_minutes, type, status, pending_actor)
           VALUES ($1, $2, $3, $4, 'session', $5, $6)
           RETURNING id`,
          [alexId, patientId, startsAt.toISOString(), duration, status, pendingActor]
        );

        if (status !== "completed") continue;

        completedCounter += 1;
        const appointmentId = appointmentResult.rows[0].id;
        await client.query(
          `INSERT INTO progress_notes (psychologist_user_id, patient_user_id, appointment_id, note_date, session_number, body)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            alexId,
            patientId,
            appointmentId,
            startsAt.toISOString(),
            sessionNumber,
            plan.notes[(sessionNumber + planIndex) % plan.notes.length]
          ]
        );
        sessionNumber += 1;

        if (completedCounter % 4 === 0) {
          const speaker = (await client.query<{ full_name: string }>("SELECT full_name FROM users WHERE id = $1", [patientId])).rows[0].full_name;
          await client.query(
            `INSERT INTO session_artifacts (psychologist_user_id, patient_user_id, started_at, transcript, ai_notes)
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
            [
              alexId,
              patientId,
              startsAt.toISOString(),
              JSON.stringify([
                { speaker, text: plan.quotes[0], time: "14:23" },
                { speaker: "Алекс Ривера", text: plan.quotes[1], time: "14:24" },
                { speaker, text: plan.quotes[2], time: "14:25" }
              ]),
              JSON.stringify([
                `Основные темы сессии: ${plan.topics.join(", ")}.`,
                "Пациент стабильно выполняет рекомендации и отмечает прогресс.",
                "Следующий шаг: закрепить навыки в повседневных ситуациях."
              ])
            ]
          );
        }
      }

      // 4. Recent conversation (last unread message from the patient).
      if (conversationId) {
        const dayBeforeYesterday = new Date(today.getTime() - 2 * DAY_MS);
        const yesterday = new Date(today.getTime() - DAY_MS);
        const stamp = (date: Date, time: string) => `${toDateKey(date)}T${time}.000Z`;
        const messages: Array<{ sender: number; body: string; at: string; read: boolean }> = [
          { sender: patientId, body: plan.recentChat[0], at: stamp(dayBeforeYesterday, "17:42:00"), read: true },
          { sender: alexId, body: plan.recentChat[1], at: stamp(dayBeforeYesterday, "18:05:00"), read: true },
          {
            sender: patientId,
            body: "Спасибо! До встречи на ближайшей сессии.",
            at: stamp(yesterday, "19:10:00"),
            read: planIndex % 2 === 1
          }
        ];
        for (const message of messages) {
          await client.query(
            `INSERT INTO messages (conversation_id, sender_user_id, body, created_at, is_read)
             VALUES ($1, $2, $3, $4, $5)`,
            [conversationId, message.sender, message.body, message.at, message.read]
          );
        }
      }
    }

    // 5. Alex as a patient of Maya: mood, sessions every two weeks, open slots, journal.
    {
      const rand = mulberry32(777);
      for (let day = new Date(SEED_END); day < today; day = new Date(day.getTime() + DAY_MS)) {
        if (rand() < 0.12) continue;
        const daysSince = (day.getTime() - SEED_END.getTime()) / DAY_MS;
        const score = Math.max(1, Math.min(5, 3.1 + Math.sin(daysSince / 6) * 0.7 + (rand() - 0.5) * 1.1));
        await client.query(
          `INSERT INTO mood_entries (patient_user_id, entry_date, mood)
           VALUES ($1, $2::date, $3)
           ON CONFLICT (patient_user_id, entry_date) DO NOTHING`,
          [alexId, toDateKey(day), scoreToMood(score)]
        );
      }

      const mayaBase = new Date("2026-04-24T15:00:00.000Z");
      for (let step = 1; ; step += 1) {
        const startsAt = new Date(mayaBase.getTime() + step * 14 * DAY_MS);
        if (startsAt > horizon) break;
        await client.query(
          `INSERT INTO appointments (psychologist_user_id, patient_user_id, starts_at, duration_minutes, type, status)
           VALUES ($1, $2, $3, 60, 'followup', $4)`,
          [mayaId, alexId, startsAt.toISOString(), startsAt < now ? "completed" : "confirmed"]
        );
      }

      for (let offset = 1; offset <= 10; offset += 1) {
        const slotDay = new Date(today.getTime() + offset * DAY_MS);
        const weekday = slotDay.getUTCDay();
        if (weekday === 0 || weekday === 6) continue;
        for (const hour of [9, 14]) {
          const startsAt = new Date(Date.UTC(slotDay.getUTCFullYear(), slotDay.getUTCMonth(), slotDay.getUTCDate(), hour));
          const conflict = await client.query(
            "SELECT 1 FROM appointments WHERE psychologist_user_id = $1 AND starts_at = $2",
            [mayaId, startsAt.toISOString()]
          );
          if (conflict.rows.length > 0) continue;
          await client.query(
            `INSERT INTO appointments (psychologist_user_id, patient_user_id, starts_at, duration_minutes, type, status)
             VALUES ($1, NULL, $2, 60, 'session', 'available')`,
            [mayaId, startsAt.toISOString()]
          );
        }
      }

      const mayaConversation = await client.query<{ id: number }>(
        "SELECT id FROM conversations WHERE psychologist_user_id = $1 AND patient_user_id = $2",
        [mayaId, alexId]
      );
      const conversationId = mayaConversation.rows[0]?.id;
      if (conversationId) {
        const yesterday = new Date(today.getTime() - DAY_MS);
        const stamp = (time: string) => `${toDateKey(yesterday)}T${time}.000Z`;
        const messages = [
          { sender: alexId, body: `Майя, на этой неделе стало легче. Работаю над темами: ${supervisorExtraTopics}.`, at: stamp("10:14:00") },
          { sender: mayaId, body: "Алекс, это хороший сигнал. Продолжайте ритуал восстановления между сложными сессиями.", at: stamp("10:40:00") }
        ];
        for (const message of messages) {
          await client.query(
            `INSERT INTO messages (conversation_id, sender_user_id, body, created_at, is_read)
             VALUES ($1, $2, $3, $4, TRUE)`,
            [conversationId, message.sender, message.body, message.at]
          );
        }
      }

      const totalDays = Math.floor((today.getTime() - SEED_END.getTime()) / DAY_MS);
      const step = Math.max(1, Math.floor(totalDays / journalBodies.length));
      for (const [index, body] of journalBodies.entries()) {
        const entryDay = new Date(today.getTime() - (journalBodies.length - index) * step * DAY_MS + DAY_MS);
        await client.query(
          "INSERT INTO journal_entries (patient_user_id, body, created_at) VALUES ($1, $2, $3)",
          [alexId, body, `${toDateKey(entryDay)}T20:${String(10 + index * 3).padStart(2, "0")}:00.000Z`]
        );
      }

      const yesterday = new Date(today.getTime() - DAY_MS);
      await client.query(
        `INSERT INTO journal_chat_messages (patient_user_id, sender_kind, body, created_at)
         VALUES
           ($1, 'bot', $2, $3),
           ($1, 'user', $4, $5),
           ($1, 'bot', $6, $7)`,
        [
          alexId,
          "Привет, Алекс. Как прошёл день? Что дало вам больше всего энергии?",
          `${toDateKey(yesterday)}T09:00:00.000Z`,
          "Короткая прогулка между сессиями и вовремя законченные документы.",
          `${toDateKey(yesterday)}T09:02:00.000Z`,
          "Отличные опоры. Попробуйте сохранить их и на этой неделе.",
          `${toDateKey(yesterday)}T09:03:00.000Z`
        ]
      );
    }

    await client.query("COMMIT");
    console.log("Backfill complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
