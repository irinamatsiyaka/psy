import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { seedDatabase } from "./seed";

export const initDb = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[]");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ru'");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_phone TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS about TEXT DEFAULT ''");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT");
  await pool.query(
    "UPDATE users SET full_name = split_part(email, '@', 1) WHERE full_name IS NULL OR btrim(full_name) = ''"
  );
  await pool.query("UPDATE users SET role = 'patient' WHERE role IS NULL OR btrim(role) = ''");
  await pool.query("UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL OR cardinality(roles) = 0");
  await pool.query("UPDATE users SET about = '' WHERE about IS NULL");
  await pool.query("UPDATE users SET username = regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g') WHERE username IS NULL");
  await pool.query("ALTER TABLE users ALTER COLUMN full_name SET NOT NULL");
  await pool.query("ALTER TABLE users ALTER COLUMN role SET NOT NULL");
  await pool.query("ALTER TABLE users ALTER COLUMN roles SET NOT NULL");
  await pool.query("ALTER TABLE users ALTER COLUMN roles SET DEFAULT ARRAY['patient']::text[]");
  await pool.query("ALTER TABLE users ALTER COLUMN preferred_language SET NOT NULL");
  await pool.query("ALTER TABLE users ALTER COLUMN preferred_language SET DEFAULT 'ru'");
  await pool.query("ALTER TABLE users ALTER COLUMN about SET NOT NULL");
  await pool.query("ALTER TABLE users ALTER COLUMN about SET DEFAULT ''");
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_roles_check'
      ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_roles_check
        CHECK (
          role IN ('psychologist', 'patient')
          AND roles <@ ARRAY['psychologist', 'patient']::text[]
          AND cardinality(roles) > 0
        );
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_id TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (LOWER(username)) WHERE username IS NOT NULL");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      age INTEGER,
      diagnosis TEXT,
      phone TEXT,
      onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'new',
      summary_topics TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      summary_progress TEXT NOT NULL DEFAULT '',
      summary_actions TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (status IN ('new', 'active', 'scheduled', 'completed'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS therapist_patients (
      psychologist_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (psychologist_user_id, patient_user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      psychologist_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      duration_minutes INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (type IN ('session', 'initial', 'followup')),
      CHECK (status IN ('available', 'confirmed', 'pending', 'completed', 'cancelled'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      psychologist_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (psychologist_user_id, patient_user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress_notes (
      id SERIAL PRIMARY KEY,
      psychologist_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      note_date TIMESTAMPTZ NOT NULL,
      session_number INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE progress_notes ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pending_actor TEXT");
  await pool.query("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_pending_actor_check");
  await pool.query("ALTER TABLE appointments ADD CONSTRAINT appointments_pending_actor_check CHECK (pending_actor IS NULL OR pending_actor IN ('patient', 'psychologist'))");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mood_entries (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      mood TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (patient_user_id, entry_date),
      CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS journal_chat_messages (
      id SERIAL PRIMARY KEY,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_kind TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (sender_kind IN ('bot', 'user'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_artifacts (
      id SERIAL PRIMARY KEY,
      psychologist_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL,
      transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
      ai_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_ai_messages (
      id SERIAL PRIMARY KEY,
      psychologist_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('psychologist', 'assistant')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_patient_profiles_status ON patient_profiles(status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_appointments_psychologist ON appointments(psychologist_user_id, starts_at)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_user_id, starts_at)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_progress_notes_patient ON progress_notes(patient_user_id, note_date DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_patient_ai_messages_pair ON patient_ai_messages(psychologist_user_id, patient_user_id, created_at ASC)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_mood_entries_patient ON mood_entries(patient_user_id, entry_date DESC)");

  const hasUsersResult = await pool.query<{ has_users: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM users LIMIT 1) AS has_users"
  );

  // Seed demo data only for a fresh database to avoid wiping user-created data on restart.
  if (!hasUsersResult.rows[0]?.has_users) {
    const seedPasswordHash = await bcrypt.hash("MindcareDemo2026!", 12);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await seedDatabase(client, seedPasswordHash);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
};
