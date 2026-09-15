import type { AppInfo, BatteryInfo, DeviceInfo, MemoryInfo, ProcessInfo, StorageInfo } from "../lib/types";

export const MOCK_ADB_STATUS = {
  ready: true,
  version: "Android Debug Bridge version 1.0.41 (mock)",
  path: "C:\\Android\\platform-tools\\adb.exe",
  mock: true,
};

export const MOCK_DEVICES: DeviceInfo[] = [
  {
    serial: "192.168.1.10:37747",
    state: "connected",
    transport: "wireless",
    manufacturer: "vivo",
    model: "vivo X100",
    device: "V2308",
    product: "V2308",
    android_version: "16",
    sdk: "36",
    abi: "arm64-v8a",
    build_id: "UP1A.231005",
    fingerprint: "vivo/V2308/V2308:16/UP1A:user/release-keys",
    battery_pct: 78,
    screen: "Physical size: 1260x2800",
    density: "Physical density: 480",
  },
  {
    serial: "emulator-5554",
    state: "connected",
    transport: "emulator",
    manufacturer: "Google",
    model: "Pixel 9",
    device: "panther",
    product: "sdk_gphone64",
    android_version: "15",
    sdk: "35",
    abi: "x86_64",
    build_id: "AP3A.241005",
    fingerprint: "google/sdk_gphone64:15/AP3A:userdebug/test-keys",
    battery_pct: 100,
    screen: "Physical size: 1080x2400",
    density: "Physical density: 420",
  },
];

export const MOCK_APPS: AppInfo[] = [
  { name: "TikTok", package: "com.ss.android.ugc.trill", version: "40.2.4", version_code: "400204", uid: "10231", install_type: "user", running: true, system: false },
  { name: "Chrome", package: "com.android.chrome", version: "140.0.7339", version_code: "7339000", uid: "10061", install_type: "user", running: false, system: false },
  { name: "Example App", package: "com.example.app", version: "2.4.1", version_code: "241", uid: "10312", install_type: "user", running: true, system: false },
  { name: "Settings", package: "com.android.settings", version: "16", version_code: "36", uid: "1000", install_type: "system", running: false, system: true },
  { name: "System UI", package: "com.android.systemui", version: "16", version_code: "36", uid: "1001", install_type: "system", running: true, system: true },
];

export const MOCK_PROCESSES: ProcessInfo[] = [
  { pid: 1234, name: "com.example.app", package: "com.example.app", cpu_pct: 12.4, mem_kb: 184320, state: "R", user: "u0_a312" },
  { pid: 890, name: "com.ss.android.ugc.trill", package: "com.ss.android.ugc.trill", cpu_pct: 8.9, mem_kb: 402112, state: "R", user: "u0_a231" },
  { pid: 567, name: "surfaceflinger", package: null, cpu_pct: 3.1, mem_kb: 96256, state: "S", user: "system" },
  { pid: 42, name: "zygote64", package: null, cpu_pct: 0.2, mem_kb: 45056, state: "S", user: "root" },
];

export const MOCK_BATTERY: BatteryInfo = {
  pct: 78, charging: true, health: "Good", temperature_c: 31.0, voltage_mv: 4100, technology: "Li-ion",
};
export const MOCK_MEMORY: MemoryInfo = { total_kb: 11560104, avail_kb: 7654321 };
export const MOCK_STORAGE: StorageInfo = { total_kb: 118000000, used_kb: 84000000, avail_kb: 34000000, path: "/data" };

export function MOCK_FILES(path: string) {
  return [
    { name: "DCIM", path: `${path}/DCIM`, is_dir: true, size: 0, modified: "2024-05-01 10:00" },
    { name: "Download", path: `${path}/Download`, is_dir: true, size: 0, modified: "2024-05-03 09:12" },
    { name: "photo.jpg", path: `${path}/photo.jpg`, is_dir: false, size: 2411723, modified: "2024-05-02 12:30" },
    { name: "notes.txt", path: `${path}/notes.txt`, is_dir: false, size: 842, modified: "2024-05-04 18:02" },
  ];
}

const TAGS = ["ActivityManager", "WindowManager", "AndroidRuntime", "SurfaceFlinger", "ExampleApp", "ConnectivityService"];
const MSGS = [
  "Start proc com.example.app for activity",
  "Window timeout for ActivityRecord",
  "Displayed com.example.app/.MainActivity",
  "FATAL EXCEPTION: main Process: com.example.app, PID: 1234 java.lang.NullPointerException at MainActivity.kt:142",
  "Slow dispatch, ANR warning candidate",
  "Network capabilities changed",
];
const LEVELS = ["I", "I", "I", "E", "W", "D"] as const;

export function mockLogLine(i: number) {
  const k = i % MSGS.length;
  const sec = String(20 + (i % 39)).padStart(2, "0");
  const min = String(40 + ((i >> 2) % 19)).padStart(2, "0");
  return {
    id: `mock-${i}-${Date.now()}`,
    timestamp: `${min}:${sec}`,
    level: LEVELS[k],
    tag: TAGS[k],
    pid: 1200 + (i % 50),
    message: MSGS[k],
    package_hint: k === 0 || k === 3 ? "com.example.app" : null,
  };
}
