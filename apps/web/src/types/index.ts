export type TestRunStatus = "정상" | "오류" | "경고" | "정지" | "장애" | "대기";

export interface DashboardSummary {
  totalRuns: number;
  totalDuration: number;
  statusCounts: Record<TestRunStatus, number>;
  failedSteps: (TestStep & { runId: string; projectId: string })[];
}

export interface TestStep {
  id: string;
  name: string;
  status: TestRunStatus;
  startedAt: string;
  endedAt?: string;
  screenshotUrl?: string;
  logUrl?: string;
  scenarioId: string;
}

export type TestStage = 
  | "waiting_for_device"
  | "start"
  | "preparing"
  | "running_test"
  | "processing_results"
  | "cleaning_device"
  | "end";

export interface TestStageInfo {
  stage: TestStage;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  endedAt?: string;
  duration?: number; // seconds
  message?: string;
}

export interface TestRun {
  id: string;
  projectId: string;
  scenarioId: string;
  status: TestRunStatus;
  device: string;
  os: string;
  label?: string;
  startedAt: string;
  endedAt?: string;
  steps?: TestStep[];
  stages?: TestStageInfo[];
  currentStage?: TestStage;
  errorMessage?: string;
  output?: string;
}

export interface Project {
  id: string;
  name: string;
  product: string;
  platform: "android" | "ios" | "web";
  bundleId?: string;
  deviceId?: string;
  deviceName?: string;
  lastRunAt?: string;
  totalRuns: number;
  scheduleStatus?: string;
  subCategory?: string;
}

export interface ScenarioNode {
  id: string;
  type: string;
  name: string;
  no?: number; // 스텝 번호
  locatorType?: string; // by (XPATH, ID 등)
  locator?: string; // value
  inputText?: string;
  sleep?: number;
  skipOnError?: boolean; // skip_on_error (Y/N)
  mandatory?: boolean; // mandatory (Y/N)
  // 조건부 점프
  jumpIfVisibleType?: string; // jump_if_visible_type
  jumpIfVisible?: string; // jump_if_visible
  jumpToNo?: number; // jump_to_no
  // 표시 조건
  visibleIfType?: string; // visible_if_type
  visibleIf?: string; // visible_if
  swipeStartX?: number;
  swipeStartY?: number;
  swipeEndX?: number;
  swipeEndY?: number;
}

export interface ScenarioEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface ScenarioGraph {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  product: string;
  platform: "android" | "ios";
  tags: string[];
  version: number;
  updatedAt: string;
  graph: ScenarioGraph;
}

export interface Device {
  id: string;
  name: string;
  platform: "android" | "ios";
  osVersion: string;
  status: "available" | "in-use" | "offline";
  connection: "usb" | "remote";
}

export interface DeviceApp {
  id: string;
  platform: "android" | "ios";
  packageId: string;
  name?: string;
  version?: string;
}

export interface LocatorTemplate {
  id: string;
  name: string;
  screen: string;
  locatorType: string;
  locator: string;
  description?: string;
}

export interface Schedule {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD 형식
  createdAt: string;
  updatedAt: string;
}

export interface AiTestSession {
  id: string;
  projectId: string;
  name: string;
  status: "running" | "completed";
  startedAt: string;
  endedAt?: string;
  lastMessageAt?: string;
}

export interface AiChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiResultScreenshot {
  id: string;
  imageUrl: string;
  capturedAt: string;
  note?: string;
}

export interface AiTestResult {
  id: string;
  projectId: string;
  sessionId: string;
  name: string;
  status: "completed" | "failed";
  summary?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  screenshots: AiResultScreenshot[];
}

export interface ManualTestSession {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  status: "running" | "completed";
  startedAt: string;
  endedAt?: string;
  lastMessageAt?: string;
}

export interface ManualChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type ManualVerificationResult = "P" | "F" | "NT" | "N";

export interface ManualTestCase {
  id: string;
  sessionId: string;
  title: string;
  objective?: string;
  preconditions?: string;
  steps?: string[];
  expectedResult?: string;
  notes?: string;
  aiSummary?: string;
  verificationResult?: ManualVerificationResult;
  btsId?: string;
  reporterNote?: string;
  createdAt: string;
  updatedAt: string;
}

