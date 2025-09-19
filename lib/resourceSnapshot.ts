import type { FetchEntry } from './fetchProxy';

export interface SnapshotMetrics {
  cpu: number | null;
  memory: number | null;
}

export interface WindowSnapshot {
  id: string;
  title: string;
  className: string;
  state: {
    minimized: boolean;
    maximized: boolean;
    focused: boolean;
  };
  zIndex: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  area: number;
  dataset: Record<string, string>;
  metrics: SnapshotMetrics;
}

export interface TimerSnapshot {
  id: string;
  label: string;
  mode: 'timer' | 'stopwatch';
  running: boolean;
  startedAt: number | null;
  expectedEnd: number | null;
  remainingSeconds: number | null;
  elapsedSeconds: number | null;
  laps: number[];
  lastUpdated: number | null;
}

export interface SnapshotFetchEntry {
  id: number;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  requestSize?: number;
  responseSize?: number;
  fromServiceWorkerCache?: boolean;
  error?: string | { name?: string; message: string; stack?: string };
}

export interface ResourceSnapshot {
  version: 1;
  capturedAt: string;
  metrics: SnapshotMetrics;
  windows: WindowSnapshot[];
  timers: TimerSnapshot[];
  network?: {
    active: SnapshotFetchEntry[];
    history: SnapshotFetchEntry[];
  };
}

export interface SnapshotOptions {
  network?: {
    active?: FetchEntry[];
    history?: FetchEntry[];
  };
}

interface TimerMetadata {
  mode: 'timer' | 'stopwatch';
  lastUpdated?: number;
  timer: {
    running: boolean;
    remainingSeconds: number;
    durationSeconds: number;
    startTimestamp: number | null;
    endTimestamp: number | null;
  };
  stopwatch: {
    running: boolean;
    elapsedSeconds: number;
    startTimestamp: number | null;
    laps: number[];
  };
}

declare global {
  interface Window {
    __kaliResourceTimers?: TimerMetadata;
  }
}

const SNAPSHOT_VERSION = 1;

const waitForSample = (timeout = 1200): Promise<SnapshotMetrics> => {
  if (typeof window === 'undefined' || typeof Worker !== 'function') {
    return Promise.resolve({ cpu: null, memory: null });
  }
  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: number | null = null;
    try {
      const worker = new Worker(
        new URL('../components/apps/resource_monitor.worker.js', import.meta.url),
      );
      const cleanup = () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        worker.terminate();
      };
      worker.onmessage = (event: MessageEvent<any>) => {
        if (settled) return;
        const { cpu, memory } = event.data || {};
        if (typeof cpu === 'number' && typeof memory === 'number') {
          settled = true;
          cleanup();
          resolve({ cpu, memory });
        }
      };
      timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ cpu: null, memory: null });
      }, timeout);
      worker.postMessage({ type: 'init', reduceMotion: true });
    } catch (err) {
      console.error('Failed to sample resource worker', err);
      settled = true;
      resolve({ cpu: null, memory: null });
    }
  });
};

const cloneDataset = (dataset: DOMStringMap): Record<string, string> => {
  const copy: Record<string, string> = {};
  for (const key of Object.keys(dataset)) {
    const value = dataset[key];
    if (typeof value === 'string') {
      copy[key] = value;
    }
  }
  return copy;
};

interface WindowWithArea extends Omit<WindowSnapshot, 'metrics'> {
  metrics: SnapshotMetrics;
}

const collectWindows = (): WindowWithArea[] => {
  if (typeof document === 'undefined') {
    return [];
  }
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('.main-window'),
  );
  return elements.map((el) => {
    const rect = el.getBoundingClientRect();
    const width = Number.isFinite(rect.width) ? rect.width : 0;
    const height = Number.isFinite(rect.height) ? rect.height : 0;
    const area = Math.max(width * height, 0);
    const computed =
      typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
        ? window.getComputedStyle(el)
        : null;
    const zIndex = computed ? Number(computed.zIndex) || 0 : 0;
    const className = typeof el.className === 'string' ? el.className : '';
    const dataset = cloneDataset(el.dataset);
    const title = el.getAttribute('aria-label') || el.id || 'unknown';
    const minimized = el.classList.contains('invisible') || el.classList.contains('opacity-0');
    const maximized = el.classList.contains('rounded-none');
    const focused = !el.classList.contains('notFocused');
    return {
      id: el.id,
      title,
      className,
      state: { minimized, maximized, focused },
      zIndex,
      bounds: {
        x: Number.isFinite(rect.x) ? rect.x : 0,
        y: Number.isFinite(rect.y) ? rect.y : 0,
        width,
        height,
      },
      area,
      dataset,
      metrics: { cpu: null, memory: null },
    };
  });
};

const sanitizeError = (error: unknown): SnapshotFetchEntry['error'] => {
  if (error == null) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || undefined,
    };
  }
  if (typeof error === 'object') {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const sanitizeFetchEntry = (entry: FetchEntry): SnapshotFetchEntry => {
  const {
    id,
    url,
    method,
    startTime,
    endTime,
    duration,
    status,
    requestSize,
    responseSize,
    fromServiceWorkerCache,
    error,
  } = entry;
  const sanitized: SnapshotFetchEntry = {
    id,
    url,
    method,
    startTime,
    endTime,
    duration,
    status,
    requestSize,
    responseSize,
    fromServiceWorkerCache,
  };
  const cleanError = sanitizeError(error);
  if (cleanError !== undefined) {
    sanitized.error = cleanError;
  }
  return sanitized;
};

const collectTimers = (): TimerSnapshot[] => {
  if (typeof window === 'undefined' || !window.__kaliResourceTimers) {
    return [];
  }
  const meta = window.__kaliResourceTimers;
  const now = Date.now();
  const lastUpdated = typeof meta.lastUpdated === 'number' ? meta.lastUpdated : now;
  const timers: TimerSnapshot[] = [];

  const timerDuration = Number(meta.timer.durationSeconds) || 0;
  const timerRemaining = Number(meta.timer.remainingSeconds) || 0;
  const timerElapsed = Math.max(timerDuration - timerRemaining, 0);

  timers.push({
    id: 'timer',
    label: 'Countdown Timer',
    mode: 'timer',
    running: !!meta.timer.running,
    startedAt: meta.timer.startTimestamp,
    expectedEnd: meta.timer.endTimestamp,
    remainingSeconds: timerRemaining,
    elapsedSeconds: timerElapsed,
    laps: [],
    lastUpdated,
  });

  const stopwatchElapsed = Number(meta.stopwatch.elapsedSeconds) || 0;
  timers.push({
    id: 'stopwatch',
    label: 'Stopwatch',
    mode: 'stopwatch',
    running: !!meta.stopwatch.running,
    startedAt: meta.stopwatch.startTimestamp,
    expectedEnd: null,
    remainingSeconds: null,
    elapsedSeconds: meta.stopwatch.elapsedSeconds,
    laps: Array.isArray(meta.stopwatch.laps) ? [...meta.stopwatch.laps] : [],
    lastUpdated,
  });

  return timers;
};

const distributeMetrics = (
  sample: SnapshotMetrics,
  windows: WindowWithArea[],
): WindowSnapshot[] => {
  const totalArea = windows.reduce((sum, w) => sum + w.area, 0);
  const cpu = sample.cpu;
  const memory = sample.memory;
  return windows.map((w) => {
    const ratio = totalArea > 0 ? w.area / totalArea : windows.length ? 1 / windows.length : 0;
    const perWindowCpu =
      cpu == null ? null : Number.isFinite(cpu * ratio) ? Number((cpu * ratio).toFixed(2)) : null;
    const perWindowMemory =
      memory == null
        ? null
        : Number.isFinite(memory * ratio)
        ? Number((memory * ratio).toFixed(2))
        : null;
    return {
      ...w,
      metrics: {
        cpu: typeof perWindowCpu === 'number' && Number.isFinite(perWindowCpu)
          ? perWindowCpu
          : null,
        memory:
          typeof perWindowMemory === 'number' && Number.isFinite(perWindowMemory)
            ? perWindowMemory
            : null,
      },
    };
  });
};

export async function captureResourceSnapshot(
  options: SnapshotOptions = {},
): Promise<ResourceSnapshot> {
  const windows = collectWindows();
  const sample = await waitForSample();
  const distributed = distributeMetrics(sample, windows);
  const timers = collectTimers();

  const network = options.network
    ? {
        active: (options.network.active || []).map(sanitizeFetchEntry),
        history: (options.network.history || []).map(sanitizeFetchEntry),
      }
    : undefined;

  return {
    version: SNAPSHOT_VERSION,
    capturedAt: new Date().toISOString(),
    metrics: sample || { cpu: null, memory: null },
    windows: distributed,
    timers,
    network,
  };
}

export function serializeResourceSnapshot(snapshot: ResourceSnapshot): string {
  const seen = new WeakSet();
  return JSON.stringify(
    snapshot,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    },
    2,
  );
}

