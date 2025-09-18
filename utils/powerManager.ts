export interface BatterySnapshot {
  cycleCount: number;
  healthPercent: number;
  levelPercent: number;
  designCapacityWh: number;
  fullChargeCapacityWh: number;
}

export interface ResourceSamplingConfig {
  sampleInterval: number;
  drawThrottle: number;
}

const BATTERY_BASELINE: BatterySnapshot = {
  cycleCount: 327,
  designCapacityWh: 58.2,
  fullChargeCapacityWh: 47.6,
  healthPercent: 0, // computed lazily
  levelPercent: 64,
};

const BASELINE_DRAIN_PER_HOUR = 14.2;
const SAVER_DRAIN_PER_HOUR = 9.6;

const DEFAULT_SAMPLING: ResourceSamplingConfig = {
  sampleInterval: 1000,
  drawThrottle: 1000,
};

const SAVER_SAMPLING: ResourceSamplingConfig = {
  sampleInterval: 2000,
  drawThrottle: 2000,
};

let powerSaverEnabled = false;
const listeners = new Set<(enabled: boolean) => void>();

const computeHealthPercent = (snapshot: BatterySnapshot): number =>
  Math.round((snapshot.fullChargeCapacityWh / snapshot.designCapacityWh) * 100);

export const getBatterySnapshot = (): BatterySnapshot => ({
  ...BATTERY_BASELINE,
  healthPercent: computeHealthPercent(BATTERY_BASELINE),
});

export const estimateLifeGainMinutes = (level = getBatterySnapshot().levelPercent): number => {
  const baselineHours = level / BASELINE_DRAIN_PER_HOUR;
  const saverHours = level / SAVER_DRAIN_PER_HOUR;
  return Math.max(0, Math.round((saverHours - baselineHours) * 60));
};

export const setPowerSaverEnabled = (enabled: boolean): void => {
  if (powerSaverEnabled === enabled) return;
  powerSaverEnabled = enabled;
  listeners.forEach((listener) => {
    try {
      listener(powerSaverEnabled);
    } catch {
      // Ignore subscriber errors
    }
  });
};

export const isPowerSaverEnabled = (): boolean => powerSaverEnabled;

export const onPowerSaverChange = (
  listener: (enabled: boolean) => void,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getResourceSamplingConfig = (
  enabled: boolean,
): ResourceSamplingConfig => ({
  ...(enabled ? SAVER_SAMPLING : DEFAULT_SAMPLING),
});
