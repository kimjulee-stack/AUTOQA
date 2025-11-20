import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function UiTestPage() {
  const allProjects = await fetchFromApiSafe<Project[]>("/projects", []);
  // UI 테스트는 시나리오 테스트(android/ios), DB 테스트(web), QR 테스트와 분리
  // 프로젝트 이름에 "ui" 또는 "UI"가 포함된 프로젝트만 표시
  const projects = allProjects.filter(p => {
    const nameLower = p.name.toLowerCase();
    // 시나리오 테스트(android/ios), DB 테스트(web)와 겹치지 않도록
    // UI 테스트 전용 프로젝트만 표시
    return (nameLower.includes("ui") || nameLower.includes("ui-test")) && 
           p.platform !== "web"; // DB 테스트와 겹치지 않도록
  });

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>UI 테스트</h1>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}

