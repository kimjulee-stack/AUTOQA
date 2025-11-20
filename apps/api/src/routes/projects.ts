import { Router } from "express";
import { z } from "zod";

import { addProject, deleteProject, findProjectById, getDevices, getProjects, updateProject } from "../data/store.js";

const router = Router();

const createProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  product: z.string().min(2),
  platform: z.enum(["android", "ios", "web"]),
  bundleId: z.string().optional(),
  deviceId: z.string().optional()
});

router.get("/", (_req, res) => {
  res.json(getProjects());
});

router.get("/:projectId", (req, res) => {
  // 프로젝트 ID 디코딩 시도
  let projectId = req.params.projectId;
  try {
    projectId = decodeURIComponent(projectId);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  const project = findProjectById(projectId);
  if (!project) {
    return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
  }
  res.json(project);
});

router.post("/", async (req, res) => {
  const result = createProjectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "유효하지 않은 요청입니다.", issues: result.error.issues });
  }
  let deviceName: string | undefined;
  if (result.data.deviceId) {
    const devices = await getDevices();
    const selected = devices.find(device => device.id === result.data.deviceId);
    if (!selected) {
      return res.status(400).json({ message: "선택한 단말기를 찾을 수 없습니다." });
    }
    deviceName = selected.name;
  }
  const project = await addProject({ ...result.data, deviceName });
  res.status(201).json(project);
});

router.put("/:projectId", async (req, res) => {
  const result = createProjectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "유효하지 않은 요청입니다.", issues: result.error.issues });
  }
  
  // 프로젝트 ID 디코딩 시도
  let projectId = req.params.projectId;
  try {
    projectId = decodeURIComponent(projectId);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  
  let deviceName: string | undefined;
  if (result.data.deviceId) {
    const devices = await getDevices();
    const selected = devices.find(device => device.id === result.data.deviceId);
    if (!selected) {
      return res.status(400).json({ message: "선택한 단말기를 찾을 수 없습니다." });
    }
    deviceName = selected.name;
  }
  const updated = await updateProject(projectId, { ...result.data, deviceName });
  if (!updated) {
    // 디버깅을 위해 모든 프로젝트 ID 목록 반환
    const allProjects = getProjects();
    return res.status(404).json({ 
      message: "프로젝트를 찾을 수 없습니다.",
      requestedId: projectId,
      availableIds: allProjects.map(p => p.id)
    });
  }
  res.json(updated);
});

router.delete("/:projectId", async (req, res) => {
  // 프로젝트 ID 디코딩 시도
  let projectId = req.params.projectId;
  try {
    projectId = decodeURIComponent(projectId);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  const deleted = await deleteProject(projectId);
  if (!deleted) {
    return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
  }
  res.status(204).send();
});

export default router;

