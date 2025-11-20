import { DashboardSummaryCard } from "@/components/dashboard/summary-card";
import { TestRunTable } from "@/components/test-runs/test-run-table";
import { fetchFromApiSafe } from "@/lib/api";
import type { DashboardSummary, Project, TestRun, Schedule } from "@/types";

async function getInitialData() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  
  const [dashboard, projects, testRuns, schedules] = await Promise.all([
    fetchFromApiSafe<DashboardSummary>("/dashboard", {
      totalRuns: 0,
      totalDuration: 0,
      statusCounts: {
        정상: 0,
        "오류": 0,
        경고: 0,
        정지: 0,
        장애: 0,
        대기: 0
      },
      failedSteps: []
    }),
    fetchFromApiSafe<Project[]>("/projects", []),
    fetchFromApiSafe<TestRun[]>("/test-runs", []),
    fetchFromApiSafe<Schedule[]>(`/schedules?date=${todayStr}`, [])
  ]);

  const runsWithProjects = testRuns.map(run => ({
    ...run,
    project: projects.find(project => project.id === run.projectId)
  }));

  // 오늘 날짜의 일정에 해당하는 프로젝트만 필터링
  const todayScheduledProjectIds = schedules.map(s => s.projectId);
  const todayProjects = projects.filter(p => todayScheduledProjectIds.includes(p.id));

  return { dashboard, runsWithProjects, projects, todayProjects };
}

export default async function Home() {
  const { dashboard, runsWithProjects, projects, todayProjects } = await getInitialData();
  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>대시보드</h1>
      </header>
      <DashboardSummaryCard summary={dashboard} projects={todayProjects} />
      <TestRunTable runs={runsWithProjects} />
    </>
  );
}
