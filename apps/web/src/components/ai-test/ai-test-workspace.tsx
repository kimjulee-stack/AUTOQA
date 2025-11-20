"use client";

import { useState, useRef, useEffect } from "react";
import type { Project } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiTestWorkspaceProps {
  project: Project;
}

export function AiTestWorkspace({ project }: AiTestWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `안녕하세요! ${project.name} 프로젝트의 AI 테스트 어시스턴트입니다. 어떤 테스트를 수행하고 싶으신가요?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "응답을 받을 수 없습니다." }));
        throw new Error(errorData.error || `서버 오류 (${response.status})`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "응답을 생성할 수 없습니다.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI 채팅 오류:", error);
      const errorMsg = (error as Error).message;
      let userFriendlyMessage = `❌ 오류가 발생했습니다: ${errorMsg}`;
      
      // 할당량 초과 오류에 대한 친절한 안내
      if (errorMsg.includes("quota") || errorMsg.includes("billing") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        userFriendlyMessage = `❌ Gemini API 할당량을 초과했습니다.\n\n해결 방법:\n1. Google Cloud Console에서 할당량을 확인하세요: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas\n2. API 사용량을 확인하세요: https://console.cloud.google.com/apis/dashboard\n3. 필요시 할당량을 늘리거나 결제 계정을 설정하세요.\n\n에러 상세: ${errorMsg}`;
      } else if (errorMsg.includes("API 키") || errorMsg.includes("API_KEY")) {
        userFriendlyMessage = `❌ Gemini API 키 설정 오류\n\n해결 방법:\n1. apps/web/.env.local 파일에 GEMINI_API_KEY가 올바르게 설정되었는지 확인하세요.\n2. Google Cloud Console에서 API 키를 발급받으세요: https://makersuite.google.com/app/apikey\n3. 서버를 재시작하세요.\n\n에러 상세: ${errorMsg}`;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: userFriendlyMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: 24,
        height: "calc(100vh - 200px)",
        minHeight: 600
      }}
    >
      {/* 메인 테스트 공간 */}
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
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>테스트 공간</h2>
        <div
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "#f8f9fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)"
          }}
        >
          <p>AI가 테스트를 수행하면 여기에 결과가 표시됩니다.</p>
        </div>
      </div>

      {/* AI 채팅 패널 */}
      <div
        className="surface"
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)"
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid var(--border)",
            background: "#f8f9fa"
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Gemini Assistant</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>AI와 대화하며 테스트를 수행하세요</p>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          {messages.map(message => (
            <div
              key={message.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: message.role === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: message.role === "user" ? "var(--primary)" : "#f1f3f8",
                  color: message.role === "user" ? "#fff" : "var(--text)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                {message.content}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {message.timestamp.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", gap: 4, alignItems: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <span>AI가 응답을 생성하는 중...</span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  animation: "pulse 1.5s ease-in-out infinite"
                }}
              />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid var(--border)",
            background: "#f8f9fa"
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="테스트 요청을 입력하세요..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 14,
                resize: "none",
                minHeight: 44,
                maxHeight: 120,
                fontFamily: "inherit"
              }}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                padding: "10px 20px",
                background: input.trim() && !isLoading ? "var(--primary)" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                fontSize: 14
              }}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

