import { exec } from "node:child_process";
import { promisify } from "node:util";
import { parseStringPromise } from "xml2js";

const execAsync = promisify(exec);

export interface ElementInfo {
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

/**
 * Android 디바이스에서 UI 계층 구조 XML을 가져옵니다.
 */
export async function getAndroidXmlHierarchy(serial: string): Promise<string | null> {
  try {
    // UI 계층 구조를 XML로 덤프
    await execAsync(`adb -s ${serial} shell uiautomator dump /sdcard/window_dump.xml`);
    
    // XML 파일을 로컬로 가져오기
    const os = await import("node:os");
    const tmpPath = `${os.tmpdir()}/window_dump_${serial}_${Date.now()}.xml`;
    await execAsync(`adb -s ${serial} pull /sdcard/window_dump.xml "${tmpPath}"`);
    
    // XML 파일 읽기
    const fs = await import("node:fs/promises");
    const xmlContent = await fs.readFile(tmpPath, "utf-8");
    
    // 임시 파일 삭제
    await fs.unlink(tmpPath).catch(() => {});
    
    return xmlContent;
  } catch (error) {
    console.warn("[elementExtractor] Failed to get Android XML hierarchy:", (error as Error).message);
    return null;
  }
}

/**
 * Android 디바이스에서 특정 좌표의 요소 정보를 추출합니다.
 * uiautomator dump를 사용하여 UI 계층 구조를 가져온 후,
 * 좌표에 해당하는 요소를 찾아 locator를 생성합니다.
 */
async function extractAndroidElement(serial: string, x: number, y: number): Promise<ElementInfo | null> {
  try {
    // XML 계층 구조 가져오기
    const xmlContent = await getAndroidXmlHierarchy(serial);
    if (!xmlContent) {
      return null;
    }
    
    // XML 파싱
    const parsed = await parseStringPromise(xmlContent);
    
    // 좌표에 해당하는 요소 찾기
    const findElementAtPoint = (node: any, targetX: number, targetY: number): any => {
      if (!node) return null;
      
      // XML2JS 파싱 결과에서 속성은 $에 있음
      const attrs = node.$ || {};
      const bounds = attrs.bounds;
      
      if (bounds) {
        // bounds 형식: "[x1,y1][x2,y2]"
        const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (match) {
          const [, x1, y1, x2, y2] = match.map(Number);
          if (targetX >= x1 && targetX <= x2 && targetY >= y1 && targetY <= y2) {
            // 이 요소가 클릭된 좌표를 포함함
            // 자식 요소 중 더 작은 것을 찾거나, 이 요소를 반환
            const children = node.node || (Array.isArray(node) ? node : []);
            for (const child of Array.isArray(children) ? children : [children]) {
              const childResult = findElementAtPoint(child, targetX, targetY);
              if (childResult) return childResult;
            }
            return node;
          }
        }
      }
      
      // 자식 요소 검색
      const children = node.node || (Array.isArray(node) ? node : []);
      for (const child of Array.isArray(children) ? children : [children]) {
        const result = findElementAtPoint(child, targetX, targetY);
        if (result) return result;
      }
      
      return null;
    };

    // XML2JS 파싱 결과 구조: { hierarchy: { node: [...] } }
    const hierarchy = parsed.hierarchy || parsed;
    const rootNode = hierarchy.node?.[0] || hierarchy.node || hierarchy;
    const element = findElementAtPoint(rootNode, x, y);
    
    if (!element || !element.$) {
      return null;
    }

    const attrs = element.$;
    const resourceId = attrs["resource-id"];
    const text = attrs.text;
    const contentDesc = attrs["content-desc"];
    const className = attrs.class;
    const bounds = attrs.bounds;
    const index = attrs.index !== undefined ? Number(attrs.index) : undefined;
    const packageName = attrs.package;

    // Locator 우선순위: resource-id > content-desc > text > xpath
    let locatorType = "xpath";
    let locator = "";

    if (resourceId) {
      locatorType = "id";
      locator = resourceId;
    } else if (contentDesc) {
      locatorType = "accessibility id";
      locator = contentDesc;
    } else if (text) {
      locatorType = "xpath";
      locator = `//*[@text='${text}']`;
    } else if (className) {
      locatorType = "class name";
      locator = className;
    } else {
      // bounds를 사용한 xpath 생성
      locatorType = "xpath";
      if (bounds) {
        const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (match) {
          const [, x1, y1, x2, y2] = match.map(Number);
          locator = `//*[@bounds='[${x1},${y1}][${x2},${y2}]']`;
        }
      }
    }

    // XPath 생성 (모든 가능한 locator 타입)
    const xpath = className ? `//${className}` : `//${attrs.class || "*"}`;

    return {
      locatorType,
      locator,
      text,
      resourceId,
      contentDesc,
      className,
      bounds,
      elementId: attrs["element-id"] || attrs.index !== undefined ? `00000000-0000-0000-ffff-ffff${String(index || 0).padStart(8, "0")}` : undefined,
      index,
      package: packageName,
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
  } catch (error) {
    console.warn("[elementExtractor] Failed to extract Android element:", (error as Error).message);
    return null;
  }
}

/**
 * iOS 디바이스에서 특정 좌표의 요소 정보를 추출합니다.
 * idevice-app-runner 또는 Appium을 통해 accessibility 정보를 가져옵니다.
 */
async function extractIosElement(udid: string, x: number, y: number): Promise<ElementInfo | null> {
  try {
    // iOS는 idevice-app-runner나 Appium이 필요하므로,
    // 일단 기본적인 접근 방식으로 구현
    // 실제로는 Appium Inspector의 접근 방식을 사용해야 함
    
    // 임시로 좌표 기반 locator 반환
    return {
      locatorType: "xpath",
      locator: `//XCUIElementTypeButton[@x=${x} and @y=${y}]`,
      bounds: `[${x},${y}][${x+100},${y+50}]`
    };
  } catch (error) {
    console.warn("[elementExtractor] Failed to extract iOS element:", (error as Error).message);
    return null;
  }
}

/**
 * 디바이스에서 특정 좌표의 요소 정보를 추출합니다.
 */
export async function extractElementAtPoint(
  deviceId: string,
  platform: "android" | "ios",
  x: number,
  y: number
): Promise<ElementInfo | null> {
  if (platform === "android") {
    const serial = deviceId.replace(/^android-/, "");
    return extractAndroidElement(serial, x, y);
  }
  if (platform === "ios") {
    const udid = deviceId.replace(/^ios-/, "");
    return extractIosElement(udid, x, y);
  }
  return null;
}

