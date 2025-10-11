import {
  calculateFps,
  extractMemoryStats,
  normalizeCpuDuration,
  rollingAverage,
  METRIC_BASELINES,
} from '../components/apps/resource_monitor.metrics';

describe('resource monitor metric helpers', () => {
  it('normalizes memory stats from performance.memory', () => {
    const stats = extractMemoryStats({
      usedJSHeapSize: 52 * 1024 * 1024,
      totalJSHeapSize: 128 * 1024 * 1024,
      jsHeapSizeLimit: 256 * 1024 * 1024,
    });

    expect(stats.supported).toBe(true);
    expect(stats.usedMB).toBeCloseTo(52, 1);
    expect(stats.totalMB).toBeCloseTo(128, 1);
    expect(stats.limitMB).toBeCloseTo(256, 1);
    expect(stats.usagePercent).toBeCloseTo((52 / 256) * 100, 5);
  });

  it('falls back gracefully when memory info is missing', () => {
    const stats = extractMemoryStats();
    expect(stats.supported).toBe(false);
    expect(stats.usedMB).toBe(0);
    expect(stats.usagePercent).toBe(0);
  });

  it('converts CPU probe durations to percentages', () => {
    const percent = normalizeCpuDuration(3.5, METRIC_BASELINES.cpuProbeBaselineMs);
    expect(percent).toBeCloseTo(100, 5);

    const half = normalizeCpuDuration(1.75, METRIC_BASELINES.cpuProbeBaselineMs);
    expect(half).toBeCloseTo(50, 5);

    const capped = normalizeCpuDuration(99, METRIC_BASELINES.cpuProbeBaselineMs);
    expect(capped).toBeLessThanOrEqual(100);
  });

  it('translates frame deltas to FPS and averages samples', () => {
    expect(calculateFps(16.67)).toBeCloseTo(60, 0);
    expect(calculateFps(0)).toBe(0);
    expect(rollingAverage([30, 60, 90])).toBe(60);
    expect(rollingAverage([])).toBe(0);
  });
});
