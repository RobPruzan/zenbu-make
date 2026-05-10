import { useCallback, useEffect, useRef, useState } from "react";
import { useRpc } from "@zenbujs/core/react";

type Phase =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "fetching"; loaded?: number; total?: number; ratio?: number }
  | { phase: "resolving"; depthConsidered: number }
  | {
      phase: "installing";
      pm: string;
      line?: string;
      loaded?: number;
      total?: number;
      ratio?: number;
    }
  | { phase: "applied"; sha: string; reranInstall: boolean }
  | { phase: "up-to-date"; sha: string }
  | { phase: "incompatible"; remoteHead: string; reason: string }
  | { phase: "error"; message: string };

interface Info {
  mode: "bundle" | "dev";
  appsDir: string | null;
  hostVersion: string | null;
  currentSha: string | null;
  mirror: { url: string; branch: string } | null;
}

interface CheckResult {
  status: "ok" | "dev-mode" | "error" | "no-mirror" | "no-host-version";
  currentSha: string | null;
  targetSha: string | null;
  tipSha: string | null;
  hasUpdate: boolean;
  incompatibleHead: boolean;
  error?: string;
}

const POLL_CHECK_MS = 30_000;
const POLL_STATUS_MS = 250;

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 12,
  right: 12,
  width: 320,
  padding: 14,
  borderRadius: 10,
  background: "#1c1c1f",
  border: "1px solid #2a2a2e",
  color: "#e5e5e5",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontSize: 12,
  lineHeight: 1.45,
  zIndex: 9999,
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 4,
};

const labelStyle: React.CSSProperties = {
  color: "#888",
  flexShrink: 0,
};

const valueStyle: React.CSSProperties = {
  color: "#e5e5e5",
  fontFeatureSettings: '"tnum" 1',
  textAlign: "right",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #3a3a40",
  background: "#262629",
  color: "#e5e5e5",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 80ms ease",
};

const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#4f46e5",
  borderColor: "#5b52ec",
  color: "white",
};

const progressBgStyle: React.CSSProperties = {
  height: 4,
  width: "100%",
  background: "#26262a",
  borderRadius: 999,
  marginTop: 8,
  overflow: "hidden",
};

const progressFgStyle = (ratio: number): React.CSSProperties => ({
  height: "100%",
  width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
  background: "#6366f1",
  transition: "width 120ms ease",
});

function shortSha(sha: string | null | undefined): string {
  return sha ? sha.slice(0, 7) : "—";
}

function describePhase(phase: Phase): {
  label: string;
  ratio: number | null;
  detail?: string;
} {
  switch (phase.phase) {
    case "idle":
      return { label: "Idle", ratio: null };
    case "checking":
      return { label: "Checking…", ratio: null };
    case "fetching":
      return {
        label: "Fetching from mirror…",
        ratio: phase.ratio ?? null,
        detail:
          phase.loaded != null && phase.total != null
            ? `${phase.loaded}/${phase.total}`
            : undefined,
      };
    case "resolving":
      return {
        label: "Resolving compatible commit…",
        ratio: null,
        detail: `depth=${phase.depthConsidered}`,
      };
    case "installing":
      return {
        label: `Installing (${phase.pm})…`,
        ratio: phase.ratio ?? null,
        detail: phase.line ?? undefined,
      };
    case "applied":
      return {
        label: `Applied ${shortSha(phase.sha)}${phase.reranInstall ? " (deps updated)" : ""}`,
        ratio: 1,
      };
    case "up-to-date":
      return { label: "Up to date", ratio: null };
    case "incompatible":
      return {
        label: "No compatible commit on mirror",
        ratio: null,
        detail: phase.reason,
      };
    case "error":
      return { label: "Error", ratio: null, detail: phase.message };
  }
}

export function UpdateStatus(): React.ReactElement {
  const rpc = useRpc();
  const [info, setInfo] = useState<Info | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [phase, setPhase] = useState<Phase>({ phase: "idle" });
  const [busy, setBusy] = useState(false);
  const lastErrorRef = useRef<string | null>(null);


  const refreshInfo = useCallback(async () => {
    try {
      const next = await rpc.updater.getInfo();
      setInfo(next);
    } catch (err) {
      lastErrorRef.current = (err as Error).message;
    }
  }, [rpc]);

  const runCheck = useCallback(async () => {
    try {
      const next = (await rpc.updater.check()) ;
      setCheck(next);
    } catch (err) {
      lastErrorRef.current = (err as Error).message;
    }
  }, [rpc]);

  // Initial load + check on mount
  useEffect(() => {
    void refreshInfo();
    void runCheck();
  }, [refreshInfo, runCheck]);

  // Periodic re-check (only when not actively updating)
  useEffect(() => {
    if (busy) return;
    const id = setInterval(() => {
      void runCheck();
    }, POLL_CHECK_MS);
    return () => clearInterval(id);
  }, [busy, runCheck]);

  // Status polling while busy
  useEffect(() => {
    if (!busy) return;
    let cancelled = false;
    const tick = async (): Promise<void> => {
      if (cancelled) return;
      try {
        const next = (await rpc.updater.getStatus()) ;
        if (!cancelled) setPhase(next);
      } catch {}
    };
    const id = setInterval(tick, POLL_STATUS_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [busy, rpc]);

  const onUpdate = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setPhase({ phase: "checking" });
    try {
      await rpc.updater.update();
    } catch (err) {
      setPhase({ phase: "error", message: (err as Error).message });
    } finally {
      setBusy(false);
      void refreshInfo();
      void runCheck();
    }
  }, [busy, rpc, refreshInfo, runCheck]);

  const isDev = info?.mode === "dev";
  const phaseInfo = describePhase(phase);
  const updateAvailable =
    !isDev && check?.status === "ok" && check.hasUpdate && !!check.targetSha;
  const updateDisabled = busy || isDev || !info;

  const buttonLabel = (() => {
    if (isDev) return "Dev mode (no updates)";
    if (busy) return "Updating…";
    if (updateAvailable) return `Update to ${shortSha(check?.targetSha)}`;
    if (check?.status === "ok" && !check.hasUpdate) return "Up to date";
    if (check?.status === "ok" && check.incompatibleHead)
      return "Tip incompatible — pinning earlier commit";
    return "Check for updates";
  })();

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13 }}>Updater</div>
        <div
          style={{
            color: isDev ? "#a78bfa" : updateAvailable ? "#22c55e" : "#888",
            fontSize: 11,
          }}
        >
          {isDev ? "DEV" : updateAvailable ? "UPDATE READY" : "BUNDLE"}
        </div>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Host</span>
        <span style={valueStyle}>{info?.hostVersion ?? "—"}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Current SHA</span>
        <span style={valueStyle}>{shortSha(info?.currentSha)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Mirror</span>
        <span style={valueStyle}>
          {info?.mirror ? `${info.mirror.branch}` : "—"}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Target SHA</span>
        <span style={valueStyle}>{shortSha(check?.targetSha)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Status</span>
        <span style={valueStyle}>{phaseInfo.label}</span>
      </div>
      {phaseInfo.detail && (
        <div
          style={{
            marginTop: 6,
            padding: "6px 8px",
            borderRadius: 4,
            background: "#161618",
            color: "#9aa0a6",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 11,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={phaseInfo.detail}
        >
          {phaseInfo.detail}
        </div>
      )}
      {phaseInfo.ratio != null && (
        <div style={progressBgStyle}>
          <div style={progressFgStyle(phaseInfo.ratio)} />
        </div>
      )}

      <button
        type="button"
        onClick={onUpdate}
        disabled={updateDisabled}
        style={
          updateAvailable && !updateDisabled
            ? buttonPrimaryStyle
            : { ...buttonStyle, opacity: updateDisabled ? 0.55 : 1 }
        }
      >
        {buttonLabel}
      </button>
    </div>
  );
}
