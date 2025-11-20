import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import serverless from "serverless-http";

// Express 앱 초기화는 함수 외부에서 한 번만 수행 (Lambda 재사용)
let app: Express | null = null;
let handler: ReturnType<typeof serverless> | null = null;

async function initializeApp(): Promise<Express> {
  if (app) return app;

  // ES 모듈 동적 import
  const { initializeStore } = await import("../../apps/api/dist/data/store.js");
  const dashboardRouter = (await import("../../apps/api/dist/routes/dashboard.js")).default;
  const devicesRouter = (await import("../../apps/api/dist/routes/devices.js")).default;
  const locatorsRouter = (await import("../../apps/api/dist/routes/locators.js")).default;
  const projectsRouter = (await import("../../apps/api/dist/routes/projects.js")).default;
  const runsRouter = (await import("../../apps/api/dist/routes/runs.js")).default;
  const scenariosRouter = (await import("../../apps/api/dist/routes/scenarios.js")).default;
  const schedulesRouter = (await import("../../apps/api/dist/routes/schedules.js")).default;
  const testRunsRouter = (await import("../../apps/api/dist/routes/testRuns.js")).default;
  const aiTestSessionsRouter = (await import("../../apps/api/dist/routes/aiTestSessions.js")).default;
  const aiTestResultsRouter = (await import("../../apps/api/dist/routes/aiTestResults.js")).default;

  app = express();
  
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/dashboard", dashboardRouter);
  app.use("/devices", devicesRouter);
  app.use("/locators", locatorsRouter);
  app.use("/projects", projectsRouter);
  app.use("/scenarios", scenariosRouter);
  app.use("/schedules", schedulesRouter);
  app.use("/runs", runsRouter);
  app.use("/test-runs", testRunsRouter);
  app.use("/ai-test-sessions", aiTestSessionsRouter);
  app.use("/ai-test-results", aiTestResultsRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "알 수 없는 오류가 발생했습니다." });
  });

  // 데이터 초기화
  await initializeStore();

  return app;
}

export const handler = async (event: any, context: any) => {
  // Lambda 함수가 재사용될 수 있으므로 컨텍스트 재사용 방지
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    if (!app) {
      app = await initializeApp();
    }

    if (!handler) {
      handler = serverless(app);
    }

    return await handler(event, context);
  } catch (error) {
    console.error("Netlify Function 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "서버 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      })
    };
  }
};

