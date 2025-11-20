"use client";

import { useCallback, useMemo, useState } from "react";

import { ManualTestWorkspace } from "./manual-test-workspace";
import type { ManualTestCase, ManualTestSession, Project } from "@/types";
import { useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type Tab = "테스트 실행" | "실행 결과";

interface ManualTestTabsProps {
  project: Project;
}

interface ResultsSummary {
  label: string;
  value: number;
  description: string;
}

export function ManualTestTabs({ project }: ManualTestTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("테스트 실행");
  const [resultsRefreshKey, setResultsRefreshKey] = useState(0);

  const handleCasesChange = useCallback((_cases: ManualTestCase[]) => {
    setResultsRefreshKey(prev => prev + 1);
  }, []);

  return (
    <>
      <div className="surface" style={{ padding: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 24, fontWeight: 600 }}>
          {(["테스트 실행", "실행 결과"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === tab ? "var(--primary-dark)" : "var(--text-muted)",
                padding: 0
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "테스트 실행" && (
        <ManualTestWorkspace project={project} onCasesChange={handleCasesChange} />
      )}
      {activeTab === "실행 결과" && <ManualTestResultsPanel project={project} refreshKey={resultsRefreshKey} />}
    </>
  );
}

function ManualTestResultsPanel({ project, refreshKey }: { project: Project; refreshKey: number }) {
  const [cases, setCases] = useState<ManualTestCase[]>([]);
  const [sessions, setSessions] = useState<Record<string, ManualTestSession>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!project.id) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [casesRes, sessionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/manual-test-cases?projectId=${encodeURIComponent(project.id)}`),
          fetch(`${API_BASE_URL}/manual-test-sessions?projectId=${encodeURIComponent(project.id)}`)
        ]);
        if (!casesRes.ok || !sessionsRes.ok) {
          throw new Error("실행 결과를 불러오지 못했습니다.");
        }
        const [casesData, sessionsData] = await Promise.all([
          casesRes.json() as Promise<ManualTestCase[]>,
          sessionsRes.json() as Promise<ManualTestSession[]>
        ]);
        if (!cancelled) {
          setCases(casesData);
          setSessions(
            sessionsData.reduce<Record<string, ManualTestSession>>((acc, session) => {
              acc[session.id] = session;
              return acc;
            }, {})
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setCases([]);
          setSessions({});
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [project.id, refreshKey]);

  const summary: ResultsSummary[] = useMemo(() => {
    const counts: Record<string, number> = { 전체: cases.length, P: 0, F: 0, NT: 0, N: 0 };
    cases.forEach(testCase => {
      if (testCase.verificationResult) {
        counts[testCase.verificationResult] = (counts[testCase.verificationResult] || 0) + 1;
      }
    });
    return [
      { label: "전체 케이스", value: counts["전체"], description: "생성된 총 케이스 수" },
      { label: "Pass (P)", value: counts.P || 0, description: "성공한 케이스" },
      { label: "Fail (F)", value: counts.F || 0, description: "실패한 케이스" },
      { label: "미실행 (NT)", value: counts.NT || 0, description: "아직 검증되지 않음" },
      { label: "제외 (N)", value: counts.N || 0, description: "해당 없음" }
    ];
  }, [cases]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="surface" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {summary.map(item => (
            <div
              key={item.label}
              style={{
                padding: 16,
                border: "1px solid var(--border)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.label}</span>
              <strong style={{ fontSize: 24 }}>{item.value}</strong>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surface" style={{ borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>실행 결과 목록</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            케이스를 클릭하면 매뉴얼 테스트 탭에서 상세 정보를 편집할 수 있습니다.
          </p>
        </div>
        {isLoading ? (
          <div style={{ padding: 24, fontSize: 14, color: "var(--text-muted)" }}>결과를 불러오는 중...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: 24, fontSize: 14, color: "var(--text-muted)" }}>
            아직 생성된 테스트 케이스가 없습니다.
          </div>
        ) : (
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#f8f9fb" }}>
                  <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>케이스명</th>
                  <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>세션</th>
                  <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>검증결과</th>
                  <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>BTS-ID</th>
                  <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(testCase => (
                  <tr key={testCase.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{testCase.title}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      {sessions[testCase.sessionId]?.title ?? "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{testCase.verificationResult ?? "-"}</td>
                    <td style={{ padding: "12px 16px" }}>{testCase.btsId ?? "-"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      {testCase.reporterNote ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

