import { Router } from "express";
import { z } from "zod";

import { getDevices } from "../data/store.js";
import { getDeviceApps } from "../services/deviceAppScanner.js";
import { extractElementAtPoint, getAndroidXmlHierarchy } from "../services/elementExtractor.js";
import { captureScreenshot } from "../services/screenshotCapture.js";
import { tap, swipe, inputText, back } from "../services/deviceControl.js";

const router = Router();

router.get("/", async (req, res) => {
  const { connection } = req.query;
  const devices = await getDevices();
  const filtered = devices.filter(device => {
    if (!connection) return true;
    return device.connection === connection;
  });

  res.json(filtered);
});

router.get("/:deviceId/apps", async (req, res) => {
  const { deviceId } = req.params;
  const devices = await getDevices();
  const target = devices.find(device => device.id === deviceId);
  if (!target) {
    return res.status(404).json({ message: "디바이스를 찾을 수 없습니다." });
  }

  if (target.connection !== "usb") {
    return res.status(400).json({ message: "USB로 연결된 디바이스만 앱 목록을 조회할 수 있습니다." });
  }

  const apps = await getDeviceApps(deviceId, target.platform);
  res.json(apps);
});

router.get("/:deviceId/element", async (req, res) => {
  const { deviceId } = req.params;
  const devices = await getDevices();
  const target = devices.find(device => device.id === deviceId);
  if (!target) {
    return res.status(404).json({ message: "디바이스를 찾을 수 없습니다." });
  }

  if (target.connection !== "usb") {
    return res.status(400).json({ message: "USB로 연결된 디바이스만 요소 정보를 추출할 수 있습니다." });
  }

  const schema = z.object({
    x: z.coerce.number(),
    y: z.coerce.number()
  });

  const parseResult = schema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ message: "x, y 좌표가 필요합니다.", errors: parseResult.error.errors });
  }

  const { x, y } = parseResult.data;
  const elementInfo = await extractElementAtPoint(deviceId, target.platform, x, y);

  if (!elementInfo) {
    return res.status(404).json({ message: "해당 좌표에서 요소를 찾을 수 없습니다." });
  }

  res.json(elementInfo);
});

router.get("/:deviceId/xml", async (req, res) => {
  const { deviceId } = req.params;
  const devices = await getDevices();
  const target = devices.find(device => device.id === deviceId);
  if (!target) {
    return res.status(404).json({ message: "디바이스를 찾을 수 없습니다." });
  }

  if (target.connection !== "usb") {
    return res.status(400).json({ message: "USB로 연결된 디바이스만 XML 계층 구조를 조회할 수 있습니다." });
  }

  if (target.platform !== "android") {
    return res.status(400).json({ message: "Android 디바이스만 지원됩니다." });
  }

  const serial = deviceId.replace(/^android-/, "");
  const xmlContent = await getAndroidXmlHierarchy(serial);

  if (!xmlContent) {
    return res.status(500).json({ message: "XML 계층 구조를 가져올 수 없습니다." });
  }

  res.setHeader("Content-Type", "application/xml");
  res.send(xmlContent);
});

router.post("/:deviceId/screenshot", async (req, res) => {
  const { deviceId } = req.params;
  const devices = await getDevices();
  const target = devices.find(device => device.id === deviceId);
  if (!target) {
    return res.status(404).json({ message: "디바이스를 찾을 수 없습니다." });
  }

  if (target.connection !== "usb") {
    return res.status(400).json({ message: "USB로 연결된 디바이스만 스크린샷을 캡처할 수 있습니다." });
  }

  const screenshotBuffer = await captureScreenshot(deviceId, target.platform);

  if (!screenshotBuffer) {
    return res.status(500).json({ message: "스크린샷을 캡처할 수 없습니다." });
  }

  // Base64로 인코딩하여 반환
  const base64 = screenshotBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  res.json({ screenshotUrl: dataUrl });
});

// AI 제어를 위한 디바이스 액션 엔드포인트
router.post("/:deviceId/action", async (req, res) => {
  const { deviceId } = req.params;
  const devices = await getDevices();
  const target = devices.find(device => device.id === deviceId);
  
  if (!target) {
    return res.status(404).json({ message: "디바이스를 찾을 수 없습니다." });
  }

  if (target.connection !== "usb") {
    return res.status(400).json({ message: "USB로 연결된 디바이스만 제어할 수 있습니다." });
  }

  const schema = z.object({
    action: z.enum(["tap", "swipe", "input", "back", "enter"]),
    x: z.coerce.number().optional(),
    y: z.coerce.number().optional(),
    x1: z.coerce.number().optional(),
    y1: z.coerce.number().optional(),
    x2: z.coerce.number().optional(),
    y2: z.coerce.number().optional(),
    text: z.string().optional(),
    duration: z.coerce.number().optional()
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ 
      message: "요청 형식이 올바르지 않습니다.", 
      errors: parseResult.error.errors 
    });
  }

  const { action, x, y, x1, y1, x2, y2, text, duration } = parseResult.data;

  try {
    switch (action) {
      case "tap":
        if (x === undefined || y === undefined) {
          return res.status(400).json({ message: "tap 액션에는 x, y 좌표가 필요합니다." });
        }
        await tap(deviceId, target.platform, x, y);
        break;
      
      case "swipe":
        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
          return res.status(400).json({ message: "swipe 액션에는 x1, y1, x2, y2 좌표가 필요합니다." });
        }
        await swipe(deviceId, target.platform, x1, y1, x2, y2, duration);
        break;
      
      case "input":
        if (!text) {
          return res.status(400).json({ message: "input 액션에는 text가 필요합니다." });
        }
        await inputText(deviceId, target.platform, text);
        break;
      
      case "back":
        await back(deviceId, target.platform);
        break;
      
      case "enter":
        if (target.platform === "android") {
          const { pressEnterAndroid } = await import("../services/deviceControl.js");
          await pressEnterAndroid(deviceId);
        } else {
          return res.status(400).json({ message: "iOS는 아직 지원되지 않습니다." });
        }
        break;
      
      default:
        return res.status(400).json({ message: `지원하지 않는 액션: ${action}` });
    }

    // 액션 실행 후 잠시 대기 (UI 업데이트 시간)
    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({ success: true, message: `액션 '${action}' 실행 완료` });
  } catch (error) {
    console.error(`[Device Control] 액션 실행 실패:`, error);
    res.status(500).json({ 
      message: `액션 실행 실패: ${(error as Error).message}` 
    });
  }
});

export default router;

