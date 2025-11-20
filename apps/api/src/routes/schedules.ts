import { Router } from "express";
import { z } from "zod";

import { getSchedules, getSchedulesByDate, addSchedule, deleteSchedule, deleteScheduleByProjectAndDate } from "../data/store.js";

const router = Router();

const createScheduleSchema = z.object({
  projectId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)")
});

router.get("/", (req, res) => {
  const { date } = req.query;
  if (date && typeof date === "string") {
    const schedules = getSchedulesByDate(date);
    res.json(schedules);
  } else {
    res.json(getSchedules());
  }
});

router.post("/", async (req, res) => {
  const parsed = createScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", issues: parsed.error.issues });
  }

  try {
    const schedule = await addSchedule(parsed.data.projectId, parsed.data.date);
    res.status(201).json(schedule);
  } catch (error) {
    console.error("[schedules] 일정 추가 실패:", error);
    res.status(500).json({ message: "일정 추가에 실패했습니다." });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const deleted = await deleteSchedule(id);
  if (!deleted) {
    return res.status(404).json({ message: "일정을 찾을 수 없습니다." });
  }
  res.json({ success: true });
});

router.delete("/by-project-date", async (req, res) => {
  const parsed = createScheduleSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", issues: parsed.error.issues });
  }

  const deleted = await deleteScheduleByProjectAndDate(parsed.data.projectId, parsed.data.date);
  if (!deleted) {
    return res.status(404).json({ message: "일정을 찾을 수 없습니다." });
  }
  res.json({ success: true });
});

export default router;

