import type { ReactNode } from "react";

export function PageHeader({ title, desc, actions }: { title: string; desc: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</p>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="panel p-3 min-w-0">
      <div className="text-[10.5px] uppercase tracking-[0.08em] font-semibold" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-[19px] font-semibold mt-1 truncate" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="text-[11.5px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="panel p-8 text-center">
      <div className="text-[13.5px] font-medium">{title}</div>
      <div className="text-[12.5px] mt-1" style={{ color: "var(--text-secondary)" }}>{desc}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingState({ text }: { text: string }) {
  return (
    <div className="panel p-6 flex items-center gap-3">
      <span className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}

export function ErrorState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <div className="panel p-6">
      <div className="text-[13.5px] font-medium" style={{ color: "var(--error)" }}>{title}</div>
      <div className="text-[12.5px] mt-1" style={{ color: "var(--text-secondary)" }}>{detail}</div>
      <details className="mt-2 text-[11.5px] mono" style={{ color: "var(--text-muted)" }}>
        <summary className="cursor-pointer">Technical Details</summary>
        <pre className="mt-1 whitespace-pre-wrap">{detail}</pre>
      </details>
      {onRetry && <button className="btn mt-3" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function StatusBadge({ state }: { state: string }) {
  const map: Record<string, { dot: string; label: string; color: string }> = {
    connected: { dot: "dot-ok", label: "Connected", color: "var(--success)" },
    unauthorized: { dot: "dot-warn", label: "Unauthorized", color: "var(--warning)" },
    offline: { dot: "dot-err", label: "Offline", color: "var(--error)" },
    connecting: { dot: "pulse-dot dot-warn", label: "Connecting", color: "var(--warning)" },
    pairing: { dot: "pulse-dot dot-warn", label: "Pairing", color: "var(--warning)" },
  };
  const m = map[state] ?? { dot: "dot-mute", label: state, color: "var(--text-muted)" };
  return (
    <span className="chip">
      <span className={`dot ${m.dot}`} />
      <span style={{ color: m.color }}>{m.label}</span>
    </span>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "#1b2230" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: "var(--accent)" }} />
    </div>
  );
}

export function ConfirmDialog({
  title, body, confirmLabel, onConfirm, onCancel, danger,
}: {
  title: string; body: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onCancel}>
      <div className="panel-elevated dialog-enter p-5 w-[380px] max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[12.5px] mt-1.5 mono break-all" style={{ color: "var(--text-secondary)" }}>{body}</div>
        <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>This action cannot be undone.</div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
