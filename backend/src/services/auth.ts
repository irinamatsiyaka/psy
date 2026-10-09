import bcrypt from "bcryptjs";
import { pool } from "../db/pool";
import { signAccessToken, signRefreshToken } from "./jwt";
import { env } from "../config";

export type UserRole = "psychologist" | "patient";

export type PublicUser = {
  id: number;
  email: string;
  fullName: string;
  roles: UserRole[];
  preferredLanguage: string;
  username: string | null;
  contactPhone: string | null;
  about: string;
  avatarUrl: string | null;
};

type UserRow = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  roles: UserRole[];
  password_hash: string;
  preferred_language: string;
  username: string | null;
  contact_phone: string | null;
  about: string | null;
  avatar_url: string | null;
};

const normalizeRoles = (roles: UserRole[] | null | undefined, fallbackRole?: UserRole): UserRole[] => {
  if (roles && roles.length > 0) {
    return Array.from(new Set(roles));
  }

  if (fallbackRole) {
    return [fallbackRole];
  }

  return ["patient"];
};

const mapUserRow = (row: {
  id: number;
  email: string;
  full_name: string;
  role?: UserRole;
  roles?: UserRole[] | null;
  preferred_language?: string | null;
  username?: string | null;
  contact_phone?: string | null;
  about?: string | null;
  avatar_url?: string | null;
}): PublicUser => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  roles: normalizeRoles(row.roles, row.role),
  preferredLanguage: row.preferred_language || 'ru',
  username: row.username ?? null,
  contactPhone: row.contact_phone ?? null,
  about: row.about ?? '',
  avatarUrl: row.avatar_url ?? null
});

export const createUser = async (
  email: string,
  password: string,
  fullName: string,
  roles: UserRole[],
  preferredLanguage: string = 'ru',
  requestedUsername?: string
): Promise<PublicUser> => {
  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedRoles = normalizeRoles(roles);
  const primaryRole = normalizedRoles[0];
  const requested = requestedUsername?.trim().replace(/^@+/, '').toLowerCase();
  const username = requested && /^[a-z0-9_]{5,32}$/.test(requested)
    ? requested
    : await generateUniqueUsername(fullName, email);
  const result = await pool.query<{
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    roles: UserRole[];
    preferred_language: string;
    username: string | null;
    contact_phone: string | null;
    about: string;
    avatar_url: string | null;
  }>(
    "INSERT INTO users (email, password_hash, full_name, role, roles, preferred_language, username) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, full_name, role, roles, preferred_language, username, contact_phone, about, avatar_url",
    [email.toLowerCase(), passwordHash, fullName.trim(), primaryRole, normalizedRoles, preferredLanguage, username]
  );
  return mapUserRow(result.rows[0]);
};

export const isUsernameAvailable = async (username: string, excludeUserId?: number): Promise<boolean> => {
  const normalized = username.trim().replace(/^@+/, '').toLowerCase();
  if (!/^[a-z0-9_]{5,32}$/.test(normalized)) {
    return false;
  }

  const result = excludeUserId != null
    ? await pool.query<{ exists: boolean }>(
        `
          SELECT EXISTS(
            SELECT 1 FROM users
            WHERE LOWER(username) = $1 AND id <> $2
          )
        `,
        [normalized, excludeUserId]
      )
    : await pool.query<{ exists: boolean }>(
        `
          SELECT EXISTS(
            SELECT 1 FROM users
            WHERE LOWER(username) = $1
          )
        `,
        [normalized]
      );

  return !(result.rows[0]?.exists ?? false);
};

const normalizeBaseUsername = (value: string): string => {
  const stripped = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (stripped.length >= 5) {
    return stripped.slice(0, 24);
  }
  return `${stripped}user`.slice(0, 24);
};

const randomSuffix = (): string => String(Math.floor(Math.random() * 10_000)).padStart(4, '0');

export const generateUniqueUsername = async (fullName: string, email: string): Promise<string> => {
  const baseFromName = normalizeBaseUsername(fullName.trim());
  const fallbackBase = normalizeBaseUsername(email.split('@')[0] || 'user');
  const base = baseFromName.length >= 5 ? baseFromName : fallbackBase;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = `${base}${randomSuffix()}`.slice(0, 32);
    const available = await isUsernameAvailable(candidate);
    if (available) {
      return candidate;
    }
  }

  return `user${Date.now().toString().slice(-8)}`;
};

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const result = await pool.query<UserRow>("SELECT id, email, full_name, role, roles, password_hash, preferred_language, username, contact_phone, about, avatar_url FROM users WHERE email = $1", [
    email.toLowerCase()
  ]);
  const row = result.rows[0];
  return row ? { ...row, roles: normalizeRoles(row.roles, row.role) } : null;
};

export const findUserById = async (id: number): Promise<PublicUser | null> => {
  const result = await pool.query<{
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    roles: UserRole[];
    preferred_language: string;
    username: string | null;
    contact_phone: string | null;
    about: string | null;
    avatar_url: string | null;
  }>(
    "SELECT id, email, full_name, role, roles, preferred_language, username, contact_phone, about, avatar_url FROM users WHERE id = $1",
    [id]
  );
  const row = result.rows[0];
  return row ? mapUserRow(row) : null;
};

export const verifyUserPassword = async (user: UserRow, password: string): Promise<boolean> => {
  return bcrypt.compare(password, user.password_hash);
};

export const createSession = async (userId: number, tokenId: string): Promise<void> => {
  await pool.query(
    "INSERT INTO refresh_sessions (user_id, token_id, expires_at) VALUES ($1, $2, NOW() + ($3 || ' days')::interval)",
    [userId, tokenId, env.REFRESH_TOKEN_TTL_DAYS]
  );
};

export const revokeSession = async (tokenId: string): Promise<void> => {
  await pool.query("DELETE FROM refresh_sessions WHERE token_id = $1", [tokenId]);
};

export const revokeAllUserSessions = async (userId: number): Promise<void> => {
  await pool.query("DELETE FROM refresh_sessions WHERE user_id = $1", [userId]);
};

export const hasSession = async (tokenId: string): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM refresh_sessions WHERE token_id = $1 AND expires_at > NOW())",
    [tokenId]
  );
  return result.rows[0]?.exists ?? false;
};

export const issueAuthTokens = async (
  user: PublicUser
): Promise<{ accessToken: string; refreshToken: string; refreshTokenId: string }> => {
  const accessToken = signAccessToken(user.id, user.email);
  const { token: refreshToken, tokenId: refreshTokenId } = signRefreshToken(user.id);
  await createSession(user.id, refreshTokenId);
  return { accessToken, refreshToken, refreshTokenId };
};
