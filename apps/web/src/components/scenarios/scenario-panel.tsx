"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteToApi } from "@/lib/api";
import type { Scenario } from "@/types";

export function ScenarioPanel({ scenarios: initialScenarios }: { scenarios: Scenario[] }) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function handleDelete(scenarioId: string, scenarioName: string) {
    if (!confirm(`"${scenarioName}" 시나리오를 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(scenarioId);
    try {
      await deleteToApi(`/scenarios/${encodeURIComponent(scenarioId)}`);
      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
      router.refresh();
    } catch (error) {
      alert(`시나리오 삭제 실패: ${(error as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }
  const paginated = scenarios.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(1, Math.ceil(scenarios.length / pageSize));

  return (
    <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>시나리오 저장소 ({scenarios.length})</h2>
        </div>
        <button
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 16px",
            fontWeight: 600
          }}
        >
          시나리오 가져오기
        </button>
      </div>

      {scenarios.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            background: "#fafbff"
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 8 }}>저장된 시나리오가 없습니다.</p>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>시나리오 테스트에서 저장된 시나리오가 여기에 표시됩니다.</p>
        </div>
      ) : (
        <>
          <table>
            <thead style={{ color: "var(--text-muted)", fontSize: 13 }}>
              <tr>
                <th style={{ textAlign: "left", paddingBottom: 10 }}>시나리오</th>
                <th style={{ textAlign: "left" }}>제품명</th>
                <th style={{ textAlign: "left" }}>플랫폼</th>
                <th style={{ textAlign: "left" }}>버전</th>
                <th style={{ textAlign: "left" }}>업데이트</th>
                <th style={{ textAlign: "left", width: 120 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(scenario => (
                <tr
                  key={scenario.id}
                  style={{
                    borderTop: "1px solid var(--border)",
                    fontSize: 14
                  }}
                >
                  <td style={{ padding: "12px 0" }}>
                    <div style={{ fontWeight: 600 }}>{scenario.name}</div>
                    {scenario.description && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{scenario.description}</div>
                    )}
                    {scenario.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {scenario.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: "#f1f3f8",
                              fontSize: 11,
                              color: "var(--text-muted)"
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{scenario.product}</td>
                  <td>{scenario.platform.toUpperCase()}</td>
                  <td>v{scenario.version}</td>
                  <td>{new Date(scenario.updatedAt).toLocaleDateString("ko-KR")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "#fff",
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        편집
                      </button>
                      <button
                        onClick={() => handleDelete(scenario.id, scenario.name)}
                        disabled={deletingId === scenario.id}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "#fff",
                          fontSize: 12,
                          cursor: deletingId === scenario.id ? "not-allowed" : "pointer",
                          color: deletingId === scenario.id ? "var(--text-muted)" : "#ef4444"
                        }}
                      >
                        {deletingId === scenario.id ? "삭제 중..." : "삭제"}
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
                총 {scenarios.length}개 · {currentPage}/{totalPages}페이지
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
        </>
      )}
    </section>
  );
}


