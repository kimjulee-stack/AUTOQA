import { Router } from "express";
import { z } from "zod";

import { addScenario, deleteScenario, findScenarioById, getScenarios, updateScenario } from "../data/store.js";

const router = Router();

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  no: z.number().optional(),
  locatorType: z.string().optional(),
  locator: z.string().optional(),
  inputText: z.string().optional(),
  sleep: z.number().optional(),
  skipOnError: z.boolean().optional(),
  mandatory: z.boolean().optional(),
  jumpIfVisibleType: z.string().optional(),
  jumpIfVisible: z.string().optional(),
  jumpToNo: z.number().optional(),
  visibleIfType: z.string().optional(),
  visibleIf: z.string().optional(),
  swipeStartX: z.number().optional(),
  swipeStartY: z.number().optional(),
  swipeEndX: z.number().optional(),
  swipeEndY: z.number().optional()
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  condition: z.string().optional()
});

const graphSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema)
});

const createScenarioSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  product: z.string(),
  platform: z.enum(["android", "ios"]),
  tags: z.array(z.string()).default([]),
  graph: graphSchema
});

router.get("/", (req, res) => {
  const { product } = req.query;
  let scenarios = getScenarios();
  
  // 제품별 필터링
  if (product && typeof product === "string") {
    scenarios = scenarios.filter(scenario => scenario.product === product);
  }
  
  res.json(scenarios);
});

router.post("/", async (req, res) => {
  const parsed = createScenarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "시나리오 데이터가 올바르지 않습니다.", issues: parsed.error.issues });
  }
  const scenario = await addScenario(parsed.data);
  res.status(201).json(scenario);
});

router.put("/:scenarioId", async (req, res) => {
  let scenarioId = req.params.scenarioId;
  try {
    scenarioId = decodeURIComponent(scenarioId);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  
  const existing = findScenarioById(scenarioId);
  if (!existing) {
    return res.status(404).json({ message: "시나리오를 찾을 수 없습니다." });
  }
  const parsed = createScenarioSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "시나리오 데이터가 올바르지 않습니다.", issues: parsed.error.issues });
  }
  const updated = await updateScenario(existing.id, parsed.data);
  res.json(updated);
});

router.delete("/:scenarioId", async (req, res) => {
  let scenarioId = req.params.scenarioId;
  try {
    scenarioId = decodeURIComponent(scenarioId);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  
  const success = await deleteScenario(scenarioId);
  if (!success) {
    return res.status(404).json({ message: "시나리오를 찾을 수 없습니다." });
  }
  res.status(204).send();
});

export default router;

