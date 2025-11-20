import { Router } from "express";

import {
  getAiTestResults,
  findAiTestResultById,
  getAiChatMessages,
  deleteAiTestResult
} from "../data/store.js";

const router = Router();

router.get("/", (req, res) => {
  const { projectId } = req.query;
  const results = getAiTestResults(projectId ? String(projectId) : undefined);
  res.json(results);
});

router.get("/:resultId", (req, res) => {
  const { resultId } = req.params;
  const result = findAiTestResultById(resultId);
  if (!result) {
    return res.status(404).json({ message: "결과를 찾을 수 없습니다." });
  }
  const messages = getAiChatMessages(result.sessionId);
  res.json({ ...result, messages });
});

router.delete("/:resultId", async (req, res) => {
  const { resultId } = req.params;
  const deleted = await deleteAiTestResult(resultId);
  if (!deleted) {
    return res.status(404).json({ message: "결과를 찾을 수 없습니다." });
  }
  res.status(204).send();
});

export default router;

