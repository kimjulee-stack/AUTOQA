import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApi } from "@/lib/api";
import type { Project } from "@/types";

export default async function MobileAppsPage() {
  const projects = await fetchFromApi<Project[]>("/projects");

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>모바일 앱</h1>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}




