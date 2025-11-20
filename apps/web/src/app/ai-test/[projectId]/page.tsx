import { fetchFromApi, fetchFromApiSafe } from "@/lib/api";
import type { Project, TestRun } from "@/types";
import { AiTestTabs } from "@/components/ai-test/ai-test-tabs";

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
    bundleId: bundleId || "",
    totalRuns: 0
  };
}

async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projects = await fetchFromApi<Project[]>("/projects");
    return projects.find(p => p.id === projectId) || null;
  } catch (error) {
    console.warn("프로젝트 조회 실패:", error);
    return null;
  }
}

export default async function AiTestProjectPage({
  params,
  searchParams
}: {
  params: { projectId: string } | Promise<{ projectId: string }>;
  searchParams: SearchParams | Promise<SearchParams>;
}) {
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
  
  const resolvedProject = project ?? createPlaceholderProject(resolvedParams.projectId, resolvedSearchParams);
  
  const projectRuns = runs
    .filter(run => run.projectId === resolvedProject.id)
    .map(run => ({
      ...run,
      steps: run.steps ?? []
    }));

  const summary = {
    total: projectRuns.length,
    successRate: projectRuns.length 
      ? Math.round((projectRuns.filter(run => run.status === "정상").length / projectRuns.length) * 100)
      : 0,
    success: projectRuns.filter(run => run.status === "정상").length,
    fail: projectRuns.filter(run => run.status !== "정상" && run.status !== "대기").length
  };

  const displayProjectId = (() => {
    try {
      return decodeURIComponent(resolvedParams.projectId);
    } catch {
      return resolvedParams.projectId;
    }
  })();

  return (
    <>
      <nav style={{ fontSize: 14, color: "var(--text-muted)" }}>
        <a href="/ai-test" style={{ color: "var(--primary)", textDecoration: "none" }}>
          AI 테스트
        </a>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>{resolvedProject.name}</span>
      </nav>
      <header style={{ marginTop: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{resolvedProject.name}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          {resolvedProject.product || "제품 미지정"} · {(resolvedProject.platform || "web").toUpperCase()}
        </p>
      </header>
      <AiTestTabs
        project={resolvedProject}
      />
    </>
  );
}

