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
  return (
    <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>시나리오 저장소</h2>
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
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 8 }}>
            저장된 시나리오가 없습니다.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            시나리오 테스트에서 시나리오를 생성하고 저장하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden"
            }}
          >
            {/* 테이블 헤더 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
                gap: 16,
                padding: "12px 16px",
                background: "#f8f9fa",
                borderBottom: "1px solid var(--border)",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--text-muted)"
              }}
            >
              <div>시나리오명</div>
              <div>제품</div>
              <div>플랫폼</div>
              <div>버전</div>
              <div>업데이트</div>
              <div style={{ textAlign: "center" }}>작업</div>
            </div>
            {/* 리스트 아이템 */}
            {scenarios
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map(scenario => (
                <div
                  key={scenario.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
                    gap: 16,
                    padding: "16px",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f6f7fb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {scenario.name}
                    </div>
                    {scenario.description && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {scenario.description}
                      </div>
                    )}
                    {scenario.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {scenario.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: "#f1f3f8",
                              fontSize: 11,
                              fontWeight: 500
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13 }}>{scenario.product}</div>
                  <div style={{ fontSize: 13, textTransform: "uppercase" }}>{scenario.platform}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>v{scenario.version}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(scenario.updatedAt).toLocaleDateString("ko-KR")}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px dashed var(--border)",
                        fontWeight: 600,
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 12
                      }}
                    >
                      편집
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id, scenario.name)}
                      disabled={deletingId === scenario.id}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        fontWeight: 600,
                        background: deletingId === scenario.id ? "#ddd" : "#fff",
                        color: deletingId === scenario.id ? "#999" : "var(--danger)",
                        cursor: deletingId === scenario.id ? "not-allowed" : "pointer",
                        fontSize: 12
                      }}
                    >
                      {deletingId === scenario.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {/* 페이지네이션 */}
          {scenarios.length > pageSize && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 16
              }}
            >
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: currentPage === 1 ? "#f5f5f5" : "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  color: currentPage === 1 ? "#999" : "var(--text)",
                  fontWeight: 600
                }}
              >
                이전
              </button>
              {Array.from({ length: Math.ceil(scenarios.length / pageSize) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: currentPage === page ? "var(--primary)" : "#fff",
                    color: currentPage === page ? "#fff" : "var(--text)",
                    cursor: "pointer",
                    fontWeight: 600,
                    minWidth: 40
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(scenarios.length / pageSize), prev + 1))}
                disabled={currentPage === Math.ceil(scenarios.length / pageSize)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: currentPage === Math.ceil(scenarios.length / pageSize) ? "#f5f5f5" : "#fff",
                  cursor: currentPage === Math.ceil(scenarios.length / pageSize) ? "not-allowed" : "pointer",
                  color: currentPage === Math.ceil(scenarios.length / pageSize) ? "#999" : "var(--text)",
                  fontWeight: 600
                }}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}


