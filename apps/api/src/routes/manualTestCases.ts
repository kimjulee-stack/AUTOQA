import { Router } from "express";
import { z } from "zod";

import {
  createManualTestCases,
  deleteManualTestCase,
  findManualTestCase,
  findManualTestSession,
  getManualTestCases,
  updateManualTestCase
} from "../data/store.js";

const router = Router();

router.get("/", (req, res) => {
  const { sessionId, projectId } = req.query;
  const cases = getManualTestCases({
    sessionId: sessionId ? String(sessionId) : undefined,
    projectId: projectId ? String(projectId) : undefined
  });
  res.json(cases);
});

router.get("/:caseId", (req, res) => {
  const { caseId } = req.params;
  const testCase = findManualTestCase(caseId);
  if (!testCase) {
    return res.status(404).json({ message: "테스트 케이스를 찾을 수 없습니다." });
  }
  res.json(testCase);
});

router.post("/", async (req, res) => {
  const schema = z.object({
    sessionId: z.string(),
    cases: z
      .array(
        z.object({
          title: z.string().min(1, "테스트 케이스 제목이 필요합니다."),
          objective: z.string().optional(),
          preconditions: z.string().optional(),
          steps: z.array(z.string()).optional(),
          expectedResult: z.string().optional(),
          notes: z.string().optional(),
          aiSummary: z.string().optional()
        })
      )
      .min(1)
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", errors: parseResult.error.errors });
  }

  const { sessionId, cases } = parseResult.data;
  const session = findManualTestSession(sessionId);
  if (!session) {
    return res.status(404).json({ message: "세션을 찾을 수 없습니다." });
  }

  try {
    const created = await createManualTestCases(sessionId, cases);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

router.put("/:caseId", async (req, res) => {
  const { caseId } = req.params;
  const existing = findManualTestCase(caseId);
  if (!existing) {
    return res.status(404).json({ message: "테스트 케이스를 찾을 수 없습니다." });
  }

  const schema = z.object({
    title: z.string().optional(),
    objective: z.string().optional(),
    preconditions: z.string().optional(),
    steps: z.array(z.string()).optional(),
    expectedResult: z.string().optional(),
    notes: z.string().optional(),
    aiSummary: z.string().optional(),
    verificationResult: z.enum(["P", "F", "NT", "N"]).optional(),
    btsId: z.string().optional(),
    reporterNote: z.string().optional()
  });

  const parseResult = schema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", errors: parseResult.error.errors });
  }

  try {
    const updated = await updateManualTestCase(caseId, parseResult.data);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

router.delete("/:caseId", async (req, res) => {
  const { caseId } = req.params;
  const deleted = await deleteManualTestCase(caseId);
  if (!deleted) {
    return res.status(404).json({ message: "테스트 케이스를 찾을 수 없습니다." });
  }
  res.status(204).send();
});

export default router;

