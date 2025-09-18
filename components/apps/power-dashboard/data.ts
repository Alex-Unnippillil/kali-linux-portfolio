import type { PowerSample } from '../../../utils/powerManager';

export const HOURS_IN_DAY = 24;
const HOUR_MS = 60 * 60 * 1000;

export interface HourlyGroup {
  /** Timestamp at the start of the hour bucket */
  hour: number;
  /** Average battery level across all samples in the bucket */
  averageLevel: number;
  /** Minimum battery level encountered within the bucket */
  minLevel: number;
  /** Maximum battery level encountered within the bucket */
  maxLevel: number;
  /** Average temperature in Celsius */
  averageTemperature: number;
  /** Number of samples aggregated */
  sampleCount: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const alignToHour = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
};

export const groupSamplesByHour = (
  samples: PowerSample[],
  hours: number = HOURS_IN_DAY,
  now: number = Date.now(),
): HourlyGroup[] => {
  const safeHours = Math.max(1, Math.round(hours));
  const endHour = alignToHour(now);
  const startHour = endHour - (safeHours - 1) * HOUR_MS;
  const buckets: HourlyGroup[] = Array.from({ length: safeHours }, (_, index) => ({
    hour: startHour + index * HOUR_MS,
    averageLevel: 0,
    minLevel: 100,
    maxLevel: 0,
    averageTemperature: 0,
    sampleCount: 0,
  }));

  if (!samples.length) {
    return buckets.map((bucket) => ({
      ...bucket,
      minLevel: 0,
    }));
  }

  const bucketAccumulator = buckets.map(() => ({
    levelSum: 0,
    tempSum: 0,
  }));

  samples.forEach((sample) => {
    const { timestamp, batteryLevel, temperatureC } = sample;
    if (timestamp < startHour || timestamp >= endHour + HOUR_MS) {
      return;
    }
    const bucketIndex = Math.floor((timestamp - startHour) / HOUR_MS);
    if (bucketIndex < 0 || bucketIndex >= buckets.length) {
      return;
    }
    const accumulator = bucketAccumulator[bucketIndex];
    accumulator.levelSum += batteryLevel;
    accumulator.tempSum += temperatureC;
    const bucket = buckets[bucketIndex];
    bucket.sampleCount += 1;
    bucket.minLevel = Math.min(bucket.minLevel, batteryLevel);
    bucket.maxLevel = Math.max(bucket.maxLevel, batteryLevel);
  });

  return buckets.map((bucket, index) => {
    const { levelSum, tempSum } = bucketAccumulator[index];
    const count = bucket.sampleCount || 0;
    const averageLevel = count ? clamp(levelSum / count, 0, 100) : 0;
    const averageTemperature = count ? tempSum / count : 0;
    return {
      ...bucket,
      averageLevel,
      minLevel: count ? clamp(bucket.minLevel, 0, 100) : 0,
      maxLevel: count ? clamp(bucket.maxLevel, 0, 100) : 0,
      averageTemperature,
    };
  });
};

export const toDisplayHour = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};
