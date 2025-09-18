export type WifiSecurity =
  | 'WPA3'
  | 'WPA2/WPA3'
  | 'WPA2'
  | 'WPA'
  | 'WEP'
  | 'Open';

export type WifiBand = '2.4 GHz' | '5 GHz' | '6 GHz';

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  channel: number;
  band: WifiBand;
  security: WifiSecurity;
  signal: number; // in dBm (negative values typical)
  noise: number; // in dBm (negative values)
  utilization: number; // range 0..1 representing airtime utilisation
  lastSeen: string; // ISO timestamp
  widthMHz: number;
}

export type WifiScanMode = 'simulated' | 'demo' | 'offline';

export interface WifiScanRequest {
  type: 'scan';
  offline?: boolean;
  demoMode?: boolean;
}

export interface WifiScanResult {
  mode: WifiScanMode;
  generatedAt: string;
  networks: WifiNetwork[];
}

export interface WifiScanResponseMessage {
  type: 'result';
  result: WifiScanResult;
}

export type WifiScanWorkerMessage = WifiScanResponseMessage;
