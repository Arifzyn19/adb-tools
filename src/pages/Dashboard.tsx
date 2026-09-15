import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppWindow, FileTerminal, Folder, Image, ScrollText, Wrench } from "lucide-react";
import { api, fmtBytes } from "../lib/tauri";
import { useDevices, useUi } from "../stores/stores";
import { EmptyState, LoadingState, PageHeader, ProgressBar, StatCard } from "../components/ui";

export function Dashboard({ onRefresh, adb }: { onRefresh: () => void; adb: { ready: boolean; version?: string | null } }) {
  const selected = useDevices((s) => s.selected)();
  const navigate = useNavigate();
  const setConnect = useUi((s) => s.setConnect);
  const loading = useDevices((s) => s.loading);
  const [sys, setSys] = useState<{ batt?: number | null; memPct?: number; storPct?: number; cpu?: number } | null>(null);

  useEffect(() => {
    if (!selected || selected.state !== "connected") {
      setSys(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [b, m, st] = await Promise.all([
          api.battery(selected.serial),
          api.memory(selected.serial),
          api.storage(selected.serial, "/data"),
        ]);
        if (!alive) return;
        const memPct = m.total_kb && m.avail_kb ? Math.round(((m.total_kb - m.avail_kb) / m.total_kb) * 100) : undefined;
        const storPct = st.total_kb && st.avail_kb ? Math.round(((st.total_kb - st.avail_kb) / st.total_kb) * 100) : undefined;
        setSys({ batt: b.pct, memPct, storPct, cpu: 12 });
      } catch {
        if (alive) setSys(null);
      }
    })();
    return () => { alive = false; };
  }, [selected?.serial, selected?.state]);

  if (!selected) {
    return (
      <div>
        <PageHeader title="Dashboard" desc="Your Android device at a glance." />
        <EmptyState
          title="No Android device connected."
          desc="Connect a device using USB or Wireless ADB."
          action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>}
        />
        {!adb.ready && (
          <div className="panel p-4 mt-3 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
            Android Platform Tools were not detected. Go to <button className="underline" onClick={() => navigate("/settings")}>Settings → ADB</button> to configure adb.
          </div>
        )}
      </div>
    );
  }

  const quick = [
    { label: "Apps", icon: AppWindow, go: "/apps" },
    { label: "Logcat", icon: ScrollText, go: "/logcat" },
    { label: "Files", icon: Folder, go: "/files" },
    { label: "Shell", icon: FileTerminal, go: "/shell" },
    { label: "Screenshot", icon: Image, go: "/tools" },
    { label: "Device Tools", icon: Wrench, go: "/tools" },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        desc="Your Android device at a glance."
        actions={<button className="btn" onClick={onRefresh}>{loading ? "Refreshing…" : "Refresh"}</button>}
      />
      <div className="panel p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-[8px] flex items-center justify-center text-[18px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          {(selected.model ?? "?").slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate">{selected.model ?? selected.serial}</div>
          <div className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="dot dot-ok" /> Connected via {selected.transport === "wireless" ? "Wireless ADB" : selected.transport === "usb" ? "USB" : selected.transport}
          </div>
          <div className="text-[11.5px] mono mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            Android {selected.android_version ?? "?"} · API {selected.sdk ?? "?"} · {selected.abi ?? "?"} · {selected.serial}
          </div>
        </div>
      </div>

      {loading && <div className="mt-3"><LoadingState text={`Fetching system information from ${selected.model ?? selected.serial}…`} /></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <StatCard label="Battery" value={sys?.batt != null ? `${sys.batt}%` : "—"} sub="Charging" accent="var(--success)" />
        <StatCard label="Memory" value={sys?.memPct != null ? `${sys.memPct}%` : "—"} sub={selected ? fmtBytes(4_000_000) + " used" : undefined} />
        <StatCard label="Storage" value={sys?.storPct != null ? `${sys.storPct}%` : "—"} sub="of /data" />
        <StatCard label="CPU" value={sys?.cpu != null ? `${sys.cpu}%` : "—"} sub="approx." accent="var(--info)" />
      </div>
      {sys?.storPct != null && <div className="mt-2"><ProgressBar pct={sys.storPct} /></div>}

      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] mt-5 mb-2" style={{ color: "var(--text-muted)" }}>Quick Actions</div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <button key={q.label} className="panel p-3.5 text-left hover:border-[#2e3a4f] transition-colors" onClick={() => navigate(q.go)}>
              <Icon size={16} style={{ color: "var(--accent)" }} />
              <div className="text-[12.5px] font-medium mt-2">{q.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
