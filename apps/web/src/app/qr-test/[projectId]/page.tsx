import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";
import { QrTestTabs } from "@/components/qr-test/qr-test-tabs";

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
    platform: platform || "android",
    bundleId: bundleId || "",
    totalRuns: 0
  };
}

async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projects = await fetchFromApiSafe<Project[]>("/projects", []);
    return projects.find(p => p.id === projectId) || null;
  } catch (error) {
    console.warn("프로젝트 조회 실패:", error);
    return null;
  }
}

export default async function QrTestProjectPage({
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
  
  try {
    project = await getProjectById(resolvedParams.projectId);
  } catch (error) {
    console.warn("프로젝트 조회 실패:", error);
  }
  
  const resolvedProject = project ?? createPlaceholderProject(resolvedParams.projectId, resolvedSearchParams);
  
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
        QR 테스트 &gt; <span style={{ color: "var(--text-strong)" }}>{resolvedProject.name || displayProjectId}</span>
      </nav>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{resolvedProject.name}</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
            {resolvedProject.product || "제품 미지정"} · {(resolvedProject.platform || "android").toUpperCase()}
          </p>
        </div>
      </div>
      <QrTestTabs project={resolvedProject} />
    </>
  );
}

