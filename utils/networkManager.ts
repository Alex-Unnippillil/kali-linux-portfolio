export enum NMDeviceMetered {
  UNKNOWN = 0,
  YES = 1,
  NO = 2,
  GUESS_YES = 3,
  GUESS_NO = 4,
}

export interface MeteredConnectionReport {
  connectionId: string;
  state: NMDeviceMetered;
  summary: string;
  reason: string;
}

const SIMULATED_REPORTS: Record<string, MeteredConnectionReport> = {
  wired: {
    connectionId: "wired",
    state: NMDeviceMetered.NO,
    summary: "Unmetered Ethernet",
    reason: "Device is wired and marked NM_DEVICE_METERED_NO.",
  },
  homelab: {
    connectionId: "homelab",
    state: NMDeviceMetered.GUESS_NO,
    summary: "Wi-Fi treated as unmetered",
    reason: "NetworkManager guessed NM_DEVICE_METERED_GUESS_NO based on connection profile history.",
  },
  redteam: {
    connectionId: "redteam",
    state: NMDeviceMetered.UNKNOWN,
    summary: "Unknown policy",
    reason: "No data cap metadata provided; NetworkManager reports NM_DEVICE_METERED_UNKNOWN.",
  },
  espresso: {
    connectionId: "espresso",
    state: NMDeviceMetered.YES,
    summary: "Captive portal / pay-per-use",
    reason: "Marked NM_DEVICE_METERED_YES because the portal charges per megabyte.",
  },
  pineapple: {
    connectionId: "pineapple",
    state: NMDeviceMetered.GUESS_YES,
    summary: "Legacy WEP hotspot",
    reason: "NetworkManager applies NM_DEVICE_METERED_GUESS_YES due to tethering heuristics.",
  },
  pixelhotspot: {
    connectionId: "pixelhotspot",
    state: NMDeviceMetered.YES,
    summary: "Android mobile hotspot",
    reason: "NM marks Android USB/Wi-Fi tethering as NM_DEVICE_METERED_YES to protect data plans.",
  },
};

const UNKNOWN_REPORT: MeteredConnectionReport = {
  connectionId: "unknown",
  state: NMDeviceMetered.UNKNOWN,
  summary: "Metered state unavailable",
  reason: "NetworkManager did not expose a metered flag for this connection.",
};

export const describeNMState = (state: NMDeviceMetered): string => {
  switch (state) {
    case NMDeviceMetered.YES:
      return "NM_DEVICE_METERED_YES";
    case NMDeviceMetered.NO:
      return "NM_DEVICE_METERED_NO";
    case NMDeviceMetered.GUESS_YES:
      return "NM_DEVICE_METERED_GUESS_YES";
    case NMDeviceMetered.GUESS_NO:
      return "NM_DEVICE_METERED_GUESS_NO";
    default:
      return "NM_DEVICE_METERED_UNKNOWN";
  }
};

export const isMetered = (state: NMDeviceMetered): boolean =>
  state === NMDeviceMetered.YES || state === NMDeviceMetered.GUESS_YES;

export const fetchMeteredStatus = async (
  connectionId: string,
): Promise<MeteredConnectionReport> =>
  new Promise((resolve) => {
    const report = SIMULATED_REPORTS[connectionId] ?? { ...UNKNOWN_REPORT, connectionId };
    const timer = typeof window === "undefined" ? setTimeout : window.setTimeout.bind(window);
    timer(() => resolve(report), 150);
  });
