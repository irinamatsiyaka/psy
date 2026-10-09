import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { findUserById, isUsernameAvailable } from "../services/auth";

const usersRouter = Router();

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@+/, ''))
    .pipe(z.string().regex(/^[a-z0-9_]{5,32}$/))
    .optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  about: z.string().trim().max(300).optional(),
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => /^data:image\//.test(value) || /^https?:\/\//.test(value), {
      message: "Avatar must be an image data URL or an http(s) URL"
    })
    .nullable()
    .optional(),
  preferredLanguage: z.enum(["en", "ru"]).optional()
});

const usernameAvailabilitySchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{5,32}$/)
});

usersRouter.get("/username-availability", async (req, res) => {
  const parsed = usernameAvailabilitySchema.safeParse({ username: String(req.query.username ?? "") });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid username" });
    return;
  }

  const available = await isUsernameAvailable(parsed.data.username);
  res.json({ available });
});

// Search for users (patients, psychologists)
usersRouter.get("/search", requireAuth, async (req, res) => {
  const { q, role } = req.query;

  if (!q || typeof q !== "string" || q.trim().length === 0) {
    res.status(400).json({ message: "Search query is required" });
    return;
  }

  if (role && !["patient", "psychologist"].includes(role as string)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

  try {
    const rawQuery = q.trim().toLowerCase();
    const searchQuery = `%${rawQuery}%`;
    const usernameQuery = `%${rawQuery.replace(/^@+/, '')}%`;
    
    let sqlQuery = `
      SELECT
        users.id,
        users.email,
        users.full_name,
        users.roles,
        users.preferred_language,
        users.username,
        EXISTS (
          SELECT 1
          FROM therapist_patients current_relationship
          WHERE current_relationship.psychologist_user_id = $3
            AND current_relationship.patient_user_id = users.id
        ) AS is_in_patient_list,
        EXISTS (
          SELECT 1
          FROM therapist_patients any_relationship
          WHERE any_relationship.patient_user_id = users.id
        ) AS has_psychologist
      FROM users
      WHERE (LOWER(email) LIKE $1 OR LOWER(full_name) LIKE $1 OR LOWER(username) LIKE $2)
      AND id != $3
    `;
    
    const params: any[] = [searchQuery, usernameQuery, req.user!.id];

    if (role) {
      sqlQuery += ` AND $${params.length + 1} = ANY(roles)`;
      params.push(role);
    }

    sqlQuery += ` LIMIT 20`;

    const result = await pool.query(sqlQuery, params);

    const users = result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      roles: row.roles,
      preferredLanguage: row.preferred_language,
      username: row.username,
      isInPatientList: Boolean(row.is_in_patient_list),
      hasPsychologist: Boolean(row.has_psychologist)
    }));

    res.json({ users });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

// Get current user profile
usersRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      preferredLanguage: user.preferredLanguage,
      username: user.username,
      contactPhone: user.contactPhone,
      about: user.about,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

usersRouter.get("/profile", requireAuth, async (req, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    username: user.username,
    contactPhone: user.contactPhone,
    about: user.about,
    avatarUrl: user.avatarUrl,
    preferredLanguage: user.preferredLanguage,
    roles: user.roles
  });
});

usersRouter.patch("/profile", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ message: "Nothing to update" });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          full_name = COALESCE($1, full_name),
          username = COALESCE($2, username),
          contact_phone = COALESCE($3, contact_phone),
          about = COALESCE($4, about),
          avatar_url = COALESCE($5, avatar_url),
          preferred_language = COALESCE($6, preferred_language)
        WHERE id = $7
        RETURNING id, email, full_name, roles, preferred_language, username, contact_phone, about, avatar_url
      `,
      [
        updates.fullName ?? null,
        updates.username ?? null,
        updates.contactPhone ?? null,
        updates.about ?? null,
        updates.avatarUrl ?? null,
        updates.preferredLanguage ?? null,
        req.user!.id
      ]
    );

    const row = result.rows[0];
    res.json({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      roles: row.roles,
      preferredLanguage: row.preferred_language,
      username: row.username,
      contactPhone: row.contact_phone,
      about: row.about,
      avatarUrl: row.avatar_url
    });
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
    console.error("Failed to update profile", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

usersRouter.post("/heartbeat", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE users SET last_seen_at = NOW() WHERE id = $1", [req.user!.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    res.status(500).json({ message: "Failed to update heartbeat" });
  }
});

export { usersRouter };
