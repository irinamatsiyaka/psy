import { pool } from "./pool";

/**
 * Additive chat refresh:
 *  1. translates the English demo messages (and journal chat) to Russian in place;
 *  2. adds Russian conversation history from late April up to October.
 * Never deletes rows. Safe to re-run.
 *
 * Run: npm run backfill:chats
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_START = new Date("2026-04-28T00:00:00.000Z");
const HISTORY_END = new Date("2026-10-01T00:00:00.000Z");

const PSYCHOLOGIST_EMAIL = "alex.rivera@mindcare.app";
const SUPERVISOR_EMAIL = "maya.brooks@mindcare.app";

// Russian versions of the original 2026-04-20 demo conversations (same order as the English originals).
const originalChats: Record<string, string[]> = {
  "sarah.martinez@mindcare.app": [
    "Привет, Алекс. Я хотела бы обсудить нашу последнюю сессию.",
    "Конечно. Как ты чувствуешь себя после неё?",
    "Я практикую дыхательные упражнения, и они действительно помогают перед встречами.",
    "Это хороший прогресс. Какие ситуации стали легче?",
    "В основном командные встречи. Я чувствую себя увереннее и быстрее восстанавливаюсь, если нервничаю."
  ],
  "john.doe@mindcare.app": [
    "Привет, Алекс, на этой неделе работа стала менее утомительной.",
    "Это очень хорошо слышать. Что изменилось больше всего?",
    "Я сохранил привычку вечерней прогулки и перестал проверять почту после 20:00.",
    "Отличное правило. Это помогло и со сном?",
    "Да, я быстрее засыпаю и просыпаюсь с большей энергией."
  ],
  "emily.chen@mindcare.app": [
    "Вчера я сходила на небольшой ужин с друзьями.",
    "Это важный шаг. Как реагировало тело?",
    "Сначала я напряглась, но заземление помогло, и я осталась до конца.",
    "Это очень сильная работа с экспозицией. Что помогло больше всего в тот момент?",
    "Называние предметов вокруг меня и замедление дыхания."
  ],
  "michael.brown@mindcare.app": [
    "Сегодня я один раз высказался на совещании по проекту.",
    "Это настоящий успех. Насколько тревожно было до и после?",
    "Около 8 до, 5 после. Это снизилось быстрее обычного.",
    "Быстрое восстановление важно. Давай продолжим это на следующей сессии.",
    "Да, думаю, я могу попробовать ещё раз, но сначала в более маленькой группе."
  ],
  "lisa.johnson@mindcare.app": [
    "У меня снова было сжатие в груди, но это не переросло в полноценную панику.",
    "Это важный прогресс. Что ты сделала по-другому?",
    "Я осталась с этим чувством и использовала счёт до упражнения.",
    "Отлично. Именно такой ответ мы и хотим закреплять.",
    "Это было неприятно, но не так страшно, как раньше."
  ],
  "david.kim@mindcare.app": [
    "Мне всё ещё кажется, что я отстаю в новой роли.",
    "Какие факты это подтверждают, а какие говорят против?",
    "Мой менеджер сказал, что я хорошо справился со сложным клиентом.",
    "Это сильное контр-доказательство. Продолжай собирать такие моменты.",
    "Обязательно. Это помогает видеть полную картину, а не только ошибки."
  ]
};

const supervisorOriginalChat = [
  "Привет, Майя, у меня была тяжёлая неделя в клинике. Слишком много сложных случаев подряд.",
  "Понимаю. Когда ты несёшь боль так многих людей, это накапливается. Что было самым тяжёлым?",
  "Пожалуй, это был пациент в очень тяжёлом состоянии. Я оставался присутствующим, но это меня вымотало.",
  "Такой эмпатический груз действительно тяжёлый. Была ли у тебя возможность восстановиться после этого?",
  "Не совсем. Я сразу перешёл к документам и следующей встрече.",
  "Давай создадим короткий ритуал восстановления между сложными сессиями. Даже пять минут уже важно."
];

const simpleTranslations: Array<[string, string]> = [
  ["Hi", "Привет"],
  ["HI", "Привет"],
  ["Hello", "Здравствуйте"]
];

const journalChatTranslations: Array<[string, string]> = [
  ["Hi Alex. Let's do a quick emotional check-in. What felt most demanding today?", "Привет, Алекс. Давай быстро сделаем эмоциональную проверку. Что сегодня было самым тяжёлым?"],
  ["Holding boundaries with messages after clinic hours was the hardest part.", "Сложнее всего было держать границы с сообщениями после рабочего дня."],
  ["That sounds like useful progress. What helped you protect that boundary even a little?", "Это похоже на полезный прогресс. Что помогло вам хотя бы немного защитить эту границу?"]
];

const journalEntryTranslations: Array<[string, string]> = [
  ["Busy clinic week, but I finally blocked one evening for rest and it lowered my overall stress.", "Насыщенная неделя в клинике, но я наконец выделил один вечер на отдых, и общий стресс снизился."],
  ["Noticed I feel better on days when I stop charting by 7 pm and take a short walk.", "Заметил, что чувствую себя лучше в дни, когда заканчиваю документы к 19:00 и выхожу на короткую прогулку."]
];

type Exchange = [string, string, string];

const genericExchanges: Exchange[] = [
  [
    "Алекс, добрый день! Можно ли перенести ближайшую сессию на час позже?",
    "Здравствуйте! Да, подойдёт, подтвердил новое время в календаре.",
    "Спасибо большое, до встречи!"
  ],
  [
    "Здравствуйте, напоминание на завтра пришло, всё в силе?",
    "Да, жду вас в то же время. Подготовьте, пожалуйста, записи за неделю.",
    "Хорошо, всё подготовлю."
  ],
  [
    "Алекс, после сессии осталось много мыслей. Можно коротко вернуться к ним в чате?",
    "Конечно. Запишите главное, а подробности разберём на следующей встрече.",
    "Договорились, так и сделаю."
  ],
  [
    "Добрый вечер! Не смогу прийти на встречу из-за рабочей командировки.",
    "Спасибо, что предупредили. Давайте подберём другое время на этой неделе.",
    "Отлично, посмотрю свободные слоты в календаре."
  ],
  [
    "Алекс, спасибо за сегодняшнюю сессию, стало заметно спокойнее.",
    "Рад это слышать. Вы проделали большую работу.",
    "Постараюсь закрепить это в течение недели."
  ],
  [
    "Домашнее задание на неделю получилось выполнить полностью.",
    "Отлично, это важный шаг. Обсудим, что получилось лучше всего.",
    "С удовольствием, мне есть что рассказать."
  ]
];

const patientExchanges: Record<string, Exchange[]> = {
  "sarah.martinez@mindcare.app": [
    ["Алекс, на этой неделе провела презентацию, волновалась меньше, чем обычно.", "Отличный результат, Сара. Что помогло вам собраться перед началом?", "Дыхание по схеме 4-7-8 и пауза перед первым слайдом."],
    ["Коллега снова перебил меня на встрече, и я заметила привычное напряжение.", "Что вы сделали в этот момент?", "Спокойно сказала, что хочу закончить мысль. Было непросто, но получилось."],
    ["Сегодня поймала себя на мысли «всё должно быть идеально» и остановилась.", "Это важный навык — замечать такие мысли вовремя. Чем вы их заменили?", "Напомнила себе, что «достаточно хорошо» — это тоже результат."],
    ["Алекс, вечером накатила тревога перед завтрашним докладом.", "Попробуйте упражнение на заземление и запишите три тезиса к докладу. Этого будет достаточно.", "Сделала, стало заметно спокойнее. Спасибо!"],
    ["Сходила на встречу с друзьями, впервые за долгое время не думала о работе.", "Рад за вас, Сара. Как вы себя чувствовали после?", "Лёгкость и немного гордости за себя."],
    ["Начала вечером выключать рабочие уведомления, как мы и обсуждали.", "Отличное решение. Как это отразилось на сне?", "Засыпаю быстрее, а утром больше сил."]
  ],
  "john.doe@mindcare.app": [
    ["Алекс, неделя была тяжёлая, но вечерние прогулки я не пропустил.", "Это очень хороший знак, Джон. Как вы себя чувствуете после прогулок?", "Голова проясняется, и меньше тянет зависать в телефоне."],
    ["Сегодня с утра не было сил вставать, пришлось заставлять себя.", "Бывает, что утро даётся тяжело. Что вам удалось сделать, несмотря на это?", "Всё же вышел на пробежку и нормально позавтракал. Стало легче."],
    ["Заполнил план активностей на неделю, выполнил почти всё.", "Отличная динамика. Какое дело принесло больше всего удовольствия?", "Встреча с братом в субботу, давно не виделись."],
    ["Работа снова накрыла, после 20:00 очень хотелось проверить почту.", "Что вы решили сделать?", "Не стал. Выключил ноутбук и пошёл гулять."],
    ["Алекс, сон стал лучше — просыпаюсь раньше будильника.", "Рад это слышать. Что изменилось в вашем вечернем ритуале?", "Убрал телефон за час до сна и читаю бумажную книгу."],
    ["Давно не чувствовал такого спокойствия, это странно и приятно.", "Так и работает накопительный эффект практик. Давайте обсудим это на сессии.", "Хорошо, запишу, что хочу разобрать."]
  ],
  "emily.chen@mindcare.app": [
    ["Алекс, вчера на улице был триггер, но флешбэк удалось остановить.", "Это серьёзный результат, Эмили. Какую технику вы использовали?", "5-4-3-2-1: назвала предметы вокруг и замедлила дыхание."],
    ["На выходных ходила на день рождения подруги, пробыла два часа.", "Это большой шаг. Как вы себя чувствовали по ходу вечера?", "Сначала напряжённо, потом расслабилась и даже смеялась."],
    ["Плохо спала ночью, снились тревожные сны.", "Сочувствую. Попробуйте вечернее упражнение на расслабление мышц и запишите сон, если захотите.", "Хорошо, попробую сегодня вечером."],
    ["Алекс, заметила, что флешбэков стало заметно меньше.", "Это отражение вашей работы. Что изменилось в повседневной жизни?", "Стала чаще выходить из дома и меньше избегать людных мест."],
    ["Сегодня ехала в метро в час пик и справилась.", "Горжусь вашим прогрессом. Что помогло больше всего?", "Дыхание и музыка в наушниках, которую мы подбирали."],
    ["Появилась мысль записаться на курсы рисования.", "Отличная идея, она поддержит ваше восстановление. Что вас в ней привлекает?", "Хочется заниматься чем-то спокойным, где можно просто быть здесь и сейчас."]
  ],
  "michael.brown@mindcare.app": [
    ["Алекс, сегодня я сам предложил идею на совещании.", "Это прекрасный результат, Майкл. Как вы себя чувствовали до и после?", "До — 7 из 10, после — около 3. Быстро отпустило."],
    ["Звали на корпоратив, сначала хотел отказаться.", "Что вы решили?", "Пошёл на час. Поговорил с двумя коллегами и ушёл довольным."],
    ["Вчера избежал выступления на планёрке, ругаю себя.", "Это нормально, не каждый шаг получается. Что мешало и что можно попробовать в следующий раз?", "Попробую начать с короткого комментария, а не с целой речи."],
    ["Замечаю, что внутренний критик стал тише.", "Это важная перемена. Чем вы заменяете его фразы?", "Говорю себе: «Я просто делюсь мнением, это не экзамен»."],
    ["Записался на небольшую группу по интересам.", "Здорово, Майкл. Какое направление выбрали?", "Настольные игры, там всего шесть человек."],
    ["Первая встреча в группе прошла лучше, чем я ожидал.", "Отлично. Какие моменты вам запомнились?", "Смог пошутить, и никто не отвернулся. Это было неожиданно приятно."]
  ],
  "lisa.johnson@mindcare.app": [
    ["Алекс, неделя без панических атак, и это уже не случайность.", "Отличный результат, Лиза. Что вы делали иначе?", "Не убегала от ощущений в груди, а просто наблюдала за ними."],
    ["Сегодня в лифте появилось сжатие в груди, но я не поддалась панике.", "Это большая работа. Как вы себя поддержали?", "Сказала себе, что это волна и она пройдёт. Так и вышло."],
    ["Вернулась в спортзал после долгого перерыва.", "Рад за вас. Что вы чувствовали во время нагрузки?", "Сердце колотилось, но я знала, что это нормально."],
    ["Алекс, немного боюсь поездки в другой город на поезде.", "Давайте составим план: что поможет вам в дороге? Можно обсудить на сессии.", "Хорошо, подумаю и запишу идеи."],
    ["Съездила в поездку, всё прошло спокойно.", "Поздравляю, Лиза! Это очень значимый результат.", "Сама не верю, как легко получилось."],
    ["Врач подтвердила, что с лекарствами всё в порядке, дозу не меняем.", "Хорошая новость. Продолжайте наблюдать за самочувствием и вести записи.", "Да, дневник веду каждый вечер."]
  ],
  "david.kim@mindcare.app": [
    ["Алекс, на этой неделе записал три факта против синдрома самозванца.", "Отличная работа, Дэвид. Какой из них оказался самым весомым?", "Клиент отметил, что мой отчёт помог ему принять решение."],
    ["Сегодня руководитель дал критику, и я сначала расстроился.", "Что вы сделали с этими чувствами?", "Отделил факты от оценок и понял, что замечания по делу."],
    ["Хотел взять дополнительный проект, но испугался.", "Что говорит вам внутренний голос, и что показывают факты?", "Факты говорят, что я справляюсь. Возьму проект поменьше."],
    ["Мне предложили выступить на командной встрече.", "Это признание вашей экспертизы. Как вы к этому относитесь?", "Волнуюсь, но соглашусь."],
    ["Выступил, прошло хорошо, коллеги задавали вопросы.", "Поздравляю, Дэвид. Что вы вынесли из этого опыта?", "Что мне не нужно быть идеальным, чтобы быть полезным."],
    ["Стал спокойнее относиться к ошибкам, они больше не кажутся катастрофой.", "Это существенный сдвиг. Продолжайте замечать такие моменты.", "Обязательно, дневник доказательств теперь мой любимый инструмент."]
  ]
};

// Alex (as a patient) <-> Maya Brooks (psychologist).
const supervisorExchanges: Exchange[] = [
  ["Майя, после сложной недели чувствую усталость, но использую паузы между сессиями.", "Отлично, Алекс. Какие паузы работают лучше всего?", "Пять минут тишины и стакан воды, без телефона."],
  ["Заметил, что снова начал отвечать на сообщения поздно вечером.", "Вы замечаете это сами, это уже половина работы. Что можно изменить?", "Установлю правило: после 19:00 только срочные случаи."],
  ["Майя, выходные впервые прошли без рабочих мыслей.", "Это очень хороший знак. Что вам помогло отключиться?", "Поездка за город и никаких документов."],
  ["Перед отпуском накопилось много задач, чувствую напряжение.", "Давайте составим короткий список приоритетов и передадим остальное коллегам.", "Хорошая идея, займусь этим сегодня."],
  ["Вернулся из отпуска, энергии больше, чем ожидал.", "Рада слышать. Как вы планируете сохранить это состояние?", "Закреплю два свободных вечера в неделю и вечерний дневник."]
];

const toIso = (day: Date, hour: number, minute: number): string => {
  const date = new Date(day.getTime());
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
};

type ConversationRow = { id: number; psychologist_email: string; patient_email: string };

const main = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Translate English demo content in place.
    const conversations = await client.query<ConversationRow>(
      `SELECT c.id, pu.email AS psychologist_email, au.email AS patient_email
       FROM conversations c
       JOIN users pu ON pu.id = c.psychologist_user_id
       JOIN users au ON au.id = c.patient_user_id`
    );

    for (const conversation of conversations.rows) {
      const russian = conversation.psychologist_email === SUPERVISOR_EMAIL && conversation.patient_email === PSYCHOLOGIST_EMAIL
        ? supervisorOriginalChat
        : originalChats[conversation.patient_email];
      if (!russian) continue;

      const originalDay = conversation.patient_email === PSYCHOLOGIST_EMAIL ? "2026-04-21" : "2026-04-20";
      const rows = await client.query<{ id: number; body: string }>(
        `SELECT id, body FROM messages
         WHERE conversation_id = $1 AND created_at::date = $2::date
         ORDER BY created_at, id`,
        [conversation.id, originalDay]
      );
      for (const [index, row] of rows.rows.entries()) {
        if (/[А-Яа-яЁё]/.test(row.body) || !russian[index]) continue;
        await client.query("UPDATE messages SET body = $2 WHERE id = $1", [row.id, russian[index]]);
      }
    }

    for (const [from, to] of simpleTranslations) {
      await client.query("UPDATE messages SET body = $2 WHERE body = $1", [from, to]);
    }
    for (const [from, to] of journalChatTranslations) {
      await client.query("UPDATE journal_chat_messages SET body = $2 WHERE body = $1", [from, to]);
    }
    for (const [from, to] of journalEntryTranslations) {
      await client.query("UPDATE journal_entries SET body = $2 WHERE body = $1", [from, to]);
    }

    // Session transcripts from the original seed (first three lines mirror the original chat).
    const artifacts = await client.query<{ id: number; email: string; transcript: Array<{ text: string; time: string; speaker: string }> }>(
      `SELECT a.id, u.email, a.transcript
       FROM session_artifacts a JOIN users u ON u.id = a.patient_user_id
       WHERE a.started_at < '2026-05-01'`
    );
    for (const artifact of artifacts.rows) {
      const russian = originalChats[artifact.email];
      if (!russian) continue;
      const updated = artifact.transcript.map((entry, index) =>
        /[А-Яа-яЁё]/.test(entry.text) || !russian[index] ? entry : { ...entry, text: russian[index] }
      );
      await client.query("UPDATE session_artifacts SET transcript = $2::jsonb WHERE id = $1", [artifact.id, JSON.stringify(updated)]);
    }

    // 2. New Russian history from late April until October.
    const alexResult = await client.query<{ id: number }>("SELECT id FROM users WHERE email = $1", [PSYCHOLOGIST_EMAIL]);
    const alexId = alexResult.rows[0]?.id;
    if (!alexId) {
      throw new Error("Demo psychologist not found");
    }

    const spanDays = Math.floor((HISTORY_END.getTime() - HISTORY_START.getTime()) / DAY_MS);
    let added = 0;

    for (const [conversationIndex, conversation] of conversations.rows.entries()) {
      const isSupervisor = conversation.psychologist_email === SUPERVISOR_EMAIL && conversation.patient_email === PSYCHOLOGIST_EMAIL;
      const specific = isSupervisor ? supervisorExchanges : patientExchanges[conversation.patient_email];
      if (!specific) continue;

      const already = await client.query<{ cnt: string }>(
        "SELECT COUNT(*)::text AS cnt FROM messages WHERE conversation_id = $1 AND created_at >= $2 AND created_at < $3",
        [conversation.id, HISTORY_START.toISOString(), HISTORY_END.toISOString()]
      );
      if (Number(already.rows[0].cnt) > 0) continue;

      const idsResult = await client.query<{ psychologist_user_id: number; patient_user_id: number }>(
        "SELECT psychologist_user_id, patient_user_id FROM conversations WHERE id = $1",
        [conversation.id]
      );
      const therapistId = idsResult.rows[0].psychologist_user_id;
      const patientId = idsResult.rows[0].patient_user_id;

      let threads: Exchange[];
      if (isSupervisor) {
        threads = specific;
      } else {
        const g = conversationIndex % genericExchanges.length;
        threads = [
          specific[0],
          genericExchanges[g],
          specific[1],
          specific[2],
          genericExchanges[(g + 3) % genericExchanges.length],
          specific[3],
          specific[4],
          specific[5]
        ];
      }

      const step = Math.floor(spanDays / (threads.length + 0.5));
      for (const [threadIndex, thread] of threads.entries()) {
        const day = new Date(HISTORY_START.getTime() + (threadIndex * step + (conversationIndex % 6) * 2) * DAY_MS);
        const hour = 9 + ((threadIndex * 3 + conversationIndex) % 10);
        const minute = (threadIndex * 7 + conversationIndex * 5) % 50;
        const senders = [patientId, therapistId, patientId];
        const offsets = [0, 11, 26];
        for (const [messageIndex, body] of thread.entries()) {
          await client.query(
            `INSERT INTO messages (conversation_id, sender_user_id, body, created_at, is_read)
             VALUES ($1, $2, $3, $4, TRUE)`,
            [conversation.id, senders[messageIndex], body, toIso(day, hour, minute + offsets[messageIndex])]
          );
          added += 1;
        }
      }
    }

    await client.query("COMMIT");
    console.log(`Chats refreshed, new messages added: ${added}`);
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
