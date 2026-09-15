import { useState } from "react";
import { api, fmtSize } from "../lib/tauri";
import { useDevices, useUi } from "../stores/stores";
import { ConfirmDialog, EmptyState, PageHeader } from "../components/ui";

export function Files() {
  const selected = useDevices((s) => s.selected)();
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const [path, setPath] = useState("/storage/emulated/0");
  const [entries, setEntries] = useState<{ name: string; path: string; is_dir: boolean; size: number; modified?: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = async (p = path) => {
    if (!selected) return;
    setLoading(true);
    try {
      const list = await api.files(selected.serial, p);
      setEntries(list);
    } catch (e) {
      toast("error", String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!selected) {
    return (
      <div>
        <PageHeader title="Files" desc="Browse the device filesystem." />
        <EmptyState title="No Android device connected." desc="Select a device first." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
      </div>
    );
  }

  const up = () => {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    const np = "/" + parts.join("/");
    setPath(np || "/");
    load(np || "/");
  };

  return (
    <div>
      <PageHeader
        title="Files"
        desc={`Browsing ${selected.model ?? selected.serial}`}
        actions={<><button className="btn" onClick={() => load()}>Refresh</button><button className="btn" onClick={() => toast("info", "Upload uses adb push with progress (native dialog in Tauri build)")}>Upload</button></>}
      />
      <div className="flex gap-2 mb-2.5">
        <button className="btn" onClick={up}>↑ Up</button>
        <input className="input mono" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <button className="btn" onClick={() => load()}>Go</button>
      </div>
      {loading && <div className="text-[12px] mb-2" style={{ color: "var(--text-secondary)" }}>Loading directory…</div>}
      {!loading && entries.length === 0 && <EmptyState title="This directory is empty." desc="Upload files or navigate elsewhere." action={<button className="btn" onClick={() => load()}>Refresh</button>} />}
      {entries.length > 0 && (
        <div className="table-wrap">
          <table className="dtable">
            <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th></th></tr></thead>
            <tbody>
              {entries.map((f) => (
                <tr key={f.path}>
                  <td>
                    {f.is_dir
                      ? <button className="font-medium hover:underline" onClick={() => { setPath(f.path); load(f.path); }}>📁 {f.name}</button>
                      : <span>📄 {f.name}</span>}
                    <div className="mono text-[10.5px]" style={{ color: "var(--text-muted)" }}>{f.path}</div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{f.is_dir ? "Folder" : "File"}</td>
                  <td className="mono">{f.is_dir ? "—" : fmtSize(f.size)}</td>
                  <td className="mono text-[11.5px]">{f.modified ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {!f.is_dir && <button className="btn btn-ghost !py-1 !px-2 text-[11.5px]" onClick={() => toast("info", "Download uses adb pull (native dialog in Tauri build)")}>Download</button>}
                    <button className="btn btn-ghost !py-1 !px-2 text-[11.5px]" style={{ color: "var(--error)" }} onClick={() => setConfirmDel(f.path)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmDel && (
        <ConfirmDialog title="Delete File" body={confirmDel} confirmLabel="Delete" danger onCancel={() => setConfirmDel(null)} onConfirm={() => { toast("info", "Delete via adb shell rm (confirm in Tauri build)"); setConfirmDel(null); }} />
      )}
    </div>
  );
}
