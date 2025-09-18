export interface ConnectionResult {
  ip: string;
  latencyMs: number;
}

export interface LeakTestResult {
  ip: string;
  targetIp: string;
  leaking: boolean;
  dnsLeaking: boolean;
  webRtcLeaking: boolean;
  timestamp: string;
}

const DEFAULT_EXIT_IP = '198.51.100.42';
const VPN_EXIT_POOL = [
  '203.0.113.8',
  '198.51.100.77',
  '192.0.2.24',
  '198.51.100.163',
  '203.0.113.99',
];

let poolIndex = 0;
let currentIp = DEFAULT_EXIT_IP;
let connected = false;
let killSwitchEnabled = false;

const cyclePool = (): string => {
  const ip = VPN_EXIT_POOL[poolIndex % VPN_EXIT_POOL.length];
  poolIndex += 1;
  return ip;
};

export const getExternalIp = (): string => currentIp;

export const isKillSwitchEnabled = (): boolean => killSwitchEnabled;

export const isConnected = (): boolean => connected;

export const connect = (): ConnectionResult => {
  connected = true;
  const ip = cyclePool();
  currentIp = ip;
  const latencyMs = 35 + ((poolIndex * 7) % 40);
  return { ip, latencyMs };
};

export const disconnect = (): string => {
  connected = false;
  if (killSwitchEnabled) {
    currentIp = '0.0.0.0';
  } else {
    currentIp = DEFAULT_EXIT_IP;
  }
  return currentIp;
};

export const setKillSwitchEnabled = (value: boolean): string => {
  killSwitchEnabled = value;
  if (!connected) {
    currentIp = killSwitchEnabled ? '0.0.0.0' : DEFAULT_EXIT_IP;
  }
  return currentIp;
};

export const runLeakTest = (expectedIp: string | null): LeakTestResult => {
  const targetIp = expectedIp ?? (connected ? currentIp : DEFAULT_EXIT_IP);
  const leaking = currentIp !== targetIp && currentIp !== '0.0.0.0';
  const timestamp = new Date().toISOString();
  return {
    ip: currentIp,
    targetIp,
    leaking,
    dnsLeaking: leaking,
    webRtcLeaking: leaking && !killSwitchEnabled,
    timestamp,
  };
};

export const resetNetworkState = (): void => {
  poolIndex = 0;
  currentIp = DEFAULT_EXIT_IP;
  connected = false;
  killSwitchEnabled = false;
};

const networkState = {
  connect,
  disconnect,
  getExternalIp,
  isConnected,
  isKillSwitchEnabled,
  runLeakTest,
  setKillSwitchEnabled,
  resetNetworkState,
};

export default networkState;
