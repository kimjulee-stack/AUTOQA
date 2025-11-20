import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function DbTestPage() {
  const allProjects = await fetchFromApiSafe<Project[]>("/projects", []);
  // DB 테스트는 platform이 "web"인 프로젝트만 필터링
  const projects = allProjects.filter(p => p.platform === "web");

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>DB 테스트</h1>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}
