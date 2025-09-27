export interface SystemMetricsSample {
  cpu: number;
  memory: number;
  fps: number;
  timestamp: number;
}

type Listener = (sample: SystemMetricsSample) => void;

const listeners = new Set<Listener>();

let latest: SystemMetricsSample = {
  cpu: 0,
  memory: 0,
  fps: 0,
  timestamp: 0,
};

let rafId: number | null = null;
let running = false;
let lastFrame = 0;
let lastSample = 0;
let frameSum = 0;
let frameCount = 0;

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function readMemoryUsage(): number {
  if (typeof performance !== 'undefined' && (performance as Performance & { memory?: any }).memory) {
    try {
      const { usedJSHeapSize, totalJSHeapSize } = (performance as Performance & {
        memory: { usedJSHeapSize: number; totalJSHeapSize: number };
      }).memory;
      if (totalJSHeapSize > 0) {
        return (usedJSHeapSize / totalJSHeapSize) * 100;
      }
    } catch {
      // ignore memory read errors
    }
  }
  return latest.memory;
}

function notify(sample: SystemMetricsSample) {
  listeners.forEach((listener) => listener(sample));
}

function sampleLoop(timestamp: number) {
  if (!running) return;

  if (!lastFrame) lastFrame = timestamp;

  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (delta >= 0) {
    frameSum += delta;
    frameCount += 1;
  }

  if (!lastSample) lastSample = timestamp;

  if (timestamp - lastSample >= 1000) {
    const avgFrame = frameCount > 0 ? frameSum / frameCount : 0;
    const target = 1000 / 60; // 60 FPS baseline
    const cpuRaw = target > 0 ? ((avgFrame - target) / target) * 100 : 0;
    const cpu = Math.min(100, Math.max(0, cpuRaw));
    const memory = readMemoryUsage();
    const fps = delta > 0 ? Math.min(240, 1000 / delta) : latest.fps;

    latest = {
      cpu,
      memory,
      fps,
      timestamp,
    };

    frameSum = 0;
    frameCount = 0;
    lastSample = timestamp;
    notify(latest);
  }

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    rafId = window.requestAnimationFrame(sampleLoop);
  } else {
    rafId = null;
  }
}

function startLoop() {
  if (typeof window === 'undefined' || running) return;
  if (typeof window.requestAnimationFrame !== 'function') return;
  running = true;
  lastFrame = now();
  lastSample = lastFrame;
  rafId = window.requestAnimationFrame(sampleLoop);
}

function stopLoop() {
  if (typeof window === 'undefined') return;
  if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(rafId);
  }
  rafId = null;
  running = false;
  lastFrame = 0;
  lastSample = 0;
  frameSum = 0;
  frameCount = 0;
}

export function subscribeSystemMetrics(listener: Listener): () => void {
  listeners.add(listener);
  if (!running) {
    startLoop();
  }
  // Immediately emit the latest value for late subscribers
  listener(latest);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopLoop();
    }
  };
}

export function getLatestSystemMetrics(): SystemMetricsSample {
  return { ...latest };
}

export function __setLatestSystemMetricsForTests(sample: SystemMetricsSample) {
  // Only exposed for unit tests to control the singleton state.
  latest = sample;
  notify(sample);
}

