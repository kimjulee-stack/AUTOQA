import { Router } from "express";

import { deleteTestRun, getTestRuns } from "../data/store.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getTestRuns());
});

router.delete("/:runId", async (req, res) => {
  const { runId } = req.params;
  const deleted = await deleteTestRun(runId);
  if (!deleted) {
    return res.status(404).json({ message: "테스트 실행을 찾을 수 없습니다." });
  }
  res.json({ message: "테스트 실행이 삭제되었습니다." });
});

export default router;


