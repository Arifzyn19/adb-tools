export type DeviceState =
  | "connected"
  | "unauthorized"
  | "offline"
  | "disconnected"
  | "connecting"
  | "pairing"
  | "error";

export type Transport = "usb" | "wireless" | "emulator" | "unknown";

export interface DeviceInfo {
  serial: string;
  state: DeviceState;
  transport: Transport;
  manufacturer?: string | null;
  model?: string | null;
  device?: string | null;
  product?: string | null;
  android_version?: string | null;
  sdk?: string | null;
  abi?: string | null;
  build_id?: string | null;
  fingerprint?: string | null;
  battery_pct?: number | null;
  screen?: string | null;
  density?: string | null;
}

export interface AdbStatus {
  ready: boolean;
  version?: string | null;
  path?: string | null;
  mock: boolean;
}

export interface AppInfo {
  name: string;
  package: string;
  version?: string | null;
  version_code?: string | null;
  uid?: string | null;
  install_type: string;
  running: boolean;
  system: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  package?: string | null;
  cpu_pct: number;
  mem_kb: number;
  state: string;
  user: string;
}

export type LogLevel = "V" | "D" | "I" | "W" | "E" | "F";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  pid?: number | null;
  message: string;
  package_hint?: string | null;
}

export interface CrashInfo {
  id: string;
  package: string;
  exception: string;
  thread: string;
  timestamp: string;
  location?: string | null;
  stacktrace: string;
}

export interface BatteryInfo {
  pct?: number | null;
  charging?: boolean | null;
  health?: string | null;
  temperature_c?: number | null;
  voltage_mv?: number | null;
  technology?: string | null;
}

export interface MemoryInfo {
  total_kb?: number | null;
  avail_kb?: number | null;
}

export interface StorageInfo {
  total_kb?: number | null;
  used_kb?: number | null;
  avail_kb?: number | null;
  path: string;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified?: string | null;
}

export interface SavedDevice {
  serial: string;
  nickname: string;
  transport: Transport;
  last_ip?: string | null;
  last_port?: number | null;
}

export interface ApkMeta {
  file_name: string;
  size_bytes: number;
  package?: string | null;
  version?: string | null;
  version_code?: string | null;
  min_sdk?: string | null;
  target_sdk?: string | null;
  abis: string[];
  permissions: string[];
  activities: string[];
  services: string[];
  receivers: string[];
  providers: string[];
}
