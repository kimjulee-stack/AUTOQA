"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ManualAiChat } from "./manual-ai-chat";
import { ManualTestCaseModal } from "./manual-test-case-modal";
import type {
  ManualChatMessage,
  ManualTestCase,
  ManualTestSession,
  ManualVerificationResult,
  Project
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type GeneratedCasePayload = {
  title?: string;
  objective?: string;
  preconditions?: string;
  steps?: string[] | string;
  expectedResult?: string;
  notes?: string;
};

function normalizeSteps(value?: string[] | string) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(step => String(step));
  return value
    .split(/\n+/)
    .map(step => step.trim())
    .filter(Boolean);
}

function parseGeneratedCases(message: string): GeneratedCasePayload[] {
  const codeBlockMatch = message.match(/```json([\s\S]*?)```/i) || message.match(/```([\s\S]*?)```/i);
  const raw = codeBlockMatch ? codeBlockMatch[1] : null;
  const fallbackArrayMatch = !raw ? message.match(/\[[\s\S]*\]/) : null;
  const target = raw ?? fallbackArrayMatch?.[0];

  if (!target) {
    return [];
  }

  try {
    const parsed = JSON.parse(target.trim());
    if (Array.isArray(parsed)) {
      return parsed as GeneratedCasePayload[];
    }
    if (parsed && typeof parsed === "object") {
      return [parsed as GeneratedCasePayload];
    }
  } catch (error) {
    console.warn("Failed to parse generated cases:", error);
  }
  return [];
}

interface ManualTestWorkspaceProps {
  project?: Project;
  onCasesChange?: (cases: ManualTestCase[]) => void;
}

export function ManualTestWorkspace({ project, onCasesChange }: ManualTestWorkspaceProps = {}) {
  const [sessions, setSessions] = useState<ManualTestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ManualChatMessage[]>([]);
  const [testCases, setTestCases] = useState<ManualTestCase[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [caseModalId, setCaseModalId] = useState<string | null>(null);
  const [isSavingCase, setIsSavingCase] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find(session => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const runningSessionId = sessions.find(session => session.status === "running")?.id ?? null;

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const query = project?.id ? `?projectId=${encodeURIComponent(project.id)}` : "";
      const response = await fetch(`${API_BASE_URL}/manual-test-sessions${query}`);
      if (!response.ok) throw new Error("세션 목록을 불러오지 못했습니다.");
      const data: ManualTestSession[] = await response.json();
      setSessions(data);
      if (data.length > 0) {
        const preferred = data.find(session => session.status === "running") ?? data[0];
        setSelectedSessionId(prev => prev ?? preferred.id);
      } else {
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [project?.id]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/manual-test-sessions/${sessionId}/messages`);
        if (!response.ok) throw new Error("메시지를 불러오지 못했습니다.");
        const data: ManualChatMessage[] = await response.json();
        setSessionMessages(data);
      } catch (error) {
        console.error(error);
        setSessionMessages([]);
      }
    },
    []
  );

  const loadCases = useCallback(
    async (sessionId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/manual-test-cases?sessionId=${encodeURIComponent(sessionId)}`);
        if (!response.ok) throw new Error("테스트 케이스를 불러오지 못했습니다.");
        const data: ManualTestCase[] = await response.json();
        setTestCases(data);
        onCasesChange?.(data);
      } catch (error) {
        console.error(error);
        setTestCases([]);
        onCasesChange?.([]);
      }
    },
    [onCasesChange]
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionMessages([]);
      setTestCases([]);
      return;
    }
    loadMessages(selectedSessionId);
    loadCases(selectedSessionId);
  }, [selectedSessionId, loadMessages, loadCases]);

  const handleCreateSession = async () => {
    const defaultTitle = project ? `${project.name} 매뉴얼 테스트` : "매뉴얼 테스트";
    const title = prompt("세션 제목을 입력하세요", defaultTitle);
    if (title === null) return;
    setIsCreatingSession(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manual-test-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, projectId: project?.id })
      });
      if (!response.ok) throw new Error("세션을 생성할 수 없습니다.");
      await loadSessions();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!selectedSessionId) return;
    if (!confirm("현재 세션을 종료하시겠습니까?")) return;
    setIsCompletingSession(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manual-test-sessions/${selectedSessionId}/complete`, {
        method: "POST"
      });
      if (!response.ok) throw new Error("세션을 종료할 수 없습니다.");
      await loadSessions();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsCompletingSession(false);
    }
  };

  const handleAssistantMessage = async (content: string) => {
    if (!selectedSessionId) return;
    const generated = parseGeneratedCases(content);
    if (generated.length === 0) return;
    try {
      await fetch(`${API_BASE_URL}/manual-test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          cases: generated.map(testCase => ({
            title: testCase.title || "테스트 케이스",
            objective: testCase.objective,
            preconditions: testCase.preconditions,
            steps: normalizeSteps(testCase.steps),
            expectedResult: testCase.expectedResult,
            notes: testCase.notes,
            aiSummary: content
          }))
        })
      });
      await loadCases(selectedSessionId);
    } catch (error) {
      console.error(error);
      alert("테스트 케이스를 저장하지 못했습니다.");
    }
  };

  const handleSaveCaseResult = async (
    caseId: string,
    updates: { verificationResult?: ManualVerificationResult; btsId?: string; reporterNote?: string }
  ) => {
    setIsSavingCase(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manual-test-cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("테스트 케이스를 업데이트할 수 없습니다.");
      await loadCases(selectedSessionId!);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSavingCase(false);
    }
  };

  const activeCase = caseModalId ? testCases.find(testCase => testCase.id === caseModalId) ?? null : null;

  const heading = project ? `${project.name} · AI 기반 매뉴얼 테스트` : "AI 기반 매뉴얼 테스트 케이스";
  const subheading = project
    ? `${project.product || "제품 미지정"} · ${project.platform?.toUpperCase() ?? "WEB"}`
    : "Gemini 텍스트 모델과 대화하며 테스트 케이스를 생성하고 결과를 기록하세요.";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="surface" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{heading}</h2>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 14 }}>{subheading}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCreateSession}
              disabled={isCreatingSession}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "var(--primary)",
                color: "#1c1d21",
                fontWeight: 700,
                cursor: isCreatingSession ? "not-allowed" : "pointer"
              }}
            >
              {isCreatingSession ? "생성 중..." : "새 세션 시작"}
            </button>
            {selectedSessionId && (
              <button
                onClick={handleCompleteSession}
                disabled={isCompletingSession || selectedSession?.status === "completed"}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "#fff",
                  cursor:
                    isCompletingSession || selectedSession?.status === "completed" ? "not-allowed" : "pointer"
                }}
              >
                {isCompletingSession ? "종료 중..." : "세션 종료"}
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            진행 중인 세션
            <select
              value={selectedSessionId ?? ""}
              onChange={event => setSelectedSessionId(event.target.value || null)}
              disabled={isLoadingSessions || sessions.length === 0}
              style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "8px 10px", minWidth: 240 }}
            >
              {sessions.length === 0 && <option value="">세션 없음</option>}
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title} ({session.status === "running" ? "진행 중" : "완료"})
                </option>
              ))}
            </select>
          </label>
          {selectedSession && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              시작: {new Date(selectedSession.startedAt).toLocaleString("ko-KR")}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
          gap: 24,
          height: "calc(100vh - 260px)",
          minHeight: 640
        }}
      >
        <div className="surface" style={{ padding: 0, borderRadius: 12, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>생성된 테스트 케이스 ({testCases.length})</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              목록을 클릭하면 테스트 결과를 입력할 수 있습니다.
            </p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {testCases.length === 0 ? (
              <div style={{ padding: 24, fontSize: 14, color: "var(--text-muted)" }}>
                아직 생성된 테스트 케이스가 없습니다. AI에게 기획 의도를 설명해 보세요.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f8f9fb" }}>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>제목</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>기대 결과</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", width: 120 }}>
                      검증결과
                    </th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", width: 120 }}>BTS-ID</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", width: 140 }}>
                      최근 수정
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map(testCase => (
                    <tr
                      key={testCase.id}
                      onClick={() => setCaseModalId(testCase.id)}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer"
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{testCase.title}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                        {testCase.expectedResult ?? "-"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>{testCase.verificationResult ?? "-"}</td>
                      <td style={{ padding: "12px 16px" }}>{testCase.btsId ?? "-"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                        {new Date(testCase.updatedAt).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <ManualAiChat
          sessionId={selectedSessionId}
          sessionTitle={selectedSession?.title ?? project?.name ?? "Manual Test"}
          isSessionActive={Boolean(selectedSessionId && runningSessionId === selectedSessionId)}
          initialMessages={sessionMessages}
          onMessagesPersist={() => selectedSessionId && loadMessages(selectedSessionId)}
          onAssistantMessage={handleAssistantMessage}
        />
      </div>

      {activeCase && (
        <ManualTestCaseModal
          testCase={activeCase}
          onClose={() => setCaseModalId(null)}
          onSave={async updates => {
            await handleSaveCaseResult(activeCase.id, updates);
          }}
        />
      )}
      {isSavingCase && <div style={{ display: "none" }} aria-hidden="true" />} {/* trigger loading state */}
    </section>
  );
}

