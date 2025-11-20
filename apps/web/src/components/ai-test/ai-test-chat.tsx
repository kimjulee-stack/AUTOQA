"use client";

import { useState, useRef, useEffect } from "react";
import type { AiChatMessage, Project } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiTestChatProps {
  project: Project;
  currentScreenshot?: string | null;
  onScreenshotUpdate?: (url: string | null, options?: { persist?: boolean }) => void;
  onActionExecute?: (action: any) => Promise<void>;
  sessionId: string | null;
  isSessionActive: boolean;
  initialMessages?: AiChatMessage[];
  onMessagesPersist?: () => void;
}

function createGreeting(projectName: string): Message[] {
  return [
    {
      id: "greeting",
      role: "assistant",
      content: `안녕하세요! ${projectName} 프로젝트의 AI 테스트 어시스턴트입니다. 어떤 테스트를 수행하고 싶으신가요?`,
      timestamp: new Date()
    }
  ];
}

export function AiTestChat({
  project,
  currentScreenshot,
  onScreenshotUpdate,
  onActionExecute,
  sessionId,
  isSessionActive,
  initialMessages = [],
  onMessagesPersist
}: AiTestChatProps) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [messageList, setMessageList] = useState<Message[]>(createGreeting(project.name));
  const messagesRef = useRef<Message[]>(messageList);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  useEffect(() => {
    messagesRef.current = messageList;
  }, [messageList]);

  useEffect(() => {
    if (!sessionId) {
      setMessageList(createGreeting(project.name));
      return;
    }

    if (initialMessages.length === 0) {
      return;
    }

    const restored = initialMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.createdAt)
    }));
    setMessageList(restored);
  }, [sessionId, initialMessages, project.name]);

  const canSend = Boolean(sessionId && isSessionActive);
  const canSendRef = useRef(canSend);
  useEffect(() => {
    canSendRef.current = canSend;
  }, [canSend]);
  const appendMessage = (message: Message) => {
    const updated = [...messagesRef.current, message];
    setMessageList(updated);
    return updated;
  };

  const convertImageToBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // data:image/png;base64, 부분 제거
          const base64 = base64String.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("이미지 변환 실패:", error);
      return null;
    }
  };

  const sendToAssistant = async (userMessage: Message) => {
    const conversation = appendMessage(userMessage);
    setIsLoading(true);

    try {
      let screenshotBase64: string | null = null;
      let mediaType = "image/png";

      if (currentScreenshot) {
        screenshotBase64 = await convertImageToBase64(currentScreenshot);
        if (currentScreenshot.includes(".jpg") || currentScreenshot.includes(".jpeg")) {
          mediaType = "image/jpeg";
        }
      }

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          projectId: project.id,
          projectName: project.name,
          messages: conversation.map(m => ({
            role: m.role,
            content: m.content
          })),
          latestUserMessage: userMessage.content,
          screenshot: screenshotBase64
            ? {
                base64: screenshotBase64,
                mediaType
              }
            : null
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

      appendMessage(assistantMessage);
      onMessagesPersist?.();

      const actionMatch =
        data.message?.match(/```json\s*([\s\S]*?)\s*```/) ||
        data.message?.match(/\{[\s\S]*"action"[\s\S]*\}/);

      if (actionMatch && onActionExecute && canSendRef.current) {
        try {
          const actionJson = actionMatch[1] || actionMatch[0];
          const action = JSON.parse(actionJson);

          if (action.action && ["tap", "swipe", "input", "back", "enter"].includes(action.action) && canSendRef.current) {
            await onActionExecute(action);

            if (project.deviceId && project.platform !== "web" && canSendRef.current) {
              await new Promise(resolve => setTimeout(resolve, 800));

              try {
                const screenshotResponse = await fetch(`${API_BASE_URL}/devices/${project.deviceId}/screenshot`, {
                  method: "POST"
                });
                if (screenshotResponse.ok && canSendRef.current) {
                  const screenshotData = await screenshotResponse.json();
                  onScreenshotUpdate?.(screenshotData.screenshotUrl, { persist: true });
                }
              } catch (screenshotError) {
                console.error("스크린샷 재캡처 실패:", screenshotError);
              }
            }

          }
        } catch (parseError) {
          console.warn("액션 JSON 파싱 실패:", parseError);
        }
      }

      if (data.screenshotUrl) {
        onScreenshotUpdate?.(data.screenshotUrl, { persist: true });
      }
    } catch (error) {
      console.error("AI 채팅 오류:", error);
      const errorMsg = (error as Error).message;
      let userFriendlyMessage = `❌ 오류가 발생했습니다: ${errorMsg}`;

      if (
        errorMsg.toLowerCase().includes("fetch failed") ||
        errorMsg.toLowerCase().includes("econnrefused") ||
        errorMsg.toLowerCase().includes("timeout")
      ) {
        userFriendlyMessage =
          `❌ LLaVA 로컬 서버에 연결할 수 없습니다.\n\n` +
          `확인 방법:\n` +
          `1. LM Studio에서 Developer 탭 → Start Local Server가 ON인지 확인하세요.\n` +
          `2. 모델(llava-1.6 등)이 Load 상태인지 확인하세요.\n` +
          `3. 서버 포트 (기본 1234)가 변경되었다면 .env의 LM_STUDIO_API_URL을 맞춰주세요.\n\n` +
          `에러 상세: ${errorMsg}`;
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: userFriendlyMessage,
        timestamp: new Date()
      };
      appendMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!canSend) {
      alert(sessionId ? "이미 종료된 세션입니다. 새 테스트를 시작해주세요." : "테스트 세션을 시작한 후에 메시지를 보낼 수 있습니다.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setInput("");
    await sendToAssistant(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!canSend) return;
      handleSend();
    }
  };

  return (
    <div
      className="surface"
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--border)",
        flex: 1,
        height: "100%",
        minHeight: 0
      }}
    >
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid var(--border)",
          background: "#f8f9fa"
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>LLaVA Assistant</h3>
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
        {messageList.map(message => (
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
            placeholder={
              canSend
                ? "테스트 요청을 입력하세요..."
                : sessionId
                  ? "세션이 종료되어 메시지를 보낼 수 없습니다."
                  : "테스트 세션을 시작하면 입력할 수 있습니다."
            }
            disabled={isLoading || !canSend}
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
            disabled={!input.trim() || isLoading || !canSend}
            style={{
              padding: "10px 20px",
              background: input.trim() && !isLoading && canSend ? "var(--primary)" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: input.trim() && !isLoading && canSend ? "pointer" : "not-allowed",
              fontSize: 14
            }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

