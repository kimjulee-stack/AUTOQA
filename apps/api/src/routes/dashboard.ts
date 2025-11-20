import { Router } from "express";

import { getDashboardSummary } from "../data/store.js";

const router = Router();

router.get("/", (_req, res) => {
  const summary = getDashboardSummary();
  res.json(summary);
});

export default router;






