"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import type { AiChatMessage, AiResultScreenshot, AiTestResult, AiTestSession, Project } from "@/types";
import { AiTestChat } from "./ai-test-chat";

type Tab = "테스트 실행" | "실행 결과";

interface AiTestTabsProps {
  project: Project;
}

export function AiTestTabs({ project }: AiTestTabsProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "실행 결과") return "실행 결과";
    return "테스트 실행";
  });
  const [screenShotUrl, setScreenShotUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAutoCapture, setIsAutoCapture] = useState(true);
  const [sessions, setSessions] = useState<AiTestSession[]>([]);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<AiChatMessage[]>([]);
  const [aiResults, setAiResults] = useState<AiTestResult[]>([]);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<AiTestResult | null>(null);
  const [resultScreenshots, setResultScreenshots] = useState<AiResultScreenshot[]>([]);
  const [resultMessages, setResultMessages] = useState<AiChatMessage[]>([]);
  const [isResultDetailLoading, setIsResultDetailLoading] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
const [screenshotOrientationMap, setScreenshotOrientationMap] = useState<Record<string, "landscape" | "portrait">>({});

  const tabs: Tab[] = ["테스트 실행", "실행 결과"];
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-test-sessions/${sessionId}/messages`);
      if (!response.ok) throw new Error("메시지를 불러오지 못했습니다.");
      const data: AiChatMessage[] = await response.json();
      setSessionMessages(data);
    } catch (error) {
      console.error("세션 메시지 로드 실패:", error);
      setSessionMessages([]);
    }
  }, [API_BASE_URL]);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-test-sessions?projectId=${encodeURIComponent(project.id)}`);
      if (!response.ok) throw new Error("세션 목록을 불러오지 못했습니다.");
      const data: AiTestSession[] = await response.json();
      setSessions(data);
      const runningSession = data.find(session => session.status === "running") ?? null;
      setSelectedSessionId(runningSession ? runningSession.id : null);
      setSessionMessages([]);
    } catch (error) {
      console.error("세션 목록 로드 실패:", error);
    }
  }, [API_BASE_URL, project.id]);

  const loadResults = useCallback(async () => {
    setIsResultsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai-test-results?projectId=${encodeURIComponent(project.id)}`);
      if (!response.ok) throw new Error("실행 결과를 불러오지 못했습니다.");
      const data: AiTestResult[] = await response.json();
      setAiResults(data);
    } catch (error) {
      console.error("실행 결과 로드 실패:", error);
      setAiResults([]);
    } finally {
      setIsResultsLoading(false);
    }
  }, [API_BASE_URL, project.id]);

  const loadResultDetail = useCallback(
    async (resultId: string) => {
      setIsResultDetailLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/ai-test-results/${resultId}`);
        if (!response.ok) throw new Error("실행 결과를 불러오지 못했습니다.");
        const data: AiTestResult & { messages?: AiChatMessage[] } = await response.json();
        setSelectedResult(data);
        setResultScreenshots(data.screenshots ?? []);
        setResultMessages(data.messages ?? []);
      } catch (error) {
        console.error("실행 결과 상세 로드 실패:", error);
        setSelectedResult(null);
        setResultScreenshots([]);
        setResultMessages([]);
      } finally {
        setIsResultDetailLoading(false);
      }
    },
    [API_BASE_URL]
  );

  const persistScreenshotForSession = useCallback(
    async (imageUrl: string) => {
      if (!selectedSessionId) return;
      try {
        await fetch(`${API_BASE_URL}/ai-test-sessions/${selectedSessionId}/screenshots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl })
        });
      } catch (error) {
        console.error("실행 결과 스크린샷 저장 실패:", error);
      }
    },
    [API_BASE_URL, selectedSessionId]
  );

  const handleScreenshotUpdate = useCallback(
    (url: string | null, options?: { persist?: boolean }) => {
      setScreenShotUrl(url);
      if (url && (options?.persist ?? true)) {
        persistScreenshotForSession(url);
      }
    },
    [persistScreenshotForSession]
  );

  // 실시간 스크린샷 자동 캡처
  useEffect(() => {
    if (!isAutoCapture || !project.deviceId || project.platform === "web" || activeTab !== "테스트 실행") {
      return;
    }

    let isCancelled = false;

    const captureScreenshot = async () => {
      if (isCancelled) return;
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/devices/${project.deviceId}/screenshot`,
          { method: "POST" }
        );
        if (response.ok && !isCancelled) {
          const data = await response.json();
          handleScreenshotUpdate(data.screenshotUrl, { persist: true });
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("자동 스크린샷 캡처 실패:", err);
        }
      }
    };

    // 즉시 한 번 캡처
    captureScreenshot();

    // 1.5초마다 자동 캡처 (더 빠른 실시간 연동)
    const interval = setInterval(captureScreenshot, 1500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [API_BASE_URL, isAutoCapture, project.deviceId, project.platform, activeTab, handleScreenshotUpdate]);

  useEffect(() => {
    loadSessions();
    loadResults();
  }, [loadSessions, loadResults]);

  useEffect(() => {
    if (selectedSessionId) {
      setSessionMessages([]);
      loadSessionMessages(selectedSessionId);
    } else {
      setSessionMessages([]);
    }
  }, [selectedSessionId, loadSessionMessages]);

  useEffect(() => {
    if (aiResults.length === 0) {
      setSelectedResultId(null);
      setSelectedResult(null);
      setResultScreenshots([]);
      setResultMessages([]);
      return;
    }
    if (!selectedResultId || !aiResults.some(result => result.id === selectedResultId)) {
      setSelectedResultId(aiResults[0].id);
    }
  }, [aiResults, selectedResultId]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "실행 결과") {
      setActiveTab("실행 결과");
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedResultId) {
      loadResultDetail(selectedResultId);
    } else {
      setSelectedResult(null);
      setResultScreenshots([]);
      setResultMessages([]);
    }
  }, [selectedResultId, loadResultDetail]);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined") {
      return;
    }

    const defaultOrientation: "landscape" | "portrait" = "portrait";

    const loadOrientations = async () => {
      const entries = await Promise.all(
        resultScreenshots.map(screenshot => {
          return new Promise<{ id: string; orientation: "landscape" | "portrait" }>(resolve => {
            if (!screenshot.imageUrl) {
              resolve({ id: screenshot.id, orientation: defaultOrientation });
              return;
            }

            const img = new window.Image();
            img.onload = () => {
              const orientation = img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait";
              resolve({ id: screenshot.id, orientation });
            };
            img.onerror = () => resolve({ id: screenshot.id, orientation: defaultOrientation });
            img.src = screenshot.imageUrl;
          });
        })
      );

      if (!cancelled) {
        const next: Record<string, "landscape" | "portrait"> = {};
        entries.forEach(entry => {
          next[entry.id] = entry.orientation;
        });
        setScreenshotOrientationMap(next);
      }
    };

    if (resultScreenshots.length > 0) {
      loadOrientations();
    } else {
      setScreenshotOrientationMap({});
    }

    return () => {
      cancelled = true;
    };
  }, [resultScreenshots]);

  const handleStartSession = async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai-test-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "세션을 시작할 수 없습니다.");
      }
      const session: AiTestSession = await response.json();
      setSelectedSessionId(session.id);
      setSessionMessages([]);
      setIsAutoCapture(true);
      await Promise.all([loadSessions(), loadResults()]);
    } catch (error) {
      console.error("세션 시작 실패:", error);
      alert((error as Error).message);
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleStopSession = async () => {
    if (!selectedSessionId || isEndingSession) return;
    setIsEndingSession(true);
    try {
      const lastAssistantMessage = [...sessionMessages].reverse().find(msg => msg.role === "assistant")?.content;
      const response = await fetch(`${API_BASE_URL}/ai-test-sessions/${selectedSessionId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: lastAssistantMessage ?? "AI 테스트가 종료되었습니다."
        })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "세션을 종료할 수 없습니다.");
      }
      await Promise.all([loadSessions(), loadResults()]);
      setSelectedSessionId(null);
      setSessionMessages([]);
      setScreenShotUrl(null);
      setIsAutoCapture(false);
    } catch (error) {
      console.error("세션 종료 실패:", error);
      alert((error as Error).message);
    } finally {
      setIsEndingSession(false);
    }
  };

  const handleDeleteResult = useCallback(
    async (resultId: string) => {
      if (!confirm("선택한 AI 테스트 결과를 삭제하시겠습니까?")) {
        return;
      }

      setDeletingResultId(resultId);
      try {
        const response = await fetch(`${API_BASE_URL}/ai-test-results/${resultId}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "AI 테스트 결과를 삭제할 수 없습니다.");
        }

        setAiResults(prev => prev.filter(result => result.id !== resultId));

        let removedCurrentSelection = false;
        setSelectedResultId(prev => {
          if (prev === resultId) {
            removedCurrentSelection = true;
            return null;
          }
          return prev;
        });

        if (removedCurrentSelection) {
          setSelectedResult(null);
          setResultScreenshots([]);
          setResultMessages([]);
        }
      } catch (error) {
        console.error("AI 테스트 결과 삭제 실패:", error);
        alert((error as Error).message);
      } finally {
        setDeletingResultId(null);
      }
    },
    [API_BASE_URL]
  );

  const selectedSession = sessions.find(session => session.id === selectedSessionId) ?? null;
  const hasRunningSession = sessions.some(session => session.status === "running");
  const canStopSession = selectedSession?.status === "running";

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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 400px",
            gap: 24,
            height: "calc(100vh - 200px)",
            minHeight: 600
          }}
        >
          {/* 스크린샷 영역 */}
          <div
            className="surface"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              borderRadius: 12,
              overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>스크린샷</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setIsAutoCapture(!isAutoCapture)}
                  disabled={!project.deviceId || project.platform === "web"}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: isAutoCapture ? "#22c55e" : "#fff",
                    color: isAutoCapture ? "#fff" : "var(--text-strong)",
                    cursor: (!project.deviceId || project.platform === "web") ? "not-allowed" : "pointer",
                    fontWeight: 600
                  }}
                >
                  {isAutoCapture ? "실시간 ON" : "실시간 OFF"}
                </button>
                <button
                  onClick={async () => {
                    if (!project.deviceId || project.platform === "web") {
                      alert("USB로 연결된 디바이스가 필요합니다.");
                      return;
                    }
                    try {
                      setIsCapturing(true);
                      const response = await fetch(`${API_BASE_URL}/devices/${project.deviceId}/screenshot`, {
                        method: "POST"
                      });
                      if (response.ok) {
                        const data = await response.json();
                        handleScreenshotUpdate(data.screenshotUrl, { persist: true });
                      } else {
                        const error = await response.json();
                        alert(error.message || "스크린샷을 캡처할 수 없습니다.");
                      }
                    } catch (err) {
                      console.error("스크린샷 캡처 실패:", err);
                      alert("스크린샷을 캡처할 수 없습니다. 디바이스가 연결되어 있는지 확인하세요.");
                    } finally {
                      setIsCapturing(false);
                    }
                  }}
                  disabled={isCapturing || !project.deviceId || project.platform === "web"}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: (isCapturing || !project.deviceId || project.platform === "web") ? "#ddd" : "var(--primary)",
                    color: (isCapturing || !project.deviceId || project.platform === "web") ? "var(--text-muted)" : "#fff",
                    cursor: (isCapturing || !project.deviceId || project.platform === "web") ? "not-allowed" : "pointer",
                    fontWeight: 600
                  }}
                >
                  {isCapturing ? "캡처 중..." : "수동 캡처"}
                </button>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                minHeight: 400
              }}
            >
              {screenShotUrl ? (
                <Image
                  src={screenShotUrl}
                  alt="Test screenshot"
                  fill
                  style={{ objectFit: "contain" }}
                  unoptimized
                />
              ) : (
                <p style={{ color: "var(--text-muted)" }}>AI가 테스트를 수행하면 여기에 스크린샷이 표시됩니다.</p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
            <div
              className="surface"
              style={{
                padding: 16,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>테스트 세션</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleStartSession}
                    disabled={isStartingSession || hasRunningSession}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: isStartingSession || hasRunningSession ? "#e5e7eb" : "var(--primary)",
                      color: isStartingSession || hasRunningSession ? "var(--text-muted)" : "#1c1d21",
                      fontWeight: 700,
                      cursor: isStartingSession || hasRunningSession ? "not-allowed" : "pointer"
                    }}
                  >
                    {isStartingSession ? "시작 중..." : "테스트 시작"}
                  </button>
                  <button
                    onClick={handleStopSession}
                    disabled={!canStopSession || isEndingSession}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: !canStopSession || isEndingSession ? "#e5e7eb" : "#f87171",
                      color: !canStopSession || isEndingSession ? "var(--text-muted)" : "#fff",
                      fontWeight: 700,
                      cursor: !canStopSession || isEndingSession ? "not-allowed" : "pointer"
                    }}
                  >
                    {isEndingSession ? "종료 중..." : "테스트 종료"}
                  </button>
                </div>
                {actionError && (
                  <p style={{ marginTop: 8, fontSize: 12, color: "#b91c1c", lineHeight: 1.4 }}>
                    ⚠ 액션 실행 실패: {actionError}
                  </p>
                )}
              </div>
            </div>

            <AiTestChat
              project={project}
              sessionId={selectedSessionId}
              isSessionActive={canStopSession}
              initialMessages={sessionMessages}
              currentScreenshot={screenShotUrl}
              onScreenshotUpdate={handleScreenshotUpdate}
              onActionExecute={async action => {
                if (isExecutingAction) {
                  return;
                }
                if (!project.deviceId || project.platform === "web") {
                  setActionError("USB로 연결된 디바이스가 필요합니다.");
                  return;
                }

                setIsExecutingAction(true);
                setActionError(null);
                try {
                  const response = await fetch(`${API_BASE_URL}/devices/${project.deviceId}/action`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify(action)
                  });

                  if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || "액션 실행 실패");
                  }

                  const result = await response.json();
                  console.log("액션 실행 성공:", result);
                  setActionError(null);
                } catch (error) {
                  console.error("액션 실행 실패:", error);
                  setActionError((error as Error).message || "알 수 없는 오류가 발생했습니다.");
                }
                setIsExecutingAction(false);
              }}
              onMessagesPersist={() => {
                if (selectedSessionId) {
                  loadSessionMessages(selectedSessionId);
                  loadSessions();
                }
              }}
            />
          </div>
        </div>
      )}

      {activeTab === "실행 결과" && (
        <>
          <section className="surface" style={{ padding: 24 }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>AI 테스트 결과</h3>
              {isResultsLoading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>불러오는 중...</span>}
            </header>
            {aiResults.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>저장된 AI 테스트 결과가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {aiResults.map(result => {
                  const isSelected = result.id === selectedResultId;
                  const isDeleting = deletingResultId === result.id;
                  const statusColor = result.status === "completed" ? "#22c55e" : "#ef4444";
                  return (
                    <div
                      key={result.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedResultId(result.id)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedResultId(result.id);
                        }
                      }}
                      style={{
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 12,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        background: isSelected ? "rgba(80,156,255,0.08)" : "#fff",
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {new Date(result.createdAt).toLocaleString("ko-KR", { hour12: false })}
                          </span>
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              handleDeleteResult(result.id);
                            }}
                            disabled={isDeleting}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: "1px solid rgba(239,68,68,0.4)",
                              background: isDeleting ? "rgba(239,68,68,0.15)" : "rgba(254,226,226,0.8)",
                              color: "#b91c1c",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: isDeleting ? "not-allowed" : "pointer"
                            }}
                          >
                            {isDeleting ? "삭제 중..." : "삭제"}
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                        시작 {new Date(result.startedAt).toLocaleString("ko-KR", { hour12: false })}
                        {result.endedAt && ` · 종료 ${new Date(result.endedAt).toLocaleString("ko-KR", { hour12: false })}`}
                      </p>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{result.summary ?? "요약 없음"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {selectedResult && (
            <section className="surface" style={{ padding: 24 }}>
              <header style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedResult.name} 상세</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  {selectedResult.status === "completed" ? "완료됨" : "실패"} ·{" "}
                  {selectedResult.endedAt
                    ? new Date(selectedResult.endedAt).toLocaleString("ko-KR", { hour12: false })
                    : new Date(selectedResult.createdAt).toLocaleString("ko-KR", { hour12: false })}
                </p>
              </header>

              {isResultDetailLoading ? (
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>결과를 불러오는 중입니다...</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>실행 결과 스크린샷</h4>
                    {resultScreenshots.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>저장된 스크린샷이 없습니다.</p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 16
                        }}
                      >
                        {resultScreenshots.map(screenshot => {
                          const orientation = screenshotOrientationMap[screenshot.id] ?? "portrait";
                          const aspectRatio = orientation === "landscape" ? "16/9" : "9/16";
                          const flexBasis = orientation === "landscape" ? "calc(50% - 16px)" : "calc(25% - 16px)";
                          const minWidth = orientation === "landscape" ? 280 : 180;

                          return (
                            <div
                              key={screenshot.id}
                              style={{
                                flex: `1 1 ${flexBasis}`,
                                minWidth,
                                maxWidth: flexBasis,
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                overflow: "hidden",
                                background: "#fff",
                                display: "flex",
                                flexDirection: "column",
                                boxSizing: "border-box"
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
                                onClick={() => window.open(screenshot.imageUrl, "_blank")}
                              >
                                <Image src={screenshot.imageUrl} alt="실행 결과 스크린샷" fill style={{ objectFit: "contain" }} unoptimized />
                              </div>
                              <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
                                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                                  {new Date(screenshot.capturedAt).toLocaleString("ko-KR", { hour12: false })}
                                </p>
                                <button
                                  onClick={() => window.open(screenshot.imageUrl, "_blank")}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontWeight: 600
                                  }}
                                >
                                  크게 보기
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>대화 내용</h4>
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 16,
                        maxHeight: 540,
                        overflowY: "auto",
                        background: "#fff"
                      }}
                    >
                      {resultMessages.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>저장된 대화가 없습니다.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {resultMessages.map(message => (
                            <div key={message.id}>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                {message.role === "assistant" ? "AI" : "사용자"} ·{" "}
                                {new Date(message.createdAt).toLocaleTimeString("ko-KR", { hour12: false })}
                              </div>
                              <div
                                style={{
                                  background: message.role === "assistant" ? "rgba(80,156,255,0.08)" : "#f6f7fb",
                                  borderRadius: 12,
                                  padding: 10,
                                  marginTop: 4,
                                  fontSize: 13,
                                  whiteSpace: "pre-wrap"
                                }}
                              >
                                {message.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
