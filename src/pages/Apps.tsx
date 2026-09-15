import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApps, useDevices, useLogcat, useUi } from "../stores/stores";
import { api } from "../lib/tauri";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "../components/ui";

const FILTERS = ["all", "user", "system", "running"] as const;

export function Apps() {
  const selected = useDevices((s) => s.selected)();
  const apps = useApps((s) => s.apps);
  const query = useApps((s) => s.query);
  const filter = useApps((s) => s.filter);
  const loading = useApps((s) => s.loading);
  const error = useApps((s) => s.error);
  const selectedPkg = useApps((s) => s.selectedPkg);
  const setApps = useApps((s) => s.setApps);
  const setQuery = useApps((s) => s.setQuery);
  const setFilter = useApps((s) => s.setFilter);
  const setLoading = useApps((s) => s.setLoading);
  const setError = useApps((s) => s.setError);
  const setSelected = useApps((s) => s.setSelected);
  const navigate = useNavigate();
  const setPkg = useLogcat((s) => s.setPkg);
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const [confirm, setConfirm] = useState<{ action: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const list = await api.listApps(selected.serial);
      setApps(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.serial]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return apps.filter((a) => {
      if (filter === "user" && a.system) return false;
      if (filter === "system" && !a.system) return false;
      if (filter === "running" && !a.running) return false;
      if (q && !(a.name.toLowerCase().includes(q) || a.package.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [apps, query, filter]);

  const detail = apps.find((a) => a.package === selectedPkg) ?? null;

  const runAction = async (action: string) => {
    if (!selected || !selectedPkg) return;
    setBusy(true);
    try {
      const msg = await api.appAction(selected.serial, selectedPkg, action);
      toast("success", msg);
      if (action === "uninstall") {
        setApps(apps.filter((a) => a.package !== selectedPkg));
        setSelected(null);
      } else {
        load();
      }
    } catch (e) {
      toast("error", `Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  if (!selected) {
    return (
      <div>
        <PageHeader title="Applications" desc="Manage applications installed on the selected Android device." />
        <EmptyState title="No Android device connected." desc="Select a device first." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
      </div>
    );
  }

  const stats = {
    total: apps.length,
    running: apps.filter((a) => a.running).length,
    user: apps.filter((a) => !a.system).length,
    system: apps.filter((a) => a.system).length,
  };

  return (
    <div>
      <PageHeader title="Applications" desc={`Manage applications on ${selected.model ?? selected.serial}.`} actions={<button className="btn" onClick={load}>Refresh</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {[["Total Apps", stats.total], ["Running", stats.running], ["User Apps", stats.user], ["System Apps", stats.system]].map(([l, v]) => (
          <div key={l as string} className="panel px-3 py-2.5">
            <div className="text-[10.5px] uppercase tracking-[0.08em] font-semibold" style={{ color: "var(--text-muted)" }}>{l}</div>
            <div className="text-[18px] font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <input className="input !w-[240px]" placeholder="Search applications…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip !py-1.5 !px-3 capitalize cursor-pointer ${filter === f ? "!border-[var(--accent)] text-white" : ""}`} style={filter === f ? { background: "var(--accent-soft)" } : undefined}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-[11.5px] mono" style={{ color: "var(--text-muted)" }}>{filtered.length} / {apps.length}</span>
      </div>

      {loading && <LoadingState text={`Loading installed applications… Fetching package information from ${selected.model ?? selected.serial}`} />}
      {error && !loading && <ErrorState title="Unable to load applications" detail={`Could not execute ADB operation. ${error}`} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && <EmptyState title="No applications found." desc="Try a different search or filter." />}

      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrap">
          <table className="dtable">
            <thead><tr><th>Application</th><th>Package</th><th>Version</th><th>State</th></tr></thead>
            <tbody>
              {filtered.slice(0, 300).map((a) => (
                <tr key={a.package} className={selectedPkg === a.package ? "selected" : ""} onClick={() => setSelected(a.package)} style={{ cursor: "pointer" }}>
                  <td><span className="font-medium">{a.name}</span></td>
                  <td className="mono text-[11.5px]" style={{ color: "var(--text-secondary)" }}>{a.package}</td>
                  <td className="mono text-[11.5px]">{a.version ?? "—"}</td>
                  <td>{a.running ? <span className="chip"><span className="dot dot-ok" /> Running</span> : <span className="chip"><span className="dot dot-mute" /> Stopped</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-y-0 right-0 w-[380px] max-w-[90vw] z-40 panel-elevated drawer-enter !rounded-none !border-y-0 !border-r-0 p-5 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-semibold">{detail.name}</div>
              <div className="mono text-[11.5px] break-all" style={{ color: "var(--text-secondary)" }}>{detail.package}</div>
            </div>
            <button className="btn btn-ghost !px-2" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
            {[["Version", detail.version ?? "—"], ["Version Code", detail.version_code ?? "—"], ["UID", detail.uid ?? "—"], ["Install Type", detail.install_type]].map(([k, v]) => (
              <div key={k} className="panel p-2.5"><div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{k}</div><div className="mono mt-0.5">{v}</div></div>
            ))}
          </div>
          <div className="mt-2"><StatusBadge state={detail.running ? "connected" : "disconnected"} /></div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="btn justify-center" disabled={busy} onClick={() => runAction("launch")}>Launch</button>
            <button className="btn justify-center" disabled={busy} onClick={() => runAction("force-stop")}>Force Stop</button>
            <button className="btn justify-center" disabled={busy} onClick={() => setConfirm({ action: "clear-data", label: "Clear Data" })}>Clear Data</button>
            <button className="btn justify-center" disabled={busy} onClick={() => { setPkg(detail.package); navigate("/logcat"); }}>Open Logcat</button>
            <button className="btn btn-danger justify-center col-span-2" disabled={busy} onClick={() => setConfirm({ action: "uninstall", label: "Uninstall" })}>Uninstall</button>
          </div>
          <div className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>Permissions · Activities · Services tabs available after full dumpsys enrichment.</div>
        </div>
      )}
      {confirm && detail && (
        <ConfirmDialog title={`Confirm ${confirm.label}`} body={detail.package} confirmLabel={confirm.label} danger onCancel={() => setConfirm(null)} onConfirm={() => runAction(confirm.action)} />
      )}
    </div>
  );
}
