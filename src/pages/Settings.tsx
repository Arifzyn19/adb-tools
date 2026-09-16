import { useState } from "react";
import { api } from "../lib/tauri";
import { useLogcat, useSettings, useUi } from "../stores/stores";
import { PageHeader } from "../components/ui";

export function SettingsPage({ adb, onRefresh }: { adb: { ready: boolean; version?: string | null; path?: string | null }; onRefresh: () => void }) {
  const s = useSettings();
  const toast = useUi((s) => s.toast);
  const setMaxBuffer = useLogcat((st) => st.setMaxBuffer);
  const [path, setPath] = useState(s.adbPath);
  const [testing, setTesting] = useState(false);

  const save = (p: Partial<Parameters<typeof s.set>[0]>) => s.set(p);

  const test = async () => {
    setTesting(true);
    try {
      if (path && path !== s.adbPath) {
        save({ adbPath: path });
        await api.adbSetPath(path);
      }
      const st = await api.adbDetect();
      toast(st.ready ? "success" : "warning", st.ready ? `ADB OK: ${st.version}` : "ADB still not found");
      onRefresh();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setTesting(false);
    }
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b last:border-0" style={{ borderColor: "#1a2230" }}>
      <span className="text-[12.5px]">{label}</span>
      <span className="flex items-center gap-2">{children}</span>
    </div>
  );

  const Toggle = ({ v, on }: { v: boolean; on: (b: boolean) => void }) => (
    <button onClick={() => on(!v)} className="w-9 h-5 rounded-full relative transition-colors" style={{ background: v ? "var(--accent)" : "#232c3a" }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: v ? 18 : 2 }} />
    </button>
  );

  return (
    <div>
      <PageHeader title="Settings" desc="ADB, devices, logcat, appearance and behavior." />
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="panel p-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "var(--text-muted)" }}>ADB</div>
          <div className="text-[12px] mb-2" style={{ color: "var(--text-secondary)" }}>
            Status <b style={{ color: adb.ready ? "var(--success)" : "var(--error)" }}>{adb.ready ? "● Ready" : "● Missing"}</b>
            <span className="mono ml-2">{adb.version ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <input className="input mono" placeholder="C:\Android\platform-tools\adb.exe" value={path} onChange={(e) => setPath(e.target.value)} />
            <button className="btn btn-primary shrink-0" disabled={testing} onClick={test}>{testing ? "Testing…" : "Detect / Test"}</button>
          </div>
          <div className="mono text-[11px] mt-2 truncate" style={{ color: "var(--text-muted)" }}>Current: {adb.path ?? "not configured"}</div>
        </div>

        <div className="panel p-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "var(--text-muted)" }}>Devices</div>
          <Row label="Auto refresh device list"><Toggle v={s.autoRefresh} on={(v) => save({ autoRefresh: v })} /></Row>
          <Row label="Auto reconnect wireless"><Toggle v={s.autoReconnect} on={(v) => save({ autoReconnect: v })} /></Row>
          <Row label="Remember devices"><Toggle v={s.rememberDevices} on={(v) => save({ rememberDevices: v })} /></Row>
        </div>

        <div className="panel p-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "var(--text-muted)" }}>Logcat</div>
          <Row label="Maximum buffer (lines)">
            <input type="number" className="input mono !w-[120px]" value={s.maxBuffer} min={1000} max={50000} step={1000}
              onChange={(e) => { const n = Number(e.target.value) || 10000; save({ maxBuffer: n }); setMaxBuffer(n); }} />
          </Row>
          <Row label="Pause on crash"><Toggle v={s.pauseOnCrash} on={(v) => save({ pauseOnCrash: v })} /></Row>
        </div>

        <div className="panel p-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "var(--text-muted)" }}>Behavior</div>
          <Row label="Confirm destructive actions"><Toggle v={s.confirmDestructive} on={(v) => save({ confirmDestructive: v })} /></Row>
          <div className="text-[11.5px] mt-2" style={{ color: "var(--text-muted)" }}>
            Shortcuts: Ctrl+K palette · Ctrl+R refresh · Ctrl+Shift+L logcat · Ctrl+Shift+A apps · Ctrl+Shift+S shell · Esc close.
          </div>
        </div>
      </div>
    </div>
  );
}
