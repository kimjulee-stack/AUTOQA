"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { fetchFromApi, postToApi, putToApi } from "@/lib/api";
import { getCardLibraryForProduct } from "./product-card-libraries";
import { XmlTreeViewer } from "./xml-tree-viewer";
import { TestProgressModal } from "./test-progress-modal";
import { MenuSelectorModal } from "./menu-selector-modal";
import type { LocatorTemplate, Scenario, ScenarioNode, TestRun, TestStageInfo } from "@/types";
import type { ButtonXpath } from "./menu-structure";

type TestStageName =
  | "waiting_for_device"
  | "start"
  | "preparing"
  | "running_test"
  | "processing_results"
  | "cleaning_device"
  | "end";

const stageLabels: Record<TestStageName, string> = {
  waiting_for_device: "디바이스 대기",
  start: "시작",
  preparing: "준비",
  running_test: "테스트 실행",
  processing_results: "결과 처리",
  cleaning_device: "디바이스 정리",
  end: "종료"
};

function formatStageDuration(seconds?: number) {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}분 ${secs}초`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분 ${secs}초`;
}

function getStageVisual(stage: TestStageInfo) {
  if (stage.status === "completed") {
    return { icon: "✓", color: "#22c55e", background: "#dcfce7" };
  }
  if (stage.status === "running") {
    return { icon: "▶", color: "#3b82f6", background: "#dbeafe" };
  }
  if (stage.status === "failed") {
    return { icon: "✗", color: "#ef4444", background: "#fee2e2" };
  }
  return { icon: "○", color: "#9ca3af", background: "#f3f4f6" };
}

function ActivityStageItem({ stage, isLast }: { stage: TestStageInfo; isLast: boolean }) {
  const { icon, color, background } = getStageVisual(stage);
  const messages = stage.message
    ? stage.message.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    : [];

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: isLast ? 0 : 20 }}>
      <div style={{ position: "relative", width: 32 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700
          }}
        >
          {icon}
        </div>
        {!isLast && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 32,
              width: 2,
              height: 24,
              background: "#e5e7eb",
              transform: "translateX(-50%)"
            }}
          />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 14 }}>{stageLabels[stage.stage as TestStageName] ?? stage.stage}</strong>
          {stage.duration && (
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatStageDuration(stage.duration)}</span>
          )}
        </div>
        {messages.length > 0 && (
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 16, fontSize: 12, color: "#4b5563" }}>
            {messages.map((msg, idx) => (
              <li key={`${stage.stage}-log-${idx}`}>{msg}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type TabKey = "scenario" | "activity" | "screen";

interface ElementInfo {
  locatorType: string;
  locator: string;
  text?: string;
  resourceId?: string;
  contentDesc?: string;
  className?: string;
  bounds?: string;
  elementId?: string;
  index?: number;
  package?: string;
  checkable?: boolean;
  checked?: boolean;
  clickable?: boolean;
  enabled?: boolean;
  focusable?: boolean;
  focused?: boolean;
  scrollable?: boolean;
  longClickable?: boolean;
  password?: boolean;
  selected?: boolean;
}

interface ScreenshotImageProps {
  src: string;
  alt: string;
  project?: {
    deviceId?: string;
    platform?: "android" | "ios" | "web";
    product?: string;
  };
  onElementExtracted: (elementInfo: ElementInfo) => void;
  isExtracting: boolean;
  setIsExtracting: (value: boolean) => void;
}

function ScreenshotImage({ src, alt, project, onElementExtracted, isExtracting, setIsExtracting }: ScreenshotImageProps) {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  async function handleImageClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!project?.deviceId || !project?.platform || project.platform === "web" || isExtracting) return;
    if (!imageSize || !naturalSize) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 스크린샷의 실제 크기와 표시 크기의 비율 계산
    const scaleX = naturalSize.width / imageSize.width;
    const scaleY = naturalSize.height / imageSize.height;

    // 실제 디바이스 좌표로 변환
    const deviceX = Math.round(clickX * scaleX);
    const deviceY = Math.round(clickY * scaleY);

    setIsExtracting(true);
    try {
      const elementInfo = await fetchFromApi<ElementInfo>(
        `/devices/${project.deviceId}/element?x=${deviceX}&y=${deviceY}`
      );
      onElementExtracted(elementInfo);
    } catch (err) {
      console.error("요소 추출 실패:", err);
      alert("요소 정보를 추출할 수 없습니다. 디바이스가 연결되어 있고 앱이 실행 중인지 확인하세요.");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
        cursor: project?.deviceId && project?.platform !== "web" ? "crosshair" : "default",
        position: "relative"
      }}
      onClick={handleImageClick}
    >
      <Image
        src={src}
        alt={alt}
        width={240}
        height={480}
        style={{ width: "100%", height: "auto", display: "block" }}
        onLoad={(e) => {
          const img = e.currentTarget;
          setImageSize({ width: img.offsetWidth, height: img.offsetHeight });
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
      />
      {isExtracting && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 14
          }}
        >
          요소 정보 추출 중...
        </div>
      )}
    </div>
  );
}

interface RunWorkspaceProps {
  projectId: string;
  project?: {
    deviceId?: string;
    platform?: "android" | "ios" | "web";
    product?: string;
    subCategory?: string;
  };
  scenarios: Scenario[];
  latestRuns?: TestRun[];
}

export function RunWorkspace({ projectId, project, scenarios, latestRuns = [] }: RunWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("scenario");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [nodes, setNodes] = useState<ScenarioNode[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [expandedJumpSections, setExpandedJumpSections] = useState<Set<string>>(new Set());
  const [expandedVisibleSections, setExpandedVisibleSections] = useState<Set<string>>(new Set());
  const [locatorTemplates, setLocatorTemplates] = useState<LocatorTemplate[]>([]);
  const [screens, setScreens] = useState<string[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<string>("");
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [selectedXmlElement, setSelectedXmlElement] = useState<any>(null);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [extractedElementInfo, setExtractedElementInfo] = useState<ElementInfo | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [activityRun, setActivityRun] = useState<TestRun | null>(latestRuns[0] ?? null);
  const [menuSelectorOpen, setMenuSelectorOpen] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<string | null>(null);

  // 제품별 카드 라이브러리 가져오기
  const cardLibrary = useMemo(() => getCardLibraryForProduct(project?.product), [project?.product]);
  const cardLibraryItems = cardLibrary.cards;

  // 제품별 시나리오 필터링
  const filteredScenarios = useMemo(() => {
    if (!project?.product) return scenarios;
    return scenarios.filter(scenario => scenario.product === project.product);
  }, [scenarios, project?.product]);

  const selectedScenario = useMemo(() => filteredScenarios.find(item => item.id === selectedScenarioId), [selectedScenarioId, filteredScenarios]);

  useEffect(() => {
    if (selectedScenario) {
      setNodes(selectedScenario.graph.nodes);
    } else {
      setNodes([]);
    }
  }, [selectedScenario]);

  // Locator 템플릿 로드
  useEffect(() => {
    async function loadLocatorTemplates() {
      if (!project?.product) return;
      try {
        const [templates, screenList] = await Promise.all([
          fetchFromApi<LocatorTemplate[]>(`/locators/templates?product=${encodeURIComponent(project.product)}`),
          fetchFromApi<string[]>(`/locators/screens?product=${encodeURIComponent(project.product)}`)
        ]);
        setLocatorTemplates(templates);
        setScreens(screenList);
        if (screenList.length > 0 && !selectedScreen) {
          setSelectedScreen(screenList[0]);
        }
      } catch (error) {
        console.warn("Locator 템플릿 로드 실패:", error);
      }
    }
    loadLocatorTemplates();
  }, [project?.product]);

  // 화면 변경 시 템플릿 필터링
  useEffect(() => {
    async function loadScreenTemplates() {
      if (!project?.product || !selectedScreen) return;
      try {
        const templates = await fetchFromApi<LocatorTemplate[]>(
          `/locators/templates?product=${encodeURIComponent(project.product)}&screen=${encodeURIComponent(selectedScreen)}`
        );
        setLocatorTemplates(templates);
      } catch (error) {
        console.warn("화면별 Locator 템플릿 로드 실패:", error);
      }
    }
    loadScreenTemplates();
  }, [project?.product, selectedScreen]);

  // 최신 실행 결과 동기화
  useEffect(() => {
    if (!currentRunId) {
      setActivityRun(latestRuns[0] ?? null);
    }
  }, [latestRuns, currentRunId]);

  // 최신 실행 목록을 보고 버튼 상태 동기화
  useEffect(() => {
    if (!currentRunId) return;
    const currentRun = latestRuns.find(run => run.id === currentRunId);
    if (currentRun && currentRun.currentStage === "end") {
      setIsRunning(false);
      setCurrentRunId(null);
    }
  }, [latestRuns, currentRunId]);

  // Activity Map에서 현재 실행 중인 로그를 실시간으로 표시
  useEffect(() => {
    if (!currentRunId || activeTab !== "activity") return;

    let cancelled = false;

    async function pollRun() {
      try {
        const runDetail = await fetchFromApi<TestRun>(`/runs/${currentRunId}`);
        if (!cancelled) {
          setActivityRun(runDetail);
          if (runDetail.currentStage === "end") {
            cancelled = true;
          }
        }
      } catch (error) {
        console.warn("활동 로그 업데이트 실패:", error);
      }
    }

    pollRun();
    const interval = setInterval(pollRun, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentRunId, activeTab]);

  function handlePaletteDrag(event: React.DragEvent<HTMLDivElement>, type: string) {
    event.dataTransfer.setData("application/x-step-type", type);
  }

  function handleCardClick(type: string) {
    // 클릭만 메뉴 선택 모달 열기
    if (type === "click") {
      setSelectedCardType(type);
      setMenuSelectorOpen(true);
    } else {
      // 다른 카드는 바로 노드 추가
      addNodeByType(type);
    }
  }

  function handleMenuSelect(menuId: string, buttonXpaths?: ButtonXpath[]) {
    if (!selectedCardType) return;

    setNodes(prev => {
      const currentLength = prev.length;
      
      // 버튼 목록이 있으면 각 버튼을 개별 노드로 추가
      if (buttonXpaths && buttonXpaths.length > 0) {
        const newNodes = buttonXpaths.map((button, idx) => ({
          id: `node-${Date.now()}-${idx}`,
          type: selectedCardType,
          name: button.buttonName,
          no: button.no || currentLength + idx + 1,
          locatorType: button.locatorType || "xpath",
          locator: button.xpath || "",
          sleep: button.sleep || 2,
          mandatory: button.mandatory || false,
          skipOnError: button.skipOnError || false,
          jumpIfVisibleType: button.jumpIfVisibleType,
          jumpIfVisible: button.jumpIfVisible,
          jumpToNo: button.jumpToNo,
          visibleIfType: button.visibleIfType,
          visibleIf: button.visibleIf
        }));
        return [...prev, ...newNodes];
      } else {
        // 버튼 목록이 없으면 단일 노드로 추가
        const menuLabels: Record<string, string> = {
          main: "메인",
          curriculum: "커리큘럼 리스트",
          intro: "입문",
          theme: "테마",
          local_talk: "현지톡",
          learning_report: "학습 리포트",
          speaking_clinic: "스피킹 클리닉",
          profile: "프로필",
          settings: "설정",
          review: "리뷰",
          audio_learning: "오디오학습"
        };

        const newNode: ScenarioNode = {
          id: `node-${Date.now()}`,
          type: selectedCardType,
          name: menuLabels[menuId] || menuId,
          no: currentLength + 1,
          locatorType: "",
          locator: "",
          sleep: 2,
          mandatory: false,
          skipOnError: false
        };
        return [...prev, newNode];
      }
    });
  }

  function addNodeByType(type: string) {
    const swipeDefaults =
      type === "swipe"
        ? {
            swipeStartX: 200,
            swipeStartY: 800,
            swipeEndX: 200,
            swipeEndY: 200
          }
        : {};

    const newNode: ScenarioNode = {
      id: `node-${Date.now()}`,
      type,
      name: `${type} 동작`,
      no: nodes.length + 1,
      locatorType: "",
      locator: "",
      sleep: 2,
      mandatory: false,
      skipOnError: false,
      ...swipeDefaults
    };
    setNodes(prev => [...prev, { ...newNode, no: prev.length + 1 }]);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-step-type");
    if (!type) return;
    addNodeByType(type);
  }

  function moveNode(nodeId: string, direction: "up" | "down") {
    setNodes(prev => {
      const current = [...prev];
      const index = current.findIndex(node => node.id === nodeId);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return prev;
      const temp = current[targetIndex];
      current[targetIndex] = current[index];
      current[index] = temp;
      return current.map((node, idx) => ({ ...node, no: idx + 1 }));
    });
  }


  function handleNodeChange(id: string, field: keyof ScenarioNode, value: string | number | boolean) {
    setNodes(prev =>
      prev.map(node =>
        node.id === id
          ? {
              ...node,
              [field]:
                typeof value === "string" &&
                (
                  field === "sleep" ||
                  field === "no" ||
                  field === "jumpToNo" ||
                  field === "swipeStartX" ||
                  field === "swipeStartY" ||
                  field === "swipeEndX" ||
                  field === "swipeEndY"
                )
                  ? value === "" ? undefined : Number(value)
                  : value
            }
          : node
      )
    );
  }

  function handleRemoveNode(id: string) {
    setNodes(prev => prev.filter(node => node.id !== id));
  }

  async function handleSaveScenario() {
    if (nodes.length === 0) {
      setError("저장할 시나리오가 없습니다. 카드를 추가해주세요.");
      return;
    }

    // 시나리오 이름 입력 받기
    const scenarioName = selectedScenario 
      ? selectedScenario.name 
      : prompt("시나리오 이름을 입력하세요:");
    
    if (!scenarioName || scenarioName.trim() === "") {
      if (!selectedScenario) {
        setError("시나리오 이름을 입력해야 합니다.");
      }
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);
    
    try {
      const graph = {
        nodes,
        edges: nodes.length > 1 
          ? nodes.slice(1).map((node, idx) => ({
              id: `edge-${idx}`,
              source: nodes[idx].id,
              target: node.id
            }))
          : []
      };

      if (selectedScenario) {
        // 기존 시나리오 업데이트
        await putToApi(`/scenarios/${selectedScenario.id}`, {
          name: scenarioName,
          graph
        });
        setMessage("시나리오가 저장되었습니다.");
      } else {
        // 새 시나리오 생성
        if (!project?.product || !project?.platform || project.platform === "web") {
          setError("제품과 플랫폼 정보가 필요합니다.");
          setIsSaving(false);
          return;
        }

        const newScenario = await postToApi<Scenario>("/scenarios", {
          name: scenarioName.trim(),
          description: `${scenarioName} 시나리오`,
          product: project.product,
          platform: project.platform as "android" | "ios",
          tags: [],
          graph
        });

        setSelectedScenarioId(newScenario.id);
        setMessage("시나리오가 저장소에 등록되었습니다.");
      }
      
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRunScenario() {
    if (!selectedScenario) return;
    setIsRunning(true);
    setMessage(null);
    setError(null);
    try {
      const run = await postToApi<TestRun>("/runs", { projectId, scenarioId: selectedScenario.id });
      setCurrentRunId(run.id);
      setMessage("테스트 실행이 시작되었습니다.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setIsRunning(false);
    }
  }

  const activitySteps = useMemo(
    () =>
      nodes.map(node => ({
        id: node.id,
        name: node.name,
        status: "정상"
      })),
    [nodes]
  );

  const screenShotUrl = capturedScreenshot ?? null;

  return (
    <section className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>테스트 실행 공간</h2>
          <select
            value={selectedScenarioId}
            onChange={event => setSelectedScenarioId(event.target.value)}
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px", fontWeight: 600 }}
          >
            <option value="">시나리오 선택...</option>
            {scenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSaveScenario}
            disabled={isSaving || nodes.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: isSaving ? "#ddd" : "#fff",
              fontWeight: 600
            }}
          >
            {isSaving ? "저장 중..." : selectedScenario ? "시나리오 저장" : "시나리오 저장소에 등록"}
          </button>
          <button
            onClick={handleRunScenario}
            disabled={!selectedScenario || nodes.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: isRunning ? "#9ca3af" : "var(--primary)",
              fontWeight: 700,
              cursor: (!selectedScenario || nodes.length === 0) ? "not-allowed" : "pointer"
            }}
          >
            {isRunning ? "실행 중..." : "테스트 실행"}
          </button>
        </div>
      </header>

      {message && <div style={{ color: "var(--success)" }}>{message}</div>}
      {error && <div style={{ color: "var(--danger)" }}>{error}</div>}

      <MenuSelectorModal
        open={menuSelectorOpen}
        onClose={() => {
          setMenuSelectorOpen(false);
          setSelectedCardType(null);
        }}
        onSelect={handleMenuSelect}
        product={project?.product}
        subCategory={project?.subCategory}
      />

      {currentRunId && (
        <TestProgressModal
          runId={currentRunId}
          onClose={() => {
            setCurrentRunId(null);
            setIsRunning(false);
            router.refresh();
          }}
          onComplete={() => {
            setIsRunning(false);
            if (currentRunId) {
              fetchFromApi<TestRun>(`/runs/${currentRunId}`)
                .then(run => setActivityRun(run))
                .catch(() => null);
            }
          }}
        />
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {["scenario", "activity", "screen"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabKey)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: activeTab === tab ? "var(--primary)" : "#f1f3f8",
              fontWeight: 600
            }}
          >
            {tab === "scenario" ? "시나리오 빌더" : tab === "activity" ? "Activity Map" : "Screen"}
          </button>
        ))}
      </div>

      {activeTab === "scenario" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
          <div
            style={{
              border: "1px dashed var(--border)",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: "600px",
              maxHeight: "calc(100vh - 150px)",
              overflowY: "auto"
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>카드 라이브러리</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cardLibraryItems.map((card, idx) => (
                <div
                  key={`${card.type}-${idx}`}
                  draggable
                  onDragStart={event => handlePaletteDrag(event, card.type)}
                  onClick={() => handleCardClick(card.type)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    cursor: "pointer",
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 500,
                    userSelect: "none"
                  }}
                >
                  {card.label}
                </div>
              ))}
            </div>
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={event => event.preventDefault()}
            style={{
              border: "2px dashed var(--border)",
              borderRadius: 16,
              minHeight: 220,
              padding: 16,
              background: "#fafbff"
            }}
          >
            <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>카드를 선택하면 시나리오 맨 아래에 추가됩니다.</p>
            {nodes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                <p style={{ marginBottom: 8, fontSize: 14 }}>시나리오가 비어있습니다.</p>
                <p style={{ fontSize: 12 }}>왼쪽 카드 라이브러리에서 카드를 클릭하거나 드래그해 추가하세요.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nodes.map((node, index) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      background: selectedNodeId === node.id ? "var(--primary-light)" : "#fff",
                      border: selectedNodeId === node.id ? "2px solid var(--primary)" : "1px solid var(--border)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <strong style={{ fontSize: 11 }}>{node.type.toUpperCase()}</strong>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            moveNode(node.id, "up");
                          }}
                          disabled={index === 0}
                          style={{
                            padding: "2px 6px",
                            fontSize: 10,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: index === 0 ? "#f3f4f6" : "#fff",
                            cursor: index === 0 ? "not-allowed" : "pointer"
                          }}
                        >
                          ▲
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            moveNode(node.id, "down");
                          }}
                          disabled={index === nodes.length - 1}
                          style={{
                            padding: "2px 6px",
                            fontSize: 10,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: index === nodes.length - 1 ? "#f3f4f6" : "#fff",
                            cursor: index === nodes.length - 1 ? "not-allowed" : "pointer"
                          }}
                        >
                          ▼
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveNode(node.id);
                          }}
                          style={{ color: "var(--danger)", fontSize: 10, padding: "2px 6px" }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    번호 (no)
                    <input
                      type="number"
                      value={node.no ?? ""}
                      onChange={event => handleNodeChange(node.id, "no", event.target.value)}
                      placeholder="1"
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    이름 (name)
                    <input
                      value={node.name}
                      onChange={event => handleNodeChange(node.id, "name", event.target.value)}
                      placeholder="스텝 이름"
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Locator Type (by)
                    <select
                      value={node.locatorType ?? ""}
                      onChange={event => handleNodeChange(node.id, "locatorType", event.target.value)}
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                    >
                      <option value="">선택</option>
                      <option value="none">none</option>
                      <option value="abs">abs</option>
                      <option value="XPATH">XPATH</option>
                      <option value="ID">ID</option>
                      <option value="CLASS_NAME">CLASS_NAME</option>
                      <option value="ACCESSIBILITY_ID">ACCESSIBILITY_ID</option>
                      <option value="TEXT">TEXT</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Locator (value)
                    {locatorTemplates.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <select
                          value=""
                          onChange={event => {
                            const templateId = event.target.value;
                            if (templateId) {
                              const template = locatorTemplates.find(t => t.id === templateId);
                              if (template) {
                                handleNodeChange(node.id, "locatorType", template.locatorType);
                                handleNodeChange(node.id, "locator", template.locator);
                              }
                              event.target.value = "";
                            }
                          }}
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        >
                          <option value="">템플릿에서 선택...</option>
                          {locatorTemplates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name} {template.description ? `(${template.description})` : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          value={node.locator ?? ""}
                          onChange={event => handleNodeChange(node.id, "locator", event.target.value)}
                          placeholder="또는 직접 입력"
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        />
                      </div>
                    ) : (
                      <input
                        value={node.locator ?? ""}
                        onChange={event => handleNodeChange(node.id, "locator", event.target.value)}
                        placeholder="//android.widget.TextView[@content-desc='...']"
                        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                      />
                    )}
                  </label>
                  {node.type === "input" && (
                    <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      INPUT_TEXT
                      <input
                        value={node.inputText ?? ""}
                        onChange={event => handleNodeChange(node.id, "inputText", event.target.value)}
                        placeholder="입력할 텍스트"
                        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                      />
                    </label>
                  )}
                  {node.type === "swipe" && (
                    <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
                      <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        시작 X
                        <input
                          type="number"
                          value={node.swipeStartX ?? ""}
                          onChange={event => handleNodeChange(node.id, "swipeStartX", event.target.value)}
                          placeholder="200"
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        />
                      </label>
                      <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        시작 Y
                        <input
                          type="number"
                          value={node.swipeStartY ?? ""}
                          onChange={event => handleNodeChange(node.id, "swipeStartY", event.target.value)}
                          placeholder="800"
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        />
                      </label>
                      <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        종료 X
                        <input
                          type="number"
                          value={node.swipeEndX ?? ""}
                          onChange={event => handleNodeChange(node.id, "swipeEndX", event.target.value)}
                          placeholder="200"
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        />
                      </label>
                      <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        종료 Y
                        <input
                          type="number"
                          value={node.swipeEndY ?? ""}
                          onChange={event => handleNodeChange(node.id, "swipeEndY", event.target.value)}
                          placeholder="200"
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        />
                      </label>
                    </div>
                  )}
                  <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    대기 시간 (sleep)
                    <input
                      type="number"
                      value={node.sleep ?? ""}
                      onChange={event => handleNodeChange(node.id, "sleep", event.target.value)}
                      placeholder="2"
                      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={node.mandatory ?? false}
                      onChange={event => handleNodeChange(node.id, "mandatory", event.target.checked)}
                      style={{ width: 14, height: 14 }}
                    />
                    필수
                  </label>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={node.skipOnError ?? false}
                      onChange={event => handleNodeChange(node.id, "skipOnError", event.target.checked)}
                      style={{ width: 14, height: 14 }}
                    />
                    에러시 건너뛰기
                  </label>
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 6 }}>
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        const newExpanded = new Set(expandedJumpSections);
                        if (newExpanded.has(node.id)) {
                          newExpanded.delete(node.id);
                        } else {
                          newExpanded.add(node.id);
                        }
                        setExpandedJumpSections(newExpanded);
                      }}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        userSelect: "none"
                      }}
                    >
                      <span>{expandedJumpSections.has(node.id) ? "▼" : "▶"}</span>
                      <span>조건부 점프</span>
                    </div>
                    {expandedJumpSections.has(node.id) && (
                      <div style={{ marginTop: 6 }}>
                        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          jump_if_visible_type
                          <input
                            value={node.jumpIfVisibleType ?? ""}
                            onChange={event => handleNodeChange(node.id, "jumpIfVisibleType", event.target.value)}
                            placeholder="XPATH, ID 등"
                            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", marginTop: 4, fontSize: 11 }}
                          />
                        </label>
                        <label style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                          jump_if_visible
                          <input
                            value={node.jumpIfVisible ?? ""}
                            onChange={event => handleNodeChange(node.id, "jumpIfVisible", event.target.value)}
                            placeholder="조건 locator"
                            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", marginTop: 4, fontSize: 11 }}
                          />
                        </label>
                        <label style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                          jump_to_no
                          <input
                            type="number"
                            value={node.jumpToNo ?? ""}
                            onChange={event => handleNodeChange(node.id, "jumpToNo", event.target.value)}
                            placeholder="점프할 스텝 번호"
                            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", marginTop: 4, fontSize: 11 }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 6 }}>
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        const newExpanded = new Set(expandedVisibleSections);
                        if (newExpanded.has(node.id)) {
                          newExpanded.delete(node.id);
                        } else {
                          newExpanded.add(node.id);
                        }
                        setExpandedVisibleSections(newExpanded);
                      }}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        userSelect: "none"
                      }}
                    >
                      <span>{expandedVisibleSections.has(node.id) ? "▼" : "▶"}</span>
                      <span>표시 조건</span>
                    </div>
                    {expandedVisibleSections.has(node.id) && (
                      <div style={{ marginTop: 6 }}>
                        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          visible_if_type
                          <input
                            value={node.visibleIfType ?? ""}
                            onChange={event => handleNodeChange(node.id, "visibleIfType", event.target.value)}
                            placeholder="XPATH, ID 등"
                            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", marginTop: 4, fontSize: 11 }}
                          />
                        </label>
                        <label style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                          visible_if
                          <input
                            value={node.visibleIf ?? ""}
                            onChange={event => handleNodeChange(node.id, "visibleIf", event.target.value)}
                            placeholder="조건 locator"
                            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", marginTop: 4, fontSize: 11 }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>실행 로그</h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                {activityRun ? `${activityRun.scenarioId} · ${new Date(activityRun.startedAt).toLocaleString("ko-KR", { hour12: false })}` : "최근 실행 로그가 없습니다."}
              </p>
            </div>
            {currentRunId && (
              <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>실시간 업데이트 중...</span>
            )}
          </header>

          {activityRun?.stages && activityRun.stages.length > 0 ? (
            <div style={{ position: "relative", paddingLeft: 20 }}>
              {activityRun.stages.map((stage, index) => (
                <ActivityStageItem
                  key={stage.stage}
                  stage={stage}
                  isLast={index === activityRun.stages!.length - 1}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>표시할 실행 단계 정보가 없습니다.</p>
          )}
        </div>
      )}

      {activeTab === "screen" && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 300px", gap: 16, height: "calc(100vh - 300px)" }}>
          {/* 왼쪽: 스크린샷 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>스크린샷</p>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={async () => {
                    if (!project?.deviceId || project?.platform === "web") {
                      alert("USB로 연결된 디바이스가 필요합니다.");
                      return;
                    }
                    try {
                      setIsCapturing(true);
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/devices/${project.deviceId}/screenshot`, {
                        method: "POST"
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setCapturedScreenshot(data.screenshotUrl);
                        // XML도 함께 로드
                        if (project.platform === "android") {
                          const xmlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/devices/${project.deviceId}/xml`);
                          if (xmlResponse.ok) {
                            const xml = await xmlResponse.text();
                            setXmlContent(xml);
                          }
                        }
                      } else {
                        const error = await response.json();
                        alert(error.message || "스크린샷을 캡처할 수 없습니다.");
                      }
                    } catch (err) {
                      console.error("스크린샷 캡처 실패:", err);
                      alert("스크린샷을 캡처할 수 없습니다. 디바이스가 연결되어 있는지 확인하세요.");
                    } finally {
                      setIsCapturing(false);
                    }
                  }}
                  disabled={isCapturing}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: isCapturing ? "#ddd" : "#fff",
                    cursor: isCapturing ? "not-allowed" : "pointer"
                  }}
                >
                  {isCapturing ? "캡처 중..." : "캡처"}
                </button>
                <button
                  onClick={async () => {
                    if (!project?.deviceId || project?.platform !== "android") {
                      alert("Android 디바이스가 필요합니다.");
                      return;
                    }
                    try {
                      setIsExtracting(true);
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/devices/${project.deviceId}/xml`);
                      if (response.ok) {
                        const xml = await response.text();
                        setXmlContent(xml);
                      } else {
                        alert("XML 계층 구조를 가져올 수 없습니다.");
                      }
                    } catch (err) {
                      console.error("XML 로드 실패:", err);
                      alert("XML 계층 구조를 가져올 수 없습니다.");
                    } finally {
                      setIsExtracting(false);
                    }
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: "#fff",
                    cursor: "pointer"
                  }}
                >
                  새로고침
                </button>
              </div>
            </div>
            {screenShotUrl ? (
              <ScreenshotImage
                key={screenShotUrl}
                src={screenShotUrl}
                alt="captured screenshot"
                project={project}
                onElementExtracted={async (elementInfo) => {
                  setExtractedElementInfo(elementInfo);
                  if (project?.deviceId && project?.platform === "android") {
                    try {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/devices/${project.deviceId}/xml`);
                      if (response.ok) {
                        const xml = await response.text();
                        setXmlContent(xml);
                      }
                    } catch (err) {
                      console.error("XML 로드 실패:", err);
                    }
                  }
                  if (selectedNodeId) {
                    handleNodeChange(selectedNodeId, "locatorType", elementInfo.locatorType);
                    handleNodeChange(selectedNodeId, "locator", elementInfo.locator);
                    setMessage(`요소 정보가 "${nodes.find(n => n.id === selectedNodeId)?.name}" 노드에 적용되었습니다.`);
                  } else if (nodes.length > 0) {
                    const lastNode = nodes[nodes.length - 1];
                    handleNodeChange(lastNode.id, "locatorType", elementInfo.locatorType);
                    handleNodeChange(lastNode.id, "locator", elementInfo.locator);
                    setMessage(`요소 정보가 "${lastNode.name}" 노드에 적용되었습니다.`);
                  }
                }}
                isExtracting={isExtracting}
                setIsExtracting={setIsExtracting}
              />
            ) : (
              <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: 24, textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>최근 캡처본이 없습니다. 캡처 버튼을 눌러 현재 화면을 가져오세요.</p>
              </div>
            )}
          </div>

          {/* 중간: App Source (XML 계층 구조) */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: 8, borderBottom: "1px solid var(--border)", background: "#f8f9fa" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>App Source</h3>
            </div>
            <XmlTreeViewer
              xmlContent={xmlContent}
              onElementSelect={(element) => {
                setSelectedXmlElement(element);
                
                // XML 요소에서 정보 추출하여 extractedElementInfo 형식으로 변환
                const attrs = element.attributes;
                const elementInfo = {
                  locatorType: attrs["resource-id"] ? "id" : attrs["content-desc"] ? "accessibility id" : "xpath",
                  locator: attrs["resource-id"] || attrs["content-desc"] || (attrs.text ? `//*[@text='${attrs.text}']` : `//${element.tag}`),
                  text: attrs.text,
                  resourceId: attrs["resource-id"],
                  contentDesc: attrs["content-desc"],
                  className: attrs.class || element.tag,
                  bounds: attrs.bounds,
                  elementId: attrs["element-id"] || attrs.index !== undefined ? `00000000-0000-0000-ffff-ffff${String(attrs.index || 0).padStart(8, "0")}` : undefined,
                  index: attrs.index !== undefined ? Number(attrs.index) : undefined,
                  package: attrs.package,
                  checkable: attrs.checkable === "true",
                  checked: attrs.checked === "true",
                  clickable: attrs.clickable === "true",
                  enabled: attrs.enabled !== "false",
                  focusable: attrs.focusable === "true",
                  focused: attrs.focused === "true",
                  scrollable: attrs.scrollable === "true",
                  longClickable: attrs["long-clickable"] === "true",
                  password: attrs.password === "true",
                  selected: attrs.selected === "true"
                };
                setExtractedElementInfo(elementInfo);
                
                // 노드에 자동 적용
                if (selectedNodeId && elementInfo.locator) {
                  handleNodeChange(selectedNodeId, "locatorType", elementInfo.locatorType);
                  handleNodeChange(selectedNodeId, "locator", elementInfo.locator);
                }
              }}
              selectedElement={selectedXmlElement}
            />
          </div>

          {/* 오른쪽: Selected Element */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: 8, borderBottom: "1px solid var(--border)", background: "#f8f9fa" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Selected Element</h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, fontSize: 12 }}>
              {extractedElementInfo ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Find By 섹션 */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-strong)" }}>Find By</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {extractedElementInfo.className && (
                        <div>
                          <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>class name</div>
                          <div style={{ 
                            background: "#f8f9fa", 
                            padding: "6px 8px", 
                            borderRadius: 4, 
                            fontFamily: "monospace",
                            fontSize: 11,
                            wordBreak: "break-all"
                          }}>
                            {extractedElementInfo.className}
                          </div>
                        </div>
                      )}
                      {extractedElementInfo.resourceId && (
                        <div>
                          <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>id</div>
                          <div style={{ 
                            background: "#f8f9fa", 
                            padding: "6px 8px", 
                            borderRadius: 4, 
                            fontFamily: "monospace",
                            fontSize: 11,
                            wordBreak: "break-all"
                          }}>
                            {extractedElementInfo.resourceId}
                          </div>
                        </div>
                      )}
                      {extractedElementInfo.contentDesc && (
                        <div>
                          <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>accessibility id</div>
                          <div style={{ 
                            background: "#f8f9fa", 
                            padding: "6px 8px", 
                            borderRadius: 4, 
                            fontFamily: "monospace",
                            fontSize: 11,
                            wordBreak: "break-all"
                          }}>
                            {extractedElementInfo.contentDesc}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>xpath</div>
                        <div style={{ 
                          background: "#f8f9fa", 
                          padding: "6px 8px", 
                          borderRadius: 4, 
                          fontFamily: "monospace",
                          fontSize: 11,
                          wordBreak: "break-all"
                        }}>
                          {extractedElementInfo.locatorType === "xpath" 
                            ? extractedElementInfo.locator 
                            : extractedElementInfo.text 
                              ? `//*[@text='${extractedElementInfo.text}']`
                              : `//${extractedElementInfo.className || "*"}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attribute 섹션 */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-strong)" }}>Attribute</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {extractedElementInfo.elementId && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)" }}>elementId</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{extractedElementInfo.elementId}</span>
                        </div>
                      )}
                      {extractedElementInfo.index !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)" }}>index</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{extractedElementInfo.index}</span>
                        </div>
                      )}
                      {extractedElementInfo.package && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)" }}>package</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", textAlign: "right" }}>
                            {extractedElementInfo.package}
                          </span>
                        </div>
                      )}
                      {extractedElementInfo.className && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)" }}>class</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", textAlign: "right" }}>
                            {extractedElementInfo.className}
                          </span>
                        </div>
                      )}
                      {extractedElementInfo.text !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)" }}>text</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", textAlign: "right" }}>
                            {extractedElementInfo.text || "(empty)"}
                          </span>
                        </div>
                      )}
                      {extractedElementInfo.bounds && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ color: "var(--text-muted)" }}>bounds (절댓값 주소)</span>
                          <span style={{ 
                            fontFamily: "monospace", 
                            fontSize: 11, 
                            background: "#f8f9fa", 
                            padding: "6px 8px", 
                            borderRadius: 4,
                            wordBreak: "break-all"
                          }}>
                            {extractedElementInfo.bounds}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>checkable</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.checkable ?? false)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>clickable</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.clickable ?? false)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>enabled</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.enabled ?? true)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>focusable</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.focusable ?? false)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>focused</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.focused ?? false)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>scrollable</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.scrollable ?? false)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-muted)" }}>selected</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {String(extractedElementInfo.selected ?? false)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  스크린샷을 클릭하거나 XML 트리에서 요소를 선택하세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
