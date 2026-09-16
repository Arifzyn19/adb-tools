import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { useDevices, useUi } from "../stores/stores";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "../components/ui";

export function Devices({ onRefresh, adb }: { onRefresh: () => void; adb: { ready: boolean; version?: string | null; path?: string | null } }) {
  const devices = useDevices((s) => s.devices);
  const loading = useDevices((s) => s.loading);
  const error = useDevices((s) => s.error);
  const selectedSerial = useDevices((s) => s.selectedSerial);
  const select = useDevices((s) => s.select);
  const saved = useDevices((s) => s.saved);
  const setSaved = useDevices((s) => s.setSaved);
  const navigate = useNavigate();
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const remember = true;
  const [detecting, setDetecting] = useState(false);

  const detect = async () => {
    setDetecting(true);
    try {
      const st = await api.adbDetect();
      toast(st.ready ? "success" : "warning", st.ready ? `ADB ready: ${st.version}` : "ADB not found in PATH");
      onRefresh();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setDetecting(false);
    }
  };

  const forget = async (serial: string) => {
    const next = saved.filter((d) => d.serial !== serial);
    setSaved(next);
    await api.savedStore(next);
  };

  return (
    <div>
      <PageHeader
        title="Devices"
        desc="All Android devices visible to ADB."
        actions={
          <>
            <button className="btn" onClick={onRefresh}>Refresh</button>
            <button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>
          </>
        }
      />

      <div className="panel p-3.5 flex flex-wrap gap-x-8 gap-y-1.5 text-[12px]">
        <span style={{ color: "var(--text-secondary)" }}>ADB Status <b style={{ color: adb.ready ? "var(--success)" : "var(--error)" }}>{adb.ready ? "● Ready" : "● Missing"}</b></span>
        <span style={{ color: "var(--text-secondary)" }}>ADB Version <b className="mono">{adb.version ?? "—"}</b></span>
        <span className="mono truncate" style={{ color: "var(--text-secondary)" }}>ADB Path <b>{adb.path ?? "not configured"}</b></span>
        <button className="btn !py-1 ml-auto" onClick={detect}>{detecting ? "Detecting…" : "Detect ADB"}</button>
      </div>

      {!adb.ready && (
        <div className="panel p-6 mt-3 text-center">
          <div className="text-[14px] font-semibold">Welcome to ADB Manager</div>
          <div className="text-[12.5px] mt-1" style={{ color: "var(--text-secondary)" }}>Android Platform Tools were not detected.</div>
          <div className="flex justify-center gap-2 mt-4">
            <button className="btn btn-primary" onClick={() => navigate("/settings")}>Configure adb</button>
            <button className="btn" onClick={onRefresh}>Continue Without Device</button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {loading && <LoadingState text="Discovering devices via adb devices -l…" />}
        {error && !loading && <ErrorState title="Unable to load devices" detail={error} onRetry={onRefresh} />}
        {!loading && !error && devices.length === 0 && (
          <EmptyState title="No Android device connected." desc="Connect a device using USB or Wireless ADB." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
        )}
        <div className="grid md:grid-cols-2 gap-2.5 mt-1">
          {devices.map((d) => (
            <button key={d.serial} onClick={() => select(d.serial)} className={`panel p-4 text-left transition-colors ${selectedSerial === d.serial ? "!border-[var(--accent)]" : "hover:border-[#2e3a4f]"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13.5px] font-semibold truncate">{d.model ?? d.serial}</div>
                <StatusBadge state={d.state} />
              </div>
              <div className="mono text-[11px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>{d.serial}</div>
              <div className="text-[11.5px] mt-1.5" style={{ color: "var(--text-secondary)" }}>
                Android {d.android_version ?? "?"} · API {d.sdk ?? "?"} · {d.transport === "wireless" ? "Wireless" : d.transport === "usb" ? "USB" : d.transport}
                {d.abi ? ` · ${d.abi}` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      {remember && saved.length > 0 && (
        <div className="mt-5">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-muted)" }}>Saved Devices</div>
          <div className="grid md:grid-cols-2 gap-2.5">
            {saved.map((s) => (
              <div key={s.serial} className="panel p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">● {s.nickname}</div>
                  <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{s.transport === "wireless" ? "Wireless ADB" : s.transport}{s.last_ip ? ` · ${s.last_ip}` : ""}</div>
                </div>
                <button className="btn !py-1" onClick={() => setConnect(true)}>Connect</button>
                <button className="btn btn-ghost !py-1" onClick={() => forget(s.serial)}>Forget</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
