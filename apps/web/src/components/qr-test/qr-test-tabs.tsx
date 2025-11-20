"use client";

import { useState } from "react";
import type { Project } from "@/types";
import { QrTestWorkspace } from "./qr-test-workspace";

type Tab = "테스트 실행" | "실행 결과";
type StatusState = "completed" | "in-progress" | "pending";

interface StatusStep {
  key: string;
  label: string;
  description: string;
  duration?: string;
  state: StatusState;
}

interface MockResult {
  id: string;
  name: string;
  status: "completed" | "failed";
  summary: string;
  startedAt: string;
}

interface QrTestTabsProps {
  project: Project;
}

export function QrTestTabs({ project }: QrTestTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("테스트 실행");
  const [statusTimeline] = useState<StatusStep[]>([
    { key: "device", label: "디바이스 대기", description: "디바이스 연결이 확인되었습니다.", duration: "1초", state: "completed" },
    { key: "start", label: "시작", description: "QR 테스트 세션을 초기화합니다.", state: "in-progress" },
    { key: "prepare", label: "준비", description: "학습 환경 및 QR 이미지를 준비합니다.", state: "pending" },
    { key: "run", label: "테스트 실행", description: "선택한 QR 이미지를 순서대로 촬영합니다.", state: "pending" },
    { key: "process", label: "결과 처리", description: "스크린샷과 로그를 정리합니다.", state: "pending" },
    { key: "cleanup", label: "디바이스 정리", description: "테스트 종료 후 디바이스를 초기화합니다.", state: "pending" },
    { key: "end", label: "종료", description: "세션을 마무리합니다.", state: "pending" }
  ]);

  const mockResults: MockResult[] = [
    {
      id: "result-1",
      name: "프랑스어 입문 1회차",
      status: "completed",
      summary: "학습 인트로/종료 화면 캡처 완료",
      startedAt: "2025-02-01 10:32"
    },
    {
      id: "result-2",
      name: "스페인어 테마 1회차",
      status: "failed",
      summary: "학습 종료 화면 감지 실패",
      startedAt: "2025-01-28 14:05"
    }
  ];

  const [selectedResultId, setSelectedResultId] = useState<string | null>(mockResults[0]?.id ?? null);
  const selectedResult = mockResults.find(result => result.id === selectedResultId) ?? null;

  const tabs: Tab[] = ["테스트 실행", "실행 결과"];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="surface" style={{ padding: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 24, fontWeight: 600 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === tab ? "var(--primary-dark)" : "var(--text-muted)",
                padding: 0,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "테스트 실행" && (
        <>
          <section className="surface" style={{ padding: 24, borderRadius: 12, display: "flex", flexDirection: "column", gap: 16 }}>
            <header>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>테스트 실행 진행 상황</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>QR 테스트 세션의 진행 단계를 확인하세요.</p>
            </header>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {statusTimeline.map(step => (
                <div
                  key={step.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: step.state === "pending" ? 0.55 : 1
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "2px solid var(--border)",
                      background:
                        step.state === "completed"
                          ? "var(--primary)"
                          : step.state === "in-progress"
                          ? "var(--primary-light)"
                          : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: step.state === "completed" ? "#fff" : "var(--text-muted)",
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  >
                    {step.state === "completed" ? "✓" : step.state === "in-progress" ? "▶" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{step.label}</strong>
                      {step.duration && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{step.duration}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <QrTestWorkspace project={project} />
        </>
      )}

      {activeTab === "실행 결과" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="surface" style={{ padding: 24, borderRadius: 12 }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>실행 결과 목록</h3>
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                새로 고침
              </button>
            </header>
            {mockResults.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>저장된 AI 테스트 결과가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mockResults.map(result => {
                  const isSelected = result.id === selectedResultId;
                  const statusColor = result.status === "completed" ? "#22c55e" : "#ef4444";
                  return (
                    <div
                      key={result.id}
                      onClick={() => setSelectedResultId(result.id)}
                      style={{
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 12,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        background: isSelected ? "rgba(80,156,255,0.08)" : "#fff",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 14 }}>{result.name}</strong>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: `${statusColor}1A`,
                            color: statusColor
                          }}
                        >
                          {result.status === "completed" ? "완료" : "실패"}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{result.summary}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{result.startedAt}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="surface" style={{ padding: 24, borderRadius: 12 }}>
            <header style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>결과 상세</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                실행 중 캡처된 학습 인트로 및 종료 화면, 로그를 확인하세요.
              </p>
            </header>
            {selectedResult ? (
              <div
                style={{
                  padding: 20,
                  border: "1px dashed var(--border)",
                  borderRadius: 12,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  background: "#f8f9fa"
                }}
              >
                `{selectedResult.name}` 결과 데이터가 저장되면 이곳에 노출됩니다.
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>왼쪽에서 확인할 결과를 선택하세요.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}


