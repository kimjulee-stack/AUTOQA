"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { RunWorkspace } from "./run-workspace";
import { deleteToApi } from "@/lib/api";
import type { Project, Scenario, TestRun, TestStep } from "@/types";

type Tab = "테스트 실행" | "실행 결과" | "스케줄";

interface ProjectTabsProps {
  projectId: string;
  project: {
    deviceId?: string;
    platform?: string;
    product?: string;
    subCategory?: string;
  };
  scenarios: Scenario[];
  latestRuns: TestRun[];
  summary: {
    total: number;
    successRate: number;
    success: number;
    fail: number;
  };
  projectRuns: TestRun[];
}

export function ProjectTabs({ projectId, project, scenarios, latestRuns, summary, projectRuns }: ProjectTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "실행 결과") return "실행 결과";
    if (tabParam === "스케줄") return "스케줄";
    return "테스트 실행";
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(() => {
    return searchParams.get("runId");
  });

  const tabs: Tab[] = ["테스트 실행", "실행 결과", "스케줄"];

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "실행 결과") {
      setActiveTab("실행 결과");
    } else if (tabParam === "스케줄") {
      setActiveTab("스케줄");
    }

    const runIdParam = searchParams.get("runId");
    if (runIdParam) {
      setSelectedRunId(runIdParam);
    } else if (projectRuns.length === 0) {
      setSelectedRunId(null);
    } else if (!selectedRunId) {
      setSelectedRunId(projectRuns[0].id);
    } else {
      const exists = projectRuns.some(run => run.id === selectedRunId);
      if (!exists) {
        setSelectedRunId(projectRuns[0].id);
      }
    }
  }, [projectRuns, selectedRunId, searchParams]);

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
    <>
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
        <RunWorkspace
          projectId={projectId}
          project={project}
          scenarios={scenarios}
          latestRuns={latestRuns}
        />
      )}

      {activeTab === "실행 결과" && (
        <>
          <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Test Suite Run 개요</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>최근 결과 기준</p>
              </div>
              <select
                defaultValue="24h"
                style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px", fontWeight: 600 }}
              >
                <option value="24h">최근 24시간</option>
                <option value="7d">최근 7일</option>
              </select>
            </header>
            <div style={{ display: "flex", gap: 32 }}>
              <div style={{ flex: 1, minHeight: 180, background: "#f6f7fb", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>그래프 준비 중</span>
              </div>
              <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>총 실행 횟수</span>
                  <strong>{summary.total}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>성공률</span>
                  <strong>{summary.successRate}%</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>총 통과</span>
                  <strong>{summary.success}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>총 실패</span>
                  <strong>{summary.fail}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="surface" style={{ padding: 24 }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>최근 Test Suite Run</h3>
              <button style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px" }}>필터</button>
            </header>
            {projectRuns.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>아직 실행 기록이 없습니다.</p>
            ) : (
              <table>
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    <th style={{ textAlign: "left", paddingBottom: 8 }}>실행 ID</th>
                    <th style={{ textAlign: "left" }}>시나리오</th>
                    <th style={{ textAlign: "left" }}>상태</th>
                    <th style={{ textAlign: "left" }}>디바이스</th>
                    <th style={{ textAlign: "left" }}>시작 시각</th>
                    <th style={{ textAlign: "left" }}>실패 원인</th>
                    <th style={{ textAlign: "left", width: 80 }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {projectRuns.map(run => (
                    <tr
                      key={run.id}
                      style={{
                        borderTop: "1px solid var(--border)",
                        fontSize: 14,
                        background: selectedRunId === run.id ? "rgba(80,156,255,0.08)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "10px 0", fontWeight: 600 }}>
                        <button
                          onClick={() => setSelectedRunId(run.id)}
                          style={{
                            border: "none",
                            background: "none",
                            color: "var(--primary-dark)",
                            cursor: "pointer",
                            fontWeight: 600,
                            textDecoration: selectedRunId === run.id ? "underline" : "none"
                          }}
                        >
                          {run.id}
                        </button>
                      </td>
                      <td>{run.scenarioId}</td>
                      <td>
                        <span style={{ 
                          color: run.status === "정상" ? "#22c55e" : run.status === "오류" ? "#ef4444" : "var(--text-muted)",
                          fontWeight: 600
                        }}>
                          {run.status}
                        </span>
                      </td>
                      <td>
                        {run.device} / {run.os}
                      </td>
                      <td>{new Date(run.startedAt).toLocaleString("ko-KR", { hour12: false })}</td>
                      <td style={{ maxWidth: 400, wordBreak: "break-word" }}>
                        {run.errorMessage ? (
                          <span style={{ color: "#ef4444", fontSize: 12 }}>{run.errorMessage}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>-</span>
                        )}
                      </td>
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
            )}
          </section>

          <ScreenshotGallery projectRuns={projectRuns} selectedRunId={selectedRunId} product={project.product} />
        </>
      )}

      {activeTab === "스케줄" && (
        <section className="surface" style={{ padding: 24 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>스케줄 기능은 준비 중입니다.</p>
        </section>
      )}
    </>
  );
}

interface ScreenshotGalleryProps {
  projectRuns: TestRun[];
  selectedRunId: string | null;
  product?: string;
}

function ScreenshotGallery({ projectRuns, selectedRunId, product }: ScreenshotGalleryProps) {
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedImageInfo, setEnlargedImageInfo] = useState<{ name: string; stepIndex: number; runId: string } | null>(null);
  
  // 태블릿 학습 제품들은 가로 모드로 표시
  const isTabletProduct = product === "뇌새김" || product === "브레인키" || product === "톡이즈" || product === "톡이즈 보카";
  const aspectRatio = isTabletProduct ? "16/9" : "9/16";
  const gridColumns = isTabletProduct ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(280px, 1fr))";
  
  const targetRuns = useMemo(() => {
    if (selectedRunId) {
      return projectRuns.filter(run => run.id === selectedRunId);
    }
    return projectRuns.slice(0, 1);
  }, [projectRuns, selectedRunId]);

  const allScreenshots = useMemo(() => {
    const screenshots: Array<{
      runId: string;
      runName: string;
      step: TestStep;
      stepIndex: number;
    }> = [];

    targetRuns.forEach(run => {
      if (run.steps) {
        run.steps.forEach((step, index) => {
          if (step.screenshotUrl) {
            screenshots.push({
              runId: run.id,
              runName: `${run.id} - ${run.scenarioId}`,
              step,
              stepIndex: index + 1
            });
          }
        });
      }
    });

    return screenshots;
  }, [targetRuns]);

  const handleImageClick = (screenshotUrl: string, stepName: string, stepIndex: number, runId: string) => {
    setEnlargedImage(screenshotUrl);
    setEnlargedImageInfo({ name: stepName, stepIndex, runId });
  };

  const handleDownload = async (screenshotUrl: string, stepName: string, stepIndex: number) => {
    try {
      let blob: Blob;
      let url: string;
      
      if (screenshotUrl.startsWith("data:")) {
        // base64 이미지인 경우
        const response = await fetch(screenshotUrl);
        blob = await response.blob();
        url = URL.createObjectURL(blob);
      } else {
        // 일반 URL인 경우
        const response = await fetch(screenshotUrl);
        blob = await response.blob();
        url = URL.createObjectURL(blob);
      }
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `step-${stepIndex}-${stepName.replace(/[^a-zA-Z0-9가-힣]/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("이미지 다운로드 실패:", error);
      alert("이미지 다운로드에 실패했습니다.");
    }
  };

  if (allScreenshots.length === 0) {
    return (
      <section className="surface" style={{ padding: 24 }}>
        <header style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>실행 결과 스크린샷</h3>
        </header>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {selectedRunId
            ? "선택한 실행에 스크린샷이 없습니다."
            : "스크린샷이 없습니다."}
        </p>
      </section>
    );
  }

  return (
    <section className="surface" style={{ padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>실행 결과 스크린샷</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {selectedRunId ? `실행 ID ${selectedRunId}의 스크린샷 ${allScreenshots.length}개` : `총 ${allScreenshots.length}개의 스크린샷`}
        </p>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          gap: 16,
        }}
      >
        {allScreenshots.map((item, idx) => (
          <div
            key={`${item.runId}-${item.step.id}-${idx}`}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div 
              style={{ 
                position: "relative", 
                width: "100%", 
                aspectRatio, 
                background: "#000",
                cursor: "pointer"
              }}
              onClick={() => handleImageClick(item.step.screenshotUrl || "", item.step.name, item.stepIndex, item.runId)}
            >
              <Image
                src={item.step.screenshotUrl || "/assets/screenshots/sample.png"}
                alt={`Step ${item.stepIndex} screenshot`}
                fill
                style={{ objectFit: "contain" }}
                unoptimized
              />
            </div>
            <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                Step {item.stepIndex} · {new Date(item.step.endedAt || item.step.startedAt).toLocaleTimeString("ko-KR", { hour12: false })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.step.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                <div>실행 ID: {item.runId}</div>
                <div style={{ marginTop: 2 }}>
                  상태: <span style={{ color: item.step.status === "정상" ? "#22c55e" : "#ef4444" }}>{item.step.status}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(item.step.screenshotUrl || "", item.step.name, item.stepIndex);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-strong)"
                }}
              >
                다운로드
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 확대 이미지 모달 */}
      {enlargedImage && enlargedImageInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 24
          }}
          onClick={() => {
            setEnlargedImage(null);
            setEnlargedImageInfo(null);
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  Step {enlargedImageInfo.stepIndex} · {enlargedImageInfo.name}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
                  실행 ID: {enlargedImageInfo.runId}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleDownload(enlargedImage, enlargedImageInfo.name, enlargedImageInfo.stepIndex)}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  다운로드
                </button>
                <button
                  onClick={() => {
                    setEnlargedImage(null);
                    setEnlargedImageInfo(null);
                  }}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
            <div style={{ position: "relative", width: "100%", maxHeight: "80vh", background: "#000", borderRadius: 8, overflow: "hidden" }}>
              <Image
                src={enlargedImage}
                alt={`Enlarged screenshot - Step ${enlargedImageInfo.stepIndex}`}
                width={1920}
                height={1080}
                style={{ 
                  width: "100%", 
                  height: "auto", 
                  objectFit: "contain",
                  maxHeight: "80vh"
                }}
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

