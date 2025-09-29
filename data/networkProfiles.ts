export type NetworkType = "wired" | "wifi";
export type SignalStrength = "excellent" | "good" | "fair" | "weak";

export interface NetworkProfile {
  id: string;
  name: string;
  type: NetworkType;
  strength?: SignalStrength;
  secure?: boolean;
  details: string;
}

export const NETWORKS: NetworkProfile[] = [
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
  {
    id: "pixelhotspot",
    name: "Pixel 8 Hotspot",
    type: "wifi",
    strength: "good",
    secure: true,
    details: "Mobile hotspot • WPA2",
  },
];

export const SIGNAL_LABEL: Record<SignalStrength, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  weak: "Weak",
};

export const hasSecureLabel = (network: NetworkProfile) =>
  network.type === "wifi" && network.secure ? "Secured" : network.type === "wifi" ? "Open" : "Active";

export const isValidNetworkId = (value: unknown): value is string =>
  typeof value === "string" && NETWORKS.some((network) => network.id === value);

export const getNetworkById = (id: string): NetworkProfile | undefined =>
  NETWORKS.find((network) => network.id === id);
