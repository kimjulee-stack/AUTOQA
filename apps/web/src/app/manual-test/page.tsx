import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function ManualTestPage() {
  const allProjects = await fetchFromApiSafe<Project[]>("/projects", []);
  const projects = allProjects.filter(project => {
    const isMobileProject = project.platform === "android" || project.platform === "ios";
    if (!isMobileProject) return false;
    const subCategory = (project.subCategory ?? "").toLowerCase();
    const nameLower = project.name.toLowerCase();
    return subCategory === "manual" || nameLower.includes("manual");
  });

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>매뉴얼 테스트</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
          프로젝트를 선택하여 AI 기반 매뉴얼 테스트 케이스를 생성하고 결과를 추적하세요.
        </p>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}
