"use client";

import QRCode from "qrcode";
import type { FC, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import usePersistentState from "../../hooks/usePersistentState";

type NetworkType = "wired" | "wifi";
type SignalStrength = "excellent" | "good" | "fair" | "weak";

interface NetworkCredentials {
  ssid: string;
  password?: string;
  security?: string;
  hidden?: boolean;
}

interface Network {
  id: string;
  name: string;
  type: NetworkType;
  strength?: SignalStrength;
  secure?: boolean;
  details: string;
  credentials?: NetworkCredentials;
}

const NETWORKS: Network[] = [
  {
    id: "wired",
    name: "Wired connection",
    type: "wired",
    details: "Connected • 1.0 Gbps",
  },
  {
    id: "homelab",
    name: "HomeLab 5G",
    type: "wifi",
    strength: "excellent",
    secure: true,
    details: "Auto-connect • WPA2",
    credentials: {
      ssid: "HomeLab 5G",
      password: "k@l1-l@b-5g!",
      security: "WPA2",
    },
  },
  {
    id: "redteam",
    name: "Red Team Ops",
    type: "wifi",
    strength: "good",
    secure: true,
    details: "Hidden SSID • WPA3",
    credentials: {
      ssid: "Red Team Ops",
      password: "Sup3rS3cret!",
      security: "WPA3",
      hidden: true,
    },
  },
  {
    id: "espresso",
    name: "Espresso Bar",
    type: "wifi",
    strength: "fair",
    secure: false,
    details: "Captive portal",
    credentials: {
      ssid: "Espresso Bar",
      security: "None",
    },
  },
  {
    id: "pineapple",
    name: "Pineapple Lab",
    type: "wifi",
    strength: "weak",
    secure: true,
    details: "WEP • Legacy",
    credentials: {
      ssid: "Pineapple Lab",
      password: "LegacyLab",
      security: "WEP",
    },
  },
];

const SIGNAL_LABEL: Record<SignalStrength, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  weak: "Weak",
};

const SIGNAL_STRENGTH_LEVEL: Record<SignalStrength, number> = {
  weak: 1,
  fair: 2,
  good: 3,
  excellent: 4,
};

export const hasSecureLabel = (network: Network) =>
  network.type === "wifi" && network.secure ? "Secured" : network.type === "wifi" ? "Open" : "Active";

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const isValidNetworkId = (value: unknown): value is string =>
  typeof value === "string" && NETWORKS.some((network) => network.id === value);

type ShareLogAction =
  | "open"
  | "confirm"
  | "qr-generated"
  | "nfc-success"
  | "nfc-failure"
  | "error"
  | "close";

interface ShareLogEntry {
  timestamp: string;
  action: ShareLogAction;
  networkId: string;
  provider?: "nfcap" | "kdeconnect";
  details?: string;
}

const isShareLogEntryArray = (value: unknown): value is ShareLogEntry[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ShareLogEntry).timestamp === "string" &&
      typeof (entry as ShareLogEntry).action === "string" &&
      typeof (entry as ShareLogEntry).networkId === "string",
  );

const maskSecret = (secret?: string) => {
  if (!secret) return "Not required";
  return "•".repeat(Math.max(secret.length, 8));
};

const createWifiPayload = (network: Network) => {
  const credentials = network.credentials;
  const ssid = credentials?.ssid ?? network.name;
  const params = new URLSearchParams();
  params.set("ssid", ssid);
  if (credentials?.password) {
    params.set("password", credentials.password);
  }
  if (credentials?.security) {
    params.set("security", credentials.security);
  }
  if (credentials?.hidden) {
    params.set("hidden", "true");
  }
  params.set("source", "kali-desktop-ui");
  return `wifi://?${params.toString()}`;
};

type ShareStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "ready"; qr: string; payload: string }
  | { state: "error"; message: string };

declare global {
  interface Window {
    nfcap?: {
      supported?: boolean;
      push: (payload: string) => Promise<void>;
    };
    kdeconnect?: {
      isAvailable?: boolean;
      share: (payload: string, options?: unknown) => Promise<void>;
    };
  }
}

const pushToNfc = async (payload: string) => {
  if (typeof window === "undefined") {
    return { attempted: false as const };
  }

  let provider: "nfcap" | "kdeconnect" | undefined;
  try {
    if (window.nfcap?.push && window.nfcap.supported !== false) {
      provider = "nfcap";
      await window.nfcap.push(payload);
      return { attempted: true as const, provider, success: true as const };
    }

    if (window.kdeconnect?.share && window.kdeconnect.isAvailable !== false) {
      provider = "kdeconnect";
      await window.kdeconnect.share(payload, { type: "text/plain" });
      return { attempted: true as const, provider, success: true as const };
    }
  } catch (error) {
    return {
      attempted: true as const,
      provider: provider ?? (window.nfcap?.push ? ("nfcap" as const) : ("kdeconnect" as const)),
      success: false as const,
      message: error instanceof Error ? error.message : "Unknown NFC error",
    };
  }

  return { attempted: false as const };
};

interface ConnectionSummary {
  state: "offline" | "disabled" | "connected" | "blocked";
  label: string;
  description: string;
  meta?: string;
  tooltip: string;
  notice?: string;
}

export const getConnectionSummary = ({
  allowNetwork,
  online,
  wifiEnabled,
  network,
}: {
  allowNetwork: boolean;
  online: boolean;
  wifiEnabled: boolean;
  network: Network;
}): ConnectionSummary => {
  if (!online) {
    return {
      state: "offline",
      label: "Offline",
      description: wifiEnabled ? "Waiting for connection" : "Wi-Fi radio turned off",
      tooltip: "Offline",
    };
  }

  if (network.type === "wifi" && !wifiEnabled) {
    return {
      state: "disabled",
      label: "Wi-Fi disabled",
      description: "Wi-Fi radio turned off",
      tooltip: "Wi-Fi disabled",
    };
  }

  const secureLabel = hasSecureLabel(network);
  const networkMeta =
    network.type === "wifi"
      ? [secureLabel, network.details].filter(Boolean).join(" • ")
      : network.details;

  if (!allowNetwork) {
    return {
      state: "blocked",
      label: "Requests blocked",
      description: network.name,
      meta: networkMeta,
      tooltip: `Connected to ${network.name} • Requests blocked`,
      notice: "Remote requests are blocked by privacy controls.",
    };
  }

  if (network.type === "wired") {
    return {
      state: "connected",
      label: "Wired connection",
      description: network.name,
      meta: network.details,
      tooltip: `${network.name} connected`,
    };
  }

  return {
    state: "connected",
    label: "Connected",
    description: network.name,
    meta: networkMeta,
    tooltip: `Connected to ${network.name} (${secureLabel})`,
  };
};

const WifiGlyph: FC<{ strength?: SignalStrength; muted?: boolean; slash?: boolean }> = ({
  strength,
  muted = false,
  slash = false,
}) => {
  const level = strength ? SIGNAL_STRENGTH_LEVEL[strength] : 0;
  const activeOpacity = muted ? 0.55 : 0.9;
  const inactiveOpacity = muted ? 0.25 : 0.3;

  return (
    <svg className="status-symbol h-4 w-4" viewBox="0 0 16 16" aria-hidden="true" role="img">
      <path
        d="M2.2 6.3C5.1 3.7 10.9 3.7 13.8 6.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        fill="none"
        opacity={level >= 4 ? activeOpacity : inactiveOpacity}
      />
      <path
        d="M3.8 8.1C6.1 6.4 9.9 6.4 12.2 8.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        fill="none"
        opacity={level >= 3 ? activeOpacity : inactiveOpacity}
      />
      <path
        d="M5.5 9.9C7 8.8 9 8.8 10.5 9.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        fill="none"
        opacity={level >= 2 ? activeOpacity : inactiveOpacity}
      />
      <circle
        cx="8"
        cy="12.1"
        r="1.1"
        fill="currentColor"
        opacity={level >= 1 ? activeOpacity : inactiveOpacity}
      />
      {slash && (
        <line
          x1="3"
          y1="13"
          x2="13"
          y2="3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      )}
    </svg>
  );
};

const WiredGlyph: FC = () => (
  <svg className="status-symbol h-4 w-4" viewBox="0 0 16 16" aria-hidden="true" role="img">
    <rect
      x="2"
      y="3.5"
      width="12"
      height="6.2"
      rx="1.8"
      ry="1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.85"
    />
    <rect x="5.2" y="10.5" width="5.6" height="2.2" rx="0.8" fill="currentColor" opacity="0.85" />
    <rect x="7" y="12.3" width="2" height="2.5" rx="0.7" fill="currentColor" opacity="0.85" />
  </svg>
);

const OfflineGlyph: FC = () => (
  <svg className="status-symbol h-4 w-4" viewBox="0 0 16 16" aria-hidden="true" role="img">
    <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.5" opacity="0.35" fill="none" />
    <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
  </svg>
);

const StatusGlyph: FC<{ summary: ConnectionSummary; network: Network }> = ({ summary, network }) => {
  if (summary.state === "offline") return <OfflineGlyph />;
  if (summary.state === "disabled") return <WifiGlyph strength={network.strength} muted slash />;
  if (network.type === "wired") return <WiredGlyph />;
  return <WifiGlyph strength={network.strength} muted={summary.state === "blocked"} />;
};

interface NetworkIndicatorProps {
  className?: string;
  allowNetwork: boolean;
  online: boolean;
}

const NetworkIndicator: FC<NetworkIndicatorProps> = ({ className = "", allowNetwork, online }) => {

  const [wifiEnabled, setWifiEnabled] = usePersistentState<boolean>(
    "status-wifi-enabled",
    true,
    (value): value is boolean => typeof value === "boolean",
  );
  const [connectedId, setConnectedId] = usePersistentState<string>(
    "status-connected-network",
    () => NETWORKS[0].id,
    isValidNetworkId,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [shareTarget, setShareTarget] = useState<Network | null>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>({ state: "idle" });
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [shareLogs, setShareLogs] = usePersistentState<ShareLogEntry[]>(
    "status-network-share-log",
    [],
    isShareLogEntryArray,
  );

  const connectedNetwork = useMemo(
    () => NETWORKS.find((network) => network.id === connectedId) ?? NETWORKS[0],
    [connectedId],
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!wifiEnabled && connectedNetwork.type === "wifi") {
      setConnectedId("wired");
    }
  }, [wifiEnabled, connectedNetwork.type, setConnectedId]);

  const summary = useMemo(
    () => getConnectionSummary({ allowNetwork, online, wifiEnabled, network: connectedNetwork }),
    [allowNetwork, online, wifiEnabled, connectedNetwork],
  );

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleWifiToggle = () => {
    setWifiEnabled((prev) => !prev);
  };

  const handleConnect = (network: Network) => {
    if (network.type === "wifi" && !wifiEnabled) {
      setWifiEnabled(true);
    }
    setConnectedId(network.id);
  };

  const appendShareLog = useCallback(
    (entry: Omit<ShareLogEntry, "timestamp">) => {
      setShareLogs((prev) => {
        const nextEntry: ShareLogEntry = {
          ...entry,
          timestamp: new Date().toISOString(),
        };
        const trimmed = prev.slice(-49);
        return [...trimmed, nextEntry];
      });
    },
    [setShareLogs],
  );

  const closeShare = useCallback(() => {
    if (shareTarget) {
      appendShareLog({ action: "close", networkId: shareTarget.id, details: "Share modal dismissed" });
    }
    setShareTarget(null);
    setShareStatus({ state: "idle" });
    setShareConfirmed(false);
    setNfcStatus(null);
  }, [appendShareLog, shareTarget]);

  const handleShare = useCallback(
    (network: Network) => {
      setShareTarget(network);
      setShareStatus({ state: "idle" });
      setShareConfirmed(false);
      setNfcStatus(null);
      appendShareLog({ action: "open", networkId: network.id, details: "Share modal opened" });
    },
    [appendShareLog],
  );

  useEffect(() => {
    if (!shareTarget) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeShare();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeShare, shareTarget]);

  const handleConfirmShare = useCallback(async () => {
    if (!shareTarget) return;

    setShareConfirmed(true);
    setShareStatus({ state: "pending" });
    appendShareLog({ action: "confirm", networkId: shareTarget.id, details: "User confirmed sharing" });

    const payload = createWifiPayload(shareTarget);

    try {
      const qr = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
      setShareStatus({ state: "ready", qr, payload });
      appendShareLog({ action: "qr-generated", networkId: shareTarget.id, details: "QR code generated" });

      const nfcResult = await pushToNfc(payload);
      if (nfcResult.attempted) {
        if (nfcResult.success) {
          appendShareLog({
            action: "nfc-success",
            networkId: shareTarget.id,
            provider: nfcResult.provider,
            details: "NFC payload pushed",
          });
          setNfcStatus(`NFC push sent via ${nfcResult.provider}.`);
        } else {
          appendShareLog({
            action: "nfc-failure",
            networkId: shareTarget.id,
            provider: nfcResult.provider,
            details: nfcResult.message ?? "Unknown NFC failure",
          });
          setNfcStatus(nfcResult.message ?? "NFC push failed.");
        }
      } else {
        setNfcStatus("NFC push not available on this device.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate QR code";
      setShareStatus({ state: "error", message });
      appendShareLog({ action: "error", networkId: shareTarget.id, details: message });
    }
  }, [appendShareLog, shareTarget]);

  return (
    <div ref={rootRef} className={classNames("relative flex items-center", className)}>
      <button
        type="button"
        className="flex h-full w-full items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        aria-label={summary.tooltip}
        aria-haspopup="true"
        aria-expanded={open}
        title={summary.tooltip}
        onClick={handleToggle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="relative inline-flex">
          <StatusGlyph summary={summary} network={connectedNetwork} />
          {!allowNetwork && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          )}
        </span>
      </button>
      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-[300] w-48 origin-top-right rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          role="menu"
          aria-label="Network menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Network</span>
            <span className={`text-xs font-medium ${summary.state === 'connected' ? 'text-emerald-400' : summary.state === 'offline' ? 'text-red-400' : 'text-slate-400'}`}>
              {summary.label}
            </span>
          </div>

          {/* Current Connection */}
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/[0.06] p-2">
            <StatusGlyph summary={summary} network={connectedNetwork} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{connectedNetwork.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{summary.meta || summary.description}</p>
            </div>
          </div>

          {/* Wi-Fi Toggle */}
          <button
            type="button"
            onClick={handleWifiToggle}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${wifiEnabled
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
          >
            <WifiGlyph strength="excellent" muted={!wifiEnabled} />
            {wifiEnabled ? 'Wi-Fi On' : 'Wi-Fi Off'}
          </button>
        </div>
      )}
      {shareTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={closeShare}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Share ${shareTarget.name}`}
            className="w-full max-w-md rounded-lg border border-white/20 bg-ub-cool-grey p-5 text-sm text-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Share {shareTarget.name}</h2>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-red-200">
                  Privacy warning: credentials stay hidden until you confirm. All share actions are logged locally for review.
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-200 transition hover:border-white/40 hover:text-white"
                onClick={closeShare}
                aria-label="Close share dialog"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 rounded border border-white/15 bg-black/30 p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">SSID</span>
                <span className="font-medium text-white">{shareTarget.credentials?.ssid ?? shareTarget.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Security</span>
                <span className="text-white">{shareTarget.credentials?.security ?? "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Password</span>
                <span className="font-mono text-white">
                  {shareConfirmed
                    ? shareTarget.credentials?.password ?? "Not required"
                    : maskSecret(shareTarget.credentials?.password)}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {!shareConfirmed && (
                <button
                  type="button"
                  className="w-full rounded bg-ub-blue px-3 py-2 text-sm font-semibold text-white transition hover:bg-ub-blue/80"
                  onClick={handleConfirmShare}
                >
                  Reveal &amp; Generate QR
                </button>
              )}
              {shareConfirmed && shareStatus.state === "pending" && (
                <div className="rounded border border-white/10 bg-black/40 px-3 py-2 text-center text-[13px] text-gray-200">
                  Generating secure QR code…
                </div>
              )}
              {shareStatus.state === "ready" && (
                <div className="space-y-2 text-center">
                  <img
                    src={shareStatus.qr}
                    alt={`Wi-Fi share code for ${shareTarget.name}`}
                    className="mx-auto h-40 w-40 rounded bg-white p-2"
                  />
                  <p className="text-[11px] text-gray-300">Payload: {shareStatus.payload}</p>
                  {nfcStatus && <p className="text-[11px] text-gray-200">{nfcStatus}</p>}
                </div>
              )}
              {shareStatus.state === "error" && (
                <div className="rounded border border-red-500/60 bg-red-900/40 px-3 py-2 text-[13px] text-red-100">
                  {shareStatus.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkIndicator;
