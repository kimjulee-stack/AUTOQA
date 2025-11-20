import { ProjectTabs } from "@/components/projects/project-tabs";
import { fetchFromApi } from "@/lib/api";
import type { Project, Scenario, TestRun } from "@/types";

function getSummary(runs: TestRun[]) {
  const total = runs.length;
  const success = runs.filter(run => run.status === "정상").length;
  const fail = runs.filter(run => run.status !== "정상" && run.status !== "대기").length;

  return {
    total,
    successRate: total ? Math.round((success / total) * 100) : 0,
    success,
    fail
  };
}

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeParam(value?: string | string[]) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function createPlaceholderProject(projectId: string, fallback?: SearchParams): Project {
  const decoded = (() => {
    try {
      return decodeURIComponent(projectId);
    } catch {
      return projectId;
    }
  })();
  
  const name = normalizeParam(fallback?.name);
  const product = normalizeParam(fallback?.product);
  const platform = normalizeParam(fallback?.platform) as Project["platform"] | undefined;
  const bundleId = normalizeParam(fallback?.bundleId);
  
  return {
    id: projectId,
    name: name || decoded,
    product: product || "제품 미지정",
    platform: platform || "web",
    totalRuns: 0,
    scheduleStatus: "-",
    bundleId: bundleId
  };
}

async function getProjectById(projectId: string) {
  try {
    // Next.js가 이미 디코딩한 projectId를 그대로 사용
    return await fetchFromApi<Project>(`/projects/${projectId}`);
  } catch {
    // 404인 경우 null 반환 (placeholder 사용)
    return null;
  }
}

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: { projectId: string } | Promise<{ projectId: string }>;
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  // params가 Promise인 경우 await 처리
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  if (!resolvedParams?.projectId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>프로젝트를 찾을 수 없습니다.</h1>
        <p>프로젝트 ID가 제공되지 않았습니다.</p>
      </div>
    );
  }
  
  let project: Project | null = null;
  let runs: TestRun[] = [];
  let allScenarios: Scenario[] = [];
  
  try {
    project = await getProjectById(resolvedParams.projectId);
  } catch (error) {
    console.warn("프로젝트 조회 실패:", error);
  }
  
  try {
    runs = await fetchFromApi<TestRun[]>("/test-runs");
  } catch (error) {
    console.warn("테스트 실행 목록 조회 실패:", error);
  }
  
  try {
    allScenarios = await fetchFromApi<Scenario[]>("/scenarios");
  } catch (error) {
    console.warn("시나리오 목록 조회 실패:", error);
  }
  
  // API에서 프로젝트를 찾지 못한 경우 placeholder 생성 (쿼리 파라미터 사용)
  const resolvedProject = project ?? createPlaceholderProject(resolvedParams.projectId, resolvedSearchParams);
  
  // 제품별 시나리오 필터링
  const scenarios = resolvedProject.product 
    ? allScenarios.filter(s => s.product === resolvedProject.product)
    : [];
  
  // 프로젝트 ID 표시용 (URL 파라미터에서 디코딩)
  const displayProjectId = (() => {
    try {
      return decodeURIComponent(resolvedParams.projectId);
    } catch {
      return resolvedParams.projectId;
    }
  })();

  const projectRuns = runs
    .filter(run => run.projectId === resolvedProject.id)
    .map(run => ({
      ...run,
      steps: run.steps ?? []
    }));
  const summary = getSummary(projectRuns);

  return (
    <>
      <nav style={{ fontSize: 14, color: "var(--text-muted)" }}>
            시나리오 테스트 &gt; <span style={{ color: "var(--text-strong)" }}>{resolvedProject.id || displayProjectId}</span>
      </nav>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{resolvedProject.name || resolvedProject.id || displayProjectId}</h1>
          <p style={{ color: "var(--text-muted)" }}>
            {resolvedProject.product || "제품 미지정"} · {(resolvedProject.platform || "web").toUpperCase()}
          </p>
        </div>
      </div>
      <ProjectTabs
        projectId={resolvedProject.id}
        project={{
          deviceId: resolvedProject.deviceId,
          platform: resolvedProject.platform,
          product: resolvedProject.product,
          subCategory: resolvedProject.subCategory
        }}
        scenarios={scenarios}
        latestRuns={projectRuns}
        summary={summary}
        projectRuns={projectRuns}
      />
    </>
  );
}

