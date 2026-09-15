import { create } from "zustand";
import type { AppInfo, CrashInfo, DeviceInfo, FileEntry, LogEntry, ProcessInfo, SavedDevice } from "../lib/types";

// ---------- Devices ----------
interface DeviceState {
  devices: DeviceInfo[];
  selectedSerial: string | null;
  loading: boolean;
  error: string | null;
  saved: SavedDevice[];
  setDevices: (d: DeviceInfo[]) => void;
  select: (s: string | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setSaved: (s: SavedDevice[]) => void;
  selected: () => DeviceInfo | null;
}

export const useDevices = create<DeviceState>((set, get) => ({
  devices: [],
  selectedSerial: null,
  loading: false,
  error: null,
  saved: [],
  setDevices: (devices) =>
    set((st) => {
      // Auto-select first connected device if none selected.
      let sel = st.selectedSerial;
      if (!sel || !devices.some((d) => d.serial === sel)) {
        sel = devices.find((d) => d.state === "connected")?.serial ?? devices[0]?.serial ?? null;
      }
      return { devices, selectedSerial: sel };
    }),
  select: (selectedSerial) => set({ selectedSerial }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSaved: (saved) => set({ saved }),
  selected: () => {
    const { devices, selectedSerial } = get();
    return devices.find((d) => d.serial === selectedSerial) ?? null;
  },
}));

// ---------- Apps ----------
interface AppsState {
  apps: AppInfo[];
  query: string;
  filter: "all" | "user" | "system" | "running";
  loading: boolean;
  error: string | null;
  selectedPkg: string | null;
  setApps: (a: AppInfo[]) => void;
  setQuery: (q: string) => void;
  setFilter: (f: AppsState["filter"]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setSelected: (p: string | null) => void;
}

export const useApps = create<AppsState>((set) => ({
  apps: [],
  query: "",
  filter: "all",
  loading: false,
  error: null,
  selectedPkg: null,
  setApps: (apps) => set({ apps }),
  setQuery: (query) => set({ query }),
  setFilter: (filter) => set({ filter }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelected: (selectedPkg) => set({ selectedPkg }),
}));

// ---------- Processes ----------
interface ProcState {
  procs: ProcessInfo[];
  query: string;
  autoRefresh: boolean;
  loading: boolean;
  setProcs: (p: ProcessInfo[]) => void;
  setQuery: (q: string) => void;
  setAuto: (v: boolean) => void;
  setLoading: (v: boolean) => void;
}

export const useProcs = create<ProcState>((set) => ({
  procs: [],
  query: "",
  autoRefresh: false,
  loading: false,
  setProcs: (procs) => set({ procs }),
  setQuery: (query) => set({ query }),
  setAuto: (autoRefresh) => set({ autoRefresh }),
  setLoading: (loading) => set({ loading }),
}));

// ---------- Logcat ----------
const MAX_DEFAULT = 10000;

interface LogcatState {
  lines: LogEntry[];
  running: boolean;
  paused: boolean;
  autoScroll: boolean;
  query: string;
  level: string;
  pkg: string;
  maxBuffer: number;
  pushBatch: (batch: LogEntry[]) => void;
  clear: () => void;
  setRunning: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setAutoScroll: (v: boolean) => void;
  setQuery: (q: string) => void;
  setLevel: (l: string) => void;
  setPkg: (p: string) => void;
  setMaxBuffer: (n: number) => void;
}

export const useLogcat = create<LogcatState>((set) => ({
  lines: [],
  running: false,
  paused: false,
  autoScroll: true,
  query: "",
  level: "all",
  pkg: "all",
  maxBuffer: MAX_DEFAULT,
  pushBatch: (batch) =>
    set((st) => {
      const merged = st.lines.concat(batch);
      const trimmed = merged.length > st.maxBuffer ? merged.slice(merged.length - st.maxBuffer) : merged;
      return { lines: trimmed };
    }),
  clear: () => set({ lines: [] }),
  setRunning: (running) => set({ running }),
  setPaused: (paused) => set({ paused }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  setQuery: (query) => set({ query }),
  setLevel: (level) => set({ level }),
  setPkg: (pkg) => set({ pkg }),
  setMaxBuffer: (maxBuffer) => set({ maxBuffer }),
}));

// ---------- Crashes ----------
interface CrashState {
  crashes: CrashInfo[];
  add: (c: CrashInfo) => void;
  clear: () => void;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
}

export const useCrashes = create<CrashState>((set) => ({
  crashes: [],
  add: (c) => set((st) => ({ crashes: [c, ...st.crashes].slice(0, 200) })),
  clear: () => set({ crashes: [] }),
  selectedId: null,
  setSelected: (selectedId) => set({ selectedId }),
}));

// ---------- Files ----------
interface FileState {
  path: string;
  entries: FileEntry[];
  loading: boolean;
  setPath: (p: string) => void;
  setEntries: (e: FileEntry[]) => void;
  setLoading: (v: boolean) => void;
}

export const useFiles = create<FileState>((set) => ({
  path: "/storage/emulated/0",
  entries: [],
  loading: false,
  setPath: (path) => set({ path }),
  setEntries: (entries) => set({ entries }),
  setLoading: (loading) => set({ loading }),
}));

// ---------- UI ----------
export type PageKey =
  | "dashboard" | "devices" | "apps" | "processes" | "files"
  | "logcat" | "crashes" | "apk" | "shell" | "tools" | "settings";

interface UiState {
  paletteOpen: boolean;
  setPalette: (v: boolean) => void;
  connectOpen: boolean;
  setConnect: (v: boolean) => void;
  toasts: { id: string; kind: "success" | "error" | "warning" | "info"; text: string }[];
  toast: (kind: UiState["toasts"][number]["kind"], text: string) => void;
  dismiss: (id: string) => void;
}

export const useUi = create<UiState>((set) => ({
  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
  connectOpen: false,
  setConnect: (connectOpen) => set({ connectOpen }),
  toasts: [],
  toast: (kind, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((st) => ({ toasts: [...st.toasts, { id, kind, text }].slice(-5) }));
    setTimeout(() => {
      set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
}));

// ---------- Settings ----------
interface SettingsState {
  adbPath: string;
  autoRefresh: boolean;
  autoReconnect: boolean;
  rememberDevices: boolean;
  maxBuffer: number;
  pauseOnCrash: boolean;
  confirmDestructive: boolean;
  set: (p: Partial<SettingsState>) => void;
}

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem("adb.settings") ?? "{}") as Partial<SettingsState>;
  } catch {
    return {};
  }
})();

export const useSettings = create<SettingsState>((set) => ({
  adbPath: "",
  autoRefresh: true,
  autoReconnect: true,
  rememberDevices: true,
  maxBuffer: 10000,
  pauseOnCrash: true,
  confirmDestructive: true,
  ...stored,
  set: (p) =>
    set((st) => {
      const next = { ...st, ...p };
      try {
        const { set: _omit, ...persist } = next as SettingsState & { set: unknown };
        void _omit;
        localStorage.setItem("adb.settings", JSON.stringify(persist));
      } catch { /* ignore */ }
      return next;
    }),
}));
