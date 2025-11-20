import { exec } from "node:child_process";
import { promisify } from "node:util";

import type { DeviceApp } from "../types.js";

const execAsync = promisify(exec);

async function getAndroidApps(serial: string): Promise<DeviceApp[]> {
  try {
    const { stdout } = await execAsync(`adb -s ${serial} shell pm list packages -3`);
    const packages = stdout
      .split("\n")
      .map(line => line.trim().replace("package:", ""))
      .filter(Boolean);

    return packages.map(pkg => ({
      id: `android-app-${pkg}`,
      platform: "android",
      packageId: pkg
    }));
  } catch (error) {
    console.warn("[deviceAppScanner] Failed to read Android apps:", (error as Error).message);
    return [];
  }
}

async function getIosApps(udid: string): Promise<DeviceApp[]> {
  try {
    const { stdout } = await execAsync(`ideviceinstaller -u ${udid} -l`);
    const packages = stdout
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.includes(" - "))
      .map(line => {
        const [packageId, name] = line.split(" - ");
        return { packageId, name };
      });

    return packages.map(pkg => ({
      id: `ios-app-${pkg.packageId}`,
      platform: "ios",
      packageId: pkg.packageId,
      name: pkg.name
    }));
  } catch (error) {
    console.warn("[deviceAppScanner] Failed to read iOS apps:", (error as Error).message);
    return [];
  }
}

export async function getDeviceApps(deviceId: string, platform: "android" | "ios") {
  if (platform === "android") {
    const serial = deviceId.replace(/^android-/, "");
    return getAndroidApps(serial);
  }
  if (platform === "ios") {
    const udid = deviceId.replace(/^ios-/, "");
    return getIosApps(udid);
  }
  return [];
}






