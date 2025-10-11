import { METRIC_BASELINES } from './resource_monitor.metrics';

const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_ITERATIONS = 50000;

let running = false;
let timer = null;

const options = {
  intervalMs: DEFAULT_INTERVAL_MS,
  iterations: DEFAULT_ITERATIONS,
  baselineMs: METRIC_BASELINES.cpuProbeBaselineMs,
};

self.onmessage = (event) => {
  const { type, intervalMs, iterations, baselineMs } = event.data || {};

  if (type === 'start') {
    if (typeof intervalMs === 'number') {
      options.intervalMs = Math.max(250, intervalMs);
    }
    if (typeof iterations === 'number') {
      options.iterations = Math.max(1000, Math.floor(iterations));
    }
    if (typeof baselineMs === 'number' && baselineMs > 0) {
      options.baselineMs = baselineMs;
    }
    if (!running) {
      running = true;
      schedule();
    }
  } else if (type === 'stop') {
    running = false;
    clear();
  } else if (type === 'configure') {
    if (typeof intervalMs === 'number') {
      options.intervalMs = Math.max(250, intervalMs);
    }
    if (typeof iterations === 'number') {
      options.iterations = Math.max(1000, Math.floor(iterations));
    }
    if (typeof baselineMs === 'number' && baselineMs > 0) {
      options.baselineMs = baselineMs;
    }
    if (running) {
      clear();
      schedule();
    }
  }
};

function schedule() {
  clear();
  timer = setTimeout(sample, options.intervalMs);
}

function clear() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function sample() {
  if (!running) return;

  const duration = runCpuProbe(options.iterations);
  const payload = {
    type: 'probe',
    duration,
    baselineMs: options.baselineMs,
    timestamp: performance.now(),
  };

  if (typeof performance !== 'undefined' && performance.memory) {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    payload.memory = { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit };
  }

  self.postMessage(payload);
  schedule();
}

function runCpuProbe(iterations) {
  const limit = Math.max(1000, iterations | 0);
  let accumulator = 0;
  const start = performance.now();
  for (let i = 0; i < limit; i += 1) {
    accumulator += Math.sqrt((i % 100) + accumulator);
    if (accumulator > 1e6) {
      accumulator = Math.sqrt(accumulator);
    }
  }
  return performance.now() - start;
}

// Expose helpers for tests when running in Node.
if (typeof module !== 'undefined') {
  module.exports = {
    runCpuProbe,
  };
}
