import { safeLocalStorage } from '../../utils/safeStorage';
import { isBrowser } from '../../utils/env';

type PrefetchFn = () => void | Promise<void>;

type PrefetchStatus = 'idle' | 'scheduled' | 'running' | 'paused';

type PrefetchableScreen = {
  prefetch?: PrefetchFn;
  [key: string]: unknown;
};

export interface PrefetchableApp {
  id: string;
  title?: string;
  disabled?: boolean;
  screen?: PrefetchableScreen | PrefetchFn | null;
}

type PrefetchSource = PrefetchableApp[] | (() => PrefetchableApp[]);

export interface PrefetchMetrics {
  attempts: number;
  successes: number;
  failures: number;
  skipped: number;
}

export interface BandwidthState {
  mode: 'normal' | 'throttled' | 'paused';
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

export interface PrefetchState {
  idle: boolean;
  status: PrefetchStatus;
  pending: string[];
  queue: string[];
  lastPrefetched: string[];
  lastRunAt?: number;
  reason?: string;
  bandwidth: BandwidthState;
  metrics: PrefetchMetrics;
}

export interface PrefetchOptions {
  idleThresholdMs?: number;
  maxApps?: number;
  cooldownMs?: number;
  log?: boolean;
}

type IdleHandle = number;

interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleCapableWindow extends Window {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: { timeout?: number },
  ) => IdleHandle;
  cancelIdleCallback?: (handle: IdleHandle) => void;
}

type ConnectionLike = {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
  onchange?: (() => void) | null;
};

const DEFAULT_IDLE_THRESHOLD = 10_000;
const DEFAULT_MAX_APPS = 3;
const DEFAULT_COOLDOWN = 5 * 60 * 1000;
const THROTTLED_DELAY = 2000;
const IDLE_RESCHEDULE_BUDGET = 12;
const FALLBACK_IDLE_DELAY = 100;
const QUEUE_PREVIEW_SIZE = 6;

const defaultMetrics: PrefetchMetrics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  skipped: 0,
};

const defaultState: PrefetchState = {
  idle: false,
  status: 'idle',
  pending: [],
  queue: [],
  lastPrefetched: [],
  bandwidth: { mode: 'normal' },
  metrics: { ...defaultMetrics },
};

let state: PrefetchState = { ...defaultState };
let appSource: () => PrefetchableApp[] = () => [];
let options: Required<Pick<PrefetchOptions, 'idleThresholdMs' | 'maxApps' | 'log'>> & {
  cooldownMs: number;
} = {
  idleThresholdMs: DEFAULT_IDLE_THRESHOLD,
  maxApps: DEFAULT_MAX_APPS,
  log: false,
  cooldownMs: DEFAULT_COOLDOWN,
};
let logEnabled = false;
let lastActivity = Date.now();
let idleTimeout: number | null = null;
let idleCallback: IdleHandle | null = null;
let running = false;
let scheduled = false;
let connection: ConnectionLike | undefined;
let connectionCleanup: (() => void) | null = null;
const prefetchedAt = new Map<string, number>();
const subscribers = new Set<(snapshot: PrefetchState) => void>();

const windowEvents: (keyof WindowEventMap)[] = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'touchmove',
];

const documentEvents: (keyof DocumentEventMap)[] = ['visibilitychange'];

function notify(label?: string) {
  const snapshot = getPrefetchState();
  if (logEnabled && label) {
    console.info(`[prefetch] ${label}`, snapshot);
  }
  subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[prefetch] subscriber error', error);
      }
    }
  });
}

function updateState(partial: Partial<PrefetchState>, label?: string) {
  state = {
    ...state,
    ...partial,
  };
  notify(label);
}

function resetState(label?: string) {
  state = { ...defaultState };
  notify(label);
}

function getConnection(): ConnectionLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as Navigator & {
    connection?: ConnectionLike;
    mozConnection?: ConnectionLike;
    webkitConnection?: ConnectionLike;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

function captureConnectionInfo(info?: ConnectionLike): BandwidthState {
  if (!info) {
    return { mode: 'normal' };
  }
  const snapshot: BandwidthState = {
    mode: 'normal',
    downlink: info.downlink,
    effectiveType: info.effectiveType,
    saveData: info.saveData,
  };
  if (info.saveData) {
    snapshot.mode = 'paused';
  } else if (info.effectiveType && /2g/.test(info.effectiveType)) {
    snapshot.mode = 'paused';
  } else if (typeof info.downlink === 'number' && info.downlink > 0 && info.downlink < 1) {
    snapshot.mode = 'throttled';
  } else if (info.effectiveType === '3g') {
    snapshot.mode = 'throttled';
  }
  return snapshot;
}

function isBandwidthEqual(a: BandwidthState, b: BandwidthState) {
  return (
    a.mode === b.mode &&
    a.downlink === b.downlink &&
    a.effectiveType === b.effectiveType &&
    a.saveData === b.saveData
  );
}

function updateBandwidthState(label?: string) {
  const bandwidth = captureConnectionInfo(connection);
  if (!isBandwidthEqual(state.bandwidth, bandwidth)) {
    const next: Partial<PrefetchState> = { bandwidth };
    if (!running) {
      if (bandwidth.mode === 'paused') {
        next.status = 'paused';
        next.reason = 'bandwidth';
      } else if (state.status === 'paused') {
        next.status = 'idle';
        if (state.reason === 'bandwidth') {
          next.reason = undefined;
        }
      }
    } else if (bandwidth.mode === 'paused') {
      next.reason = 'bandwidth';
    } else if (state.reason === 'bandwidth') {
      next.reason = undefined;
    }
    updateState(next, label);
    if (bandwidth.mode !== 'paused' && !running) {
      scheduleIdleCheck();
    }
  } else if (label && logEnabled) {
    notify(label);
  }
}

function attachConnectionListener() {
  connection = getConnection();
  if (!connection) return;
  const handler = () => {
    updateBandwidthState('network change');
  };
  if (typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', handler);
    connectionCleanup = () => {
      connection?.removeEventListener?.('change', handler);
    };
  } else if ('onchange' in connection) {
    const previous = connection.onchange;
    connection.onchange = () => {
      previous?.();
      handler();
    };
    connectionCleanup = () => {
      if (connection && 'onchange' in connection) {
        connection.onchange = previous || null;
      }
    };
  }
  updateBandwidthState('network init');
}

function detachConnectionListener() {
  connectionCleanup?.();
  connectionCleanup = null;
  connection = undefined;
}

function cancelScheduled() {
  if (!isBrowser) return;
  if (idleTimeout !== null) {
    window.clearTimeout(idleTimeout);
    idleTimeout = null;
  }
  const idleWindow = window as IdleCapableWindow;
  if (idleCallback !== null && idleWindow.cancelIdleCallback) {
    idleWindow.cancelIdleCallback(idleCallback);
    idleCallback = null;
  }
  scheduled = false;
}

function resolveApps(): PrefetchableApp[] {
  try {
    const list = appSource();
    return Array.isArray(list) ? list : [];
  } catch (error) {
    if (logEnabled) {
      console.warn('[prefetch] failed to resolve apps', error);
    }
    return [];
  }
}

function readFrequentAppIds(): string[] {
  if (!safeLocalStorage) return [];
  const value = safeLocalStorage.getItem('frequentApps');
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<{ id?: unknown; frequency?: unknown }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is { id: string; frequency: number } =>
        Boolean(entry) && typeof entry.id === 'string' && typeof entry.frequency === 'number',
      )
      .sort((a, b) => b.frequency - a.frequency)
      .map((entry) => entry.id);
  } catch (error) {
    if (logEnabled) {
      console.warn('[prefetch] failed to parse frequentApps', error);
    }
    return [];
  }
}

function readRecentAppIds(): string[] {
  if (!safeLocalStorage) return [];
  const value = safeLocalStorage.getItem('recentApps');
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch (error) {
    if (logEnabled) {
      console.warn('[prefetch] failed to parse recentApps', error);
    }
    return [];
  }
}

function resolvePrefetchFunction(app: PrefetchableApp): PrefetchFn | undefined {
  const screen = app.screen as PrefetchableScreen | undefined;
  const prefetch = screen?.prefetch;
  return typeof prefetch === 'function' ? prefetch : undefined;
}

function shouldPrefetch(id: string): boolean {
  const last = prefetchedAt.get(id);
  if (!last) return true;
  return Date.now() - last > options.cooldownMs;
}

function buildPriorityList(apps: PrefetchableApp[]): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };
  readFrequentAppIds().forEach(pushUnique);
  readRecentAppIds().forEach(pushUnique);
  apps.forEach((app) => pushUnique(app.id));
  return ordered;
}

function selectPrefetchTargets(limit: number) {
  const apps = resolveApps();
  const map = new Map(apps.map((app) => [app.id, app]));
  const prioritized = buildPriorityList(apps);
  const prefetchable: string[] = [];
  for (const id of prioritized) {
    const app = map.get(id);
    if (!app || app.disabled) continue;
    if (resolvePrefetchFunction(app)) {
      prefetchable.push(id);
    }
  }
  const previewLimit = Math.max(limit, QUEUE_PREVIEW_SIZE);
  const queuePreview = prefetchable.slice(0, previewLimit);
  const selected: string[] = [];
  let cooldownSkipped = 0;
  for (const id of prefetchable) {
    if (selected.length >= limit) break;
    if (!shouldPrefetch(id)) {
      cooldownSkipped += 1;
      continue;
    }
    selected.push(id);
  }
  let reason: string | undefined;
  if (!selected.length) {
    if (!prefetchable.length) {
      reason = 'no-prefetchable-apps';
    } else if (cooldownSkipped >= prefetchable.length) {
      reason = 'cooldown';
    }
  }
  return { candidates: selected, queue: queuePreview, reason };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function runPrefetch(candidates: string[]) {
  if (!candidates.length) {
    updateState({ status: 'idle', idle: false, pending: [] });
    scheduleIdleCheck();
    return;
  }
  running = true;
  updateState({ status: 'running', idle: true, pending: candidates, reason: undefined }, 'prefetch start');
  const apps = resolveApps();
  const map = new Map(apps.map((app) => [app.id, app]));
  const completed: string[] = [];
  let attempts = 0;
  let successes = 0;
  let failures = 0;
  let skipped = 0;

  for (const id of candidates) {
    if (state.bandwidth.mode === 'paused') {
      updateState({
        status: 'paused',
        reason: 'bandwidth',
        pending: candidates.slice(candidates.indexOf(id)),
      }, 'bandwidth pause');
      running = false;
      scheduleIdleCheck();
      return;
    }
    const app = map.get(id);
    if (!app) {
      skipped += 1;
      continue;
    }
    const prefetch = resolvePrefetchFunction(app);
    if (!prefetch) {
      skipped += 1;
      continue;
    }
    attempts += 1;
    try {
      const result = prefetch();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await result;
      }
      successes += 1;
      completed.push(id);
      prefetchedAt.set(id, Date.now());
      if (state.bandwidth.mode === 'throttled') {
        await delay(THROTTLED_DELAY);
      }
    } catch (error) {
      failures += 1;
      if (logEnabled) {
        console.warn(`[prefetch] failed for ${id}`, error);
      }
    }
  }

  running = false;
  const metrics: PrefetchMetrics = {
    attempts: state.metrics.attempts + attempts,
    successes: state.metrics.successes + successes,
    failures: state.metrics.failures + failures,
    skipped: state.metrics.skipped + skipped,
  };

  updateState(
    {
      status: 'idle',
      idle: false,
      pending: [],
      lastPrefetched: completed,
      lastRunAt: Date.now(),
      metrics,
      reason: completed.length ? undefined : state.reason,
    },
    'prefetch complete',
  );
  scheduleIdleCheck();
}

function queueIdleCallback() {
  if (!isBrowser) return;
  if (running || scheduled) return;
  if (state.bandwidth.mode === 'paused') {
    updateState({ status: 'paused', idle: true, reason: 'bandwidth' }, 'bandwidth paused');
    idleTimeout = window.setTimeout(queueIdleCallback, options.idleThresholdMs);
    return;
  }
  const { candidates, queue, reason } = selectPrefetchTargets(options.maxApps);
  updateState({ queue, reason });
  if (!candidates.length) {
    updateState({ status: 'idle', idle: false, pending: [] }, reason ? `waiting: ${reason}` : undefined);
    idleTimeout = window.setTimeout(queueIdleCallback, options.idleThresholdMs);
    return;
  }
  scheduled = true;
  const idleWindow = window as IdleCapableWindow;
  updateState({ status: 'scheduled', idle: true, pending: candidates }, 'prefetch scheduled');
  if (idleWindow.requestIdleCallback) {
    idleCallback = idleWindow.requestIdleCallback(
      (deadline) => {
        idleCallback = null;
        scheduled = false;
        if (!deadline.didTimeout && deadline.timeRemaining() < IDLE_RESCHEDULE_BUDGET) {
          updateState({ status: 'idle', idle: false, pending: [] }, 'reschedule idle');
          scheduleIdleCheck();
          return;
        }
        void runPrefetch(candidates);
      },
      { timeout: options.idleThresholdMs },
    );
  } else {
    idleTimeout = window.setTimeout(() => {
      idleTimeout = null;
      scheduled = false;
      void runPrefetch(candidates);
    }, FALLBACK_IDLE_DELAY);
  }
}

function scheduleIdleCheck() {
  if (!isBrowser) return;
  cancelScheduled();
  const remaining = options.idleThresholdMs - (Date.now() - lastActivity);
  if (remaining <= 0) {
    queueIdleCallback();
  } else {
    idleTimeout = window.setTimeout(queueIdleCallback, remaining);
  }
}

function handleActivity() {
  lastActivity = Date.now();
  if (state.idle) {
    updateState({ idle: false });
  }
  if (!running) {
    scheduleIdleCheck();
  }
}

function setupActivityListeners() {
  windowEvents.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true });
  });
  documentEvents.forEach((event) => {
    document.addEventListener(event, handleActivity, { passive: true });
  });
}

function removeActivityListeners() {
  windowEvents.forEach((event) => {
    window.removeEventListener(event, handleActivity);
  });
  documentEvents.forEach((event) => {
    document.removeEventListener(event, handleActivity);
  });
}

export function startPrefetchMonitor(source: PrefetchSource, opts: PrefetchOptions = {}) {
  if (!isBrowser) return () => {};

  appSource = typeof source === 'function' ? source : () => source;
  options = {
    idleThresholdMs: opts.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD,
    maxApps: opts.maxApps ?? DEFAULT_MAX_APPS,
    cooldownMs: opts.cooldownMs ?? DEFAULT_COOLDOWN,
    log: opts.log ?? process.env.NODE_ENV !== 'production',
  };
  logEnabled = options.log;
  lastActivity = Date.now();
  resetState('prefetch init');
  setupActivityListeners();
  attachConnectionListener();
  scheduleIdleCheck();

  return () => {
    cancelScheduled();
    removeActivityListeners();
    detachConnectionListener();
    appSource = () => [];
    running = false;
    scheduled = false;
    updateState({ status: 'idle', idle: false, pending: [], queue: [], reason: undefined }, 'prefetch stopped');
  };
}

export function subscribePrefetchState(listener: (snapshot: PrefetchState) => void) {
  subscribers.add(listener);
  listener(getPrefetchState());
  return () => {
    subscribers.delete(listener);
  };
}

export function getPrefetchState(): PrefetchState {
  return {
    ...state,
    pending: [...state.pending],
    queue: [...state.queue],
    lastPrefetched: [...state.lastPrefetched],
    bandwidth: { ...state.bandwidth },
    metrics: { ...state.metrics },
  };
}

export function resetPrefetchMetrics() {
  updateState({ metrics: { ...defaultMetrics } }, 'metrics reset');
}
