"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CreateProjectDialog } from "./create-project-dialog";
import { deleteToApi } from "@/lib/api";

import type { Project } from "@/types";

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString("ko-KR", { hour12: false });
}

export function ProjectsPanel({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.max(1, Math.ceil(projects.length / ITEMS_PER_PAGE));

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return projects.slice(start, start + ITEMS_PER_PAGE);
  }, [projects, currentPage]);

  // 프로젝트 목록 변경 시 페이지 보정
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [projects.length, totalPages]);

  const handleRowClick = (project: Project, event: React.MouseEvent) => {
    // 버튼 클릭 시에는 행 클릭 이벤트 무시
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    // 기능 테스트만 상세 페이지로 이동, 나머지는 아무 동작 안 함
    if (pathname.startsWith("/functional-test")) {
      const slug = project.id ?? encodeURIComponent(project.name.toLowerCase());
      const query = new URLSearchParams({
        name: project.name,
        product: project.product,
        platform: project.platform,
        bundleId: project.bundleId ?? ""
      });
      router.push(`/functional-test/${slug}?${query.toString()}`);
    }
    // AI 테스트는 상세 페이지로 이동
    if (pathname.startsWith("/ai-test")) {
      const slug = project.id ?? encodeURIComponent(project.name.toLowerCase());
      const query = new URLSearchParams({
        name: project.name,
        product: project.product,
        platform: project.platform,
        bundleId: project.bundleId ?? ""
      });
      router.push(`/ai-test/${slug}?${query.toString()}`);
    }
    // UI 테스트, DB 테스트, 성능 테스트는 상세 페이지가 없으므로 클릭해도 동작하지 않음
  };

  const handleEdit = (project: Project, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingProject(project);
  };

  const handleDelete = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm("정말 이 프로젝트를 삭제하시겠습니까?")) {
      setDeletingProjectId(projectId);
      startDeleteTransition(async () => {
        try {
          await deleteToApi(`/projects/${projectId}`);
          router.refresh();
        } catch (err) {
          alert((err as Error).message);
        } finally {
          setDeletingProjectId(null);
        }
      });
    }
  };

  return (
    <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>모바일 앱 ({projects.length})</h2>
        </div>
        <CreateProjectDialog
          trigger={
            <button
              style={{
                background: "var(--primary)",
                color: "#1c1d21",
                padding: "10px 16px",
                borderRadius: 12,
                fontWeight: 700
              }}
            >
              프로젝트 생성
            </button>
          }
        />
      </div>
      <table>
        <thead style={{ color: "var(--text-muted)", fontSize: 13 }}>
          <tr>
            <th style={{ textAlign: "left", paddingBottom: 10 }}>프로젝트</th>
            <th style={{ textAlign: "left" }}>제품명</th>
            <th style={{ textAlign: "left" }}>연결 단말</th>
            <th style={{ textAlign: "left" }}>총 실행 수</th>
            <th style={{ textAlign: "left" }}>스케줄 상태</th>
            <th style={{ textAlign: "left" }}>마지막 실행일</th>
            <th style={{ textAlign: "left", width: 120 }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProjects.map(project => (
            <tr
              key={project.id}
              onClick={e => handleRowClick(project, e)}
              style={{
                borderTop: "1px solid var(--border)",
                fontSize: 14,
                cursor: pathname.startsWith("/functional-test") || pathname.startsWith("/ai-test") ? "pointer" : "default"
              }}
            >
              <td style={{ padding: "12px 0", fontWeight: 600 }}>
                {project.name}
              </td>
              <td>{project.product}</td>
              <td>{project.deviceName ?? "-"}</td>
              <td>{project.totalRuns}</td>
              <td>{project.scheduleStatus ?? "-"}</td>
              <td>{formatDate(project.lastRunAt)}</td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={e => handleEdit(project, e)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "#fff",
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={e => handleDelete(project.id, e)}
                    disabled={isDeleting && deletingProjectId === project.id}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "#fff",
                      fontSize: 12,
                      cursor: isDeleting && deletingProjectId === project.id ? "not-allowed" : "pointer",
                      color: isDeleting && deletingProjectId === project.id ? "var(--text-muted)" : "#ef4444"
                    }}
                  >
                    {isDeleting && deletingProjectId === project.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            fontSize: 13,
            color: "var(--text-muted)"
          }}
        >
          <span>
            총 {projects.length}개 · {currentPage}/{totalPages}페이지
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: currentPage === 1 ? "#f3f4f6" : "#fff",
                cursor: currentPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              이전
            </button>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={`page-${page}`}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: currentPage === page ? "var(--primary-light)" : "#fff",
                      fontWeight: currentPage === page ? 700 : 500,
                      cursor: currentPage === page ? "default" : "pointer"
                    }}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: currentPage === totalPages ? "#f3f4f6" : "#fff",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
              }}
            >
              다음
            </button>
          </div>
        </div>
      )}
      {editingProject && (
        <CreateProjectDialog
          trigger={<span style={{ display: "none" }} />}
          project={editingProject}
          onSuccess={() => {
            setEditingProject(undefined);
          }}
        />
      )}
    </section>
  );
}
