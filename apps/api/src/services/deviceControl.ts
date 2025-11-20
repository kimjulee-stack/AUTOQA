import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * 디바이스 ID에서 시리얼 번호 추출
 */
function getSerial(deviceId: string): string {
  if (deviceId.startsWith("android-")) {
    return deviceId.replace(/^android-/, "");
  }
  if (deviceId.startsWith("ios-")) {
    return deviceId.replace(/^ios-/, "");
  }
  return deviceId;
}

/**
 * 좌표 탭 (Android)
 */
export async function tapAndroid(deviceId: string, x: number, y: number): Promise<void> {
  const serial = getSerial(deviceId);
  try {
    await execAsync(`adb -s ${serial} shell input tap ${x} ${y}`);
  } catch (error) {
    throw new Error(`탭 실행 실패: ${(error as Error).message}`);
  }
}

/**
 * 좌표 탭 (iOS)
 */
export async function tapIos(deviceId: string, x: number, y: number): Promise<void> {
  const udid = getSerial(deviceId);
  try {
    // iOS는 xcrun simctl 또는 idevice 명령 사용
    // 실제 구현은 iOS 디바이스 타입에 따라 다를 수 있음
    await execAsync(`xcrun simctl io ${udid} tap ${x} ${y}`);
  } catch (error) {
    throw new Error(`탭 실행 실패: ${(error as Error).message}`);
  }
}

/**
 * 스와이프 (Android)
 */
export async function swipeAndroid(
  deviceId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  duration: number = 300
): Promise<void> {
  const serial = getSerial(deviceId);
  try {
    await execAsync(`adb -s ${serial} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
  } catch (error) {
    throw new Error(`스와이프 실행 실패: ${(error as Error).message}`);
  }
}

/**
 * 텍스트 입력 (Android)
 */
export async function inputTextAndroid(deviceId: string, text: string): Promise<void> {
  const serial = getSerial(deviceId);
  try {
    // adb input text는 공백과 특수문자 처리가 복잡하므로
    // 각 문자를 개별적으로 입력하거나 base64 인코딩 사용
    // 간단한 방법: 공백을 %s로, 특수문자는 이스케이프
    const escapedText = text
      .replace(/\\/g, "\\\\")
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`")
      .replace(/"/g, '\\"')
      .replace(/ /g, "%s");
    
    await execAsync(`adb -s ${serial} shell input text "${escapedText}"`);
  } catch (error) {
    throw new Error(`텍스트 입력 실패: ${(error as Error).message}`);
  }
}

/**
 * 뒤로가기 (Android)
 */
export async function backAndroid(deviceId: string): Promise<void> {
  const serial = getSerial(deviceId);
  try {
    await execAsync(`adb -s ${serial} shell input keyevent KEYCODE_BACK`);
  } catch (error) {
    throw new Error(`뒤로가기 실행 실패: ${(error as Error).message}`);
  }
}

/**
 * 엔터 키 (Android)
 */
export async function pressEnterAndroid(deviceId: string): Promise<void> {
  const serial = getSerial(deviceId);
  try {
    await execAsync(`adb -s ${serial} shell input keyevent KEYCODE_ENTER`);
  } catch (error) {
    throw new Error(`엔터 키 실행 실패: ${(error as Error).message}`);
  }
}

/**
 * 플랫폼별 탭 실행
 */
export async function tap(deviceId: string, platform: "android" | "ios", x: number, y: number): Promise<void> {
  if (platform === "android") {
    return tapAndroid(deviceId, x, y);
  } else {
    return tapIos(deviceId, x, y);
  }
}

/**
 * 플랫폼별 스와이프 실행
 */
export async function swipe(
  deviceId: string,
  platform: "android" | "ios",
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  duration?: number
): Promise<void> {
  if (platform === "android") {
    return swipeAndroid(deviceId, x1, y1, x2, y2, duration);
  } else {
    // iOS 스와이프 구현 필요
    throw new Error("iOS 스와이프는 아직 지원되지 않습니다.");
  }
}

/**
 * 플랫폼별 텍스트 입력
 */
export async function inputText(deviceId: string, platform: "android" | "ios", text: string): Promise<void> {
  if (platform === "android") {
    return inputTextAndroid(deviceId, text);
  } else {
    throw new Error("iOS 텍스트 입력은 아직 지원되지 않습니다.");
  }
}

/**
 * 플랫폼별 뒤로가기
 */
export async function back(deviceId: string, platform: "android" | "ios"): Promise<void> {
  if (platform === "android") {
    return backAndroid(deviceId);
  } else {
    throw new Error("iOS 뒤로가기는 아직 지원되지 않습니다.");
  }
}

