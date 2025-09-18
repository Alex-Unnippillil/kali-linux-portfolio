export type PowerPlan = 'performance' | 'balanced' | 'battery-saver';
export type CpuGovernor = 'performance' | 'balanced' | 'powersave';
export type DisplaySleep = number | 'never';

export interface PowerDevice {
  id: string;
  label: string;
  type: 'laptop' | 'tablet' | 'phone' | 'accessory';
}

export interface PowerApp {
  id: string;
  label: string;
  category: 'security' | 'productivity' | 'system';
}

export interface PowerSample {
  timestamp: number;
  deviceId: string;
  appId: string;
  batteryLevel: number;
  temperatureC: number;
  dischargeRateMw: number;
}

export interface BatterySnapshot {
  timestamp: number;
  level: number;
  charging: boolean;
  temperatureC: number;
}

export interface ThermalSummary {
  average: number;
  max: number;
  hottestDevice?: string;
}

export interface CalibrationResult {
  adjustedHistory: PowerSample[];
  offset: number;
  projectedRuntimeMinutes: number;
}

const DEVICES: PowerDevice[] = [
  { id: 'deck', label: 'Offensive Laptop', type: 'laptop' },
  { id: 'rig', label: 'Lab Workstation', type: 'laptop' },
  { id: 'field-tablet', label: 'Field Tablet', type: 'tablet' },
];

const APPS: PowerApp[] = [
  { id: 'metasploit', label: 'Metasploit Lab', category: 'security' },
  { id: 'wireshark', label: 'Wireshark Capture', category: 'security' },
  { id: 'reports', label: 'Report Writer', category: 'productivity' },
  { id: 'desktop', label: 'Desktop Idle', category: 'system' },
];

const SAMPLE_INTERVAL_MINUTES = 30;
const STREAM_INTERVAL_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

let lastSamples: PowerSample[] = [];
const listeners = new Set<(sample: PowerSample) => void>();
let streamTimer: ReturnType<typeof setInterval> | null = null;
let currentPlan: PowerPlan = 'balanced';
let currentGovernor: CpuGovernor = 'balanced';
let currentDisplaySleep: DisplaySleep = 10;

const keyForSample = (sample: PowerSample): string => `${sample.deviceId}:${sample.appId}`;
const latestSampleByKey = new Map<string, PowerSample>();

const randomInRange = (min: number, max: number): number => Math.random() * (max - min) + min;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const planMultiplier = (plan: PowerPlan): number => {
  switch (plan) {
    case 'performance':
      return 1.2;
    case 'battery-saver':
      return 0.75;
    default:
      return 1;
  }
};

const governorMultiplier = (governor: CpuGovernor): number => {
  switch (governor) {
    case 'performance':
      return 1.15;
    case 'powersave':
      return 0.85;
    default:
      return 1;
  }
};

const displaySleepMultiplier = (sleep: DisplaySleep): number => {
  if (sleep === 'never') return 1.2;
  if (sleep === 0) return 1;
  if (sleep <= 5) return 0.95;
  if (sleep <= 15) return 0.9;
  return 0.85;
};

const initializeHistory = (now: number = Date.now()): PowerSample[] => {
  const history: PowerSample[] = [];
  const totalPoints = Math.ceil((24 * 60) / SAMPLE_INTERVAL_MINUTES);
  for (let point = totalPoints; point >= 0; point -= 1) {
    const timestamp = now - point * SAMPLE_INTERVAL_MINUTES * 60 * 1000;
    DEVICES.forEach((device, deviceIndex) => {
      APPS.forEach((app, appIndex) => {
        const baseDrain = 1.1 + deviceIndex * 0.4 + appIndex * 0.25;
        const drift = randomInRange(-2, 2);
        const baseLevel = clamp(100 - point * baseDrain + drift, 8, 100);
        const temperature = clamp(32 + baseDrain * 4 + randomInRange(-1.5, 2.5), 28, 80);
        const sample: PowerSample = {
          timestamp,
          deviceId: device.id,
          appId: app.id,
          batteryLevel: baseLevel,
          temperatureC: temperature,
          dischargeRateMw: 700 + baseDrain * 50 + randomInRange(-40, 40),
        };
        history.push(sample);
        latestSampleByKey.set(keyForSample(sample), sample);
      });
    });
  }
  lastSamples = history.slice(-DEVICES.length * APPS.length * totalPoints);
  return history;
};

const ensureHistory = (): PowerSample[] => {
  if (!lastSamples.length) {
    initializeHistory();
  }
  return lastSamples;
};

const ensureStream = (): void => {
  if (streamTimer || typeof window === 'undefined') {
    return;
  }
  streamTimer = setInterval(() => {
    const now = Date.now();
    const planFactor = planMultiplier(currentPlan);
    const governorFactor = governorMultiplier(currentGovernor);
    const sleepFactor = displaySleepMultiplier(currentDisplaySleep);
    const combined = planFactor * governorFactor * sleepFactor;
    DEVICES.forEach((device) => {
      APPS.forEach((app) => {
        const key = `${device.id}:${app.id}`;
        const previous = latestSampleByKey.get(key);
        const drain = 0.9 + (previous ? previous.dischargeRateMw / 1000 : 1);
        const variability = randomInRange(-0.4, 0.4);
        const batteryDelta = (drain + variability) * combined * 0.6;
        const baseTemperature = previous ? previous.temperatureC : 38;
        const newSample: PowerSample = {
          timestamp: now,
          deviceId: device.id,
          appId: app.id,
          batteryLevel: previous
            ? clamp(previous.batteryLevel - batteryDelta, 5, 100)
            : clamp(100 - randomInRange(0, 10), 5, 100),
          temperatureC: clamp(baseTemperature + combined * 0.35 + randomInRange(-0.8, 0.8), 28, 85),
          dischargeRateMw: clamp((previous?.dischargeRateMw ?? 750) * (0.9 + randomInRange(-0.05, 0.05)), 450, 1400),
        };
        lastSamples.push(newSample);
        latestSampleByKey.set(key, newSample);
        listeners.forEach((listener) => listener(newSample));
      });
    });
    const cutoff = now - 24 * HOUR_MS;
    lastSamples = lastSamples.filter((sample) => sample.timestamp >= cutoff);
  }, STREAM_INTERVAL_MS);
};

const stopStreamIfIdle = (): void => {
  if (!listeners.size && streamTimer) {
    clearInterval(streamTimer);
    streamTimer = null;
  }
};

export const listDevices = (): PowerDevice[] => DEVICES.slice();

export const listApps = (): PowerApp[] => APPS.slice();

export const fetchPowerHistory = async (
  options: {
    deviceIds?: string[];
    appIds?: string[];
    hours?: number;
    now?: number;
  } = {},
): Promise<PowerSample[]> => {
  const history = ensureHistory();
  const { deviceIds, appIds, hours = 24, now = Date.now() } = options;
  const cutoff = now - hours * HOUR_MS;
  return history
    .filter((sample) => {
      if (sample.timestamp < cutoff) return false;
      if (deviceIds?.length && !deviceIds.includes(sample.deviceId)) return false;
      if (appIds?.length && !appIds.includes(sample.appId)) return false;
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
};

export const subscribeToPowerStream = (
  listener: (sample: PowerSample) => void,
): (() => void) => {
  ensureHistory();
  if (typeof window !== 'undefined') {
    ensureStream();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    stopStreamIfIdle();
  };
};

export const getBatterySnapshot = async (): Promise<BatterySnapshot> => {
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return {
        timestamp: Date.now(),
        level: Math.round((battery.level ?? 1) * 100),
        charging: Boolean(battery.charging),
        temperatureC: clamp(36 + randomInRange(-2, 2), 28, 45),
      };
    }
  } catch (error) {
    // Ignore real battery API errors and fall back to simulation
    console.warn('Battery API unavailable, using simulated data', error);
  }
  const history = ensureHistory();
  const latest = history[history.length - 1];
  return {
    timestamp: Date.now(),
    level: Math.round(latest?.batteryLevel ?? 100),
    charging: false,
    temperatureC: clamp(latest?.temperatureC ?? 36, 28, 45),
  };
};

export const fetchThermalSummary = async (
  samples?: PowerSample[],
): Promise<ThermalSummary> => {
  const source = samples?.length ? samples : ensureHistory();
  if (!source.length) {
    return { average: 0, max: 0 };
  }
  const total = source.reduce((acc, sample) => acc + sample.temperatureC, 0);
  const hottest = source.reduce((max, sample) => {
    if (!max || sample.temperatureC > max.temperatureC) {
      return sample;
    }
    return max;
  });
  return {
    average: total / source.length,
    max: hottest.temperatureC,
    hottestDevice: hottest.deviceId,
  };
};

export const applyPowerPlan = async (plan: PowerPlan): Promise<void> => {
  currentPlan = plan;
};

export const applyCpuGovernor = async (governor: CpuGovernor): Promise<void> => {
  currentGovernor = governor;
};

export const applyDisplaySleep = async (value: DisplaySleep): Promise<void> => {
  currentDisplaySleep = value;
};

export const calibrateBattery = (
  samples: PowerSample[],
  observedLevel: number,
): CalibrationResult => {
  if (!samples.length) {
    return {
      adjustedHistory: samples,
      offset: 0,
      projectedRuntimeMinutes: 0,
    };
  }
  const latest = samples[samples.length - 1];
  const offset = clamp(observedLevel, 0, 100) - latest.batteryLevel;
  const updatedHistory = samples.map((sample) => {
    const adjusted = {
      ...sample,
      batteryLevel: clamp(sample.batteryLevel + offset, 0, 100),
    };
    const key = keyForSample(adjusted);
    latestSampleByKey.set(key, adjusted);
    return adjusted;
  });
  // Persist calibration into the main history set
  const targets = new Set(updatedHistory.map((sample) => `${sample.timestamp}:${keyForSample(sample)}`));
  lastSamples = lastSamples.map((sample) => {
    const key = `${sample.timestamp}:${keyForSample(sample)}`;
    if (targets.has(key)) {
      const adjusted = updatedHistory.find(
        (candidate) =>
          candidate.timestamp === sample.timestamp &&
          candidate.deviceId === sample.deviceId &&
          candidate.appId === sample.appId,
      );
      return adjusted ?? sample;
    }
    return sample;
  });

  const sorted = [...updatedHistory].sort((a, b) => a.timestamp - b.timestamp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const minutes = (last.timestamp - first.timestamp) / (60 * 1000);
  const delta = first.batteryLevel - last.batteryLevel;
  const ratePerMinute = minutes > 0 ? delta / minutes : 0;
  const runtime = ratePerMinute > 0 ? last.batteryLevel / ratePerMinute : 0;

  return {
    adjustedHistory: updatedHistory,
    offset,
    projectedRuntimeMinutes: runtime,
  };
};

// Initialize on module load so SSR builds have deterministic data
initializeHistory();
