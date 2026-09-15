import { useState } from "react";
import { useCrashes, useUi } from "../stores/stores";
import { EmptyState, PageHeader } from "../components/ui";

export function Crashes() {
  const crashes = useCrashes((s) => s.crashes);
  const clear = useCrashes((s) => s.clear);
  const selectedId = useCrashes((s) => s.selectedId);
  const setSelected = useCrashes((s) => s.setSelected);
  const toast = useUi((s) => s.toast);
  const [hideSystem, setHideSystem] = useState(true);

  const selected = crashes.find((c) => c.id === selectedId) ?? null;

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast("success", "Copied to clipboard"),
      () => toast("error", "Copy failed"),
    );
  };

  const filteredStack = (st: string) => {
    if (!hideSystem) return st;
    return st.split("\n").filter((l) => !l.includes("android.app.Activity") || l.includes("MainActivity")).join("\n");
  };

  return (
    <div>
      <PageHeader
        title="Crashes"
        desc="Recent application crashes detected from Logcat."
        actions={crashes.length > 0 ? <><button className="btn" onClick={() => copy(JSON.stringify(crashes, null, 2))}>Export</button><button className="btn btn-danger" onClick={clear}>Clear history</button></> : undefined}
      />
      {crashes.length === 0 && <EmptyState title="No crashes detected." desc="Start Logcat and reproduce the crash. FATAL EXCEPTION lines will appear here." />}
      <div className="grid lg:grid-cols-[340px_1fr] gap-3">
        <div className="flex flex-col gap-2">
          {crashes.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className={`panel p-3.5 text-left ${selectedId === c.id ? "!border-[var(--accent)]" : "hover:border-[#2e3a4f]"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--error)" }}>Crash</div>
              <div className="mono text-[12.5px] font-medium mt-0.5 break-all">{c.package}</div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{c.exception} · {c.thread}</div>
              {c.location && <div className="mono text-[11px]" style={{ color: "var(--info)" }}>{c.location}</div>}
              <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{c.timestamp}</div>
            </button>
          ))}
        </div>
        <div>
          {!selected && crashes.length > 0 && <EmptyState title="Select a crash" desc="Choose a crash on the left to inspect its stacktrace." />}
          {selected && (
            <div className="panel p-4">
              <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
                {[["Application", selected.package], ["Exception", selected.exception], ["Thread", selected.thread], ["Timestamp", selected.timestamp]].map(([k, v]) => (
                  <div key={k} className="panel p-2.5"><div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{k}</div><div className="mono mt-0.5 break-all">{v}</div></div>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="chip !py-1.5 cursor-pointer"><input type="checkbox" checked={hideSystem} onChange={(e) => setHideSystem(e.target.checked)} /> Filter System Frames</label>
                <button className="btn !py-1 ml-auto" onClick={() => copy(filteredStack(selected.stacktrace))}>Copy Stacktrace</button>
              </div>
              <pre className="mono text-[11.5px] leading-relaxed whitespace-pre-wrap p-3 rounded-[6px] overflow-x-auto" style={{ background: "#0b0f15", border: "1px solid var(--border)" }}>
                {filteredStack(selected.stacktrace)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
