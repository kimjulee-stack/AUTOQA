import { RunWorkspace } from "@/components/projects/run-workspace";
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
  params: { projectId: string };
  searchParams: SearchParams;
}) {
  const [project, runs, scenarios] = await Promise.all([
    getProjectById(params.projectId),
    fetchFromApi<TestRun[]>("/test-runs"),
    fetchFromApi<Scenario[]>("/scenarios")
  ]);
  
  // API에서 프로젝트를 찾지 못한 경우 placeholder 생성 (쿼리 파라미터 사용)
  const resolvedProject = project ?? createPlaceholderProject(params.projectId, searchParams);
  
  // 프로젝트 ID 표시용 (URL 파라미터에서 디코딩)
  const displayProjectId = (() => {
    try {
      return decodeURIComponent(params.projectId);
    } catch {
      return params.projectId;
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
        모바일 앱 &gt; <span style={{ color: "var(--text-strong)" }}>{resolvedProject.id || displayProjectId}</span>
      </nav>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{resolvedProject.name || resolvedProject.id || displayProjectId}</h1>
          <p style={{ color: "var(--text-muted)" }}>
            {resolvedProject.product || "제품 미지정"} · {(resolvedProject.platform || "web").toUpperCase()}
          </p>
        </div>
      </div>
      <div className="surface" style={{ padding: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 24, fontWeight: 600 }}>
          {["실행 결과", "Test Suites", "스케줄", "디바이스", "설정"].map(tab => (
            <span key={tab} style={{ color: tab === "실행 결과" ? "var(--primary-dark)" : "var(--text-muted)" }}>
              {tab}
            </span>
          ))}
        </div>
      </div>
      <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Test Suite Run 개요</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>최근 결과 기준</p>
          </div>
          <select
            defaultValue="24h"
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px", fontWeight: 600 }}
          >
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
          </select>
        </header>
        <div style={{ display: "flex", gap: 32 }}>
          <div style={{ flex: 1, minHeight: 180, background: "#f6f7fb", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>그래프 준비 중</span>
          </div>
          <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>총 실행 횟수</span>
              <strong>{summary.total}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>성공률</span>
              <strong>{summary.successRate}%</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>총 통과</span>
              <strong>{summary.success}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>총 실패</span>
              <strong>{summary.fail}</strong>
            </div>
          </div>
        </div>
      </section>
      <RunWorkspace
        projectId={resolvedProject.id}
        project={{
          deviceId: resolvedProject.deviceId,
          platform: resolvedProject.platform
        }}
        scenarios={scenarios}
        latestRuns={projectRuns}
      />

      <section className="surface" style={{ padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>최근 Test Suite Run</h3>
          <button style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px" }}>필터</button>
        </header>
        {projectRuns.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>아직 실행 기록이 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontSize: 13 }}>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>실행 ID</th>
                <th style={{ textAlign: "left" }}>시나리오</th>
                <th style={{ textAlign: "left" }}>상태</th>
                <th style={{ textAlign: "left" }}>디바이스</th>
                <th style={{ textAlign: "left" }}>시작 시각</th>
              </tr>
            </thead>
            <tbody>
              {projectRuns.map(run => (
                <tr key={run.id} style={{ borderTop: "1px solid var(--border)", fontSize: 14 }}>
                  <td style={{ padding: "10px 0", fontWeight: 600 }}>{run.id}</td>
                  <td>{run.scenarioId}</td>
                  <td>{run.status}</td>
                  <td>
                    {run.device} / {run.os}
                  </td>
                  <td>{new Date(run.startedAt).toLocaleString("ko-KR", { hour12: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

