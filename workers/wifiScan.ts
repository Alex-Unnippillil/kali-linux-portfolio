import type {
  WifiNetwork,
  WifiScanMode,
  WifiScanRequest,
  WifiScanResponseMessage,
} from '../types/wifi';

const baseNetworks: WifiNetwork[] = [
  {
    ssid: 'Campus-5G',
    bssid: '00:11:22:33:44:55',
    channel: 36,
    band: '5 GHz',
    security: 'WPA3',
    signal: -48,
    noise: -92,
    utilization: 0.58,
    lastSeen: new Date().toISOString(),
    widthMHz: 80,
  },
  {
    ssid: 'Research-Lab',
    bssid: '00:11:22:33:44:66',
    channel: 149,
    band: '5 GHz',
    security: 'WPA2/WPA3',
    signal: -55,
    noise: -95,
    utilization: 0.46,
    lastSeen: new Date().toISOString(),
    widthMHz: 80,
  },
  {
    ssid: 'IoT-Sensors',
    bssid: '00:11:22:33:44:77',
    channel: 1,
    band: '2.4 GHz',
    security: 'WPA2',
    signal: -63,
    noise: -93,
    utilization: 0.39,
    lastSeen: new Date().toISOString(),
    widthMHz: 20,
  },
  {
    ssid: 'Guest-Wifi',
    bssid: '00:11:22:33:44:88',
    channel: 6,
    band: '2.4 GHz',
    security: 'Open',
    signal: -68,
    noise: -90,
    utilization: 0.71,
    lastSeen: new Date().toISOString(),
    widthMHz: 20,
  },
  {
    ssid: 'Engineering',
    bssid: '00:11:22:33:44:99',
    channel: 11,
    band: '2.4 GHz',
    security: 'WPA2',
    signal: -52,
    noise: -94,
    utilization: 0.33,
    lastSeen: new Date().toISOString(),
    widthMHz: 40,
  },
];

const jitter = (value: number, spread: number) => value + (Math.random() - 0.5) * spread;

const cloneWithJitter = (network: WifiNetwork): WifiNetwork => ({
  ...network,
  signal: Math.round(jitter(network.signal, 6)),
  noise: Math.round(jitter(network.noise, 4)),
  utilization: Math.max(0, Math.min(1, Number((network.utilization + (Math.random() - 0.5) * 0.1).toFixed(2)))),
  lastSeen: new Date(Date.now() - Math.floor(Math.random() * 60000)).toISOString(),
});

const detectMode = (offline?: boolean, demoMode?: boolean): WifiScanMode => {
  if (offline) return 'offline';
  if (demoMode) return 'demo';
  return 'simulated';
};

self.onmessage = (event: MessageEvent<WifiScanRequest>) => {
  const { data } = event;
  if (!data || data.type !== 'scan') return;

  const offlineFlag = data.offline ?? (typeof navigator !== 'undefined' && navigator.onLine === false);
  const mode = detectMode(offlineFlag, data.demoMode);
  const delay = mode === 'simulated' ? 600 + Math.random() * 900 : 250 + Math.random() * 200; // always < 3s

  const result: WifiScanResponseMessage = {
    type: 'result',
    result: {
      mode,
      generatedAt: new Date().toISOString(),
      networks: baseNetworks.map(cloneWithJitter),
    },
  };

  setTimeout(() => {
    self.postMessage(result);
  }, delay);
};

export {};
