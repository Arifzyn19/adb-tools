import type {
  ApkMeta, AppInfo, BatteryInfo, DeviceInfo, FileEntry,
  LogEntry, MemoryInfo, ProcessInfo, SavedDevice, StorageInfo,
} from "./types";

/**
 * Tauri 2 does NOT inject `window.__TAURI__` unless `app.withGlobalTauri`
 * is enabled. The reliable runtime marker is `__TAURI_INTERNALS__`.
 * Outside Tauri (plain browser) every call throws a clear error —
 * there is no mock mode, all data is real.
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
  if (!isTauriRuntime()) {
    throw new Error(
      "Not running inside ADB Manager desktop app. Install and open the Windows app to see real device data.",
    );
  }
  const mod = await import("@tauri-apps/api/core");
  return mod.invoke<T>(cmd, args);
}

type AdbStatusShape = { ready: boolean; version?: string | null; path?: string | null };

export const api = {
  async adbStatus(): Promise<AdbStatusShape> {
    return invokeTauri<AdbStatusShape>("adb_status");
  },
  async adbDetect(): Promise<AdbStatusShape> {
    return invokeTauri<AdbStatusShape>("adb_detect");
  },
  async adbSetPath(path: string): Promise<AdbStatusShape> {
    return invokeTauri<AdbStatusShape>("adb_set_path", { path });
  },

  async listDevices(): Promise<DeviceInfo[]> {
    return invokeTauri<DeviceInfo[]>("list_devices");
  },

  async listApps(serial: string): Promise<AppInfo[]> {
    return invokeTauri<AppInfo[]>("list_apps", { serial });
  },
  async appAction(serial: string, pkg: string, action: string): Promise<string> {
    return invokeTauri<string>("app_action", { serial, package: pkg, action });
  },

  async listProcesses(serial: string): Promise<ProcessInfo[]> {
    return invokeTauri<ProcessInfo[]>("list_processes", { serial });
  },
  async killProcess(serial: string, pid: number, pkg?: string | null): Promise<string> {
    return invokeTauri<string>("kill_process", { serial, pid, package: pkg ?? null });
  },

  async shell(serial: string, line: string) {
    return invokeTauri<{ stdout: string; stderr: string; code?: number | null }>("shell_exec", { serial, line });
  },

  async logcatDump(serial: string, tail = 200): Promise<LogEntry[]> {
    return invokeTauri<LogEntry[]>("logcat_dump", { serial, tail });
  },
  async logcatClear(serial: string): Promise<string> {
    return invokeTauri<string>("logcat_clear", { serial });
  },

  async battery(serial: string): Promise<BatteryInfo> {
    return invokeTauri<BatteryInfo>("battery_info", { serial });
  },
  async memory(serial: string): Promise<MemoryInfo> {
    return invokeTauri<MemoryInfo>("memory_info", { serial });
  },
  async storage(serial: string, path: string): Promise<StorageInfo> {
    return invokeTauri<StorageInfo>("storage_info", { serial, path });
  },
  async files(serial: string, path: string): Promise<FileEntry[]> {
    return invokeTauri<FileEntry[]>("list_files", { serial, path });
  },

  async screenshot(serial: string): Promise<string> {
    return invokeTauri<string>("screenshot", { serial });
  },

  async pair(host: string, port: number, code: string): Promise<string> {
    return invokeTauri<string>("pair_device", { host, port, code });
  },
  async connect(host: string, port: number): Promise<string> {
    return invokeTauri<string>("connect_device", { host, port });
  },
  async reboot(serial: string, mode: string): Promise<string> {
    return invokeTauri<string>("reboot_device", { serial, mode });
  },
  async installApk(serial: string, path: string, reinstall: boolean): Promise<string> {
    return invokeTauri<string>("install_apk", { serial, path, reinstall });
  },
  async inspectApk(path: string): Promise<ApkMeta> {
    return invokeTauri<ApkMeta>("inspect_apk", { path });
  },
  async savedLoad(): Promise<SavedDevice[]> {
    return invokeTauri<SavedDevice[]>("saved_devices_load");
  },
  async savedStore(devices: SavedDevice[]) {
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
