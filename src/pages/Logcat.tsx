import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCrashes, useDevices, useLogcat, useUi } from "../stores/stores";
import { mockLogLine } from "../mock/data";
import { EmptyState, PageHeader } from "../components/ui";

const LEVELS = ["all", "V", "D", "I", "W", "E", "F"] as const;
const LEVEL_COLORS: Record<string, string> = {
  V: "var(--text-muted)", D: "var(--text-secondary)", I: "var(--info)",
  W: "var(--warning)", E: "var(--error)", F: "#ff2d55",
};

let mockTimer: ReturnType<typeof setInterval> | null = null;
let mockIdx = 0;

export function Logcat() {
  const selected = useDevices((s) => s.selected)();
  const lines = useLogcat((s) => s.lines);
  const running = useLogcat((s) => s.running);
  const paused = useLogcat((s) => s.paused);
  const autoScroll = useLogcat((s) => s.autoScroll);
  const query = useLogcat((s) => s.query);
  const level = useLogcat((s) => s.level);
  const pkg = useLogcat((s) => s.pkg);
  const maxBuffer = useLogcat((s) => s.maxBuffer);
  const pushBatch = useLogcat((s) => s.pushBatch);
  const clear = useLogcat((s) => s.clear);
  const setRunning = useLogcat((s) => s.setRunning);
  const setPaused = useLogcat((s) => s.setPaused);
  const setAutoScroll = useLogcat((s) => s.setAutoScroll);
  const setQuery = useLogcat((s) => s.setQuery);
  const setLevel = useLogcat((s) => s.setLevel);
  const setPkg = useLogcat((s) => s.setPkg);
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const addCrash = useCrashes((s) => s.add);
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  const [displayCount, setDisplayCount] = useState(600);

  // Mock streaming with batching: 25 lines per 300ms tick -> batched single state update.
  useEffect(() => {
    if (!running || paused) {
      if (mockTimer) {
        clearInterval(mockTimer);
        mockTimer = null;
      }
      return;
    }
    mockTimer = setInterval(() => {
      const batch = Array.from({ length: 25 }, () => mockLogLine(mockIdx++));
      pushBatch(batch);
      // Crash detection on batch (no per-line state churn).
      for (const l of batch) {
        if (l.message.includes("FATAL EXCEPTION")) {
          const crash = {
            id: `crash-${Date.now()}`,
            package: l.package_hint ?? "com.example.app",
            exception: "NullPointerException",
            thread: "main",
            timestamp: new Date().toLocaleString(),
            location: "MainActivity.kt:142",
            stacktrace: `${l.tag}: FATAL EXCEPTION: main\nProcess: ${l.package_hint ?? "com.example.app"}\njava.lang.NullPointerException\n\tat MainActivity.kt:142\n\tat android.app.Activity.performCreate(Activity.java:9000)`,
          };
          addCrash(crash);
          toast("error", `Crash Detected — ${crash.package} · NullPointerException · Thread: main`);
        }
      }
    }, 300);
    return () => {
      if (mockTimer) clearInterval(mockTimer);
      mockTimer = null;
    };
  }, [running, paused, pushBatch, addCrash, toast]);

  // Auto-scroll to bottom on new batches.
  useEffect(() => {
    if (autoScroll && !paused && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [lines.length, autoScroll, paused]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return lines.filter((l) => {
      if (level !== "all" && l.level !== level) return false;
      if (pkg !== "all" && !(l.package_hint === pkg || l.message.includes(pkg) || l.tag.includes(pkg))) return false;
      if (q && !(l.message.toLowerCase().includes(q) || l.tag.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [lines, query, level, pkg]);

  const visible = useMemo(() => filtered.slice(-displayCount), [filtered, displayCount]);

  const rowVirtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 20,
  });

  const exportLogs = () => {
    const text = filtered.map((l) => `${l.timestamp} ${l.level} ${l.tag}: ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "logcat.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("success", `Exported ${filtered.length} lines`);
  };

  if (!selected) {
    return (
      <div>
        <PageHeader title="Logcat" desc="Live Android system logs." />
        <EmptyState title="No Android device connected." desc="Select a device first." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[560px]">
      <PageHeader
        title="Logcat"
        desc={`Live Android system logs · ${selected.model ?? selected.serial} · buffer ${lines.length}/${maxBuffer}`}
        actions={
          <>
            {!running
              ? <button className="btn btn-primary" onClick={() => setRunning(true)}>Start</button>
              : <button className="btn" onClick={() => setRunning(false)}>Stop</button>}
            <button className="btn" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
            <button className="btn" onClick={clear}>Clear</button>
            <button className="btn" onClick={exportLogs}>Export</button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2 mb-2.5 items-center">
        <input className="input !w-[200px]" placeholder="Search logs" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="input !w-[180px] mono" placeholder="Package filter" value={pkg === "all" ? "" : pkg} onChange={(e) => setPkg(e.target.value || "all")} />
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`chip !py-1 cursor-pointer ${level === l ? "!border-[var(--accent)] text-white" : ""}`} style={level === l ? { background: "var(--accent-soft)" } : undefined}>{l === "all" ? "All" : l}</button>
          ))}
        </div>
        <label className="chip !py-1.5 cursor-pointer ml-auto"><input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} /> Auto-scroll</label>
        {paused && <span className="chip" style={{ color: "var(--warning)" }}>Paused — stream continues, display frozen</span>}
      </div>

      {!running && lines.length === 0 && (
        <EmptyState title="Waiting for Logcat…" desc="Press Start to begin streaming logs." action={<button className="btn btn-primary" onClick={() => setRunning(true)}>Start Logcat</button>} />
      )}

      {(running || lines.length > 0) && (
        <div ref={parentRef} className="panel flex-1 min-h-[420px] max-h-[560px] overflow-y-auto p-2 mono text-[11.5px] leading-[26px]">
          {visible.length === 0 && <div className="p-4" style={{ color: "var(--text-muted)" }}>No lines match the current filters.</div>}
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((v) => {
              const l = visible[v.index];
              return (
                <div key={l.id} data-index={v.index} ref={rowVirtualizer.measureElement}
                  className="flex gap-2.5 px-2 whitespace-nowrap hover:bg-[#121926] rounded"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${v.start}px)` }}>
                  <span style={{ color: "var(--text-muted)" }}>{l.timestamp}</span>
                  <span className="w-3 font-bold" style={{ color: LEVEL_COLORS[l.level] }}>{l.level}</span>
                  <span className="w-[160px] shrink-0 truncate" style={{ color: "var(--info)" }}>{l.tag}</span>
                  <span className="truncate" style={l.level === "E" || l.level === "F" ? { color: "#ffb3b9" } : { color: "var(--text)" }}>{l.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span className="mono">{filtered.length} visible · {lines.length} buffered</span>
        {filtered.length > displayCount && <button className="btn !py-1" onClick={() => setDisplayCount((c) => c + 1000)}>Show more</button>}
        <button className="btn btn-ghost !py-1 ml-auto" onClick={() => navigate("/crashes")}>Open Crash Center →</button>
      </div>
    </div>
  );
}
