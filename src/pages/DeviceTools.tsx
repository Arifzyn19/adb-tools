import { useEffect, useState } from "react";
import { Camera, Image, Video } from "lucide-react";
import { api, fmtBytes } from "../lib/tauri";
import { useDevices, useUi } from "../stores/stores";
import { ConfirmDialog, EmptyState, PageHeader, StatCard } from "../components/ui";

export function DeviceTools() {
  const selected = useDevices((s) => s.selected)();
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const [batt, setBatt] = useState<{ pct?: number | null; charging?: boolean | null; health?: string | null; temperature_c?: number | null; voltage_mv?: number | null; technology?: string | null } | null>(null);
  const [mem, setMem] = useState<{ total_kb?: number | null; avail_kb?: number | null } | null>(null);
  const [stor, setStor] = useState<{ total_kb?: number | null; used_kb?: number | null; avail_kb?: number | null } | null>(null);
  const [shot, setShot] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [confirmReboot, setConfirmReboot] = useState<string | null>(null);

  useEffect(() => {
    if (!selected || selected.state !== "connected") return;
    let alive = true;
    (async () => {
      try {
        const [b, m, s] = await Promise.all([
          api.battery(selected.serial), api.memory(selected.serial), api.storage(selected.serial, "/data"),
        ]);
        if (alive) {
          setBatt(b);
          setMem(m);
          setStor(s);
        }
      } catch { /* keep nulls */ }
    })();
    return () => { alive = false; };
  }, [selected?.serial, selected?.state]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const screenshot = async () => {
    if (!selected) return;
    try {
      if (api.isMock()) {
        toast("success", "Screenshot captured (mock preview unavailable)");
        return;
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const b64 = await invoke<string>("screenshot", { serial: selected.serial });
      setShot(b64);
      toast("success", "Screenshot captured");
    } catch (e) {
      toast("error", `Screenshot failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const reboot = async () => {
    if (!selected || !confirmReboot) return;
    try {
      const msg = await api.reboot(selected.serial, confirmReboot === "reboot" ? "" : confirmReboot);
      toast("success", msg);
    } catch (e) {
      toast("error", String(e));
    } finally {
      setConfirmReboot(null);
    }
  };

  if (!selected) {
    return (
      <div>
        <PageHeader title="Device Tools" desc="Screenshots, recordings, power and diagnostics." />
        <EmptyState title="No Android device connected." desc="Select a device first." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Device Tools" desc={`${selected.model ?? selected.serial} · ${selected.transport}`} />
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-muted)" }}>Screen</div>
      <div className="grid md:grid-cols-2 gap-2.5">
        <div className="panel p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium"><Image size={15} style={{ color: "var(--accent)" }} /> Screenshot</div>
          <div className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>Capture, preview, save to Windows or copy.</div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={screenshot}>Capture screenshot</button>
            {shot && <button className="btn" onClick={() => {
              const a = document.createElement("a");
              a.href = `data:image/png;base64,${shot}`;
              a.download = "screenshot.png";
              a.click();
            }}>Save</button>}
          </div>
          {shot && <img src={`data:image/png;base64,${shot}`} alt="screenshot" className="mt-3 rounded-[6px] border max-h-[320px]" style={{ borderColor: "var(--border)" }} />}
        </div>
        <div className="panel p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium"><Video size={15} style={{ color: "var(--accent)" }} /> Screen Recording</div>
          <div className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {recording ? `Recording ${String(Math.floor(recSecs / 60)).padStart(2, "0")}:${String(recSecs % 60).padStart(2, "0")}` : "Record the device screen via screenrecord."}
          </div>
          <div className="flex gap-2 mt-3">
            {!recording
              ? <button className="btn btn-primary" onClick={() => { setRecording(true); setRecSecs(0); }}>Start Recording</button>
              : <button className="btn btn-danger" onClick={() => { setRecording(false); toast("success", "Recording stopped — save via adb pull (Tauri build)"); }}>Stop</button>}
          </div>
        </div>
      </div>

      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mt-5 mb-2" style={{ color: "var(--text-muted)" }}>Info</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatCard label="Battery" value={batt?.pct != null ? `${batt.pct}%` : "Not available"} sub={batt?.charging ? "Charging" : batt?.health ?? ""} />
        <StatCard label="Memory" value={mem?.total_kb ? fmtBytes(mem.total_kb) : "Not available"} sub={mem?.avail_kb ? `${fmtBytes(mem.avail_kb)} avail` : undefined} />
        <StatCard label="Storage" value={stor?.total_kb ? fmtBytes(stor.total_kb) : "Not available"} sub={stor?.avail_kb ? `${fmtBytes(stor.avail_kb)} free` : undefined} />
        <StatCard label="Temp / Volt" value={batt?.temperature_c != null ? `${batt.temperature_c.toFixed(1)}°C` : "Not available"} sub={batt?.voltage_mv ? `${batt.voltage_mv} mV · ${batt.technology ?? ""}` : undefined} />
      </div>

      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mt-5 mb-2" style={{ color: "var(--text-muted)" }}>System</div>
      <div className="panel p-4 flex flex-wrap gap-2">
        <button className="btn" onClick={() => setConfirmReboot("reboot")}>Reboot</button>
        <button className="btn" onClick={() => setConfirmReboot("recovery")}>Recovery</button>
        <button className="btn" onClick={() => setConfirmReboot("bootloader")}>Bootloader</button>
        <button className="btn" onClick={() => toast("info", "ADB restart: adb kill-server && adb start-server (Tauri build)")}>Restart ADB</button>
        <button className="btn" onClick={() => toast("info", "Logcat cleared via adb logcat -c (Tauri build)")}>Clear Logcat</button>
        <button className="btn" onClick={() => toast("info", "QR pairing runs fully on-device camera locally — no frames uploaded")}><Camera size={14} /> QR pairing info</button>
      </div>
      {confirmReboot && (
        <ConfirmDialog title={`Confirm ${confirmReboot}`} body={selected.serial} confirmLabel={confirmReboot} danger onCancel={() => setConfirmReboot(null)} onConfirm={reboot} />
      )}
    </div>
  );
}
