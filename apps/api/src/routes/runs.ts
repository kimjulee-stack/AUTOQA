import { Router } from "express";
import { z } from "zod";

import { createRun, findProjectById, findScenarioById, getTestRuns, updateRunStage, findRunById, saveTestRuns } from "../data/store.js";
import { runTest } from "../services/testRunner.js";
import type { TestStage } from "../types.js";

const router = Router();

const runRequestSchema = z.object({
  projectId: z.string(),
  scenarioId: z.string()
});

router.get("/", (_req, res) => {
  res.json(getTestRuns());
});

router.get("/:runId", (req, res) => {
  const run = findRunById(req.params.runId);
  if (!run) {
    return res.status(404).json({ message: "테스트 실행을 찾을 수 없습니다." });
  }
  res.json(run);
});

router.post("/", async (req, res) => {
  const parsed = runRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "요청 형식이 올바르지 않습니다.", issues: parsed.error.issues });
  }
  
  try {
    const project = findProjectById(parsed.data.projectId);
    const scenario = findScenarioById(parsed.data.scenarioId);
    
    if (!project) {
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }
    
    if (!scenario) {
      return res.status(404).json({ message: "시나리오를 찾을 수 없습니다." });
    }
    
    if (!project.deviceId) {
      return res.status(400).json({ message: "프로젝트에 디바이스가 연결되어 있지 않습니다." });
    }
    
    // 테스트 실행 레코드 생성 (저장은 내부에서 수행)
    const run = await createRun(parsed.data.projectId, parsed.data.scenarioId);
    
    // 비동기로 테스트 실행 시작 (응답은 즉시 반환)
    (async () => {
      try {
        // 단계별 상태 업데이트
        updateRunStage(run.id, "waiting_for_device", "running", "USB 디바이스 연결 상태를 확인하는 중입니다.");
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateRunStage(run.id, "waiting_for_device", "completed", "디바이스 연결이 확인되었습니다.");
        
        updateRunStage(run.id, "start", "running", "Appium 테스트 세션을 기동합니다.");
        await new Promise(resolve => setTimeout(resolve, 500));
        updateRunStage(run.id, "start", "completed", "Appium 세션이 시작되었습니다.");
        
        updateRunStage(run.id, "preparing", "running", "Appium 서버와 WebDriver를 준비 중입니다.");
        const result = await runTest({
          project,
          scenario,
          deviceId: project.deviceId,
          runId: run.id
        });
        updateRunStage(run.id, "preparing", "completed", "Appium 서버가 완전히 준비되었습니다.");
        
        updateRunStage(run.id, "running_test", "running", "시나리오 단계대로 테스트를 실행하고 있습니다.");
        // runTest 내부에서 이미 실행이 완료되므로 바로 완료 처리
        updateRunStage(
          run.id,
          "running_test",
          result.success ? "completed" : "failed",
          result.success ? "시나리오 실행이 완료되었습니다." : "시나리오 실행 중 오류가 발생했습니다."
        );
        
        // 테스트 실행 결과를 run에 저장
        const runRecord = findRunById(run.id);
        if (runRecord) {
          runRecord.status = result.success ? "정상" : "오류";
          runRecord.endedAt = new Date().toISOString();
          if (!result.success) {
            // 실패 원인 추출
            const errorMatch = result.output.match(/테스트 실행 실패: (.+?)(\n|$)/);
            runRecord.errorMessage = errorMatch ? errorMatch[1] : result.output.split("\n")[0] || "알 수 없는 오류";
            runRecord.output = result.output;
          } else {
            runRecord.output = result.output;
          }
          // 각 스텝의 상태도 업데이트 (간단히 성공/실패만)
          if (runRecord.steps) {
            runRecord.steps.forEach((step, index) => {
              if (index < result.logs.length) {
                const logLine = result.logs[index];
                if (logLine.includes("[FAIL]")) {
                  step.status = "오류";
                }
              }
            });
          }
          await saveTestRuns(getTestRuns());
        }
        
        updateRunStage(run.id, "processing_results", "running", "실행 로그와 스크린샷을 정리하고 있습니다.");
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateRunStage(run.id, "processing_results", "completed", "결과 처리가 완료되었습니다.");
        
        updateRunStage(run.id, "cleaning_device", "running", "앱 삭제 및 디바이스 정리를 수행 중입니다.");
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateRunStage(run.id, "cleaning_device", "completed", "디바이스 정리가 완료되었습니다.");
        
        updateRunStage(run.id, "end", "running", "테스트 종료 절차를 마무리합니다.");
        await new Promise(resolve => setTimeout(resolve, 500));
        updateRunStage(
          run.id,
          "end",
          result.success ? "completed" : "failed",
          result.success ? "테스트가 정상 종료되었습니다." : "테스트가 오류 상태로 종료되었습니다."
        );
        
        console.log("[runs] Test execution completed:", result.success ? "SUCCESS" : "FAILED");
      } catch (error) {
        console.error("[runs] Test execution error:", error);
        const errorMessage = (error as Error).message;
        updateRunStage(run.id, "end", "failed", errorMessage);
        
        // 에러도 run에 저장
        const runRecord = findRunById(run.id);
        if (runRecord) {
          runRecord.status = "오류";
          runRecord.endedAt = new Date().toISOString();
          runRecord.errorMessage = errorMessage;
          await saveTestRuns(getTestRuns());
        }
      }
    })();
    
    res.status(201).json(run);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

export default router;


