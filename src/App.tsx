import { useCallback, useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Header, StatusBar, Toasts } from "./components/chrome";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette, ConnectModal } from "./components/overlays";
import { api } from "./lib/tauri";
import { useDevices, useSettings, useUi } from "./stores/stores";
import { Dashboard } from "./pages/Dashboard";
import { Devices } from "./pages/Devices";
import { Apps } from "./pages/Apps";
import { Processes } from "./pages/Processes";
import { Files } from "./pages/Files";
import { Logcat } from "./pages/Logcat";
import { Crashes } from "./pages/Crashes";
import { ApkInspector } from "./pages/ApkInspector";
import { Shell } from "./pages/Shell";
import { DeviceTools } from "./pages/DeviceTools";
import { SettingsPage } from "./pages/Settings";

// HashRouter (not BrowserRouter): Tauri serves static files, no server-side
// fallback for deep links — hash routing works from file:// and asset:// too.
function AppShell() {
  const setPalette = useUi((s) => s.setPalette);
  const setDevices = useDevices((s) => s.setDevices);
  const setLoading = useDevices((s) => s.setLoading);
  const setError = useDevices((s) => s.setError);
  const setSaved = useDevices((s) => s.setSaved);
  const autoRefresh = useSettings((s) => s.autoRefresh);
  const navigate = useNavigate();
  const [adb, setAdb] = useState<{ ready: boolean; version?: string | null; path?: string | null; mock: boolean }>({ ready: false, mock: false });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [status, devs, saved] = await Promise.all([api.adbStatus(), api.listDevices(), api.savedLoad()]);
      setAdb(status);
      setDevices(devs);
      setSaved(saved);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [setDevices, setLoading, setError, setSaved]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      api.listDevices().then(setDevices).catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, setDevices]);

  // Keyboard shortcuts: Ctrl+K palette, Ctrl+R refresh, Ctrl+Shift+L/A/S, Esc close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r" && !typing) {
        e.preventDefault();
        refresh();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        navigate("/logcat");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        navigate("/apps");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        navigate("/shell");
      } else if (e.key === "Escape") {
        setPalette(false);
        useUi.getState().setConnect(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refresh, navigate, setPalette]);

  return (
    <div className="h-full flex flex-col">
      <Header adbVersion={adb.version} />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto p-5">
          <div className="max-w-[1200px] mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard onRefresh={refresh} adb={adb} />} />
              <Route path="/devices" element={<Devices onRefresh={refresh} adb={adb} />} />
              <Route path="/apps" element={<Apps />} />
              <Route path="/processes" element={<Processes />} />
              <Route path="/files" element={<Files />} />
              <Route path="/logcat" element={<Logcat />} />
              <Route path="/crashes" element={<Crashes />} />
              <Route path="/apk" element={<ApkInspector />} />
              <Route path="/shell" element={<Shell />} />
              <Route path="/tools" element={<DeviceTools />} />
              <Route path="/settings" element={<SettingsPage adb={adb} onRefresh={refresh} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <StatusBar adb={adb} />
      <CommandPalette />
      <ConnectModal />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
