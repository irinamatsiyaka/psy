import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { findUserById } from "../services/auth";
import {
  acceptPatientAppointmentRequest,
  askPatientAnalyticsAssistant,
  attachPatientToPsychologist,
  bookAvailableAppointment,
  confirmPendingAppointment,
  createProgressNote,
  createPsychologistAppointment,
  deletePsychologistAppointment,
  deleteProgressNote,
  createJournalChatReply,
  createJournalEntry,
  deleteJournalEntry,
  createMoodEntry,
  createPsychologistMessage,
  completeAppointment,
  cancelAppointment,
  getAppBootstrap,
  getPatientAnalytics,
  markConversationRead,
  markConversationReadForPatient,
  rejectPatientAppointmentRequest,
  updateJournalEntry,
  updateProgressNote,
  updatePsychologistAppointment
} from "../services/appData";

const appRouter = Router();

const psychologistMessageSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  text: z.string().trim().min(1).max(2000)
});

const moodSchema = z.object({
  mood: z.enum(["great", "good", "okay", "bad", "terrible"]),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Invalid date").optional()
});

const journalEntrySchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

const bookAppointmentSchema = z.object({
  appointmentId: z.coerce.number().int().positive()
});

const manualAppointmentSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  startsAt: z.string().datetime(),
  durationMinutes: z.coerce.number().int().min(15).max(180).default(60),
  type: z.enum(["session", "initial", "followup"]).default("session")
});

const updateAppointmentSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  startsAt: z.string().datetime(),
  durationMinutes: z.coerce.number().int().min(15).max(180),
  type: z.enum(["session", "initial", "followup"])
});

const appointmentIdParamsSchema = z.object({
  appointmentId: z.coerce.number().int().positive()
});

const attachPatientSchema = z.object({
  patientId: z.coerce.number().int().positive()
});

const noteSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(8000),
  noteDate: z.string().datetime().optional(),
  sessionNumber: z.coerce.number().int().min(1).max(999).optional(),
  imageUrl: z.string().trim().max(2_000_000).nullable().optional()
});

const updateNoteSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(8000),
  noteDate: z.string().datetime(),
  sessionNumber: z.coerce.number().int().min(1).max(999),
  imageUrl: z.string().trim().max(2_000_000).nullable().optional()
});

const noteIdParamsSchema = z.object({
  noteId: z.coerce.number().int().positive()
});

const analyticsPatientParamsSchema = z.object({
  patientId: z.coerce.number().int().positive()
});

const analyticsQuestionSchema = z.object({
  question: z.string().trim().min(1).max(2000)
});

const journalEntryParamsSchema = z.object({
  journalEntryId: z.coerce.number().int().positive()
});

appRouter.use(requireAuth);

appRouter.get("/bootstrap", async (req, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const data = await getAppBootstrap(user.id, user.roles);
  res.json(data);
});

appRouter.post("/messages", async (req, res) => {
  const parsed = psychologistMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  await createPsychologistMessage(user.id, parsed.data.patientId, parsed.data.text);
  res.status(201).json({ ok: true });
});

appRouter.post("/moods", async (req, res) => {
  const parsed = moodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  await createMoodEntry(user.id, parsed.data.mood, parsed.data.entryDate);
  res.status(201).json({ ok: true });
});

appRouter.post("/journal-entries", async (req, res) => {
  const parsed = journalEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  await createJournalEntry(user.id, parsed.data.body);
  res.status(201).json({ ok: true });
});

appRouter.post("/journal-chat", async (req, res) => {
  const parsed = journalEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  await createJournalChatReply(user.id, parsed.data.body);
  res.status(201).json({ ok: true });
});

appRouter.patch("/journal-entries/:journalEntryId", async (req, res) => {
  const parsedParams = journalEntryParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid journal entry ID" });
    return;
  }

  const parsedBody = journalEntrySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsedBody.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  const updated = await updateJournalEntry(user.id, parsedParams.data.journalEntryId, parsedBody.data.body);
  if (!updated) {
    res.status(404).json({ message: "Journal entry not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.delete("/journal-entries/:journalEntryId", async (req, res) => {
  const parsedParams = journalEntryParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid journal entry ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  const deleted = await deleteJournalEntry(user.id, parsedParams.data.journalEntryId);
  if (!deleted) {
    res.status(404).json({ message: "Journal entry not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.post("/appointments/book", async (req, res) => {
  const parsed = bookAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  const booked = await bookAvailableAppointment(user.id, parsed.data.appointmentId);
  if (!booked) {
    res.status(409).json({ message: "Appointment is no longer available" });
    return;
  }

  res.status(201).json({ ok: true });
});

appRouter.post("/appointments/confirm", async (req, res) => {
  const parsed = bookAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  const confirmed = await confirmPendingAppointment(user.id, parsed.data.appointmentId);
  if (!confirmed) {
    res.status(409).json({ message: "Appointment is no longer pending" });
    return;
  }

  res.status(201).json({ ok: true });
});

appRouter.post("/appointments/:appointmentId/accept-request", async (req, res) => {
  const parsedParams = appointmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid appointment ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const accepted = await acceptPatientAppointmentRequest(user.id, parsedParams.data.appointmentId);
  if (!accepted) {
    res.status(404).json({ message: "Request not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.post("/appointments/:appointmentId/reject-request", async (req, res) => {
  const parsedParams = appointmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid appointment ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const rejected = await rejectPatientAppointmentRequest(user.id, parsedParams.data.appointmentId);
  if (!rejected) {
    res.status(404).json({ message: "Request not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.post("/appointments/:appointmentId/complete", async (req, res) => {
  const parsedParams = appointmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid appointment ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const completed = await completeAppointment(user.id, parsedParams.data.appointmentId);
  if (!completed) {
    res.status(404).json({ message: "Session not found or not eligible to complete" });
    return;
  }

  res.json({ ok: true });
});

appRouter.post("/appointments/:appointmentId/cancel", async (req, res) => {
  const parsedParams = appointmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid appointment ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const cancelled = await cancelAppointment(user.id, parsedParams.data.appointmentId);
  if (!cancelled) {
    res.status(404).json({ message: "Session not found or not eligible to cancel" });
    return;
  }

  res.json({ ok: true });
});

appRouter.post("/appointments/manual", async (req, res) => {
  const parsed = manualAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  let appointmentId: number;
  try {
    appointmentId = await createPsychologistAppointment(
      user.id,
      parsed.data.patientId,
      parsed.data.startsAt,
      parsed.data.durationMinutes,
      parsed.data.type
    );
  } catch (error) {
    if (error instanceof Error && error.message === "APPOINTMENT_OVERLAP") {
      res.status(409).json({ message: "Appointment overlaps with an existing session" });
      return;
    }
    console.error("Manual appointment creation error:", error);
    res.status(500).json({ message: "Failed to create appointment" });
    return;
  }

  res.status(201).json({ ok: true, appointmentId });
});

appRouter.patch("/appointments/:appointmentId", async (req, res) => {
  const parsedParams = appointmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid appointment ID" });
    return;
  }

  const parsedBody = updateAppointmentSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsedBody.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  let updated = false;
  try {
    updated = await updatePsychologistAppointment(user.id, parsedParams.data.appointmentId, {
      patientUserId: parsedBody.data.patientId,
      startsAt: parsedBody.data.startsAt,
      durationMinutes: parsedBody.data.durationMinutes,
      type: parsedBody.data.type
    });
  } catch (error) {
    if (error instanceof Error && error.message === "APPOINTMENT_OVERLAP") {
      res.status(409).json({ message: "Appointment overlaps with an existing session" });
      return;
    }
    console.error("Appointment update error:", error);
    res.status(500).json({ message: "Failed to update appointment" });
    return;
  }

  if (!updated) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.delete("/appointments/:appointmentId", async (req, res) => {
  const parsedParams = appointmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid appointment ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const deleted = await deletePsychologistAppointment(user.id, parsedParams.data.appointmentId);
  if (!deleted) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.post("/patients/attach", async (req, res) => {
  const parsed = attachPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  await attachPatientToPsychologist(user.id, parsed.data.patientId);
  res.status(201).json({ ok: true });
});

appRouter.post("/notes", async (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const noteId = await createProgressNote(user.id, {
    patientUserId: parsed.data.patientId,
    body: parsed.data.body,
    noteDate: parsed.data.noteDate,
    sessionNumber: parsed.data.sessionNumber,
    imageUrl: parsed.data.imageUrl
  });

  res.status(201).json({ ok: true, noteId });
});

appRouter.patch("/notes/:noteId", async (req, res) => {
  const parsedParams = noteIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid note ID" });
    return;
  }

  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const updated = await updateProgressNote(user.id, parsedParams.data.noteId, {
    patientUserId: parsed.data.patientId,
    body: parsed.data.body,
    noteDate: parsed.data.noteDate,
    sessionNumber: parsed.data.sessionNumber,
    imageUrl: parsed.data.imageUrl
  });

  if (!updated) {
    res.status(404).json({ message: "Note not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.delete("/notes/:noteId", async (req, res) => {
  const parsedParams = noteIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid note ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const deleted = await deleteProgressNote(user.id, parsedParams.data.noteId);
  if (!deleted) {
    res.status(404).json({ message: "Note not found" });
    return;
  }

  res.json({ ok: true });
});

appRouter.get("/analytics/:patientId", async (req, res) => {
  const parsedParams = analyticsPatientParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid patient ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  const analytics = await getPatientAnalytics(user.id, parsedParams.data.patientId);
  if (!analytics) {
    res.status(404).json({ message: "Patient not found" });
    return;
  }

  res.json(analytics);
});

appRouter.post("/analytics/:patientId/chat", async (req, res) => {
  const parsedParams = analyticsPatientParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid patient ID" });
    return;
  }

  const parsedBody = analyticsQuestionSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsedBody.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  try {
    const reply = await askPatientAnalyticsAssistant(user.id, parsedParams.data.patientId, parsedBody.data.question);
    res.status(201).json({ ok: true, reply });
  } catch (error) {
    if (error instanceof Error && error.message === "PATIENT_NOT_FOUND") {
      res.status(404).json({ message: "Patient not found" });
      return;
    }
    console.error("Analytics chat error:", error);
    res.status(500).json({ message: "Failed to process analytics question" });
  }
});

appRouter.post("/conversations/:patientId/read", async (req, res) => {
  const schema = z.object({ patientId: z.coerce.number().int().positive() });
  const parsed = schema.safeParse({ patientId: req.params.patientId });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid patient ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("psychologist")) {
    res.status(403).json({ message: "Psychologist access required" });
    return;
  }

  await markConversationRead(user.id, parsed.data.patientId);
  res.json({ ok: true });
});

appRouter.post("/conversations/therapists/:therapistId/read", async (req, res) => {
  const schema = z.object({ therapistId: z.coerce.number().int().positive() });
  const parsed = schema.safeParse({ therapistId: req.params.therapistId });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid therapist ID" });
    return;
  }

  const user = await findUserById(req.user!.id);
  if (!user || !user.roles.includes("patient")) {
    res.status(403).json({ message: "Patient access required" });
    return;
  }

  await markConversationReadForPatient(user.id, parsed.data.therapistId);
  res.json({ ok: true });
});

export { appRouter };
