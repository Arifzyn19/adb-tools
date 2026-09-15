import {
  Activity, Box, Folder, LayoutDashboard, Package, ScrollText,
  Settings, Smartphone, Terminal, TriangleAlert, Wrench,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useDevices, useUi } from "../stores/stores";

const GROUPS: { label: string; items: { to: string; label: string; icon: typeof Package }[] }[] = [
  { label: "Overview", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/devices", label: "Devices", icon: Smartphone },
  ]},
  { label: "Management", items: [
    { to: "/apps", label: "Apps", icon: Package },
    { to: "/processes", label: "Processes", icon: Activity },
    { to: "/files", label: "Files", icon: Folder },
  ]},
  { label: "Debug", items: [
    { to: "/logcat", label: "Logcat", icon: ScrollText },
    { to: "/crashes", label: "Crashes", icon: TriangleAlert },
    { to: "/apk", label: "APK Inspector", icon: Box },
    { to: "/shell", label: "Shell", icon: Terminal },
  ]},
  { label: "Tools", items: [{ to: "/tools", label: "Device Tools", icon: Wrench }]},
  { label: "System", items: [{ to: "/settings", label: "Settings", icon: Settings }]},
];

export function Sidebar() {
  const devices = useDevices((s) => s.devices);
  const selected = useDevices((s) => s.selected)();
  const setConnect = useUi((s) => s.setConnect);

  return (
    <aside className="w-[228px] shrink-0 flex flex-col border-r h-full" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>{g.label}</div>
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to + it.label}
                  to={it.to}
                  end={it.to === "/"}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={15} strokeWidth={2} />
                  <span>{it.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
      <button
        className="m-2.5 p-3 text-left panel hover:border-[#2e3a4f] transition-colors"
        onClick={() => setConnect(true)}
        title="Open device selector"
      >
        {selected ? (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--success)" }}>
              <span className="dot dot-ok" /> CONNECTED
            </div>
            <div className="text-[13px] font-medium mt-1 truncate">{selected.model ?? selected.serial}</div>
            <div className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
              Android {selected.android_version ?? "?"} · {selected.transport === "wireless" ? "Wireless ADB" : selected.transport === "usb" ? "USB" : selected.transport}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
              <span className="dot dot-mute" /> NO DEVICE
            </div>
            <div className="text-[11.5px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {devices.length === 0 ? "Connect an Android device" : "Select a device"}
            </div>
          </>
        )}
      </button>
    </aside>
  );
}
