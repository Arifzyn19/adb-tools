import { useState } from "react";
import { api, fmtSize } from "../lib/tauri";
import { useDevices, useUi } from "../stores/stores";
import type { ApkMeta } from "../lib/types";
import { EmptyState, PageHeader } from "../components/ui";

export function ApkInspector() {
  const selected = useDevices((s) => s.selected)();
  const toast = useUi((s) => s.toast);
  const [meta, setMeta] = useState<ApkMeta | null>(null);
  const [tab, setTab] = useState("overview");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const inspect = async (path: string) => {
    setBusy(true);
    try {
      const m = await api.inspectApk(path);
      setMeta(m);
      setTab("overview");
    } catch (e) {
      toast("error", `Inspect failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (!selected || !meta) {
      toast("warning", "Select a device first");
      return;
    }
    setBusy(true);
    try {
      const msg = await api.installApk(selected.serial, meta.file_name, true);
      toast("success", `APK installed successfully — ${msg}`);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      toast("error", `Failed to install APK — ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="APK Inspector"
        desc="Analyze an Android APK locally."
        actions={meta && selected ? <button className="btn btn-primary" disabled={busy} onClick={install}>{busy ? "Working…" : "Install to device"}</button> : undefined}
      />
      {!meta && (
        <div
          className="panel p-10 text-center cursor-pointer transition-colors"
          style={drag ? { borderColor: "var(--accent)" } : undefined}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0] as unknown as { path?: string; name: string } | undefined;
            if (f?.path) inspect(f.path);
            else toast("info", "Drop a local .apk file path (Tauri file-drop resolves to a path)");
          }}
          onClick={() => inspect("C:\\Downloads\\app.apk")}
        >
          <div className="text-[14px] font-medium">Drop APK here</div>
          <div className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>or click to browse your files (demo path)</div>
          {busy && <div className="text-[12px] mt-2" style={{ color: "var(--accent)" }}>Analyzing…</div>}
        </div>
      )}
      {meta && (
        <div>
          <div className="panel p-4 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[12px]">
            {[["File", meta.file_name], ["Size", fmtSize(meta.size_bytes)], ["Package", meta.package ?? "—"], ["Version", `${meta.version ?? "—"} (${meta.version_code ?? "?"})`],
              ["Min SDK", meta.min_sdk ?? "—"], ["Target SDK", meta.target_sdk ?? "—"], ["ABI", meta.abis.join(", ") || "—"], ["Permissions", String(meta.permissions.length)]].map(([k, v]) => (
              <div key={k}><div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{k}</div><div className="mono mt-0.5 break-all">{v}</div></div>
            ))}
          </div>
          <div className="flex gap-1 mt-3">
            {["overview", "permissions", "components", "files"].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`chip !py-1.5 !px-3 capitalize cursor-pointer ${tab === t ? "!border-[var(--accent)] text-white" : ""}`} style={tab === t ? { background: "var(--accent-soft)" } : undefined}>{t}</button>
            ))}
            <button className="btn btn-ghost !py-1 ml-auto" onClick={() => setMeta(null)}>Inspect another</button>
          </div>
          <div className="panel p-4 mt-2 mono text-[12px] whitespace-pre-wrap">
            {tab === "overview" && `package: ${meta.package ?? "unknown"}\nversion: ${meta.version ?? "?"} (${meta.version_code ?? "?"})\nabis: ${meta.abis.join(", ") || "universal"}`}
            {tab === "permissions" && (meta.permissions.length ? meta.permissions.join("\n") : "No permissions parsed (binary manifest requires aapt2 — file list fallback).")}
            {tab === "components" && `activities:\n${meta.activities.join("\n") || "  —"}\nservices:\n${meta.services.join("\n") || "  —"}`}
            {tab === "files" && `file: ${meta.file_name}\nsize: ${fmtSize(meta.size_bytes)}\n(all inspection happens locally)`}
          </div>
        </div>
      )}
      {meta === null && <div className="mt-3"><EmptyState title="No APK loaded" desc="Local-only analysis — nothing is uploaded." /></div>}
    </div>
  );
}
