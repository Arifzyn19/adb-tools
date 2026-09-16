import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCrashes, useDevices, useLogcat, useUi } from "../stores/stores";
import { api } from "../lib/tauri";
import type { CrashInfo, LogEntry } from "../lib/types";
import { EmptyState, PageHeader } from "../components/ui";

const LEVELS = ["all", "V", "D", "I", "W", "E", "F"] as const;
const LEVEL_COLORS: Record<string, string> = {
  V: "var(--text-muted)", D: "var(--text-secondary)", I: "var(--info)",
  W: "var(--warning)", E: "var(--error)", F: "#ff2d55",
};

function logKey(l: LogEntry): string {
  return `${l.timestamp}|${l.level}|${l.tag}|${l.pid ?? ""}|${l.message}`;
}

function toCrash(l: LogEntry): CrashInfo {
  const pkg =
    l.message.match(/[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+/i)?.[0] ??
    l.package_hint ??
    "unknown";
  const exception =
    l.message.match(/[A-Za-z0-9_.]*?(Exception|Error)/)?.[0] ?? "RuntimeException";
  return {
    id: `crash-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    package: pkg,
    exception,
    thread: "main",
    timestamp: new Date().toLocaleString(),
    location: null,
    stacktrace: `${l.tag}: ${l.message}`,
  };
}

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
  const [lastError, setLastError] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const failRef = useRef(0);

  // Real streaming via `adb logcat -d -t N` polling. The dump returns the
  // tail of the device buffer each tick, so dedup by content key.
  useEffect(() => {
    if (!running || paused || !selected) return;
    let alive = true;
    const serial = selected.serial;
    const tick = async () => {
      try {
        const batch = await api.logcatDump(serial, 200);
        if (!alive) return;
        failRef.current = 0;
        setLastError(null);
        const fresh = batch.filter((l) => {
          const k = logKey(l);
          if (seenRef.current.has(k)) return false;
          seenRef.current.add(k);
          return true;
        });
        if (seenRef.current.size > 3000) {
          seenRef.current = new Set(Array.from(seenRef.current).slice(-1500));
        }
        if (fresh.length > 0) {
          pushBatch(fresh);
          for (const l of fresh) {
            if (l.message.includes("FATAL EXCEPTION")) {
              const crash = toCrash(l);
              addCrash(crash);
              toast("error", `Crash Detected — ${crash.package} · ${crash.exception}`);
            }
          }
        }
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        failRef.current++;
        if (failRef.current >= 3) {
          setRunning(false);
          toast("error", `Logcat stopped: ${msg}`);
        }
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [running, paused, selected?.serial, pushBatch, addCrash, toast, setRunning]);

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

  const doClear = async () => {
    clear();
    seenRef.current = new Set();
    if (selected) {
      try {
        await api.logcatClear(selected.serial);
      } catch (e) {
        toast("error", `Clear failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  };

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
            <button className="btn" onClick={doClear}>Clear</button>
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

      {!running && lines.length === 0 && !lastError && (
        <EmptyState title="Waiting for Logcat…" desc="Press Start to begin streaming logs." action={<button className="btn btn-primary" onClick={() => setRunning(true)}>Start Logcat</button>} />
      )}

      {lastError && (
        <div className="panel p-3.5 mb-2.5" style={{ borderColor: "rgba(255,92,104,0.4)" }}>
          <div className="text-[12.5px] font-medium" style={{ color: "var(--error)" }}>Logcat error</div>
          <div className="mono text-[11.5px] mt-1 break-all" style={{ color: "var(--text-secondary)" }}>{lastError}</div>
          <div className="flex gap-2 mt-2.5">
            <button className="btn" onClick={() => { failRef.current = 0; setLastError(null); setRunning(true); }}>Retry</button>
            <button className="btn btn-ghost" onClick={() => setLastError(null)}>Dismiss</button>
          </div>
        </div>
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
