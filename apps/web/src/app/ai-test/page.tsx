import { ProjectsPanel } from "@/components/projects/projects-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function AiTestPage() {
  const allProjects = await fetchFromApiSafe<Project[]>("/projects", []);
  // AI 테스트는 시나리오 테스트(android/ios), DB 테스트(web), UI 테스트, QR 테스트와 완전히 분리
  // 프로젝트 이름에 "ai" 또는 "ai-test"가 포함되고, 다른 테스트와 겹치지 않는 프로젝트만 표시
  const projects = allProjects.filter(p => {
    const nameLower = p.name.toLowerCase();
    const subCategory = (p.subCategory ?? "").toLowerCase();

    // 매뉴얼 테스트 프로젝트는 제외
    if (subCategory === "manual") {
      return false;
    }

    // AI 테스트 전용 프로젝트만 표시 (현재는 이름 기반)
    const isAiProject = nameLower.includes("ai") || nameLower.includes("ai-test");
    if (!isAiProject) return false;

    // 다른 테스트와 겹치지 않도록 필터링
    return (
      p.platform !== "web" && // DB 테스트와 겹치지 않도록
      !nameLower.includes("ui") && // UI 테스트와 겹치지 않도록
      !nameLower.includes("qr")
    ); // QR 테스트와 겹치지 않도록
  });

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>AI 테스트</h1>
      </header>
      <ProjectsPanel projects={projects} />
    </>
  );
}

