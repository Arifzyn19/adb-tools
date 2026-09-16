import type {
  ApkMeta, AppInfo, BatteryInfo, DeviceInfo, FileEntry,
  MemoryInfo, ProcessInfo, SavedDevice, StorageInfo,
} from "./types";
import {
  MOCK_ADB_STATUS, MOCK_APPS, MOCK_BATTERY, MOCK_DEVICES,
  MOCK_FILES, MOCK_MEMORY, MOCK_PROCESSES, MOCK_STORAGE,
} from "../mock/data";

/**
 * Tauri 2 does NOT inject `window.__TAURI__` unless `app.withGlobalTauri`
 * is enabled. The reliable runtime marker is `__TAURI_INTERNALS__`,
 * which the official `@tauri-apps/api` bridge always uses.
 */
export function isTauriRuntime(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      (window as unknown as { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__ != null
    );
  } catch {
    return false;
  }
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const mod = await import("@tauri-apps/api/core");
  // NOTE: command-level errors (Err from Rust) propagate to callers so the
  // UI can show real error states instead of silently falling back to mock.
  return mod.invoke<T>(cmd, args);
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

type AdbStatusShape = { ready: boolean; version?: string | null; path?: string | null; mock: boolean };

export const api = {
  isMock: () => !isTauriRuntime(),

  async adbStatus(): Promise<AdbStatusShape> {
    if (!isTauriRuntime()) {
      await delay();
      return MOCK_ADB_STATUS;
    }
    return invokeTauri<AdbStatusShape>("adb_status");
  },
  async adbDetect(): Promise<AdbStatusShape> {
    if (!isTauriRuntime()) {
      await delay(300);
      return MOCK_ADB_STATUS;
    }
    return invokeTauri<AdbStatusShape>("adb_detect");
  },
  async adbSetPath(path: string): Promise<AdbStatusShape> {
    if (!isTauriRuntime()) {
      await delay();
      return { ...MOCK_ADB_STATUS, path };
    }
    return invokeTauri<AdbStatusShape>("adb_set_path", { path });
  },

  async listDevices(): Promise<DeviceInfo[]> {
    if (!isTauriRuntime()) {
      await delay(250);
      return MOCK_DEVICES;
    }
    return invokeTauri<DeviceInfo[]>("list_devices");
  },

  async listApps(serial: string): Promise<AppInfo[]> {
    if (!isTauriRuntime()) {
      await delay(350);
      return MOCK_APPS;
    }
    return invokeTauri<AppInfo[]>("list_apps", { serial });
  },
  async appAction(serial: string, pkg: string, action: string): Promise<string> {
    if (!isTauriRuntime()) {
      await delay(300);
      return `${action} ok (mock)`;
    }
    return invokeTauri<string>("app_action", { serial, package: pkg, action });
  },

  async listProcesses(serial: string): Promise<ProcessInfo[]> {
    if (!isTauriRuntime()) {
      await delay(300);
      return MOCK_PROCESSES;
    }
    return invokeTauri<ProcessInfo[]>("list_processes", { serial });
  },
  async killProcess(serial: string, pid: number, pkg?: string | null): Promise<string> {
    if (!isTauriRuntime()) {
      await delay(200);
      return "killed (mock)";
    }
    return invokeTauri<string>("kill_process", { serial, pid, package: pkg ?? null });
  },

  async shell(serial: string, line: string) {
    if (!isTauriRuntime()) {
      await delay(150);
      return { stdout: `mock$ ${line}\n16\n`, stderr: "", code: 0 };
    }
    return invokeTauri<{ stdout: string; stderr: string; code?: number | null }>("shell_exec", { serial, line });
  },

  async battery(serial: string): Promise<BatteryInfo> {
    if (!isTauriRuntime()) {
      await delay(150);
      return MOCK_BATTERY;
    }
    return invokeTauri<BatteryInfo>("battery_info", { serial });
  },
  async memory(serial: string): Promise<MemoryInfo> {
    if (!isTauriRuntime()) {
      await delay(150);
      return MOCK_MEMORY;
    }
    return invokeTauri<MemoryInfo>("memory_info", { serial });
  },
  async storage(serial: string, path: string): Promise<StorageInfo> {
    if (!isTauriRuntime()) {
      await delay(150);
      return MOCK_STORAGE;
    }
    return invokeTauri<StorageInfo>("storage_info", { serial, path });
  },
  async files(serial: string, path: string): Promise<FileEntry[]> {
    if (!isTauriRuntime()) {
      await delay(200);
      return MOCK_FILES(path);
    }
    return invokeTauri<FileEntry[]>("list_files", { serial, path });
  },

  async pair(host: string, port: number, code: string): Promise<string> {
    if (!isTauriRuntime()) {
      await delay(400);
      return `Successfully paired to ${host}:${port} (mock)`;
    }
    return invokeTauri<string>("pair_device", { host, port, code });
  },
  async connect(host: string, port: number): Promise<string> {
    if (!isTauriRuntime()) {
      await delay(400);
      return `already connected to ${host}:${port} (mock)`;
    }
    return invokeTauri<string>("connect_device", { host, port });
  },
  async reboot(serial: string, mode: string): Promise<string> {
    if (!isTauriRuntime()) {
      await delay(200);
      return "Reboot command sent (mock)";
    }
    return invokeTauri<string>("reboot_device", { serial, mode });
  },
  async installApk(serial: string, path: string, reinstall: boolean): Promise<string> {
    if (!isTauriRuntime()) {
      await delay(800);
      return "Success (mock)";
    }
    return invokeTauri<string>("install_apk", { serial, path, reinstall });
  },
  async inspectApk(path: string): Promise<ApkMeta> {
    if (!isTauriRuntime()) {
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
    }
    return invokeTauri<ApkMeta>("inspect_apk", { path });
  },
  async savedLoad(): Promise<SavedDevice[]> {
    if (!isTauriRuntime()) {
      try {
        const raw = localStorage.getItem("adb.savedDevices");
        return raw ? (JSON.parse(raw) as SavedDevice[]) : [];
      } catch {
        return [];
      }
    }
    return invokeTauri<SavedDevice[]>("saved_devices_load");
  },
  async savedStore(devices: SavedDevice[]) {
    if (!isTauriRuntime()) {
      try {
        localStorage.setItem("adb.savedDevices", JSON.stringify(devices));
      } catch { /* ignore */ }
      return;
    }
    await invokeTauri("saved_devices_save", { devices });
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
