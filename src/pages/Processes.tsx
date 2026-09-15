import { useEffect, useMemo, useState } from "react";
import { api, fmtBytes } from "../lib/tauri";
import { useDevices, useProcs, useUi } from "../stores/stores";
import { ConfirmDialog, EmptyState, LoadingState, PageHeader } from "../components/ui";

export function Processes() {
  const selected = useDevices((s) => s.selected)();
  const procs = useProcs((s) => s.procs);
  const query = useProcs((s) => s.query);
  const autoRefresh = useProcs((s) => s.autoRefresh);
  const loading = useProcs((s) => s.loading);
  const setProcs = useProcs((s) => s.setProcs);
  const setQuery = useProcs((s) => s.setQuery);
  const setAuto = useProcs((s) => s.setAuto);
  const setLoading = useProcs((s) => s.setLoading);
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const [confirmPid, setConfirmPid] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<"pid" | "cpu" | "mem">("cpu");

  const load = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const list = await api.listProcesses(selected.serial);
      setProcs(list);
    } catch (e) {
      toast("error", `Processes failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.serial]);

  useEffect(() => {
    if (!autoRefresh || !selected) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, selected?.serial]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const list = procs.filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.pid).includes(q));
    const sorted = [...list].sort((a, b) =>
      sortKey === "pid" ? a.pid - b.pid : sortKey === "cpu" ? b.cpu_pct - a.cpu_pct : b.mem_kb - a.mem_kb,
    );
    return sorted;
  }, [procs, query, sortKey]);

  const kill = async () => {
    if (!selected || confirmPid == null) return;
    const target = procs.find((p) => p.pid === confirmPid);
    try {
      await api.killProcess(selected.serial, confirmPid, target?.package);
      toast("success", `Process ${confirmPid} stopped`);
      load();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setConfirmPid(null);
    }
  };

  if (!selected) {
    return (
      <div>
        <PageHeader title="Processes" desc="Monitor processes running on the selected device." />
        <EmptyState title="No Android device connected." desc="Select a device first." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Processes"
        desc={`Monitor processes on ${selected.model ?? selected.serial}.`}
        actions={
          <>
            <label className="chip !py-1.5 cursor-pointer"><input type="checkbox" checked={autoRefresh} onChange={(e) => setAuto(e.target.checked)} /> Auto Refresh</label>
            <button className="btn" onClick={load}>Refresh</button>
          </>
        }
      />
      <div className="flex gap-2 mb-2.5">
        <input className="input !w-[240px]" placeholder="Search processes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className="text-[11.5px] mono self-center" style={{ color: "var(--text-muted)" }}>{filtered.length} processes</span>
      </div>
      {loading && procs.length === 0 && <LoadingState text="Reading process list…" />}
      <div className="table-wrap">
        <table className="dtable">
          <thead><tr>
            <th><button onClick={() => setSortKey("pid")}>PID {sortKey === "pid" ? "▾" : ""}</button></th>
            <th>Process</th><th>Package</th>
            <th><button onClick={() => setSortKey("cpu")}>CPU {sortKey === "cpu" ? "▾" : ""}</button></th>
            <th><button onClick={() => setSortKey("mem")}>Memory {sortKey === "mem" ? "▾" : ""}</button></th>
            <th>State</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.slice(0, 300).map((p) => (
              <tr key={p.pid}>
                <td className="mono">{p.pid}</td>
                <td className="mono text-[12px]">{p.name}</td>
                <td className="mono text-[11.5px]" style={{ color: "var(--text-secondary)" }}>{p.package ?? "—"}</td>
                <td className="mono">{p.cpu_pct.toFixed(1)}%</td>
                <td className="mono">{fmtBytes(p.mem_kb)}</td>
                <td><span className="chip">{p.state}</span></td>
                <td><button className="btn btn-ghost !py-1 !px-2 text-[11.5px]" onClick={() => setConfirmPid(p.pid)}>Kill</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmPid != null && (
        <ConfirmDialog title="Kill Process" body={`PID ${confirmPid}`} confirmLabel="Kill Process" danger onCancel={() => setConfirmPid(null)} onConfirm={kill} />
      )}
    </div>
  );
}
