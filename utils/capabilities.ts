export type PerformanceMode = 'auto' | 'battery-saver' | 'high-performance';

type Listener = (caps: DeviceCapabilities) => void;

interface BatteryCapabilities {
  supported: boolean;
  charging?: boolean;
  level?: number;
  saver: boolean;
  timestamp: number;
}

interface HardwareCapabilities {
  cores?: number;
  memory?: number;
  cpuClass: 'low' | 'mid' | 'high';
}

interface NetworkCapabilities {
  saveData: boolean;
  effectiveType?: string;
}

export interface PlatformCapabilities {
  os: 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'chromeos' | 'unknown';
  isMobile: boolean;
  hints: string[];
}

export interface DeviceCapabilities {
  battery: BatteryCapabilities;
  hardware: HardwareCapabilities;
  network: NetworkCapabilities;
  platform: PlatformCapabilities;
  performance: {
    mode: PerformanceMode;
    shouldThrottle: boolean;
    intervalMultiplier: number;
    maxConcurrency: number;
    reasons: string[];
    lastInputLatency: number | null;
  };
}

const DEFAULT_CAPABILITIES: DeviceCapabilities = {
  battery: {
    supported: false,
    saver: false,
    timestamp: 0,
  },
  hardware: {
    cpuClass: 'mid',
  },
  network: {
    saveData: false,
  },
  platform: {
    os: 'unknown',
    isMobile: false,
    hints: [],
  },
  performance: {
    mode: 'auto',
    shouldThrottle: false,
    intervalMultiplier: 1,
    maxConcurrency: Number.POSITIVE_INFINITY,
    reasons: [],
    lastInputLatency: null,
  },
};

let cachedCapabilities: DeviceCapabilities = { ...DEFAULT_CAPABILITIES };
let baseCapabilities: DeviceCapabilities = { ...DEFAULT_CAPABILITIES };
let lastInputLatency: number | null = null;
const listeners = new Set<Listener>();
let loadingPromise: Promise<DeviceCapabilities> | null = null;

const getWindow = (): Window | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = (globalThis as typeof globalThis & { window?: Window }).window;
  return candidate;
};

const parsePerformanceMode = (value: string | null): PerformanceMode => {
  if (value === 'battery-saver' || value === 'high-performance') return value;
  return 'auto';
};

const getStoredPerformanceMode = (): PerformanceMode => {
  const win = getWindow();
  if (!win) return 'auto';
  try {
    return parsePerformanceMode(win.localStorage.getItem('performance-mode'));
  } catch {
    return 'auto';
  }
};

const classifyCpu = (cores?: number, memory?: number): HardwareCapabilities['cpuClass'] => {
  if ((cores && cores <= 2) || (memory && memory <= 2)) return 'low';
  if ((cores && cores <= 4) || (memory && memory <= 4)) return 'mid';
  return 'high';
};

const detectHardware = (): HardwareCapabilities => {
  if (typeof navigator === 'undefined') return { ...DEFAULT_CAPABILITIES.hardware };
  const cores = navigator.hardwareConcurrency;
  const memory = typeof (navigator as any).deviceMemory === 'number'
    ? (navigator as any).deviceMemory
    : undefined;
  return {
    cores,
    memory,
    cpuClass: classifyCpu(cores, memory),
  };
};

const detectPlatform = (): PlatformCapabilities => {
  if (typeof navigator === 'undefined') return { ...DEFAULT_CAPABILITIES.platform };
  const uaData = (navigator as any).userAgentData;
  const ua = navigator.userAgent || '';
  const platform = (uaData?.platform || navigator.platform || '').toLowerCase();
  const isMobile = uaData?.mobile ?? /android|iphone|ipad|ipod|mobile|mobi/i.test(ua);
  let os: PlatformCapabilities['os'] = 'unknown';
  if (platform.includes('win')) os = 'windows';
  else if (platform.includes('mac')) os = 'mac';
  else if (platform.includes('linux')) os = 'linux';
  else if (platform.includes('android')) os = 'android';
  else if (platform.includes('ios') || platform.includes('iphone') || platform.includes('ipad')) os = 'ios';
  else if (platform.includes('cros') || platform.includes('chrome os')) os = 'chromeos';
  else if (/android/.test(ua)) os = 'android';
  else if (/iphone|ipad|ipod/.test(ua)) os = 'ios';
  else if (/windows/.test(ua)) os = 'windows';
  else if (/mac os/.test(ua)) os = 'mac';

  const hints: string[] = [];
  if (isMobile) hints.push('mobile');
  if ('maxTouchPoints' in navigator && (navigator as any).maxTouchPoints > 1) hints.push('touch');
  if (typeof (navigator as any).standalone === 'boolean' && (navigator as any).standalone) hints.push('standalone');
  if (ua.toLowerCase().includes('electron')) hints.push('electron');

  return {
    os,
    isMobile,
    hints,
  };
};

const detectNetwork = (): NetworkCapabilities => {
  if (typeof navigator === 'undefined') return { ...DEFAULT_CAPABILITIES.network };
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  return {
    saveData: Boolean(connection?.saveData),
    effectiveType: connection?.effectiveType,
  };
};

const detectBattery = async (): Promise<BatteryCapabilities> => {
  const status: BatteryCapabilities = {
    supported: false,
    saver: false,
    timestamp: Date.now(),
  };
  if (typeof navigator === 'undefined') return status;
  const getBattery = (navigator as any).getBattery;
  if (typeof getBattery !== 'function') return status;
  try {
    const battery = await getBattery.call(navigator);
    status.supported = true;
    status.charging = battery.charging;
    status.level = typeof battery.level === 'number' ? battery.level : undefined;
    status.saver = !battery.charging && typeof battery.level === 'number' && battery.level <= 0.2;
  } catch {
    // Ignore battery errors and fall back to defaults.
  }
  return status;
};

const finaliseCapabilities = (base: DeviceCapabilities): DeviceCapabilities => {
  const batterySaver = base.battery.saver || base.network.saveData;
  const lowHardware = base.hardware.cpuClass === 'low';
  const degradedInput = lastInputLatency !== null && lastInputLatency > 200;
  const reasons: string[] = [];
  if (batterySaver) reasons.push('battery-saver');
  if (lowHardware) reasons.push('low-hardware');
  if (degradedInput) reasons.push('inp-degraded');

  const mode = base.performance.mode;
  let shouldThrottle = mode === 'battery-saver';
  if (mode === 'auto') {
    shouldThrottle = batterySaver || lowHardware || degradedInput;
  }

  let intervalMultiplier = shouldThrottle ? (batterySaver ? 2 : 1.5) : 1;
  if (degradedInput) {
    const penalty = Math.min((lastInputLatency! - 200) / 400, 0.5);
    intervalMultiplier = Math.max(intervalMultiplier, 1.5 + penalty);
  }

  const cores = base.hardware.cores ?? 2;
  const baselineConcurrency = Math.max(1, Math.min(4, cores));
  let maxConcurrency = shouldThrottle ? Math.max(1, Math.min(2, Math.floor(cores / 2) || 1)) : baselineConcurrency;

  if (mode === 'high-performance') {
    shouldThrottle = false;
    intervalMultiplier = 1;
    maxConcurrency = Math.max(2, cores);
  }

  return {
    ...base,
    performance: {
      mode,
      shouldThrottle,
      intervalMultiplier,
      maxConcurrency,
      reasons,
      lastInputLatency,
    },
  };
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(cachedCapabilities);
    } catch {
      // Ignore listener errors to avoid breaking loop.
    }
  });
};

const detectCapabilitiesInternal = async (): Promise<DeviceCapabilities> => {
  const performanceMode = getStoredPerformanceMode();
  const hardware = detectHardware();
  const platform = detectPlatform();
  const network = detectNetwork();
  const battery = await detectBattery();

  baseCapabilities = {
    battery,
    hardware,
    network,
    platform,
    performance: {
      ...DEFAULT_CAPABILITIES.performance,
      mode: performanceMode,
    },
  };

  cachedCapabilities = finaliseCapabilities(baseCapabilities);
  notifyListeners();
  return cachedCapabilities;
};

export const loadCapabilities = async (): Promise<DeviceCapabilities> => {
  if (!loadingPromise) {
    loadingPromise = detectCapabilitiesInternal().finally(() => {
      loadingPromise = null;
    });
  }
  return loadingPromise;
};

export const getCachedCapabilities = (): DeviceCapabilities => cachedCapabilities;

export const onCapabilitiesChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const recordInputLatencyMetric = (value: number): void => {
  lastInputLatency = value;
  cachedCapabilities = finaliseCapabilities(baseCapabilities);
  notifyListeners();
};

const handlePerformanceModeChange = (mode: PerformanceMode) => {
  baseCapabilities = {
    ...baseCapabilities,
    performance: {
      ...baseCapabilities.performance,
      mode,
    },
  };
  cachedCapabilities = finaliseCapabilities(baseCapabilities);
  notifyListeners();
};

const win = getWindow();
if (win) {
  void loadCapabilities();
  win.addEventListener('performance-mode-change', (event: Event) => {
    const detail = (event as CustomEvent<{ mode?: PerformanceMode }>).detail;
    if (detail?.mode) handlePerformanceModeChange(detail.mode);
  });
  win.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === 'performance-mode') {
      handlePerformanceModeChange(parsePerformanceMode(event.newValue ?? null));
    }
  });
}

export default getCachedCapabilities;
