import { By, until, WebDriver, WebElement } from "selenium-webdriver";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { updateRunStage, updateRunStepScreenshot } from "../data/store.js";
import type { Scenario, ScenarioNode, Project } from "../types.js";
import { remote } from "webdriverio";
import axios from "axios";

const execAsync = promisify(exec);

interface TestRunConfig {
  project: Project;
  scenario: Scenario;
  deviceId: string;
  runId?: string;
}

interface ActionData {
  action: string;
  by: string;
  value: string;
  name: string;
  sleep: number;
  skip_on_error: string;
  visible_if_type: string;
  visible_if: string;
  mandatory: string;
  no: number;
  input_text: string;
}

/**
 * 시나리오 노드를 액션으로 변환
 */
function convertNodeToAction(node: ScenarioNode): ActionData {
  const actionMap: Record<string, string> = {
    click: "click",
    input: "input",
    delete: "click",
    wait: "wait_until_visible",
    swipe: "swipe",
    scroll: "swipe",
    audio: "play_audio"
  };

  let action = actionMap[node.type] || node.type;
  let by = node.locatorType || "xpath";
  let value = node.locator || "";

  if (node.type === "swipe" && node.swipeStartX !== undefined && node.swipeStartY !== undefined && node.swipeEndX !== undefined && node.swipeEndY !== undefined) {
    value = `${node.swipeStartX},${node.swipeStartY},${node.swipeEndX},${node.swipeEndY}`;
  }

  // ABS 좌표 TAP 처리
  if (by === "abs" && value) {
    action = "tap";
    const boundsMatch = value.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (boundsMatch) {
      const [, x1, y1, x2, y2] = boundsMatch.map(Number);
      const centerX = Math.floor((x1 + x2) / 2);
      const centerY = Math.floor((y1 + y2) / 2);
      value = `${centerX},${centerY}`;
    }
    by = "abs";
  }

  if (by === "none") {
    by = "xpath";
    value = "";
    if (action === "click" || action === "input") {
      action = "wait";
    }
  }

  const byMap: Record<string, string> = {
    id: "id",
    ID: "id",
    xpath: "xpath",
    XPATH: "xpath",
    "accessibility id": "accessibility id",
    ACCESSIBILITY_ID: "accessibility id",
    "class name": "class name",
    CLASS_NAME: "class name",
    text: "xpath",
    TEXT: "xpath"
  };

  by = byMap[by] || "xpath";

  if (node.locatorType === "text" || node.locatorType === "TEXT") {
    value = `//*[@text='${value}']`;
  }

  return {
    action,
    by,
    value,
    name: node.name || `${node.type} 동작`,
    sleep: node.sleep || 2,
    skip_on_error: node.skipOnError ? "Y" : "N",
    visible_if_type: node.visibleIfType || "text",
    visible_if: node.visibleIf || "",
    mandatory: node.mandatory ? "Y" : "N",
    no: node.no || 0,
    input_text: node.inputText || ""
  };
}

/**
 * Appium 서버 시작
 */
const APPIUM_HOST = "127.0.0.1";
const APPIUM_PORT = 4723;

async function waitForAppiumReady(timeoutMs = 30000) {
  const start = Date.now();
  while (true) {
    try {
      const res = await axios.get(`http://${APPIUM_HOST}:${APPIUM_PORT}/status`, { timeout: 2000 });
      if (res.status === 200) return;
    } catch {}

    if (Date.now() - start > timeoutMs) {
      throw new Error("Appium 서버가 지정된 시간 내에 기동되지 않았습니다.");
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function startAppiumServer(): Promise<void> {
  try {
    await waitForAppiumReady(2000);
    console.log("[testRunner] Appium 서버가 이미 실행 중입니다.");
    return;
  } catch {
    console.log("[testRunner] Appium 서버가 실행 중이 아닙니다. 새로 시작합니다.");
  }

  await new Promise<void>((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "npx.cmd" : "npx";
    const args = ["appium", "--port", String(APPIUM_PORT), "--relaxed-security", "--allow-insecure=all"];

    console.log("[testRunner] Appium 서버를 시작합니다... (npx appium)");
    console.log("[testRunner] 명령:", cmd, args.join(" "));

    const appiumProcess = spawn(cmd, args, {
      cwd: process.cwd(),
      shell: true,
      stdio: "inherit",
      windowsHide: false
    });

    (globalThis as any).appiumProcess = appiumProcess;

    appiumProcess.on("error", err => {
      console.error("[testRunner] Appium 프로세스 spawn 오류:", err);
      (globalThis as any).appiumProcess = null;
      reject(new Error("Appium 서버 프로세스를 실행할 수 없습니다."));
    });

    appiumProcess.on("exit", (code, signal) => {
      console.error(`[testRunner] Appium 서버 종료됨 (코드: ${code}, 시그널: ${signal})`);
      (globalThis as any).appiumProcess = null;
    });

    waitForAppiumReady()
      .then(() => {
        console.log("[testRunner] Appium 서버가 정상적으로 응답합니다.");
        resolve();
      })
      .catch(err => {
        reject(new Error("Appium 서버를 시작할 수 없습니다: " + err.message));
      });
  });
}

/**
 * WebDriver 생성 (Appium v3 완전 대응)
 */
async function createWebDriver(config: TestRunConfig): Promise<WebDriver> {
  let udid = config.deviceId;
  if (udid.startsWith("android-")) udid = udid.replace(/^android-/, "");
  if (udid.startsWith("ios-")) udid = udid.replace(/^ios-/, "");

  const platform = config.project.platform === "web" ? "android" : config.project.platform;

  // ===========================
  // ANDROID
  // ===========================
  if (platform === "android") {
    const capabilities: any = {
      platformName: "Android",

      // 반드시 vendor prefix 필요
      "appium:automationName": "UiAutomator2",
      "appium:udid": udid,
      "appium:noReset": true,
      "appium:uiautomator2ServerInstallTimeout": 60000,
      "appium:dontStopAppOnReset": true,
      "appium:newCommandTimeout": 300,
      "appium:adbExecTimeout": 60000,
      "appium:uiautomator2ServerLaunchTimeout": 60000,
      "appium:ignoreHiddenApiPolicyError": true,
      "appium:disableWindowAnimation": true
    };

    if (config.project.bundleId) {
      capabilities["appium:appPackage"] = config.project.bundleId;
      capabilities["appium:appActivity"] = `${config.project.bundleId}.MainActivity`;
      capabilities["appium:appWaitActivity"] = "*";
    }

    console.log(`[testRunner] Android WebDriver 생성 중... (UDID: ${udid})`);
    console.log("[testRunner] Capabilities:", JSON.stringify(capabilities, null, 2));

    const driver = await remote({
      hostname: "127.0.0.1",
      port: 4723,
      path: "/",
      capabilities
    });

    try {
      await execAsync(`adb -s ${udid} shell media volume --stream 3 --set 15`);
      console.log("[testRunner] 단말 미디어 볼륨 최대 설정 완료");
    } catch (e) {
      console.warn("[testRunner] 볼륨 설정 실패:", (e as Error).message);
    }

    return driver as unknown as WebDriver;
  }

  // ===========================
  // iOS
  // ===========================
  if (platform === "ios") {
    const capabilities: any = {
      platformName: "iOS",
      "appium:automationName": "XCUITest",
      "appium:udid": udid
    };

    if (config.project.bundleId) {
      capabilities["appium:bundleId"] = config.project.bundleId;
    }

    console.log(`[testRunner] iOS WebDriver 생성 중... (UDID: ${udid})`);
    console.log("[testRunner] Capabilities:", JSON.stringify(capabilities, null, 2));

    const driver = await remote({
      hostname: "127.0.0.1",
      port: 4723,
      path: "/",
      capabilities
    });

    return driver as unknown as WebDriver;
  }

  throw new Error(`지원하지 않는 플랫폼: ${platform}`);
}

/**
 * Locator 타입별 selector 생성
 */
function getSelector(by: string, value: string): string {
  switch (by.toLowerCase()) {
    case "id":
      return `~${value}`;
    case "xpath":
      return value;
    case "accessibility id":
    case "accessibility_id":
      return `~${value}`;
    case "class name":
      return value;
    case "text":
      return `//*[@text="${value}"]`;
    case "abs":
    case "none":
      return value;
    default:
      return value;
  }
}

/**
 * 액션 실행
 */
async function performAction(
  driver: any,
  actionData: ActionData,
  screenshotDir: string,
  stepNumber: number,
  runId?: string
): Promise<boolean> {
  const { action, by, value, name, sleep, skip_on_error, visible_if_type, visible_if, mandatory, input_text } = actionData;

  try {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`[STEP ${stepNumber.toString().padStart(3, "0")}] '${name}' 실행`);
    console.log(`- Action: ${action}`);
    console.log(`- Selector: ${by} → ${value}`);

    // 표시 조건 체크
    if (visible_if) {
      if (visible_if_type === "text") {
        const src = await driver.getPageSource();
        if (!src.includes(visible_if)) {
          console.log(`[SKIP] '${visible_if}' 없음 → Step SKIP`);
          return false;
        }
      } else {
        try {
          const selector = getSelector(visible_if_type, visible_if);
          const el = await driver.$(selector);
          await el.waitForDisplayed({ timeout: 1000 });
        } catch {
          console.log(`[SKIP] 요소 '${visible_if}' 없음 → Step SKIP`);
          return false;
        }
      }
    }

    // 지정된 sleep
    if (sleep > 0) {
      await new Promise(r => setTimeout(r, sleep * 1000));
    }

    // 스크린샷 저장 및 실행 기록에 반영
    try {
      const safe = name.replace(/[\\/:*?"<>|]/g, "_");
      const file = join(screenshotDir, `${safe}_${Date.now()}.png`);
      const base64 = await driver.takeScreenshot();
      await writeFile(file, Buffer.from(base64, "base64"));
      if (runId) {
        await updateRunStepScreenshot(runId, stepNumber, base64, "정상");
      }
    } catch (screenshotError) {
      console.warn(`[WARN] Screenshot capture failed: ${(screenshotError as Error).message}`);
    }

    // 실제 액션
    if (action === "click") {
      const el = await driver.$(getSelector(by, value));
      await el.click();
    } else if (action === "input") {
      const el = await driver.$(getSelector(by, value));
      await el.clearValue();
      await el.setValue(input_text);
    } else if (action === "tap") {
      const [x, y] = value.split(",").map(Number);
      await driver.touchAction({ action: "tap", x, y });
    } else if (action === "swipe") {
      const [x1, y1, x2, y2] = value.split(",").map(Number);
      await driver.touchAction([
        { action: "press", x: x1, y: y1 },
        { action: "wait", ms: 100 },
        { action: "moveTo", x: x2, y: y2 },
        { action: "release" }
      ]);
    } else if (action === "wait" || action === "wait_until_visible") {
      const el = await driver.$(getSelector(by, value));
      await el.waitForDisplayed({ timeout: 60000 });
    } else if (action === "back") {
      await driver.back();
    } else if (action === "play_audio") {
      await new Promise(r => setTimeout(r, sleep * 1000));
    } else if (action === "text_check") {
      const src = await driver.getPageSource();
      if (!src.includes(value)) throw new Error(`텍스트 '${value}' 없음`);
    }

    console.log(`[OK] Step ${stepNumber} 완료`);
    return true;

  } catch (e) {
    console.error(`[FAIL] Step ${stepNumber}: ${(e as Error).message}`);

    try {
      const safe = name.replace(/[\\/:*?"<>|]/g, "_");
      const file = join(screenshotDir, `${safe}_error_${Date.now()}.png`);
      const base64 = await driver.takeScreenshot();
      await writeFile(file, Buffer.from(base64, "base64"));
      if (runId) {
        await updateRunStepScreenshot(runId, stepNumber, base64, "오류");
      }
    } catch (screenshotError) {
      console.warn(`[WARN] Error screenshot failed: ${(screenshotError as Error).message}`);
    }

    if (skip_on_error === "Y" || mandatory === "N") {
      console.log(`[WARN] 오류 무시 후 계속 진행`);
      return false;
    }
    throw e;
  }
}

/**
 * 테스트 실행
 */
export async function runTest(config: TestRunConfig) {
  const tempDir = join(tmpdir(), `apptest-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const screenshotDir = join(tempDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });

  const logDir = join(tempDir, "logs");
  await mkdir(logDir, { recursive: true });

  const logs: string[] = [];
  const screenshots: string[] = [];
  let driver: WebDriver | null = null;

  const log = (msg: string) => {
    const t = `[${new Date().toISOString()}] ${msg}`;
    console.log(t);
    logs.push(t);
  };

  try {
    log(`테스트 실행 시작 - 프로젝트: ${config.project.name}, 시나리오: ${config.scenario.name}`);
    log(`임시 디렉토리: ${tempDir}`);

    log("Appium 서버 시작 중...");
    await startAppiumServer();

    const nodes = config.scenario.graph.nodes.map((n, i) => ({
      ...n,
      no: n.no !== undefined ? n.no : i + 1
    }));

    log(`시나리오 노드 수: ${nodes.length}`);
    nodes.forEach(n => log(`노드 ${n.no}: ${n.type} - ${n.name}`));

    const actions = nodes.map(convertNodeToAction);

    if (config.runId) updateRunStage(config.runId, "preparing", "running", "WebDriver 생성 중...");
    log("WebDriver 생성 중...");

    driver = await createWebDriver(config);
    log("WebDriver 생성 완료");

    if (config.runId) updateRunStage(config.runId, "running_test", "running", `${actions.length}개 액션 실행`);

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      if (config.runId) {
        updateRunStage(config.runId, "running_test", "running", `액션 ${i + 1}/${actions.length}: ${a.name}`);
      }

    const ok = await performAction(driver, a, screenshotDir, a.no, config.runId);
      if (!ok && a.skip_on_error !== "Y" && a.mandatory === "Y") {
        throw new Error(`Step ${a.no} 실패`);
      }
    }

    log("시나리오 실행 완료");

    try {
      const files = await readdir(screenshotDir);
      screenshots.push(...files.map(f => join(screenshotDir, f)));
    } catch {}

    return {
      success: true,
      output: logs.join("\n"),
      screenshots,
      logs
    };

  } catch (e) {
    const msg = (e as Error).message;
    log(`테스트 실행 실패: ${msg}`);

    return {
      success: false,
      output: `테스트 실행 실패: ${msg}\n\n${logs.join("\n")}`,
      screenshots,
      logs
    };

  } finally {
    if (driver) {
      try {
        await (driver as any).deleteSession();
        log("WebDriver 종료 완료");
      } catch (e) {
        log(`WebDriver 종료 실패: ${(e as Error).message}`);
      }
    }
  }
}
