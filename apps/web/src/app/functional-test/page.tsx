import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function FunctionalTestPage() {
  const allProjects = await fetchFromApiSafe<Project[]>("/projects", []);
  // 시나리오 테스트는 android/ios 프로젝트만 표시하되, 다른 테스트와 겹치지 않도록 필터링
  const projects = allProjects.filter(p => {
    const nameLower = p.name.toLowerCase();
    // android/ios 프로젝트 중에서
    const isMobileProject = p.platform === "android" || p.platform === "ios";
    if (!isMobileProject) return false;
    
    // 다른 테스트 전용 프로젝트는 제외
    return !nameLower.includes("ai") && // AI 테스트와 겹치지 않도록
           !nameLower.includes("ui") && // UI 테스트와 겹치지 않도록
           !nameLower.includes("qr"); // QR 테스트와 겹치지 않도록
  });

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>시나리오 테스트</h1>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}

