import { Router } from "express";
import { z } from "zod";
import { env } from "../config";
import {
  createUser,
  findUserByEmail,
  findUserById,
  hasSession,
  issueAuthTokens,
  revokeSession,
  verifyUserPassword
} from "../services/auth";
import { verifyRefreshToken } from "../services/jwt";
import { requireAuth } from "../middleware/auth";

const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

const registerSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(80),
  roles: z.array(z.enum(["psychologist", "patient"])).min(1).max(2),
  preferredLanguage: z.enum(["en", "ru"]).default("en"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@+/, ''))
    .pipe(z.string().regex(/^[a-z0-9_]{5,32}$/))
    .optional()
});

const refreshCookieName = "refreshToken";

const buildRefreshCookie = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    res.status(409).json({ message: "User already exists" });
    return;
  }

  let user;
  try {
    user = await createUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.fullName,
      parsed.data.roles,
      parsed.data.preferredLanguage,
      parsed.data.username
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      res.status(409).json({ message: "Username is already taken" });
      return;
    }
    throw error;
  }
  const { accessToken, refreshToken } = await issueAuthTokens(user);

  res.cookie(refreshCookieName, refreshToken, buildRefreshCookie());
  res.status(201).json({ accessToken, user });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  const isValidPassword = await verifyUserPassword(user, parsed.data.password);
  if (!isValidPassword) {
    res.status(401).json({ message: "Invalid password" });
    return;
  }

  const authUser = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    roles: user.roles,
    preferredLanguage: user.preferred_language,
    username: user.username,
    contactPhone: user.contact_phone,
    about: user.about ?? '',
    avatarUrl: user.avatar_url
  };

  const { accessToken, refreshToken } = await issueAuthTokens(authUser);

  res.cookie(refreshCookieName, refreshToken, buildRefreshCookie());
  res.json({ accessToken, user: authUser });
});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.[refreshCookieName];
  if (!refreshToken) {
    res.status(401).json({ message: "Missing refresh cookie" });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenId = payload.tokenId;
    const userId = Number(payload.sub);

    const validSession = await hasSession(tokenId);
    if (!validSession) {
      res.status(401).json({ message: "Session expired" });
      return;
    }

    await revokeSession(tokenId);
    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const tokens = await issueAuthTokens(user);
    res.cookie(refreshCookieName, tokens.refreshToken, buildRefreshCookie());
    res.json({ accessToken: tokens.accessToken, user });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

authRouter.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.[refreshCookieName];
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await revokeSession(payload.tokenId);
    } catch {
      // Ignore malformed refresh tokens on logout.
    }
  }
  res.clearCookie(refreshCookieName, buildRefreshCookie());
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({ user });
});

export { authRouter };
