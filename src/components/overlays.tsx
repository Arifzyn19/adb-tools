import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDevices, useUi } from "../stores/stores";
import { api } from "../lib/tauri";
import { StatusBadge } from "./ui";

const ACTIONS = [
  { id: "nav-dashboard", label: "Go to Dashboard", run: "/" },
  { id: "nav-devices", label: "Go to Devices", run: "/devices" },
  { id: "nav-apps", label: "Go to Apps", run: "/apps" },
  { id: "nav-processes", label: "Go to Processes", run: "/processes" },
  { id: "nav-files", label: "Go to Files", run: "/files" },
  { id: "nav-logcat", label: "Open Logcat", run: "/logcat" },
  { id: "nav-crashes", label: "Open Crash Center", run: "/crashes" },
  { id: "nav-apk", label: "Open APK Inspector", run: "/apk" },
  { id: "nav-shell", label: "Open Shell", run: "/shell" },
  { id: "nav-tools", label: "Open Device Tools", run: "/tools" },
  { id: "act-connect", label: "Connect Device…", run: "__connect" },
  { id: "act-screenshot", label: "Take Screenshot", run: "__screenshot" },
  { id: "act-logcat-start", label: "Start Logcat", run: "/logcat" },
  { id: "act-settings", label: "Open Settings", run: "/settings" },
] as const;

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPalette);
  const navigate = useNavigate();
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const selected = useDevices((s) => s.selected)();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open ]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^>\s*/, "");
    if (!needle) return ACTIONS;
    return ACTIONS.filter((a) => a.label.toLowerCase().includes(needle));
  }, [q]);

  if (!open) return null;

  const run = async (id: string, runKey: string) => {
    void id;
    setOpen(false);
    if (runKey === "__connect") {
      setConnect(true);
      return;
    }
    if (runKey === "__screenshot") {
      if (!selected) {
        toast("warning", "Select a device first");
        return;
      }
      try {
        const core = await import("@tauri-apps/api/core");
        await core.invoke<string>("screenshot", { serial: selected.serial });
        toast("success", "Screenshot captured");
      } catch (e) {
        toast("error", `Screenshot failed: ${String(e)}`);
      }
      return;
    }
    navigate(runKey);
  };

  return (
    <div className="fixed inset-0 z-50 p-4 flex justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setOpen(false)}>
      <div className="panel-elevated dialog-enter w-[520px] max-w-full h-fit mt-[12vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="w-full bg-transparent px-4 py-3 text-[13.5px] outline-none border-b"
          style={{ borderColor: "var(--border)" }}
          placeholder="Type a command or search…  (e.g. screenshot, logcat, connect)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) run(filtered[0].id, filtered[0].run);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {filtered.map((a) => (
            <button key={a.id} className="w-full text-left px-3 py-2 rounded-[6px] text-[12.5px] hover:bg-[#161d29]" onClick={() => run(a.id, a.run)}>
              {a.label}
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-[12px]" style={{ color: "var(--text-muted)" }}>No matching commands</div>}
        </div>
      </div>
    </div>
  );
}

export function ConnectModal() {
  const open = useUi((s) => s.connectOpen);
  const setOpen = useUi((s) => s.setConnect);
  const devices = useDevices((s) => s.devices);
  const select = useDevices((s) => s.select);
  const toast = useUi((s) => s.toast);
  const [tab, setTab] = useState<"usb" | "wireless" | "manual">("usb");
  const [ip, setIp] = useState("");
  const [pairPort, setPairPort] = useState("");
  const [code, setCode] = useState("");
  const [port, setPort] = useState("5555");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const doPair = async () => {
    try {
      setBusy(true);
      const msg = await api.pair(ip.trim(), Number(pairPort), code.trim());
      toast("success", msg);
      setOpen(false);
    } catch (e) {
      toast("error", `Pairing failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const doConnect = async () => {
    try {
      setBusy(true);
      const msg = await api.connect(ip.trim(), Number(port));
      toast("success", msg);
      setOpen(false);
    } catch (e) {
      toast("error", `Connect failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setOpen(false)}>
      <div className="panel-elevated dialog-enter w-[460px] max-w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-[14.5px] font-semibold">Connect Device</div>
        <div className="flex gap-1 mt-3 p-1 rounded-[8px]" style={{ background: "#0b0f15", border: "1px solid var(--border)" }}>
          {(["usb", "wireless", "manual"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-[6px] text-[12px] capitalize ${tab === t ? "bg-[#1a2231] text-white" : ""}`} style={tab !== t ? { color: "var(--text-secondary)" } : undefined}>
              {t}
            </button>
          ))}
        </div>

        {tab === "usb" && (
          <div className="mt-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {devices.length === 0 && <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>No ADB devices visible. Enable USB debugging and plug in the device.</div>}
            {devices.map((d) => (
              <button key={d.serial} className="panel p-3 text-left hover:border-[#2e3a4f] flex items-center gap-3" onClick={() => { select(d.serial); setOpen(false); }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{d.model ?? d.serial}</div>
                  <div className="text-[11px] mono truncate" style={{ color: "var(--text-muted)" }}>{d.serial}</div>
                </div>
                <StatusBadge state={d.state} />
              </button>
            ))}
          </div>
        )}

        {tab === "wireless" && (
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              On the device: Settings → Developer options → Wireless debugging → <b>Pair device with pairing code</b>. Pairing port and connection port may differ.
            </div>
            <label className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>IP Address<input className="input mt-1 mono" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.10" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>Pairing Port<input className="input mt-1 mono" value={pairPort} onChange={(e) => setPairPort(e.target.value)} placeholder="37845" /></label>
              <label className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>Pairing Code<input className="input mt-1 mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" /></label>
            </div>
            <button className="btn btn-primary justify-center" disabled={busy || !ip || !pairPort || !code} onClick={doPair}>{busy ? "Pairing…" : "Pair Device"}</button>
          </div>
        )}

        {tab === "manual" && (
          <div className="mt-3 flex flex-col gap-2.5">
            <label className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>IP Address<input className="input mt-1 mono" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.10" /></label>
            <label className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>ADB Port<input className="input mt-1 mono" value={port} onChange={(e) => setPort(e.target.value)} placeholder="5555" /></label>
            <button className="btn btn-primary justify-center" disabled={busy || !ip} onClick={doConnect}>{busy ? "Connecting…" : "Connect"}</button>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button className="btn" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}
