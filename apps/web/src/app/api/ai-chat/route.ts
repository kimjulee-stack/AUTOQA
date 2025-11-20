import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Gemini 모델 설정 (기본값: gemini-1.5-flash)
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  // 최근 메시지만 사용하여 컨텍스트 길이 제한 (최근 10개 메시지)
  const recentMessages = allMessages.slice(-10);
  const historyText = recentMessages
    .map(message => {
      const speaker = message.role === "assistant" ? "어시스턴트" : "사용자";
      const content = String(message.content || "").trim();
      // 메시지 내용이 너무 길면 잘라내기 (각 메시지 최대 300자)
      const truncatedContent = content.length > 300 ? content.substring(0, 300) + "..." : content;
      return `${speaker}: ${truncatedContent}`;
    })
    .join("\n");

  return `${systemInstruction}

${historyText ? `이전 대화:\n${historyText}\n\n` : ""}최신 사용자 요청:
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

  // Gemini API 응답 형식 처리
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
  // ⚠️ 중요: Request Body는 한 번만 읽을 수 있습니다.
  // Next.js 16에서는 request.clone()을 사용하여 body를 복제한 후 읽어야 합니다.
  
  let projectId: string;
  let projectName: string;
  let sessionId: string;
  let messages: Array<{ role: string; content: string }>;
  let latestUserMessage: string;
  let screenshot: { base64: string; mediaType: string } | null;

  // Body 읽기 시도
  // Next.js 16에서는 bodyUsed를 확인할 수 없으므로, 
  // clone()을 먼저 시도하고 실패하면 원본을 사용합니다.
  let body: any;
  
  // bodyUsed 확인 (가능한 경우)
  const bodyUsed = (request as any).bodyUsed;
  if (bodyUsed === true) {
    console.error("[AI Chat] Request body가 이미 사용되었습니다.");
    return NextResponse.json(
      { error: "요청 본문이 이미 읽혔습니다. 페이지를 새로고침하고 다시 시도해주세요." },
      { status: 400 }
    );
  }

  try {
    // 먼저 clone()을 시도하여 body를 복제한 후 읽기
    // 이렇게 하면 원본 request가 이미 읽혔더라도 문제가 없습니다
    const clonedRequest = request.clone();
    body = await clonedRequest.json();
  } catch (cloneError: any) {
    // clone()이 실패하면 원본 request를 직접 읽기 시도
    try {
      body = await request.json();
    } catch (readError: any) {
      // Body가 이미 읽혔거나 손상된 경우
      const errorMessage = readError?.message || cloneError?.message || "알 수 없는 오류";
      if (errorMessage.includes("already been read") || 
          errorMessage.includes("Body is unusable") ||
          errorMessage.includes("bodyUsed")) {
        console.error("[AI Chat] Request body가 이미 읽혔습니다:", {
          cloneError: cloneError?.message,
          readError: readError?.message,
          bodyUsed: bodyUsed
        });
        return NextResponse.json(
          { error: "요청 본문을 읽을 수 없습니다. Next.js의 내부 동작으로 인해 body가 이미 읽혔을 수 있습니다. 페이지를 새로고침하고 다시 시도해주세요." },
          { status: 400 }
        );
      }
      console.error("[AI Chat] Request body 읽기 실패:", {
        cloneError: cloneError?.message,
        readError: readError?.message
      });
      return NextResponse.json(
        { error: "요청 본문을 읽을 수 없습니다." },
        { status: 400 }
      );
    }
  }

  // 읽은 데이터를 즉시 변수에 저장 (body 변수는 이후 사용하지 않음)
  try {
    projectId = body.projectId;
    projectName = body.projectName;
    sessionId = body.sessionId;
    messages = body.messages;
    latestUserMessage = body.latestUserMessage;
    screenshot = body.screenshot || null;
  } catch (error) {
    console.error("[AI Chat] Body 데이터 파싱 실패:", error);
    return NextResponse.json(
      { error: "요청 데이터 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  try {

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

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다. 환경 변수 GEMINI_API_KEY를 설정하세요." },
        { status: 500 }
      );
    }

    const systemInstruction = `당신은 ${projectName || "프로젝트"}의 AI 테스트 어시스턴트입니다.

**앱 제어 기능**
스크린샷을 분석 후 앱을 제어할 수 있습니다. 액션은 JSON 형식으로 응답하세요:

\`\`\`json
{"action": "tap", "x": 500, "y": 800}
\`\`\`

지원 액션:
- tap: {"action": "tap", "x": 숫자, "y": 숫자}
- swipe: {"action": "swipe", "x1": 숫자, "y1": 숫자, "x2": 숫자, "y2": 숫자}
- input: {"action": "input", "text": "텍스트"}
- back: {"action": "back"}
- enter: {"action": "enter"}

응답은 한국어로 작성하세요.`;

    const conversationPrompt = buildUserPrompt(systemInstruction, messages, latestUserMessage);

    // Gemini API 요청 형식 구성
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: conversationPrompt }
    ];

    // 이미지가 있으면 추가
    if (screenshot?.base64) {
      const mediaType = screenshot.mediaType || "image/png";
      parts.push({
        inlineData: {
          mimeType: mediaType,
          data: screenshot.base64
        }
      });
    }

    const geminiRequest = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2000
      },
      systemInstruction: {
        parts: [{ text: "You are a helpful AI test assistant. Respond in Korean." }]
      }
    };

    console.log("[AI Chat] Gemini API 호출 시작", {
      model: GEMINI_MODEL,
      hasImage: !!screenshot?.base64
    });

    logChatMessage(sessionId, "user", latestUserMessage).catch(() => {});

    // Rate limit 오류 발생 시 재시도 로직
    let lastError: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    let response: Response | null = null;
    
    while (retryCount <= maxRetries) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiRequest),
          signal: AbortSignal.timeout(60000) // 60초 타임아웃
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }

          // Rate limit 오류 (429)이고 재시도 가능한 경우
          if (response.status === 429 && retryCount < maxRetries) {
            const retryAfter = response.headers.get("retry-after");
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000; // 지수 백오프
            
            console.warn(`[AI Chat] Rate limit 오류 발생, ${waitTime / 1000}초 후 재시도... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            lastError = { response, errorData };
            continue;
          }

          // 재시도 불가능한 오류
          lastError = { response, errorData };
          break;
        }

        // 성공한 경우
        break;
      } catch (error) {
        if (retryCount < maxRetries && error instanceof Error && error.message.includes("timeout")) {
          console.warn(`[AI Chat] 타임아웃 발생, 재시도 중... (${retryCount + 1}/${maxRetries})`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      return NextResponse.json(
        { error: "API 호출에 실패했습니다." },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      console.error("[AI Chat] Gemini API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        model: GEMINI_MODEL
      });

      let errorMessage = errorData.error?.message || `Gemini API 호출 실패 (${response.status})`;
      
      // API 키 오류
      if (response.status === 400 && (errorMessage.includes("API key") || errorMessage.includes("invalid"))) {
        errorMessage = `Gemini API 키가 유효하지 않습니다.\n\n` +
          `확인 사항:\n` +
          `1. 환경 변수 GEMINI_API_KEY가 올바르게 설정되었는지 확인하세요\n` +
          `2. API 키가 유효한지 확인하세요\n` +
          `3. .env.local 파일에 GEMINI_API_KEY를 추가하세요`;
      }
      // 할당량 초과 (Rate Limit)
      else if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        
        if (errorMessage.includes("quota") || errorMessage.includes("Quota")) {
          // Quota 초과 (월간 사용량 제한)
          errorMessage = `Gemini API 할당량을 초과했습니다.\n\n` +
            `가능한 원인:\n` +
            `1. 일일 사용량 한도 도달\n` +
            `2. 무료 할당량 소진\n\n` +
            `해결 방법:\n` +
            `1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 사용량 확인\n` +
            `2. 다음 날까지 대기\n` +
            `3. Google Cloud Console에서 할당량 증가`;
        } else {
          // Rate Limit (요청 빈도 제한)
          const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
          errorMessage = `요청이 너무 빈번합니다. (Rate Limit)\n\n` +
            `잠시 후 다시 시도해주세요.\n` +
            `권장 대기 시간: ${waitSeconds}초\n\n` +
            `해결 방법:\n` +
            `1. ${waitSeconds}초 후 다시 시도\n` +
            `2. 요청 빈도를 줄이세요`;
        }
      }
      // 서버 오류
      else if (response.status >= 500) {
        errorMessage = `Gemini 서버 오류가 발생했습니다.\n\n` +
          `잠시 후 다시 시도하세요.`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status >= 500 ? 500 : 400 }
      );
    }

    const data = await response.json();
    
    // Gemini API 응답 구조 확인 및 처리
    if (!data.candidates || data.candidates.length === 0) {
      console.error("[AI Chat] Gemini API 응답에 candidates가 없습니다:", data);
      throw new Error("Gemini API가 응답을 생성하지 못했습니다.");
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      console.warn("[AI Chat] Gemini API finishReason:", candidate.finishReason);
    }

    const rawContent = candidate?.content?.parts?.[0]?.text;
    const message = extractMessageText(rawContent);
    
    if (!message || message.trim().length === 0) {
      console.error("[AI Chat] Gemini API 응답이 비어있습니다:", data);
      throw new Error("Gemini API가 빈 응답을 반환했습니다.");
    }

    logChatMessage(sessionId, "assistant", message).catch(() => {});

    console.log("[AI Chat] Gemini API 응답 성공");

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[AI Chat] 예상치 못한 오류:", error);
    
    let errorMessage = "알 수 없는 오류가 발생했습니다.";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 네트워크 오류인 경우
      if (error.message.includes("fetch failed") || 
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("timeout")) {
        errorMessage = `Gemini API 서버에 연결할 수 없습니다.\n\n` +
          `확인 사항:\n` +
          `1. 인터넷 연결을 확인하세요\n` +
          `2. Gemini API 서버 상태를 확인하세요\n` +
          `3. 방화벽 설정을 확인하세요\n\n` +
          `에러 상세: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
