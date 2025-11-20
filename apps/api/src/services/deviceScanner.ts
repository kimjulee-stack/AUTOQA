import { exec } from "node:child_process";
import { promisify } from "node:util";

import type { Device } from "../types.js";

const execAsync = promisify(exec);

async function scanAndroidDevices(): Promise<Device[]> {
  try {
    const { stdout } = await execAsync("adb devices -l");
    const lines = stdout.split("\n").map(line => line.trim());
    const devices: Device[] = [];
    for (const line of lines) {
      if (!line || line.startsWith("List of devices")) continue;
      
      // 공백으로 분리하여 시리얼 번호와 상태 추출
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      
      const serial = parts[0];
      const status = parts[1];
      
      // offline 상태는 제외, device와 unauthorized는 포함
      if (status === "offline") continue;
      
      // 모델명 또는 제품명 추출
      const modelMatch = line.match(/model:(\S+)/);
      const productMatch = line.match(/product:(\S+)/);
      const deviceName = modelMatch?.[1] ?? productMatch?.[1] ?? "Android Device";
      
      // 상태에 따라 device 상태 설정
      // unauthorized 상태도 available로 표시 (사용자가 디바이스에서 인증 허용 필요)
      let deviceStatus: "available" | "in-use" | "offline" = "available";
      if (status === "offline") {
        deviceStatus = "offline";
      }
      
      devices.push({
        id: `android-${serial}`,
        name: deviceName.replace(/_/g, " "),
        platform: "android",
        osVersion: "Android",
        status: deviceStatus,
        connection: "usb"
      });
    }
    return devices;
  } catch (error) {
    console.error("[deviceScanner] Failed to scan Android devices:", (error as Error).message);
    return [];
  }
}

async function scanIosDevices(): Promise<Device[]> {
  try {
    const { stdout } = await execAsync("idevice_id -l");
    const lines = stdout.split("\n").map(line => line.trim()).filter(Boolean);
    const devices: Device[] = [];
    for (const udid of lines) {
      devices.push({
        id: `ios-${udid}`,
        name: `iOS Device (${udid.slice(0, 6)})`,
        platform: "ios",
        osVersion: "iOS",
        status: "available",
        connection: "usb"
      });
    }
    return devices;
  } catch (error) {
    console.warn("[deviceScanner] Failed to scan iOS devices:", (error as Error).message);
    return [];
  }
}

export async function getUsbDevices() {
  const [android, ios] = await Promise.all([scanAndroidDevices(), scanIosDevices()]);
  return [...android, ...ios];
}


