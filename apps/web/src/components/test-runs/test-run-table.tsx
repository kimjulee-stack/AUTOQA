"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteToApi } from "@/lib/api";
import type { Project, TestRun } from "@/types";

function formatDate(date?: string) {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const statusColor: Record<string, string> = {
  정상: "var(--success)",
  "오류": "var(--danger)",
  경고: "var(--warn)",
  정지: "#90a4ae",
  장애: "#b0bec5",
  대기: "var(--text-muted)"
};

export function TestRunTable({ runs }: { runs: (TestRun & { project?: Project })[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(runs.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const visibleRuns = runs.slice(startIndex, startIndex + pageSize);
  const router = useRouter();

  useEffect(() => {
    setCurrentPage(1);
  }, [runs.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleDelete = async (runId: string) => {
    if (!confirm("이 테스트 실행을 삭제하시겠습니까?")) return;
    
    setDeletingId(runId);
    try {
      await deleteToApi(`/test-runs/${runId}`);
      router.refresh();
    } catch (error) {
      alert(`삭제 실패: ${(error as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>최근 테스트 실행</h3>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", fontSize: 13 }}>
            <th style={{ textAlign: "left", paddingBottom: 8 }}>ID</th>
            <th style={{ textAlign: "left" }}>Test Run</th>
            <th style={{ textAlign: "left" }}>프로젝트</th>
            <th style={{ textAlign: "left" }}>상태</th>
            <th style={{ textAlign: "left" }}>Device / OS</th>
            <th style={{ textAlign: "left" }}>실행일</th>
            <th style={{ textAlign: "left" }}>라벨</th>
            <th style={{ textAlign: "left", width: 80 }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {visibleRuns.map(run => (
            <tr key={run.id} style={{ borderTop: "1px solid var(--border)", fontSize: 14 }}>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>{run.id}</td>
              <td>{run.scenarioId}</td>
              <td>{run.project?.name ?? "-"}</td>
              <td>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: `${statusColor[run.status]}22`,
                    color: statusColor[run.status] ?? "var(--text-strong)",
                    fontWeight: 600
                  }}
                >
                  {run.status}
                </span>
              </td>
              <td>
                {run.device} / {run.os}
              </td>
              <td>{formatDate(run.startedAt)}</td>
              <td>{run.label ?? "-"}</td>
              <td>
                <button
                  onClick={() => handleDelete(run.id)}
                  disabled={deletingId === run.id}
                  style={{
                    padding: "4px 8px",
                    fontSize: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: deletingId === run.id ? "#f6f7fb" : "#fff",
                    color: deletingId === run.id ? "var(--text-muted)" : "#ef4444",
                    cursor: deletingId === run.id ? "not-allowed" : "pointer",
                    fontWeight: 600
                  }}
                >
                  {deletingId === run.id ? "삭제 중..." : "삭제"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {runs.length > pageSize && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 8 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {runs.length}개 중 {startIndex + 1} - {Math.min(startIndex + pageSize, runs.length)} 표시
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 12px",
                background: currentPage === 1 ? "#f3f4f6" : "#fff",
                color: currentPage === 1 ? "var(--text-muted)" : "var(--text-strong)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              이전
            </button>
            <div style={{ fontWeight: 600 }}>
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 12px",
                background: currentPage === totalPages ? "#f3f4f6" : "#fff",
                color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-strong)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


