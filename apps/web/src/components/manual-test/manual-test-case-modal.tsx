"use client";

import { useEffect, useState } from "react";

import type { ManualTestCase, ManualVerificationResult } from "@/types";

interface ManualTestCaseModalProps {
  testCase: ManualTestCase;
  onClose: () => void;
  onSave: (updates: {
    verificationResult?: ManualVerificationResult;
    btsId?: string;
    reporterNote?: string;
  }) => Promise<void>;
}

const RESULT_OPTIONS: { label: string; value: ManualVerificationResult }[] = [
  { label: "P (Pass)", value: "P" },
  { label: "F (Fail)", value: "F" },
  { label: "NT (Not Tested)", value: "NT" },
  { label: "N (Not Applicable)", value: "N" }
];

export function ManualTestCaseModal({ testCase, onClose, onSave }: ManualTestCaseModalProps) {
  const [verificationResult, setVerificationResult] = useState<ManualVerificationResult | undefined>(
    testCase.verificationResult
  );
  const [btsId, setBtsId] = useState(testCase.btsId ?? "");
  const [reporterNote, setReporterNote] = useState(testCase.reporterNote ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVerificationResult(testCase.verificationResult);
    setBtsId(testCase.btsId ?? "");
    setReporterNote(testCase.reporterNote ?? "");
  }, [testCase]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        verificationResult,
        btsId: btsId.trim() || undefined,
        reporterNote: reporterNote.trim() || undefined
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
      <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24
      }}
      role="dialog"
      aria-modal
    >
      <div
        className="surface"
        style={{
          width: "min(720px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{testCase.title}</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
              생성일 {new Date(testCase.createdAt).toLocaleString("ko-KR")}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--text-muted)"
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {testCase.objective && <InfoRow label="테스트 목적">{testCase.objective}</InfoRow>}
          {testCase.preconditions && <InfoRow label="사전 조건">{testCase.preconditions}</InfoRow>}
          {testCase.steps && testCase.steps.length > 0 && (
            <InfoRow label="테스트 단계">
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {testCase.steps.map((step, index) => (
                  <li key={`${testCase.id}-step-${index}`} style={{ marginBottom: 6 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </InfoRow>
          )}
          {testCase.expectedResult && <InfoRow label="기대 결과">{testCase.expectedResult}</InfoRow>}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>테스트 결과 입력</h3>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            검증결과 (P/F/NT/N)
            <select
              value={verificationResult ?? ""}
              onChange={event => setVerificationResult((event.target.value || undefined) as ManualVerificationResult | undefined)}
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "8px 10px", fontSize: 14 }}
            >
              <option value="">선택하세요</option>
              {RESULT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            BTS-ID
            <input
              value={btsId}
              onChange={event => setBtsId(event.target.value)}
              placeholder="버그 추적 시스템 ID"
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "8px 10px", fontSize: 14 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            비고 (오류 보고 내용)
            <textarea
              value={reporterNote}
              onChange={event => setReporterNote(event.target.value)}
              rows={4}
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "10px 12px", fontSize: 14, resize: "none" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            닫기
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--primary)",
              color: "#1c1d21",
              fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer"
            }}
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

