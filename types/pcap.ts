export interface ParsedPacket {
  timestamp: string;
  len: number;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  sport?: number;
  dport?: number;
  data: Uint8Array;
  layers: Record<string, unknown>;
}

export interface WifiNetworkSummary {
  ssid: string;
  bssid: string;
  channel?: number;
  frames: number;
}

export interface WifiDiscovery {
  ssid: string;
  bssid: string;
  discoveredAt: number;
}

export interface WifiAnalysisResult {
  networks: WifiNetworkSummary[];
  channelCounts: Record<number, number>;
  timeCounts: Record<number, number>;
  discoveries: WifiDiscovery[];
}

export interface PcapWorkerApi {
  parsePcap(buffer: ArrayBuffer): Promise<ParsedPacket[]>;
  analyzeWifiCapture(buffer: ArrayBuffer): Promise<WifiAnalysisResult>;
}
