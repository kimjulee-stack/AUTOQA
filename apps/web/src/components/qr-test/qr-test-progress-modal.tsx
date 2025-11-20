"use client";

export type QrTestStageKey = "scanning" | "intro" | "learning" | "completed";
export type QrTestPhase = QrTestStageKey | "idle" | "error";

interface QrTestProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  disableClose?: boolean;
  status: QrTestPhase;
  currentStage: QrTestStageKey;
  currentQrIndex: number;
  totalQr: number;
  learningType?: string | null;
  learningLanguage?: string | null;
  deviceModel?: string | null;
  error?: string | null;
}

type StageStatus = "pending" | "running" | "completed" | "failed";

const stageFlow: Array<{ key: QrTestStageKey; label: string; description: string }> = [
  { key: "scanning", label: "QR 촬영", description: "단말 카메라로 QR 코드를 인식합니다." },
  { key: "intro", label: "인트로 감지", description: "학습 시작 화면 캡처 및 감지." },
  { key: "learning", label: "학습 진행", description: "콘텐츠 진행 및 상태 모니터링." },
  { key: "completed", label: "완료 캡처", description: "학습 완료 화면을 캡처합니다." }
];

const statusText: Record<QrTestPhase, string> = {
  idle: "대기 중",
  scanning: "QR 코드 촬영 중",
  intro: "인트로 화면 감지 중",
  learning: "학습 진행 중",
  completed: "모든 QR 테스트 완료",
  error: "오류가 발생했습니다."
};

export function QrTestProgressModal({
  isOpen,
  onClose,
  disableClose,
  status,
  currentStage,
  currentQrIndex,
  totalQr,
  learningType,
  learningLanguage,
  deviceModel,
  error
}: QrTestProgressModalProps) {
  if (!isOpen) return null;

  const stageOrder: QrTestStageKey[] = ["scanning", "intro", "learning", "completed"];
  const activeIndex = stageOrder.indexOf(currentStage);

  const getStageStatus = (stage: QrTestStageKey): StageStatus => {
    const stageIndex = stageOrder.indexOf(stage);

    if (status === "error") {
      if (stageIndex < activeIndex) return "completed";
      if (stageIndex === activeIndex) return "failed";
      return "pending";
    }

    if (status === "completed") {
      return "completed";
    }

    if (stageIndex < activeIndex) return "completed";
    if (stageIndex === activeIndex) {
      return status === "idle" ? "pending" : "running";
    }
    return "pending";
  };

  const handleClose = () => {
    if (disableClose) return;
    onClose();
  };

  const displayedIndex =
    currentQrIndex > 0 ? currentQrIndex : status === "completed" ? totalQr : Math.max(currentQrIndex, 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          minWidth: 460,
          maxWidth: 600,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(15,23,42,0.25)"
        }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>QR 테스트 진행 상황</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{statusText[status]}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={disableClose}
            style={{
              border: "none",
              background: disableClose ? "#e5e7eb" : "transparent",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 20,
              cursor: disableClose ? "not-allowed" : "pointer",
              color: "#6b7280"
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 16,
            flexWrap: "wrap"
          }}
        >
          <span>
            현재 QR:{" "}
            <strong style={{ color: "var(--text-strong)" }}>
              {totalQr > 0 ? `${Math.min(displayedIndex, totalQr)}/${totalQr}` : "-"}
            </strong>
          </span>
          {learningLanguage && (
            <span>
              학습: <strong style={{ color: "var(--text-strong)" }}>{learningLanguage}</strong>
            </span>
          )}
          {learningType && (
            <span>
              타입: <strong style={{ color: "var(--text-strong)" }}>{learningType}</strong>
            </span>
          )}
          {deviceModel && (
            <span>
              단말: <strong style={{ color: "var(--text-strong)" }}>{deviceModel}</strong>
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {stageFlow.map(stage => {
            const stageStatus = getStageStatus(stage.key);
            const background =
              stageStatus === "completed"
                ? "#dcfce7"
                : stageStatus === "running"
                  ? "#dbeafe"
                  : stageStatus === "failed"
                    ? "#fee2e2"
                    : "#f3f4f6";
            const color =
              stageStatus === "completed"
                ? "#15803d"
                : stageStatus === "running"
                  ? "#1d4ed8"
                  : stageStatus === "failed"
                    ? "#b91c1c"
                    : "#6b7280";
            const icon =
              stageStatus === "completed"
                ? "✓"
                : stageStatus === "running"
                  ? "▶"
                  : stageStatus === "failed"
                    ? "✗"
                    : "○";

            return (
              <div
                key={stage.key}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background,
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 14, color: "#111827" }}>{stage.label}</strong>
                    <span style={{ fontSize: 11, color }}>
                      {stageStatus === "completed"
                        ? "완료"
                        : stageStatus === "running"
                          ? "진행 중"
                          : stageStatus === "failed"
                            ? "실패"
                            : "대기"}
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>{stage.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {status === "error" && error && (
          <div style={{ marginTop: 16, padding: 16, background: "#fef2f2", borderRadius: 12, color: "#991b1b" }}>
            <strong style={{ display: "block", marginBottom: 6 }}>오류 내용</strong>
            <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{error}</p>
          </div>
        )}

        {status === "completed" && (
          <div style={{ marginTop: 16, padding: 16, background: "#dcfce7", borderRadius: 12, color: "#166534" }}>
            모든 QR 테스트가 완료되었습니다.
          </div>
        )}
      </div>
    </div>
  );
}

