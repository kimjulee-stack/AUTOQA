"use client";

import { useRouter } from "next/navigation";
import type { DashboardSummary } from "@/types";

const statusChips = [
  { label: "정상", color: "#5ac08a" },
  { label: "오류", color: "#ff6c6c" },
  { label: "경고", color: "#f4c359" },
  { label: "정지", color: "#90a4ae" },
  { label: "장애", color: "#b0bec5" },
  { label: "대기", color: "#6b7180" }
];

function formatDuration(ms: number) {
  if (ms <= 0) return "0초";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours) return `${hours}시간 ${minutes % 60}분`;
  if (minutes) return `${minutes}분 ${seconds % 60}초`;
  return `${seconds}초`;
}

interface DashboardSummaryCardProps {
  summary: DashboardSummary;
  projects?: Array<{ id: string; name: string; scheduleStatus?: string; lastRunAt?: string }>;
}

export function DashboardSummaryCard({ summary, projects = [] }: DashboardSummaryCardProps) {
  const router = useRouter();

  const handleStepClick = (projectId: string, runId: string) => {
    // 프로젝트 상세 페이지의 실행 결과 탭으로 이동
    router.push(`/functional-test/${encodeURIComponent(projectId)}?tab=실행 결과&runId=${runId}`);
  };

  // 원형 그래프를 위한 데이터 계산
  const getPieChartData = () => {
    const total = summary.totalRuns;
    if (total === 0) {
      return {
        segments: [],
        total: 0
      };
    }

    const segments: Array<{ color: string; percentage: number; startAngle: number; endAngle: number }> = [];
    let currentAngle = -90; // 12시 방향부터 시작

    statusChips.forEach(chip => {
      const count = summary.statusCounts[chip.label as keyof typeof summary.statusCounts] ?? 0;
      
      if (count > 0) {
        const percentage = (count / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        
        segments.push({
          color: chip.color,
          percentage,
          startAngle,
          endAngle
        });
        
        currentAngle = endAngle;
      }
    });

    return { segments, total };
  };

  const pieData = getPieChartData();

  // conic-gradient를 위한 스타일 생성
  const getPieChartStyle = () => {
    if (pieData.segments.length === 0) {
      return {
        background: `conic-gradient(#e5e7eb 0deg 360deg)`
      };
    }

    const gradients = pieData.segments.map((segment, index) => {
      const start = segment.startAngle;
      const end = segment.endAngle;
      return `${segment.color} ${start}deg ${end}deg`;
    }).join(", ");

    return {
      background: `conic-gradient(${gradients})`
    };
  };

  return (
    <section className="surface" style={{ padding: 24, display: "flex", gap: 32 }}>
      <div style={{ flex: 1 }}>
        <header style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>테스트 결과</h2>
        </header>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 32 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 210,
                height: 210,
                borderRadius: "50%",
                ...getPieChartStyle(),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}
            >
              {/* 중앙 원 (배경) */}
              <div
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  fontWeight: 700,
                  fontSize: 36,
                  color: "#1c1d21"
                }}
              >
                {summary.totalRuns}
                <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>Total</span>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12, flex: 1 }}>
            {statusChips.map(chip => (
              <div key={chip.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: chip.color
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  <span>{chip.label}</span>
                  <span style={{ fontWeight: 700 }}>{summary.statusCounts[chip.label as keyof typeof summary.statusCounts] ?? 0}</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 14 }}>
              실행 시간 {formatDuration(summary.totalDuration)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          자동화 일정
        </h3>
        {projects.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>오늘 예정된 자동화가 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projects.slice(0, 5).map(project => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const lastRunDate = project.lastRunAt ? new Date(project.lastRunAt) : null;
              const daysSinceLastRun = lastRunDate 
                ? Math.floor((today.getTime() - lastRunDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
                : null;
              
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/functional-test/${encodeURIComponent(project.id)}`)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: "#fff"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f6f7fb";
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {daysSinceLastRun !== null 
                      ? `마지막 실행: ${daysSinceLastRun}일 전`
                      : "실행 이력 없음"}
                  </div>
                  {project.scheduleStatus && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      상태: {project.scheduleStatus}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          오류
        </h3>
        {summary.failedSteps.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>아직 실패한 스텝이 없습니다.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {summary.failedSteps.map(step => (
              <li
                key={step.id}
                onClick={() => handleStepClick(step.projectId, step.runId)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "#fff"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f6f7fb";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div style={{ fontWeight: 700 }}>{step.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  상태: <strong style={{ color: "var(--danger)" }}>{step.status}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}



