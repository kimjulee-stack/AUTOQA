import { Router } from "express";
import { z } from "zod";

import {
  createAiTestSession,
  completeAiTestSession,
  getAiTestSessions,
  getAiChatMessages,
  addAiChatMessage,
  findAiTestSession,
  createAiTestResult,
  addAiResultScreenshot
} from "../data/store.js";

const router = Router();

router.get("/", (req, res) => {
  const { projectId } = req.query;
  const sessions = getAiTestSessions(projectId ? String(projectId) : undefined);
  res.json(sessions);
});

router.post("/", async (req, res) => {
  const schema = z.object({
    projectId: z.string(),
    name: z.string().optional()
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", errors: parseResult.error.errors });
  }

  try {
    const session = await createAiTestSession(parseResult.data.projectId, parseResult.data.name);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

router.post("/:sessionId/complete", async (req, res) => {
  const { sessionId } = req.params;
  const schema = z.object({
    summary: z.string().optional()
  });

  const parseResult = schema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", errors: parseResult.error.errors });
  }
  try {
    const session = await completeAiTestSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
    }
    await createAiTestResult(sessionId, parseResult.data.summary);
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

router.get("/:sessionId/messages", (req, res) => {
  const { sessionId } = req.params;
  const session = findAiTestSession(sessionId);
  if (!session) {
    return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
  }
  const messages = getAiChatMessages(sessionId);
  res.json(messages);
});

router.post("/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const session = findAiTestSession(sessionId);
  if (!session) {
    return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
  }

  const schema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1)
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", errors: parseResult.error.errors });
  }

  try {
    const message = await addAiChatMessage(sessionId, parseResult.data.role, parseResult.data.content);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

router.post("/:sessionId/screenshots", async (req, res) => {
  const { sessionId } = req.params;
  const session = findAiTestSession(sessionId);
  if (!session) {
    return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
  }

  const schema = z.object({
    imageUrl: z.string().min(1),
    note: z.string().optional()
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", errors: parseResult.error.errors });
  }

  try {
    const screenshot = await addAiResultScreenshot(sessionId, parseResult.data.imageUrl, parseResult.data.note);
    res.status(201).json(screenshot);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

export default router;



