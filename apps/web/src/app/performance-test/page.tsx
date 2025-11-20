import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function PerformanceTestPage() {
  const projects = await fetchFromApiSafe<Project[]>("/projects", []);

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>성능 테스트</h1>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}

