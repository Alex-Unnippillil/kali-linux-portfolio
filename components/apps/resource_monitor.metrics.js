const BYTES_PER_MB = 1024 * 1024;

export function extractMemoryStats(memoryInfo) {
  if (!memoryInfo) {
    return {
      usedMB: 0,
      totalMB: 0,
      limitMB: 0,
      usagePercent: 0,
      supported: false,
    };
  }

  const usedJSHeapSize = Number(memoryInfo.usedJSHeapSize) || 0;
  const totalJSHeapSize = Number(memoryInfo.totalJSHeapSize) || 0;
  const jsHeapSizeLimit = Number(memoryInfo.jsHeapSizeLimit) || 0;
  const denominator = jsHeapSizeLimit || totalJSHeapSize || 1;

  return {
    usedMB: usedJSHeapSize / BYTES_PER_MB,
    totalMB: totalJSHeapSize / BYTES_PER_MB,
    limitMB: jsHeapSizeLimit / BYTES_PER_MB,
    usagePercent: Math.min(100, Math.max(0, (usedJSHeapSize / denominator) * 100)),
    supported: true,
  };
}

export function normalizeCpuDuration(durationMs, baselineMs = 3.5) {
  if (!durationMs || durationMs <= 0 || !baselineMs || baselineMs <= 0) {
    return 0;
  }
  const ratio = durationMs / baselineMs;
  return Math.min(100, Math.max(0, ratio * 100));
}

export function calculateFps(deltaMs) {
  if (!deltaMs || deltaMs <= 0) return 0;
  return 1000 / deltaMs;
}

export function rollingAverage(buffer) {
  if (!buffer || buffer.length === 0) return 0;
  const sum = buffer.reduce((acc, value) => acc + value, 0);
  return sum / buffer.length;
}

export const METRIC_BASELINES = {
  cpuProbeBaselineMs: 3.5,
};

