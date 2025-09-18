import { groupSamplesByHour } from '../../../components/apps/power-dashboard/data';
import type { PowerSample } from '../../../utils/powerManager';

describe('power dashboard data grouping', () => {
  const baseTimestamp = Date.UTC(2024, 0, 1, 12, 45, 0, 0);

  const sample = (overrides: Partial<PowerSample>): PowerSample => ({
    timestamp: baseTimestamp,
    deviceId: 'deck',
    appId: 'desktop',
    batteryLevel: 80,
    temperatureC: 40,
    dischargeRateMw: 600,
    ...overrides,
  });

  it('groups samples into hourly buckets and averages values', () => {
    const samples: PowerSample[] = [
      sample({ timestamp: baseTimestamp - 15 * 60 * 1000, batteryLevel: 80, temperatureC: 42 }),
      sample({ timestamp: baseTimestamp - 40 * 60 * 1000, batteryLevel: 60, temperatureC: 38 }),
      sample({ timestamp: baseTimestamp - 90 * 60 * 1000, batteryLevel: 90, temperatureC: 35 }),
    ];

    const groups = groupSamplesByHour(samples, 2, baseTimestamp);

    expect(groups).toHaveLength(2);
    const currentHour = groups[groups.length - 1];
    expect(currentHour.sampleCount).toBe(2);
    expect(currentHour.averageLevel).toBeCloseTo(70);
    expect(currentHour.averageTemperature).toBeCloseTo(40);

    const previousHour = groups[0];
    expect(previousHour.sampleCount).toBe(1);
    expect(previousHour.averageLevel).toBeCloseTo(90);
  });

  it('clamps values and handles empty buckets', () => {
    const samples: PowerSample[] = [
      sample({ timestamp: baseTimestamp - 30 * 60 * 1000, batteryLevel: 120, temperatureC: 80 }),
      sample({ timestamp: baseTimestamp - 30 * 60 * 1000, batteryLevel: -10, temperatureC: 20 }),
    ];

    const groups = groupSamplesByHour(samples, 1, baseTimestamp);
    expect(groups).toHaveLength(1);
    expect(groups[0].averageLevel).toBeGreaterThanOrEqual(0);
    expect(groups[0].averageLevel).toBeLessThanOrEqual(100);
    expect(groups[0].minLevel).toBeGreaterThanOrEqual(0);
    expect(groups[0].maxLevel).toBeLessThanOrEqual(100);
  });

  it('ignores samples outside of the requested window', () => {
    const samples: PowerSample[] = [
      sample({ timestamp: baseTimestamp - 26 * 60 * 60 * 1000, batteryLevel: 50 }),
      sample({ timestamp: baseTimestamp - 10 * 60 * 1000, batteryLevel: 75 }),
    ];

    const groups = groupSamplesByHour(samples, 1, baseTimestamp);

    expect(groups).toHaveLength(1);
    expect(groups[0].sampleCount).toBe(1);
    expect(groups[0].averageLevel).toBeCloseTo(75);
  });
});
