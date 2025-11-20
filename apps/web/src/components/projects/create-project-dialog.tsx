"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { postToApi, putToApi } from "@/lib/api";
import type { Device, DeviceApp, Project } from "@/types";

interface Props {
  trigger: React.ReactNode;
  project?: Project;
  onSuccess?: () => void;
}

export function CreateProjectDialog({ trigger, project, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!project;
  const productOptions = ["뇌새김", "브레인키", "톡이즈", "톡이즈 스쿨", "톡이즈 보카", "스피킹맥스", "맥스AI", "맥스AI 월드", "맥스AI 스쿨"];
  
  const noesaegimSubCategories = [
    "MATE",
    "처음영어",
    "워드프리미엄",
    "기초영어",
    "왕초보스피킹",
    "토크",
    "엄마영어",
    "왕초보여행영어",
    "엄마영어여행편",
    "비즈니스영어",
    "뉴토익스피킹",
    "중국어",
    "일본어",
    "여행일본어",
    "스페인어",
    "프랑스어",
    "주니어리딩북",
    "주니어영어",
    "주니어수학",
    "초등국어",
    "초등사회",
    "초등과학",
    "AI워드렌즈",
    "AI회화"
  ];

  const brainKeySubCategories = [
    "토크",
    "워드프리미엄",
    "기초영어",
    "처음영어",
    "기초한국어",
    "실전한국어"
  ];

  const [devices, setDevices] = useState<Device[]>([]);
  const [isDeviceLoading, setIsDeviceLoading] = useState(false);
  const [deviceApps, setDeviceApps] = useState<DeviceApp[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    product: productOptions[0],
    subCategory: "",
    platform: "android",
    bundleId: "",
    deviceId: ""
  });

  // 수정 모드일 때 폼 초기화
  useEffect(() => {
    if (open && project) {
      setForm({
        id: project.id,
        name: project.name,
        product: project.product,
        subCategory: "",
        platform: project.platform,
        bundleId: project.bundleId ?? "",
        deviceId: project.deviceId ?? ""
      });
    } else if (open && !project) {
      setForm({
        id: "",
        name: "",
        product: productOptions[0],
        subCategory: "",
        platform: "android",
        bundleId: "",
        deviceId: ""
      });
    }
  }, [open, project]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const selectedApp = useMemo(() => deviceApps.find(app => app.packageId === form.bundleId), [deviceApps, form.bundleId]);

  const isDisabled = useMemo(() => !form.name || !form.product || !form.bundleId, [form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isDisabled) return;

    startTransition(async () => {
      try {
        if (isEditMode && project) {
          // 수정 모드 - 프로젝트 ID를 URL 인코딩
          const encodedId = encodeURIComponent(project.id);
          await putToApi<Project>(`/projects/${encodedId}`, {
            name: form.name,
            product: form.product,
            platform: form.platform as Project["platform"],
            bundleId: form.bundleId || undefined,
            deviceId: form.deviceId || undefined
          });
        } else {
          // 생성 모드
          await postToApi<Project>("/projects", {
            ...form,
            id: form.id || undefined,
            platform: form.platform as Project["platform"],
            bundleId: form.bundleId || undefined,
            deviceId: form.deviceId || undefined
          });
        }
        setOpen(false);
        setDeviceApps([]);
        setForm({
          id: "",
          name: "",
          product: productOptions[0],
          subCategory: "",
          platform: "android",
          bundleId: "",
          deviceId: devices[0]?.id ?? ""
        });
        // 모든 경우에 리스트 페이지에 머무르고 새로고침하여 생성된 프로젝트가 보이도록 함
        router.refresh();
        onSuccess?.();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function fetchDevices() {
      try {
        setIsDeviceLoading(true);
        setError(null);
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
        const res = await fetch(`${baseUrl}/devices?connection=usb`, { signal: controller.signal });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`디바이스 정보를 가져오지 못했습니다: ${res.status} ${errorText}`);
        }
        const data: Device[] = await res.json();
        setDevices(data);
        if (data.length > 0) {
          setForm(prev => ({
            ...prev,
            deviceId: prev.deviceId || (data[0]?.id ?? "")
          }));
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errorMsg = (err as Error).message;
          // 네트워크 에러인 경우에만 에러 메시지 표시
          if (errorMsg.includes("fetch failed") || errorMsg.includes("Failed to fetch")) {
            setError(`API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.`);
          }
          setDevices([]);
        }
      } finally {
        setIsDeviceLoading(false);
      }
    }

    fetchDevices();

    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || !form.deviceId) {
      setDeviceApps([]);
      return;
    }
    const controller = new AbortController();
    async function fetchApps() {
      try {
        setIsAppLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
        const res = await fetch(`${baseUrl}/devices/${form.deviceId}/apps`, { signal: controller.signal });
        if (!res.ok) throw new Error("앱 목록을 가져오지 못했습니다.");
        const data: DeviceApp[] = await res.json();
        setDeviceApps(data);
        if (data.length > 0) {
          setForm(prev => ({
            ...prev,
            bundleId: prev.bundleId || data[0].packageId
          }));
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
        setDeviceApps([]);
      } finally {
        setIsAppLoading(false);
      }
    }
    fetchApps();

    return () => controller.abort();
  }, [open, form.deviceId]);

  // 수정 모드일 때는 자동으로 열기
  useEffect(() => {
    if (project && !open) {
      setOpen(true);
    }
  }, [project, open]);

  return (
    <>
      {!isEditMode && (
        <span onClick={() => setOpen(true)} style={{ display: "inline-block" }}>
          {trigger}
        </span>
      )}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="surface"
            style={{
              width: 420,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{isEditMode ? "프로젝트 수정" : "프로젝트 생성"}</h3>
              <button
                type="button"
                aria-label="close"
                onClick={() => {
                  setOpen(false);
                  if (isEditMode && onSuccess) {
                    onSuccess();
                  }
                }}
              >
                ✕
              </button>
            </div>
            {!isEditMode && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                프로젝트 ID (선택)
                <input
                  value={form.id}
                  onChange={e => setForm(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="예: wb_maxai_001"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px"
                  }}
                />
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              프로젝트 이름*
              <input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px"
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              연결된 USB 단말
              {isDeviceLoading ? (
                <div
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "var(--text-muted)",
                    fontSize: 13
                  }}
                >
                  USB 단말을 조회하는 중...
                </div>
              ) : devices.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "var(--text-muted)",
                    fontSize: 13
                  }}
                >
                  연결된 USB 단말이 없습니다.
                </div>
              ) : (
                <select
                  value={form.deviceId}
                  onChange={e => setForm(prev => ({ ...prev, deviceId: e.target.value }))}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px"
                  }}
                >
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name} · {device.osVersion}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              제품명*
              <select
                value={form.product}
                onChange={e => {
                  setForm(prev => ({ ...prev, product: e.target.value, subCategory: "" }));
                }}
                required
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px"
                }}
              >
                {productOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {form.product === "뇌새김" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                하위 카테고리
                <select
                  value={form.subCategory}
                  onChange={e => setForm(prev => ({ ...prev, subCategory: e.target.value }))}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px"
                  }}
                >
                  <option value="">선택하세요</option>
                  {noesaegimSubCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.product === "브레인키" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                하위 카테고리
                <select
                  value={form.subCategory}
                  onChange={e => setForm(prev => ({ ...prev, subCategory: e.target.value }))}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px"
                  }}
                >
                  <option value="">선택하세요</option>
                  {brainKeySubCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              플랫폼*
              <select
                value={form.platform}
                onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px"
                }}
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="web">WEB</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              앱 아이디 / 번들 ID
              {selectedApp && (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  선택된 앱: {selectedApp.name ?? selectedApp.packageId}
                </span>
              )}
              {deviceApps.length > 0 && (
                <select
                  value={form.bundleId}
                  onChange={e => setForm(prev => ({ ...prev, bundleId: e.target.value }))}
                  disabled={isAppLoading}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 8
                  }}
                >
                  {deviceApps.map(app => {
                    const label = app.name ? `${app.name} · ${app.packageId}` : app.packageId;
                    return (
                      <option key={app.id} value={app.packageId}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              )}
              <input
                value={form.bundleId}
                onChange={e => setForm(prev => ({ ...prev, bundleId: e.target.value }))}
                placeholder={isAppLoading ? "앱 목록을 불러오는 중..." : "com.example.app"}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px"
                }}
              />
            </label>
            {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
            <button
              type="submit"
              disabled={isDisabled || isPending}
              style={{
                marginTop: 12,
                padding: "12px 16px",
                borderRadius: 12,
                background: isDisabled ? "#dfe3eb" : "var(--primary)",
                color: isDisabled ? "#9ea4b3" : "#1c1d21",
                fontWeight: 700
              }}
            >
              {isPending ? (isEditMode ? "수정 중..." : "생성 중...") : isEditMode ? "수정" : "생성"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

