"use client";

import { useEffect, useRef, useState } from "react";

import type { ManualChatMessage } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ManualAiChatProps {
  sessionId: string | null;
  sessionTitle: string;
  isSessionActive: boolean;
  initialMessages?: ManualChatMessage[];
  onMessagesPersist?: () => void;
  onAssistantMessage?: (content: string) => void;
}

function createGreeting(title: string): Message[] {
  return [
    {
      id: "manual-greeting",
      role: "assistant",
      content: `안녕하세요! "${title}" 세션의 매뉴얼 테스트 어시스턴트입니다. 기획 의도나 테스트하고 싶은 기능을 설명해주세요.`,
      timestamp: new Date()
    }
  ];
}

export function ManualAiChat({
  sessionId,
  sessionTitle,
  isSessionActive,
  initialMessages = [],
  onMessagesPersist,
  onAssistantMessage
}: ManualAiChatProps) {
  const [messageList, setMessageList] = useState<Message[]>(createGreeting(sessionTitle));
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messageList);

  useEffect(() => {
    messagesRef.current = messageList;
  }, [messageList]);

  useEffect(() => {
    if (!sessionId) {
      setMessageList(createGreeting(sessionTitle));
      return;
    }

    if (initialMessages.length === 0) {
      setMessageList(createGreeting(sessionTitle));
      return;
    }

    setMessageList(
      initialMessages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: new Date(message.createdAt)
      }))
    );
  }, [initialMessages, sessionId, sessionTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList]);

  const appendMessage = (message: Message) => {
    const updated = [...messagesRef.current, message];
    setMessageList(updated);
    return updated;
  };

  const sendMessage = async (content: string) => {
    if (!sessionId) {
      alert("세션을 먼저 시작해 주세요.");
      return;
    }
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date()
    };
    const conversation = appendMessage(userMessage);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          sessionId,
          projectId: sessionId,
          projectName: sessionTitle,
          latestUserMessage: userMessage.content,
          messages: conversation.map(m => ({ role: m.role, content: m.content }))
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
        id: `${Date.now()}_assistant`,
        role: "assistant",
        content: data.message || "응답을 생성할 수 없습니다.",
        timestamp: new Date()
      };
      appendMessage(assistantMessage);
      onMessagesPersist?.();
      onAssistantMessage?.(assistantMessage.content);
    } catch (error) {
      console.error("Manual AI chat error:", error);
      appendMessage({
        id: `${Date.now()}_error`,
        role: "assistant",
        content: `❌ 오류가 발생했습니다: ${(error as Error).message}`,
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!isSessionActive) {
      alert("세션을 시작한 후 메시지를 보낼 수 있습니다.");
      return;
    }
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="surface" style={{ display: "flex", flexDirection: "column", height: "100%", borderRadius: 12 }}>
      <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI 대화</h3>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          기획 의도를 입력하면 AI가 테스트 케이스를 제안합니다.
        </p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messageList.map(message => (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: message.role === "user" ? "flex-end" : "flex-start",
              gap: 4
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
              {message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        {isLoading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>AI가 응답을 생성 중...</span>}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ borderTop: "1px solid var(--border)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={sessionId ? "테스트 시나리오나 기획 의도를 입력하세요." : "세션을 시작해야 입력할 수 있습니다."}
          rows={3}
          disabled={!isSessionActive || isLoading || !sessionId}
          style={{
            width: "100%",
            resize: "none",
            borderRadius: 10,
            border: "1px solid var(--border)",
            padding: "10px 12px",
            fontSize: 14
          }}
        />
        <button
          onClick={handleSend}
          disabled={!isSessionActive || !input.trim() || isLoading || !sessionId}
          style={{
            alignSelf: "flex-end",
            background: !isSessionActive || !input.trim() || isLoading || !sessionId ? "#d1d5db" : "var(--primary)",
            color: !isSessionActive || !input.trim() || isLoading || !sessionId ? "#6b7280" : "#1f2937",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 700,
            cursor: !isSessionActive || !input.trim() || isLoading || !sessionId ? "not-allowed" : "pointer"
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}

