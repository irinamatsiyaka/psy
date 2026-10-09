import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { findUserById } from "../services/auth";

const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

// Create or get conversation between two users
conversationsRouter.post("/", async (req, res) => {
  const schema = z.object({
    otherUserId: z.number().int().positive()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const { otherUserId } = parsed.data;
  const userId = req.user!.id;

  try {
    // Check if other user exists
    const otherUser = await findUserById(otherUserId);
    if (!otherUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Try to get existing conversation
    let result = await pool.query(
      `SELECT id FROM conversations 
       WHERE (psychologist_user_id = $1 AND patient_user_id = $2)
       OR (psychologist_user_id = $2 AND patient_user_id = $1)`,
      [userId, otherUserId]
    );

    let conversationId = result.rows[0]?.id;

    if (!conversationId) {
      // Create new conversation
      // First check the therapist_patients relationship to determine correct orientation
      const relResult = await pool.query<{ psychologist_user_id: number; patient_user_id: number }>(
        `SELECT psychologist_user_id, patient_user_id FROM therapist_patients
         WHERE (psychologist_user_id = $1 AND patient_user_id = $2)
            OR (psychologist_user_id = $2 AND patient_user_id = $1)
         LIMIT 1`,
        [userId, otherUserId]
      );

      let psychologistId: number;
      let patientId: number;

      if (relResult.rows[0]) {
        // Use existing relationship to get correct orientation
        psychologistId = relResult.rows[0].psychologist_user_id;
        patientId = relResult.rows[0].patient_user_id;
      } else {
        // Fall back to role-based determination
        const currentUser = await findUserById(userId);
        const isPsychologist = currentUser?.roles.includes("psychologist");
        const otherIsPsychologist = otherUser.roles.includes("psychologist");

        psychologistId = userId;
        patientId = otherUserId;

        if (!isPsychologist && otherIsPsychologist) {
          psychologistId = otherUserId;
          patientId = userId;
        }
      }

      await pool.query(
        `INSERT INTO therapist_patients (psychologist_user_id, patient_user_id)
         VALUES ($1, $2)
         ON CONFLICT (psychologist_user_id, patient_user_id) DO NOTHING`,
        [psychologistId, patientId]
      );

      result = await pool.query(
        `INSERT INTO conversations (psychologist_user_id, patient_user_id)
         VALUES ($1, $2)
         ON CONFLICT (psychologist_user_id, patient_user_id) DO UPDATE SET psychologist_user_id = $1
         RETURNING id`,
        [psychologistId, patientId]
      );

      conversationId = result.rows[0].id;
    }

    res.json({ conversationId });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

// List conversations for current user
conversationsRouter.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT c.id, c.psychologist_user_id, c.patient_user_id, c.created_at,
              u1.full_name as psychologist_name, u1.email as psychologist_email,
              u2.full_name as patient_name, u2.email as patient_email
       FROM conversations c
       JOIN users u1 ON c.psychologist_user_id = u1.id
       JOIN users u2 ON c.patient_user_id = u2.id
       WHERE c.psychologist_user_id = $1 OR c.patient_user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    const conversations = result.rows.map((row: any) => ({
      id: row.id,
      psychologistId: row.psychologist_user_id,
      psychologistName: row.psychologist_name,
      psychologistEmail: row.psychologist_email,
      patientId: row.patient_user_id,
      patientName: row.patient_name,
      patientEmail: row.patient_email,
      createdAt: row.created_at
    }));

    res.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Get messages for a conversation
conversationsRouter.get("/:conversationId/messages", async (req, res) => {
  const { conversationId } = req.params;
  const schema = z.object({ conversationId: z.coerce.number().int().positive() });
  const parsed = schema.safeParse({ conversationId });

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid conversation ID" });
    return;
  }

  try {
    const userId = req.user!.id;

    // Verify user has access to this conversation
    const conv = await pool.query(
      `SELECT id FROM conversations 
       WHERE id = $1 AND (psychologist_user_id = $2 OR patient_user_id = $2)`,
      [conversationId, userId]
    );

    if (conv.rows.length === 0) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Fetch messages
    const result = await pool.query(
      `SELECT m.id, m.sender_user_id, m.body, m.created_at, u.full_name
       FROM messages m
       JOIN users u ON m.sender_user_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    const messages = result.rows.map((row: any) => ({
      id: row.id,
      senderId: row.sender_user_id,
      senderName: row.full_name,
      body: row.body,
      createdAt: row.created_at
    }));

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Send a message in a conversation
conversationsRouter.post("/:conversationId/messages", async (req, res) => {
  const { conversationId } = req.params;
  const schema = z.object({
    conversationId: z.coerce.number().int().positive(),
    body: z.string().trim().min(1).max(2000)
  });

  const parsed = schema.safeParse({ conversationId, ...req.body });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const userId = req.user!.id;
    const { body } = parsed.data;

    // Verify user has access to this conversation
    const conv = await pool.query(
      `SELECT id FROM conversations 
       WHERE id = $1 AND (psychologist_user_id = $2 OR patient_user_id = $2)`,
      [conversationId, userId]
    );

    if (conv.rows.length === 0) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Insert message
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [conversationId, userId, body]
    );

    res.json({
      id: result.rows[0].id,
      senderId: userId,
      body,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

export { conversationsRouter };
