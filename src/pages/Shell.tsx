import { useEffect, useRef, useState } from "react";
import { api } from "../lib/tauri";
import { useDevices, useUi } from "../stores/stores";
import { EmptyState, PageHeader } from "../components/ui";

interface Hist { cmd: string; out: string; err?: string }

export function Shell() {
  const selected = useDevices((s) => s.selected)();
  const setConnect = useUi((s) => s.setConnect);
  const toast = useUi((s) => s.toast);
  const [hist, setHist] = useState<Hist[]>([]);
  const [line, setLine] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hist.length]);

  const run = async () => {
    const cmd = line.trim();
    if (!cmd || !selected || busy) return;
    setBusy(true);
    setHistory((h) => [cmd, ...h].slice(0, 100));
    setHIdx(-1);
    setLine("");
    try {
      const r = await api.shell(selected.serial, cmd);
      setHist((h) => [...h, { cmd, out: r.stdout || "(no output)", err: r.stderr }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHist((h) => [...h, { cmd, out: "", err: msg }]);
      toast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  if (!selected) {
    return (
      <div>
        <PageHeader title="Shell" desc="Run ADB shell commands on the selected device." />
        <EmptyState title="No Android device connected." desc="Select a device first." action={<button className="btn btn-primary" onClick={() => setConnect(true)}>Connect Device</button>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Shell"
        desc={`${selected.model ?? selected.serial} · ${selected.transport === "wireless" ? "Wireless ADB" : "USB"}`}
        actions={<><button className="btn" onClick={() => setHist([])}>Clear</button><button className="btn" onClick={() => {
          const text = hist.map((h) => `$ ${h.cmd}\n${h.out}${h.err ? `\nERR: ${h.err}` : ""}`).join("\n");
          const blob = new Blob([text], { type: "text/plain" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "shell.txt";
          a.click();
        }}>Save output</button></>}
      />
      <div className="panel p-3 mono text-[12.5px] min-h-[420px] max-h-[560px] overflow-y-auto" onClick={() => document.getElementById("shell-input")?.focus()}>
        {hist.length === 0 && <div style={{ color: "var(--text-muted)" }}># Type an Android shell command, e.g. getprop ro.build.version.release</div>}
        {hist.map((h, i) => (
          <div key={i} className="mb-2">
            <div style={{ color: "var(--accent)" }}>{selected.serial.split(":")[0]}:/ $ {h.cmd}</div>
            {h.out && <pre className="whitespace-pre-wrap" style={{ color: "var(--text)" }}>{h.out}</pre>}
            {h.err && <pre className="whitespace-pre-wrap" style={{ color: "var(--error)" }}>{h.err}</pre>}
          </div>
        ))}
        <div ref={bottomRef} />
        <div className="flex items-center gap-2 mt-1">
          <span style={{ color: "var(--accent)" }}>{selected.serial.split(":")[0]}:/ $</span>
          <input
            id="shell-input"
            autoFocus
            className="flex-1 bg-transparent outline-none"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
              else if (e.key === "ArrowUp") {
                e.preventDefault();
                const n = Math.min(hIdx + 1, history.length - 1);
                if (history[n]) {
                  setHIdx(n);
                  setLine(history[n]);
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                const n = hIdx - 1;
                setHIdx(Math.max(n, -1));
                setLine(n >= 0 ? history[n] : "");
              }
            }}
            placeholder={busy ? "running…" : "command"}
            disabled={busy}
          />
        </div>
      </div>
      <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>Executed strictly as adb -s SERIAL shell … — never via host cmd.exe.</div>
    </div>
  );
}
