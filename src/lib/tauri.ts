import type {
  ApkMeta, AppInfo, BatteryInfo, DeviceInfo, FileEntry,
  MemoryInfo, ProcessInfo, SavedDevice, StorageInfo,
} from "./types";
import {
  MOCK_ADB_STATUS, MOCK_APPS, MOCK_BATTERY, MOCK_DEVICES,
  MOCK_FILES, MOCK_MEMORY, MOCK_PROCESSES, MOCK_STORAGE,
} from "../mock/data";

let useMock = false;
try {
  // Web dev (no Tauri) or explicit mock env -> mock mode.
  useMock =
    typeof window !== "undefined" &&
    (!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
      (window as unknown as { __ADB_MOCK__?: boolean }).__ADB_MOCK__ === true);
} catch {
  useMock = true;
}

async function tryInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (useMock) return null;
  try {
    const mod = await import("@tauri-apps/api/core");
    return await mod.invoke<T>(cmd, args);
  } catch {
    useMock = true;
    return null;
  }
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const api = {
  isMock: () => useMock,

  async adbStatus() {
    const r = await tryInvoke("adb_status");
    if (r) return r as { ready: boolean; version?: string | null; path?: string | null; mock: boolean };
    await delay();
    return MOCK_ADB_STATUS;
  },
  async adbDetect() {
    const r = await tryInvoke("adb_detect");
    if (r) return r as { ready: boolean; version?: string | null; path?: string | null; mock: boolean };
    await delay(300);
    return MOCK_ADB_STATUS;
  },
  async adbSetPath(path: string) {
    const r = await tryInvoke("adb_set_path", { path });
    if (r) return r as { ready: boolean; version?: string | null; path?: string | null; mock: boolean };
    await delay();
    return { ...MOCK_ADB_STATUS, path };
  },

  async listDevices(): Promise<DeviceInfo[]> {
    const r = await tryInvoke<DeviceInfo[]>("list_devices");
    if (r) return r;
    await delay(250);
    return MOCK_DEVICES;
  },

  async listApps(serial: string): Promise<AppInfo[]> {
    const r = await tryInvoke<AppInfo[]>("list_apps", { serial });
    if (r) return r;
    await delay(350);
    return MOCK_APPS;
  },
  async appAction(serial: string, pkg: string, action: string): Promise<string> {
    const r = await tryInvoke<string>("app_action", { serial, package: pkg, action });
    if (r) return r;
    await delay(300);
    return `${action} ok (mock)`;
  },

  async listProcesses(serial: string): Promise<ProcessInfo[]> {
    const r = await tryInvoke<ProcessInfo[]>("list_processes", { serial });
    if (r) return r;
    await delay(300);
    return MOCK_PROCESSES;
  },
  async killProcess(serial: string, pid: number, pkg?: string | null): Promise<string> {
    const r = await tryInvoke<string>("kill_process", { serial, pid, package: pkg ?? null });
    if (r) return r;
    await delay(200);
    return "killed (mock)";
  },

  async shell(serial: string, line: string) {
    const r = await tryInvoke<{ stdout: string; stderr: string; code?: number | null }>("shell_exec", { serial, line });
    if (r) return r;
    await delay(150);
    return { stdout: `mock$ ${line}\n16\n`, stderr: "", code: 0 };
  },

  async battery(serial: string): Promise<BatteryInfo> {
    const r = await tryInvoke<BatteryInfo>("battery_info", { serial });
    if (r) return r;
    await delay(150);
    return MOCK_BATTERY;
  },
  async memory(serial: string): Promise<MemoryInfo> {
    const r = await tryInvoke<MemoryInfo>("memory_info", { serial });
    if (r) return r;
    await delay(150);
    return MOCK_MEMORY;
  },
  async storage(serial: string, path: string): Promise<StorageInfo> {
    const r = await tryInvoke<StorageInfo>("storage_info", { serial, path });
    if (r) return r;
    await delay(150);
    return MOCK_STORAGE;
  },
  async files(serial: string, path: string): Promise<FileEntry[]> {
    const r = await tryInvoke<FileEntry[]>("list_files", { serial, path });
    if (r) return r;
    await delay(200);
    return MOCK_FILES(path);
  },

  async pair(host: string, port: number, code: string): Promise<string> {
    const r = await tryInvoke<string>("pair_device", { host, port, code });
    if (r) return r;
    await delay(400);
    return `Successfully paired to ${host}:${port} (mock)`;
  },
  async connect(host: string, port: number): Promise<string> {
    const r = await tryInvoke<string>("connect_device", { host, port });
    if (r) return r;
    await delay(400);
    return `already connected to ${host}:${port} (mock)`;
  },
  async reboot(serial: string, mode: string): Promise<string> {
    const r = await tryInvoke<string>("reboot_device", { serial, mode });
    if (r) return r;
    await delay(200);
    return "Reboot command sent (mock)";
  },
  async installApk(serial: string, path: string, reinstall: boolean): Promise<string> {
    const r = await tryInvoke<string>("install_apk", { serial, path, reinstall });
    if (r) return r;
    await delay(800);
    return "Success (mock)";
  },
  async inspectApk(path: string): Promise<ApkMeta> {
    const r = await tryInvoke<ApkMeta>("inspect_apk", { path });
    if (r) return r;
    await delay(300);
    return {
      file_name: path.split(/[\\/]/).pop() ?? "app.apk",
      size_bytes: 24_582_144,
      package: "com.example.app",
      version: "2.4.1",
      version_code: "241",
      min_sdk: "26",
      target_sdk: "34",
      abis: ["arm64-v8a"],
      permissions: ["android.permission.INTERNET", "android.permission.CAMERA"],
      activities: [".MainActivity"],
      services: [],
      receivers: [],
      providers: [],
    };
  },
  async savedLoad(): Promise<SavedDevice[]> {
    const r = await tryInvoke<SavedDevice[]>("saved_devices_load");
    if (r) return r;
    try {
      const raw = localStorage.getItem("adb.savedDevices");
      return raw ? (JSON.parse(raw) as SavedDevice[]) : [];
    } catch {
      return [];
    }
  },
  async savedStore(devices: SavedDevice[]) {
    const r = await tryInvoke("saved_devices_save", { devices });
    if (r !== null) return;
    try {
      localStorage.setItem("adb.savedDevices", JSON.stringify(devices));
    } catch { /* ignore */ }
  },
};

export function fmtBytes(kb?: number | null): string {
  if (kb == null) return "Not available";
  const bytes = kb * 1024;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}
