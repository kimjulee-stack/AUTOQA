import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const LLM_API_URL = process.env.LM_STUDIO_API_URL ?? "http://localhost:1234/v1/chat/completions";
const LLM_MODEL = process.env.LM_STUDIO_MODEL ?? "llava";

export const runtime = "nodejs";

async function logChatMessage(sessionId: string, role: "user" | "assistant", content: string) {
  try {
    await fetch(`${API_BASE_URL}/ai-test-sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role, content })
    });
  } catch (error) {
    console.error("[AI Chat] 메시지 저장 실패:", error);
  }
}

function buildUserPrompt(
  systemInstruction: string,
  allMessages: Array<{ role: string; content: string }>,
  latestUserMessage: string
) {
  const historyText = allMessages
    .map(message => {
      const speaker = message.role === "assistant" ? "어시스턴트" : "사용자";
      return `${speaker}: ${String(message.content || "").trim()}`;
    })
    .join("\n");

  return `${systemInstruction}

이전 대화:
${historyText}

최신 사용자 요청:
${latestUserMessage}

위 스크린샷을 참고하여 UI 깨짐, 정렬 문제, 버튼 노출 여부 등을 분석하고 필요한 경우 액션 JSON을 포함해 응답하세요.`;
}

function extractMessageText(content: unknown): string {
  if (!content) {
    return "응답을 생성할 수 없습니다.";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const combined = content
      .map(part => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof (part as any).text === "string") {
          return (part as any).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    return combined || "응답을 생성할 수 없습니다.";
  }

  if (typeof content === "object" && content !== null && "text" in content && typeof (content as any).text === "string") {
    return (content as any).text;
  }

  return "응답을 생성할 수 없습니다.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectName, sessionId, messages, latestUserMessage, screenshot } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "메시지가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "세션 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!latestUserMessage || typeof latestUserMessage !== "string") {
      return NextResponse.json(
        { error: "사용자 메시지가 필요합니다." },
        { status: 400 }
      );
    }

    const systemInstruction = `당신은 ${projectName || "프로젝트"}의 AI 테스트 어시스턴트입니다. 
사용자의 요청에 따라 테스트를 수행하고 결과를 제공해야 합니다.
프로젝트 정보:
- 프로젝트명: ${projectName || "미지정"}
- 프로젝트 ID: ${projectId || "미지정"}

**중요: 앱 제어 기능**
스크린샷을 분석한 후, 앱을 직접 제어하여 테스트를 수행할 수 있습니다.
액션을 실행하려면 다음 JSON 형식으로 응답하세요:

\`\`\`json
{
  "action": "tap",
  "x": 500,
  "y": 800
}
\`\`\`

지원하는 액션:
1. tap: 좌표 클릭 - {"action": "tap", "x": 숫자, "y": 숫자}
2. swipe: 스와이프 - {"action": "swipe", "x1": 숫자, "y1": 숫자, "x2": 숫자, "y2": 숫자, "duration": 숫자(선택)}
3. input: 텍스트 입력 - {"action": "input", "text": "입력할 텍스트"}
4. back: 뒤로가기 - {"action": "back"}
5. enter: 엔터 키 - {"action": "enter"}

**테스트 프로세스:**
1. 스크린샷을 분석하여 현재 UI 상태 파악
2. 테스트 목표에 맞는 액션 결정
3. JSON 형식으로 액션 반환
4. 액션 실행 후 새로운 스크린샷으로 결과 확인
5. 이슈 발견 시 상세히 보고

**응답 형식:**
- 일반 설명: 일반 텍스트로 응답
- 액션 실행: JSON 블록으로 액션 반환
- 이슈 발견: "이슈 발견: [설명]" 형식으로 보고

응답은 한국어로 작성하세요.`;

    const conversationPrompt = buildUserPrompt(systemInstruction, messages, latestUserMessage);
    const userMessageContent: Array<{ type: "text" | "image_url"; text?: string; image_url?: string }> = [
      {
        type: "text",
        text: conversationPrompt
      }
    ];

    if (screenshot?.base64) {
      const mediaType = screenshot.mediaType || "image/png";
      userMessageContent.push({
        type: "image_url",
        image_url: `data:${mediaType};base64,${screenshot.base64}`
      });
    }

    const llmMessages = [
      {
        role: "user",
        content: userMessageContent
      }
    ];

    console.log("[AI Chat] LLaVA API 호출 시작", {
      model: LLM_MODEL,
      messageCount: llmMessages.length
    });

    logChatMessage(sessionId, "user", latestUserMessage).catch(() => {});

    const response = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: llmMessages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      console.error("[AI Chat] LLaVA API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      const errorMessage = errorData.error?.message || `LLaVA API 호출 실패 (${response.status})`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status >= 500 ? 500 : 400 }
      );
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const message = extractMessageText(rawContent);

    logChatMessage(sessionId, "assistant", message).catch(() => {});

    console.log("[AI Chat] LLaVA API 응답 성공");

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[AI Chat] 예상치 못한 오류:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
