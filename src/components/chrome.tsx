import { Bell, ChevronDown, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDevices, useUi } from "../stores/stores";

export function Header({ adbVersion }: { adbVersion?: string | null }) {
  const selected = useDevices((s) => s.selected)();
  const setPalette = useUi((s) => s.setPalette);
  const setConnect = useUi((s) => s.setConnect);
  const navigate = useNavigate();
  const toast = useUi((s) => s.toast);

  return (
    <header className="h-[46px] shrink-0 flex items-center gap-3 px-4 border-b" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
      <div className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
        ADB <span style={{ color: "var(--accent)" }}>Manager</span>
        {adbVersion ? <span className="mono ml-2 text-[10.5px] font-normal" style={{ color: "var(--text-muted)" }}>{adbVersion.split(",")[0]}</span> : null}
      </div>
      <div className="flex-1 flex justify-center">
        <button className="btn !py-[5px]" onClick={() => setConnect(true)} title="Select device">
          <span className={`dot ${selected ? "dot-ok" : "dot-mute"}`} />
          <span className="max-w-[220px] truncate">{selected ? (selected.model ?? selected.serial) : "No device"}</span>
          <ChevronDown size={13} />
        </button>
      </div>
      <button className="btn btn-ghost !px-2" onClick={() => setPalette(true)} title="Search / commands (Ctrl+K)">
        <Search size={15} />
      </button>
      <button className="btn btn-ghost !px-2" onClick={() => toast("info", "No new notifications")} title="Notifications">
        <Bell size={15} />
      </button>
      <button className="btn btn-ghost !px-2" onClick={() => navigate("/settings")} title="Settings">
        <Settings size={15} />
      </button>
    </header>
  );
}

export function StatusBar({ adb }: { adb: { ready: boolean; version?: string | null } }) {
  const devices = useDevices((s) => s.devices);
  const selected = useDevices((s) => s.selected)();
  const connected = devices.filter((d) => d.state === "connected").length;
  return (
    <footer className="h-[26px] shrink-0 flex items-center gap-4 px-4 border-t text-[11px] mono" style={{ background: "var(--sidebar)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
      <span><span style={{ color: connected ? "var(--success)" : "var(--text-muted)" }}>●</span> {connected} connected</span>
      <span className="truncate">Device · {selected ? selected.serial : "—"}</span>
      <span>Transport · {selected ? selected.transport : "—"}</span>
      <span className="ml-auto truncate">ADB · {adb.ready ? (adb.version ?? "Ready") : "Not found"}</span>
    </footer>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  const colors: Record<string, string> = {
    success: "var(--success)", error: "var(--error)", warning: "var(--warning)", info: "var(--info)",
  };
  return (
    <div className="fixed bottom-9 right-4 z-50 flex flex-col gap-2 w-[320px]">
      {toasts.map((t) => (
        <button key={t.id} onClick={() => dismiss(t.id)} className="panel-elevated toast-enter p-3 text-left flex gap-2.5 items-start">
          <span className="dot mt-1.5" style={{ background: colors[t.kind] }} />
          <span className="text-[12.5px]">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
