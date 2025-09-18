const DEFAULT_CONCURRENCY = 4;
const MIN_APPROX_MEMORY = 5;
const MAX_APPROX_MEMORY = 95;
const APPROX_VARIANCE = 8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const createSamplingBridge = (env = typeof window !== 'undefined' ? window : {}) => {
  const { navigator: nav = undefined, performance: perf = undefined, Date: DateCtor = Date } = env;

  const hasPerfNow = Boolean(perf && typeof perf.now === 'function');
  const now = hasPerfNow ? () => perf.now() : () => DateCtor.now();

  const hardwareConcurrency =
    nav && typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0
      ? nav.hardwareConcurrency
      : DEFAULT_CONCURRENCY;

  const memory = perf && perf.memory ? perf.memory : undefined;
  const hasMemoryMetrics = Boolean(
    memory &&
      typeof memory.usedJSHeapSize === 'number' &&
      typeof memory.totalJSHeapSize === 'number' &&
      memory.totalJSHeapSize > 0,
  );

  let approxMemory = (MIN_APPROX_MEMORY + MAX_APPROX_MEMORY) / 2;
  const sampleMemory = hasMemoryMetrics
    ? () => (memory.totalJSHeapSize ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0)
    : () => {
        approxMemory = clamp(
          approxMemory + (Math.random() - 0.5) * APPROX_VARIANCE,
          MIN_APPROX_MEMORY,
          MAX_APPROX_MEMORY,
        );
        return approxMemory;
      };

  return {
    now,
    hardwareConcurrency,
    sampleMemory,
    usesApproximateMemory: !hasMemoryMetrics,
  };
};

export const __TESTING__ = {
  DEFAULT_CONCURRENCY,
  MIN_APPROX_MEMORY,
  MAX_APPROX_MEMORY,
};
