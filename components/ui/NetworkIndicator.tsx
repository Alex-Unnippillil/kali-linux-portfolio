"use client";

import Image from "next/image";
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

const hasSecureLabel = (network: Network) =>
  network.type === "wifi" && network.secure ? "Secured" : network.type === "wifi" ? "Open" : "Active";

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const iconForState = (online: boolean, wifiEnabled: boolean) =>
  online && wifiEnabled
    ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
    : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg";

const isValidNetworkId = (value: unknown): value is string =>
  typeof value === "string" && NETWORKS.some((network) => network.id === value);

interface NetworkIndicatorProps {
  className?: string;
  allowNetwork: boolean;
  online: boolean;
}

const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  className = "",
  allowNetwork,
  online,
}) => {
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

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
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

  const tooltip = online
    ? wifiEnabled
      ? `Connected to ${connectedNetwork.name}`
      : "Wi-Fi disabled"
    : "Offline";

  return (
    <div ref={rootRef} className={classNames("relative flex items-center", className)}>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
        aria-label={tooltip}
        aria-haspopup="true"
        aria-expanded={open}
        title={tooltip}
        onClick={handleToggle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="relative inline-flex">
          <Image
            width={16}
            height={16}
            src={iconForState(online, wifiEnabled && connectedNetwork.type !== "wired")}
            alt={online ? "network online" : "network offline"}
            className="status-symbol h-4 w-4"
            draggable={false}
            sizes="16px"
          />
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
              <span className="font-semibold text-white">
                {online ? (wifiEnabled ? "Connected" : "Disabled") : "Offline"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-300">
              {wifiEnabled && online
                ? `${connectedNetwork.name} • ${hasSecureLabel(connectedNetwork)}`
                : wifiEnabled
                ? "Waiting for connection"
                : "Wi-Fi radio turned off"}
            </p>
          </div>
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
                        ? `${hasSecureLabel(network)}${network.strength ? ` • ${SIGNAL_LABEL[network.strength]}` : ""}`
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
