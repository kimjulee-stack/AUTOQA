"use client";

import { useEffect, useState } from "react";
import { fetchFromApi } from "@/lib/api";
import type { Project, Schedule } from "@/types";

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsData, schedulesData] = await Promise.all([
          fetchFromApi<Project[]>("/projects"),
          fetchFromApi<Schedule[]>("/schedules")
        ]);
        setProjects(projectsData);
        setSchedules(schedulesData);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    }
    loadData();
  }, []);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // 이전 달의 마지막 날들
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // 현재 달의 날들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // 다음 달의 첫 날들 (총 42개 셀을 채우기 위해)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const getSchedulesForDate = (date: Date): Schedule[] => {
    const dateStr = formatDate(date);
    return schedules.filter(s => s.date === dateStr);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setShowAddModal(true);
  };

  const handleAddSchedule = async () => {
    if (!selectedDate || !selectedProjectId) return;

    try {
      const newSchedule = await fetchFromApi<Schedule>("/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          date: selectedDate
        })
      });
      setSchedules([...schedules, newSchedule]);
      setShowAddModal(false);
      setSelectedDate(null);
      setSelectedProjectId("");
    } catch (error) {
      console.error("일정 추가 실패:", error);
      alert("일정 추가에 실패했습니다.");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await fetchFromApi(`/schedules/${scheduleId}`, {
        method: "DELETE"
      });
      setSchedules(schedules.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다.");
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>일정</h1>
      </header>

      <div className="surface" style={{ padding: 24 }}>
        {/* 달력 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={goToPreviousMonth}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer"
              }}
            >
              ←
            </button>
            <button
              onClick={goToToday}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer"
              }}
            >
              오늘
            </button>
            <button
              onClick={goToNextMonth}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer"
              }}
            >
              →
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginLeft: 16 }}>
              {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
            </h2>
          </div>
        </div>

        {/* 달력 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {/* 요일 헤더 */}
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                textAlign: "center",
                fontWeight: 600,
                padding: 8,
                color: day === "일" ? "#ef4444" : day === "토" ? "#3b82f6" : "var(--text)"
              }}
            >
              {day}
            </div>
          ))}

          {/* 날짜 셀 */}
          {days.map((day, index) => {
            const dateStr = formatDate(day.date);
            const isToday = day.date.getTime() === today.getTime();
            const daySchedules = getSchedulesForDate(day.date);
            const projectNames = daySchedules
              .map(s => {
                const project = projects.find(p => p.id === s.projectId);
                return project?.name || "";
              })
              .filter(Boolean);

            return (
              <div
                key={index}
                onClick={() => handleDateClick(day.date)}
                style={{
                  minHeight: 100,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 8,
                  cursor: "pointer",
                  background: day.isCurrentMonth ? "#fff" : "#f8f9fa",
                  position: "relative",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (day.isCurrentMonth) {
                    e.currentTarget.style.background = "#f6f7fb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (day.isCurrentMonth) {
                    e.currentTarget.style.background = "#fff";
                  }
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#3b82f6" : day.isCurrentMonth ? "var(--text)" : "var(--text-muted)",
                    marginBottom: 4
                  }}
                >
                  {day.date.getDate()}
                </div>
                {daySchedules.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {projectNames.slice(0, 2).map((name, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          background: "#3b82f6",
                          color: "#fff",
                          borderRadius: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {name}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        +{daySchedules.length - 2}개
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {showAddModal && selectedDate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="surface"
            style={{
              padding: 24,
              borderRadius: 12,
              minWidth: 400,
              maxWidth: 500
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              {selectedDate} 일정 추가
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                프로젝트 선택
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8
                }}
              >
                <option value="">프로젝트를 선택하세요</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedDate(null);
                  setSelectedProjectId("");
                }}
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fff",
                  cursor: "pointer"
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={!selectedProjectId}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: selectedProjectId ? "var(--primary)" : "#ccc",
                  color: "#fff",
                  cursor: selectedProjectId ? "pointer" : "not-allowed",
                  fontWeight: 600
                }}
              >
                추가
              </button>
            </div>
            {/* 해당 날짜의 기존 일정 목록 */}
            {getSchedulesForDate(new Date(selectedDate)).length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>기존 일정</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {getSchedulesForDate(new Date(selectedDate)).map(schedule => {
                    const project = projects.find(p => p.id === schedule.projectId);
                    return (
                      <div
                        key={schedule.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: 8,
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          background: "#f8f9fa"
                        }}
                      >
                        <span>{project?.name || schedule.projectId}</span>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          style={{
                            padding: "4px 8px",
                            border: "none",
                            borderRadius: 4,
                            background: "#ef4444",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 12
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
