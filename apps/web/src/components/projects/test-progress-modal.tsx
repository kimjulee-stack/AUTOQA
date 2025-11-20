"use client";

import { useEffect, useState } from "react";
import { fetchFromApi } from "@/lib/api";
import type { TestRun, TestStageInfo } from "@/types";

interface TestProgressModalProps {
  runId: string;
  onClose: () => void;
  onComplete?: () => void;
}

type TestStage = 
  | "waiting_for_device"
  | "start"
  | "preparing"
  | "running_test"
  | "processing_results"
  | "cleaning_device"
  | "end";

const stageLabels: Record<TestStage, string> = {
  waiting_for_device: "디바이스 대기",
  start: "시작",
  preparing: "준비",
  running_test: "테스트 실행",
  processing_results: "결과 처리",
  cleaning_device: "디바이스 정리",
  end: "종료"
};

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}분 ${secs}초`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분 ${secs}초`;
}

function getStageIcon(stage: TestStageInfo) {
  if (stage.status === "completed") {
    return "✓";
  } else if (stage.status === "running") {
    return "▶";
  } else if (stage.status === "failed") {
    return "✗";
  }
  return "○";
}

function getStageColor(stage: TestStageInfo) {
  if (stage.status === "completed") {
    return "#22c55e"; // green
  } else if (stage.status === "running") {
    return "#3b82f6"; // blue
  } else if (stage.status === "failed") {
    return "#ef4444"; // red
  }
  return "#9ca3af"; // gray
}

export function TestProgressModal({ runId, onClose, onComplete }: TestProgressModalProps) {
  const [run, setRun] = useState<TestRun | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
        const data = await fetchFromApi<TestRun>(`/runs/${runId}`);
        setRun(data);
        
        // 모든 단계가 완료되거나 실패하면 폴링 중지
        if (data.currentStage === "end" && data.stages) {
          const endStage = data.stages.find(s => s.stage === "end");
          if (endStage && (endStage.status === "completed" || endStage.status === "failed")) {
            setIsPolling(false);
            if (onComplete) {
              onComplete();
            }
          }
        }
      } catch (error) {
        console.error("상태 조회 실패:", error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1000); // 1초마다 조회

    return () => clearInterval(interval);
  }, [runId, isPolling]);

  if (!run) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            minWidth: 400,
            maxWidth: 600
          }}
        >
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  const stages = run.stages || [];
  const currentStageIndex = stages.findIndex(s => s.stage === run.currentStage);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          minWidth: 500,
          maxWidth: 700,
          maxHeight: "80vh",
          overflowY: "auto"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>테스트 실행 진행 상황</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#666",
              padding: 0,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {stages.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex || stage.status === "completed";
            const isRunning = stage.status === "running";
            const isFailed = stage.status === "failed";

            return (
              <div key={stage.stage} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* 아이콘 */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: isRunning ? "#dbeafe" : isCompleted ? "#dcfce7" : isFailed ? "#fee2e2" : "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: getStageColor(stage),
                    flexShrink: 0
                  }}
                >
                  {getStageIcon(stage)}
                </div>

                {/* 내용 */}
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: isRunning || isActive ? "#1f2937" : "#6b7280" }}>
                      {stageLabels[stage.stage]}
                    </span>
                    {stage.duration && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {formatDuration(stage.duration)}
                      </span>
                    )}
                  </div>
                  {stage.message && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                      {stage.message}
                    </p>
                  )}
                </div>

                {/* 연결선 */}
                {index < stages.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 15,
                      top: 48,
                      width: 2,
                      height: 16,
                      background: isCompleted ? "#22c55e" : "#e5e7eb",
                      marginLeft: 0
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {!isPolling && (
          <div style={{ marginTop: 24, padding: 16, background: run.status === "정상" ? "#dcfce7" : "#fee2e2", borderRadius: 8 }}>
            <p style={{ fontSize: 14, color: run.status === "정상" ? "#166534" : "#991b1b", margin: 0, fontWeight: 600 }}>
              {run.status === "정상" ? "테스트가 성공적으로 완료되었습니다." : "테스트 실행 중 오류가 발생했습니다."}
            </p>
            {run.errorMessage && (
              <div style={{ marginTop: 12, padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #fca5a5" }}>
                <p style={{ fontSize: 12, color: "#991b1b", margin: 0, fontWeight: 600, marginBottom: 8 }}>실패 원인:</p>
                <p style={{ fontSize: 12, color: "#7f1d1d", margin: 0, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {run.errorMessage}
                </p>
                {run.output && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 12, color: "#991b1b", cursor: "pointer", fontWeight: 600 }}>
                      상세 로그 보기
                    </summary>
                    <pre style={{ 
                      fontSize: 11, 
                      color: "#7f1d1d", 
                      margin: "8px 0 0 0", 
                      padding: 12, 
                      background: "#fef2f2", 
                      borderRadius: 4, 
                      overflow: "auto", 
                      maxHeight: 300,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}>
                      {run.output}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

