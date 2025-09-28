"use client";

import type { FC, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";

type NetworkType = "wired" | "wifi";
type SignalStrength = "excellent" | "good" | "fair" | "weak";

interface Network {
  id: string;
  name: string;
  type: NetworkType;
  strength?: SignalStrength;
  secure?: boolean;
  details: string;
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
  },
  {
    id: "redteam",
    name: "Red Team Ops",
    type: "wifi",
    strength: "good",
    secure: true,
    details: "Hidden SSID • WPA3",
  },
  {
    id: "espresso",
    name: "Espresso Bar",
    type: "wifi",
    strength: "fair",
    secure: false,
    details: "Captive portal",
  },
  {
    id: "pineapple",
    name: "Pineapple Lab",
    type: "wifi",
    strength: "weak",
    secure: true,
    details: "WEP • Legacy",
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

  return (
    <div ref={rootRef} className={classNames("relative flex items-center", className)}>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
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
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[14rem] rounded-md border border-black border-opacity-30 bg-ub-cool-grey px-3 py-3 text-xs text-white shadow-lg"
          role="menu"
          aria-label="Network menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-200">Network</div>
          <div className="mb-3 rounded bg-black bg-opacity-20 p-3">
            <div className="flex items-center justify-between text-[11px] text-gray-200">
              <span className="uppercase">Status</span>
              <span className="font-semibold text-white">{summary.label}</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-300">{summary.description}</p>
            {summary.meta && <p className="mt-1 text-[11px] text-gray-400">{summary.meta}</p>}
          </div>
          {summary.notice && (
            <div className="mb-3 rounded border border-red-500/50 bg-red-900/30 p-2 text-[11px] text-red-200">
              {summary.notice}
            </div>
          )}
          <label className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
            <span className="text-white normal-case">Wi-Fi</span>
            <input
              type="checkbox"
              checked={wifiEnabled}
              onChange={handleWifiToggle}
              aria-label={wifiEnabled ? "Disable Wi-Fi" : "Enable Wi-Fi"}
            />
          </label>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-200">Available networks</div>
          <ul className="space-y-1" role="group" aria-label="Available networks">
            {NETWORKS.map((network) => {
              const connected = connectedId === network.id;
              const disabled = network.type === "wifi" && !wifiEnabled;
              return (
                <li key={network.id}>
                  <button
                    type="button"
                    className={classNames(
                      "w-full rounded px-2 py-2 text-left transition",
                      connected ? "bg-ub-blue bg-opacity-60" : "hover:bg-white hover:bg-opacity-10",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                    onClick={() => !disabled && handleConnect(network)}
                    disabled={disabled}
                    aria-pressed={connected}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{network.name}</span>
                      {network.type === "wifi" && network.strength && (
                        <span className="text-[11px] text-gray-200">{SIGNAL_LABEL[network.strength]}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-300">
                      {connected
                        ? network.details
                        : network.type === "wifi"
                        ? `${hasSecureLabel(network)}${
                            network.strength ? ` • ${SIGNAL_LABEL[network.strength]}` : ""
                          }`
                        : network.details}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NetworkIndicator;
