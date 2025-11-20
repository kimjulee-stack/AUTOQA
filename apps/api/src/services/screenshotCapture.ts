import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execAsync = promisify(exec);

/**
 * Android 디바이스에서 스크린샷을 캡처합니다.
 */
export async function captureAndroidScreenshot(serial: string): Promise<Buffer | null> {
  try {
    // 스크린샷 캡처
    await execAsync(`adb -s ${serial} shell screencap -p /sdcard/screenshot.png`);
    
    // 스크린샷을 로컬로 가져오기
    const tmpPath = join(tmpdir(), `screenshot_${serial}_${Date.now()}.png`);
    await execAsync(`adb -s ${serial} pull /sdcard/screenshot.png "${tmpPath}"`);
    
    // 파일 읽기
    const imageBuffer = await readFile(tmpPath);
    
    // 임시 파일 삭제
    await unlink(tmpPath).catch(() => {});
    
    return imageBuffer;
  } catch (error) {
    console.warn("[screenshotCapture] Failed to capture Android screenshot:", (error as Error).message);
    return null;
  }
}

/**
 * iOS 디바이스에서 스크린샷을 캡처합니다.
 */
export async function captureIosScreenshot(udid: string): Promise<Buffer | null> {
  try {
    // iOS는 idevicescreenshot을 사용
    const tmpPath = join(tmpdir(), `screenshot_${udid}_${Date.now()}.png`);
    await execAsync(`idevicescreenshot -u ${udid} "${tmpPath}"`);
    
    // 파일 읽기
    const imageBuffer = await readFile(tmpPath);
    
    // 임시 파일 삭제
    await unlink(tmpPath).catch(() => {});
    
    return imageBuffer;
  } catch (error) {
    console.warn("[screenshotCapture] Failed to capture iOS screenshot:", (error as Error).message);
    return null;
  }
}

/**
 * 디바이스에서 스크린샷을 캡처합니다.
 */
export async function captureScreenshot(
  deviceId: string,
  platform: "android" | "ios"
): Promise<Buffer | null> {
  if (platform === "android") {
    const serial = deviceId.replace(/^android-/, "");
    return captureAndroidScreenshot(serial);
  }
  if (platform === "ios") {
    const udid = deviceId.replace(/^ios-/, "");
    return captureIosScreenshot(udid);
  }
  return null;
}






