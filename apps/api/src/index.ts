import cors from "cors";
import express from "express";

import { initializeStore } from "./data/store.js";
import dashboardRouter from "./routes/dashboard.js";
import devicesRouter from "./routes/devices.js";
import locatorsRouter from "./routes/locators.js";
import projectsRouter from "./routes/projects.js";
import runsRouter from "./routes/runs.js";
import scenariosRouter from "./routes/scenarios.js";
import schedulesRouter from "./routes/schedules.js";
import testRunsRouter from "./routes/testRuns.js";
import aiTestSessionsRouter from "./routes/aiTestSessions.js";
import aiTestResultsRouter from "./routes/aiTestResults.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

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

app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error(err);
  res.status(500).json({ message: "알 수 없는 오류가 발생했습니다." });
});

// 서버 시작 전 데이터 로드
initializeStore().then(() => {
  app.listen(PORT, () => {
    console.log(`[api] server listening on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("[api] 데이터 초기화 실패:", err);
  process.exit(1);
});

