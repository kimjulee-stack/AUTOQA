"use client";

import { useState, useRef, useEffect } from "react";

import { QrTestProgressModal, QrTestPhase, QrTestStageKey } from "./qr-test-progress-modal";
import type { Project } from "@/types";

interface QrTestWorkspaceProps {
  project: Project;
}

type LearningType =
  | "입문"
  | "테마"
  | "리뷰"
  | "현지톡"
  | "현지단어"
  | "필수표현"
  | "핸디북"
  | "스타터"
  | "부스터"
  | "마스터"
  | "발음"
  | "학습"
  | "에피소드 퀴즈"
  | "실전회화"
  | "핵심"
  | "확장"
  | "단어"
  | "파닉스"
  | "문장"
  | "알파벳"
  | "말하기";

interface QrImage {
  id: string;
  file: File;
  preview: string;
  order: number;
  language: string;
}

export function QrTestWorkspace({ project }: QrTestWorkspaceProps) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  
  const [qrImages, setQrImages] = useState<QrImage[]>([]);
  const learningLanguages = ["처음영어", "토크", "왕초보스피킹", "왕초보여행영어", "일본어", "여행일본어", "중국어", "스페인어", "프랑스어"];
  const learningTypeOptions: Record<string, LearningType[]> = {
    여행일본어: ["현지단어", "필수표현", "현지톡", "핸디북"],
    일본어: ["입문", "테마"],
    중국어: ["입문", "테마"],
    왕초보여행영어: ["스타터", "부스터", "마스터", "핸디북"],
    토크: ["발음", "학습", "에피소드 퀴즈", "실전회화"],
    왕초보스피킹: ["입문", "핵심", "확장"],
    처음영어: ["단어", "파닉스", "문장", "알파벳", "말하기"],
    스페인어: ["입문", "테마", "리뷰", "현지톡"],
    프랑스어: ["입문", "테마", "리뷰", "현지톡"]
  };

  const handleProgressModalClose = () => {
    if (isRunning) return;
    setIsProgressModalOpen(false);
  };

  const [selectedDeviceModel, setSelectedDeviceModel] = useState<string | null>(null);
  const [selectedLearningLanguage, setSelectedLearningLanguage] = useState<string | null>(null);
  const [selectedLearningType, setSelectedLearningType] = useState<LearningType | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentQrIndex, setCurrentQrIndex] = useState<number>(-1);
  const [testStatus, setTestStatus] = useState<QrTestPhase>("idle");
  const [currentStageKey, setCurrentStageKey] = useState<QrTestStageKey>("scanning");
  const [screenshots, setScreenshots] = useState<Array<{
    qrOrder: number;
    learningType: LearningType;
    intro?: string;
    completed?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayedQr, setDisplayedQr] = useState<{ url: string; expiresAt: number; language?: string } | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [totalQrCount, setTotalQrCount] = useState(0);

  const updateTestStatus = (phase: QrTestPhase) => {
    setTestStatus(phase);
    if (phase === "scanning" || phase === "intro" || phase === "learning" || phase === "completed") {
      setCurrentStageKey(phase);
    }
  };

  useEffect(() => {
    if (!displayedQr) return;
    const remaining = displayedQr.expiresAt - Date.now();
    if (remaining <= 0) {
      setDisplayedQr(null);
      return;
    }
    const timer = setTimeout(() => setDisplayedQr(null), remaining);
    return () => clearTimeout(timer);
  }, [displayedQr]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedLearningLanguage) {
      setError("먼저 학습을 선택한 후 이미지를 업로드하세요.");
      e.target.value = "";
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: QrImage[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      order: qrImages.length + index + 1,
      language: selectedLearningLanguage
    }));

    setQrImages(prev => [...prev, ...newImages]);
    
    // input 초기화하여 같은 파일도 다시 선택 가능하도록
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeQrImage = (id: string) => {
    setQrImages(prev => {
      const removed = prev.filter(img => img.id !== id);
      // 순서 재정렬
      return removed.map((img, index) => ({ ...img, order: index + 1 }));
    });
  };

  const moveQrImage = (id: string, direction: "up" | "down") => {
    setQrImages(prev => {
      const index = prev.findIndex(img => img.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newImages = [...prev];
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      
      // 순서 재정렬
      return newImages.map((img, idx) => ({ ...img, order: idx + 1 }));
    });
  };

  const captureScreenshot = async (): Promise<string | null> => {
    if (!project.deviceId || project.platform === "web") {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/devices/${project.deviceId}/screenshot`, {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.screenshotUrl || null;
      }
    } catch (error) {
      console.error("스크린샷 캡처 실패:", error);
    }
    
    return null;
  };

  const detectScreen = async (learningType: LearningType): Promise<"intro" | "completed" | "other"> => {
    // TODO: 실제 화면 감지 로직 구현
    // 학습 타입별로 다른 화면 감지 로직 필요
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 학습 인트로 화면 감지 (예: 특정 텍스트나 요소 확인)
    // 학습 종료 화면 감지 (예: 종료 팝업 확인)
    
    // 임시로 상태에 따라 반환
    if (testStatus === "intro") return "intro";
    if (testStatus === "completed") return "completed";
    return "other";
  };

  const processLearningFlow = async (learningType: LearningType, qrImage: QrImage): Promise<{
    intro?: string;
    completed?: string;
  }> => {
    const result: { intro?: string; completed?: string } = {};

    // 학습 타입별 다른 플로우 처리
    switch (learningType) {
      case "입문":
        // 입문 학습 플로우
        updateTestStatus("intro");
        await new Promise(resolve => setTimeout(resolve, 2000));
        result.intro = await captureScreenshot() || undefined;
        
        updateTestStatus("learning");
        // 입문 학습 진행 대기
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        updateTestStatus("completed");
        await new Promise(resolve => setTimeout(resolve, 1000));
        result.completed = await captureScreenshot() || undefined;
        break;

      case "테마":
        // 테마 학습 플로우
        updateTestStatus("intro");
        await new Promise(resolve => setTimeout(resolve, 2000));
        result.intro = await captureScreenshot() || undefined;
        
        updateTestStatus("learning");
        // 테마 학습 진행 대기
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        updateTestStatus("completed");
        await new Promise(resolve => setTimeout(resolve, 1000));
        result.completed = await captureScreenshot() || undefined;
        break;

      case "리뷰":
        // 리뷰 학습 플로우
        updateTestStatus("intro");
        await new Promise(resolve => setTimeout(resolve, 2000));
        result.intro = await captureScreenshot() || undefined;
        
        updateTestStatus("learning");
        // 리뷰 학습 진행 대기
        await new Promise(resolve => setTimeout(resolve, 7000));
        
        updateTestStatus("completed");
        await new Promise(resolve => setTimeout(resolve, 1000));
        result.completed = await captureScreenshot() || undefined;
        break;

      case "현지톡":
        // 현지톡 학습 플로우
        updateTestStatus("intro");
        await new Promise(resolve => setTimeout(resolve, 2000));
        result.intro = await captureScreenshot() || undefined;
        
        updateTestStatus("learning");
        // 현지톡 학습 진행 대기
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        updateTestStatus("completed");
        await new Promise(resolve => setTimeout(resolve, 1000));
        result.completed = await captureScreenshot() || undefined;
        break;
    }

    return result;
  };

  const startQrTest = async () => {
    if (
      qrImages.length === 0 ||
      !selectedLearningLanguage ||
      !selectedDeviceModel ||
      !selectedLearningType ||
      !project.deviceId ||
      project.platform === "web"
    ) {
      setError("QR 코드 이미지, 단말 선택, 학습 선택, 학습 타입 선택, USB 연결된 디바이스가 필요합니다.");
      return;
    }

    setIsRunning(true);
    setError(null);
    updateTestStatus("scanning");
    setScreenshots([]);
    setCurrentQrIndex(0);
    setIsProgressModalOpen(true);
    setTotalQrCount(0);

    try {
      // 정렬된 순서대로 QR 코드 처리
    const sortedImages = [...qrImages]
      .filter(image => image.language === selectedLearningLanguage)
      .sort((a, b) => a.order - b.order);

    if (sortedImages.length === 0) {
      setError(`${selectedLearningLanguage} 학습에 해당하는 QR 이미지가 없습니다.`);
      setIsRunning(false);
      updateTestStatus("idle");
      setCurrentQrIndex(-1);
      setIsProgressModalOpen(false);
      return;
    }

    setTotalQrCount(sortedImages.length);

      for (let i = 0; i < sortedImages.length; i++) {
        const qrImage = sortedImages[i];
        setCurrentQrIndex(i + 1);

        // 1. QR 코드 이미지를 디바이스에 전송하고 카메라로 촬영하도록 지시
        const formData = new FormData();
        formData.append("qrImage", qrImage.file);
        formData.append("learningType", selectedLearningType);
        formData.append("learningLanguage", selectedLearningLanguage);

        if (qrImage.preview) {
          setDisplayedQr({ url: qrImage.preview, expiresAt: Date.now() + 15000, language: qrImage.language });
        }

        const uploadResponse = await fetch(`${API_BASE_URL}/devices/${project.deviceId}/qr-scan`, {
          method: "POST",
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error(`QR 코드 ${qrImage.order} 전송 실패`);
        }

        // 2. QR 코드 촬영 대기 (카메라 앱이 열리고 촬영될 때까지)
        updateTestStatus("scanning");
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. 학습 타입별 플로우 처리
        const flowResult = await processLearningFlow(selectedLearningType, qrImage);

        // 4. 결과 저장
        setScreenshots(prev => [...prev, {
          qrOrder: qrImage.order,
          learningType: selectedLearningType,
          intro: flowResult.intro,
          completed: flowResult.completed
        }]);

        // 다음 QR 코드로 넘어가기 전 대기
        if (i < sortedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      updateTestStatus("completed");
      setCurrentQrIndex(-1);
    } catch (err) {
      console.error("QR 테스트 실패:", err);
      setError((err as Error).message || "QR 테스트 중 오류가 발생했습니다.");
      updateTestStatus("error");
      setCurrentQrIndex(-1);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>테스트 실행 공간</h2>
      </div>

      {/* 단말 선택 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          단말 선택
        </label>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
          테스트에 사용할 단말을 선택하세요. 선택한 단말로 QR 코드 촬영이 진행됩니다.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["BR8400", "BR10100"].map(model => (
            <button
              key={model}
              onClick={() => setSelectedDeviceModel(model)}
              disabled={isRunning}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: selectedDeviceModel === model ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: selectedDeviceModel === model ? "var(--primary-light)" : "#fff",
                color: selectedDeviceModel === model ? "var(--primary-dark)" : "var(--text)",
                fontWeight: selectedDeviceModel === model ? 700 : 500,
                cursor: isRunning ? "not-allowed" : "pointer",
                minWidth: 120
              }}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      {/* 학습 선택 (언어) */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          학습 선택
        </label>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
          학습할 언어를 선택하세요. 선택된 언어에 따라 학습 타입이 달라집니다.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {learningLanguages.map(language => (
            <button
              key={language}
              onClick={() => {
                setSelectedLearningLanguage(language);
                // 학습 타입은 언어 선택 변경 시 초기화
                setSelectedLearningType(null);
              }}
              disabled={isRunning}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: selectedLearningLanguage === language ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: selectedLearningLanguage === language ? "var(--primary-light)" : "#fff",
                color: selectedLearningLanguage === language ? "var(--primary-dark)" : "var(--text)",
                fontWeight: selectedLearningLanguage === language ? 700 : 500,
                cursor: isRunning ? "not-allowed" : "pointer",
                minWidth: 100
              }}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      {/* 학습 타입 선택 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          학습 타입 선택
        </label>
        {selectedLearningLanguage && learningTypeOptions[selectedLearningLanguage] ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {learningTypeOptions[selectedLearningLanguage].map(type => (
              <button
                key={type}
                onClick={() => setSelectedLearningType(type)}
                disabled={isRunning}
                style={{
                  padding: "8px 16px",
                  background: selectedLearningType === type ? "var(--primary)" : "#fff",
                  color: selectedLearningType === type ? "#fff" : "var(--text)",
                  border: `1px solid ${selectedLearningType === type ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 6,
                  cursor: isRunning ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: selectedLearningType === type ? 600 : 400
                }}
              >
                {type}
              </button>
            ))}
          </div>
        ) : selectedLearningLanguage ? (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: "#f6f7fb",
              border: "1px dashed var(--border)",
              color: "var(--text-muted)",
              fontSize: 13
            }}
          >
            선택한 학습의 타입은 준비 중입니다.
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: "#f6f7fb",
              border: "1px dashed var(--border)",
              color: "var(--text-muted)",
              fontSize: 13
            }}
          >
            먼저 학습을 선택하면 학습 타입을 고를 수 있습니다.
          </div>
        )}
      </div>

      {/* QR 코드 이미지 업로드 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          QR 코드 이미지
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isRunning}
          style={{
            padding: "8px 16px",
            background: isRunning ? "#ddd" : "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: isRunning ? "not-allowed" : "pointer",
            fontSize: 14,
            marginBottom: 16
          }}
        >
          이미지 추가
        </button>

        {/* 업로드된 QR 코드 이미지 목록 */}
        {qrImages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {qrImages
              .sort((a, b) => a.order - b.order)
              .map((qrImage) => (
                <div
                  key={qrImage.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff"
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, minWidth: 40, textAlign: "center" }}>
                    #{qrImage.order}
                  </div>
                  <div style={{ position: "relative", width: 100, height: 100, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <img
                      src={qrImage.preview}
                      alt={`QR 코드 ${qrImage.order}`}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: "var(--text-muted)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{qrImage.file.name}</div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(80,156,255,0.15)",
                        fontSize: 11,
                        fontWeight: 600
                      }}
                    >
                      {qrImage.language}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => moveQrImage(qrImage.id, "up")}
                      disabled={isRunning || qrImage.order === 1}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: (isRunning || qrImage.order === 1) ? "not-allowed" : "pointer"
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveQrImage(qrImage.id, "down")}
                      disabled={isRunning || qrImage.order === qrImages.length}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: (isRunning || qrImage.order === qrImages.length) ? "not-allowed" : "pointer"
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeQrImage(qrImage.id)}
                      disabled={isRunning}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        background: "#fee",
                        color: "#c00",
                        cursor: isRunning ? "not-allowed" : "pointer"
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {displayedQr && (
        <div
          style={{
            padding: 16,
            border: "1px solid var(--primary-light)",
            background: "rgba(80,156,255,0.08)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>현재 표시 중인 QR 코드 {displayedQr.language ? `· ${displayedQr.language}` : ""}</strong>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>약 15초 후 자동 종료</span>
          </div>
          <div
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "#fff",
              padding: 16,
              display: "flex",
              justifyContent: "center"
            }}
          >
            <img
              src={displayedQr.url}
              alt="현재 QR 코드"
              style={{ width: "100%", maxWidth: 260, objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* 테스트 실행 버튼 */}
      <div>
        <button
          onClick={startQrTest}
          disabled={
            qrImages.length === 0 ||
            !selectedLearningLanguage ||
            !selectedLearningType ||
            !selectedDeviceModel ||
            isRunning ||
            !project.deviceId ||
            project.platform === "web"
          }
          style={{
            padding: "12px 24px",
            background: (
              qrImages.length === 0 ||
              !selectedLearningLanguage ||
              !selectedLearningType ||
              !selectedDeviceModel ||
              isRunning ||
              !project.deviceId ||
              project.platform === "web"
            )
              ? "#ddd"
              : "var(--primary)",
            color: (
              qrImages.length === 0 ||
              !selectedLearningLanguage ||
              !selectedLearningType ||
              !selectedDeviceModel ||
              isRunning ||
              !project.deviceId ||
              project.platform === "web"
            )
              ? "var(--text-muted)"
              : "#fff",
            border: "none",
            borderRadius: 6,
            cursor: (
              qrImages.length === 0 ||
              !selectedLearningLanguage ||
              !selectedLearningType ||
              !selectedDeviceModel ||
              isRunning ||
              !project.deviceId ||
              project.platform === "web"
            )
              ? "not-allowed"
              : "pointer",
            fontSize: 16,
            fontWeight: 600
          }}
        >
          {isRunning 
            ? `QR 테스트 실행 중... (${currentQrIndex > 0 ? `${currentQrIndex}/${qrImages.length}` : ""})`
            : "QR 테스트 시작"
          }
        </button>
      </div>

      {/* 테스트 상태 */}
      {testStatus !== "idle" && (
        <div style={{ padding: 16, background: "#f8f9fa", borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>테스트 상태</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {testStatus === "scanning" && `QR 코드 ${currentQrIndex > 0 ? currentQrIndex : ""} 촬영 중...`}
            {testStatus === "intro" && `학습 인트로 화면 감지 중...`}
            {testStatus === "learning" && `학습 진행 중...`}
            {testStatus === "completed" && "✅ 모든 QR 테스트 완료"}
            {testStatus === "error" && "❌ 테스트 실패"}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div style={{ padding: 16, background: "#fee", color: "#c00", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* 스크린샷 결과 */}
      {screenshots.length > 0 && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>캡처된 스크린샷</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {screenshots.map((screenshot, index) => (
              <div key={index} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                  QR 코드 #{screenshot.qrOrder} - {screenshot.learningType} 학습
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {screenshot.intro && (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>학습 인트로 화면</div>
                      <img
                        src={screenshot.intro}
                        alt={`QR ${screenshot.qrOrder} 인트로 화면`}
                        style={{ maxWidth: 400, maxHeight: 600, border: "1px solid var(--border)", borderRadius: 8 }}
                      />
                    </div>
                  )}
                  {screenshot.completed && (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>학습 종료 화면</div>
                      <img
                        src={screenshot.completed}
                        alt={`QR ${screenshot.qrOrder} 종료 화면`}
                        style={{ maxWidth: 400, maxHeight: 600, border: "1px solid var(--border)", borderRadius: 8 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <QrTestProgressModal
        isOpen={isProgressModalOpen}
        onClose={handleProgressModalClose}
        disableClose={isRunning}
        status={testStatus}
        currentStage={currentStageKey}
        currentQrIndex={currentQrIndex}
        totalQr={totalQrCount}
        learningType={selectedLearningType}
        learningLanguage={selectedLearningLanguage}
        deviceModel={selectedDeviceModel}
        error={error}
      />
    </div>
  );
}
