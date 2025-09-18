export type SnapshotOrigin = 'manual' | 'auto';
export type SnapshotStatus = 'ready' | 'creating' | 'restoring';

export interface SnapshotRecord {
  id: string;
  label: string;
  createdAt: number;
  description: string;
  origin: SnapshotOrigin;
  size: string;
  status: SnapshotStatus;
  lastRestoredAt?: number;
}

export type RollbackStatus = 'idle' | 'running' | 'completed';

export interface RollbackState {
  status: RollbackStatus;
  snapshotId: string | null;
  startedAt: number | null;
  etaMs: number | null;
  expectedCompletion: number | null;
  progress: number;
  completedAt: number | null;
}

export interface PreUpdateEvent {
  type: 'open-app' | 'system-update' | 'pre-flight';
  appId?: string;
  label?: string;
  details?: Record<string, unknown>;
}

export type PreUpdateHook = (event: PreUpdateEvent) => void | Promise<void>;

type SnapshotListener = (snapshots: SnapshotRecord[], rollback: RollbackState) => void;

const OPEN_FILES = [
  '/home/kali/Documents/incident-response.md',
  '/home/kali/Reports/weekly-diff.md',
  '/home/kali/tools/plugin-change-log.txt',
];

const initialSnapshots: SnapshotRecord[] = [
  {
    id: 'snap-baseline',
    label: 'Baseline install',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    description: 'Factory image before personalization.',
    origin: 'auto',
    size: '2.2 GB',
    status: 'ready',
  },
  {
    id: 'snap-plugin-prep',
    label: 'Before plugin sync',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    description: 'Automatically captured prior to syncing plugins.',
    origin: 'auto',
    size: '2.4 GB',
    status: 'ready',
  },
  {
    id: 'snap-analyst',
    label: 'Manual checkpoint',
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    description: 'Analyst-triggered snapshot before field demo.',
    origin: 'manual',
    size: '2.1 GB',
    status: 'ready',
  },
];

let snapshots = initialSnapshots.map((snapshot) => ({ ...snapshot }));

let rollbackState: RollbackState = {
  status: 'idle',
  snapshotId: null,
  startedAt: null,
  etaMs: null,
  expectedCompletion: null,
  progress: 0,
  completedAt: null,
};

let rollbackTimer: ReturnType<typeof setTimeout> | null = null;
let rollbackInterval: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<SnapshotListener>();
const preUpdateHooks = new Set<PreUpdateHook>();

const notify = () => {
  const nextSnapshots = snapshots.map((snapshot) => ({ ...snapshot }));
  const nextRollback: RollbackState = { ...rollbackState };
  listeners.forEach((listener) => listener(nextSnapshots, nextRollback));
};

const generateId = () => `snap-${Math.random().toString(36).slice(2, 8)}`;

const SIMULATION_SPEED = 60;

export const listSnapshots = () => snapshots.map((snapshot) => ({ ...snapshot }));

export const getRollbackState = () => ({ ...rollbackState });

export const getOpenFiles = () => [...OPEN_FILES];

export const subscribe = (listener: SnapshotListener) => {
  listeners.add(listener);
  listener(listSnapshots(), getRollbackState());
  return () => {
    listeners.delete(listener);
  };
};

export const registerPreUpdateHook = (hook: PreUpdateHook) => {
  preUpdateHooks.add(hook);
  return () => {
    preUpdateHooks.delete(hook);
  };
};

export const triggerPreUpdateHooks = async (event: PreUpdateEvent) => {
  const hooks = Array.from(preUpdateHooks);
  await Promise.all(hooks.map((hook) => Promise.resolve().then(() => hook(event))));
};

export const createSnapshot = async (
  label: string,
  options?: {
    origin?: SnapshotOrigin;
    description?: string;
  },
) => {
  const trimmed = label.trim() || 'Untitled snapshot';
  const now = Date.now();
  const snapshot: SnapshotRecord = {
    id: generateId(),
    label: trimmed,
    createdAt: now,
    description: options?.description ?? '',
    origin: options?.origin ?? 'manual',
    size: `${(1.9 + Math.random() * 0.7).toFixed(1)} GB`,
    status: 'creating',
  };

  snapshots = [snapshot, ...snapshots];
  notify();

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      snapshots = snapshots.map((item) =>
        item.id === snapshot.id ? { ...item, status: 'ready' } : item,
      );
      notify();
      resolve();
    }, 600);
  });

  return snapshots.find((item) => item.id === snapshot.id)!;
};

export const rollbackSnapshot = async (snapshotId: string) => {
  const target = snapshots.find((snapshot) => snapshot.id === snapshotId);
  if (!target) {
    throw new Error('Snapshot not found');
  }

  if (rollbackTimer) {
    clearTimeout(rollbackTimer);
    rollbackTimer = null;
  }

  if (rollbackInterval) {
    clearInterval(rollbackInterval);
    rollbackInterval = null;
  }

  const startedAt = Date.now();
  const etaMs = Math.min(110_000, Math.max(55_000, Math.round(60_000 + Math.random() * 25_000)));
  const actualDuration = Math.max(600, Math.round(etaMs / SIMULATION_SPEED));

  rollbackState = {
    status: 'running',
    snapshotId,
    startedAt,
    etaMs,
    expectedCompletion: startedAt + etaMs,
    progress: 0,
    completedAt: null,
  };

  snapshots = snapshots.map((snapshot) =>
    snapshot.id === snapshotId
      ? { ...snapshot, status: 'restoring' }
      : { ...snapshot, status: snapshot.status === 'restoring' ? 'ready' : snapshot.status },
  );
  notify();

  rollbackInterval = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const simulatedElapsed = Math.min(etaMs, elapsed * SIMULATION_SPEED);
    const progress = Math.min(1, simulatedElapsed / etaMs);
    rollbackState = {
      ...rollbackState,
      progress,
    };
    notify();
  }, 200);

  await new Promise<void>((resolve) => {
    rollbackTimer = setTimeout(() => {
      if (rollbackInterval) {
        clearInterval(rollbackInterval);
        rollbackInterval = null;
      }
      const completedAt = Date.now();
      rollbackState = {
        status: 'completed',
        snapshotId,
        startedAt,
        etaMs,
        expectedCompletion: null,
        progress: 1,
        completedAt,
      };
      snapshots = snapshots.map((snapshot) =>
        snapshot.id === snapshotId
          ? { ...snapshot, status: 'ready', lastRestoredAt: completedAt }
          : { ...snapshot, status: 'ready' },
      );
      notify();
      resolve();
    }, actualDuration);
  });
};

export const resetSnapshotStore = () => {
  snapshots = initialSnapshots.map((snapshot) => ({ ...snapshot }));
  if (rollbackTimer) {
    clearTimeout(rollbackTimer);
    rollbackTimer = null;
  }
  if (rollbackInterval) {
    clearInterval(rollbackInterval);
    rollbackInterval = null;
  }
  rollbackState = {
    status: 'idle',
    snapshotId: null,
    startedAt: null,
    etaMs: null,
    expectedCompletion: null,
    progress: 0,
    completedAt: null,
  };
  notify();
};

const autoSnapshotTargets = new Set(['plugin-manager', 'settings']);

registerPreUpdateHook((event) => {
  if (event.type === 'open-app' && event.appId && autoSnapshotTargets.has(event.appId)) {
    return createSnapshot(`Pre-update: ${event.appId}`, {
      origin: 'auto',
      description: `Automatic checkpoint before opening ${event.appId}.`,
    });
  }

  if (event.type === 'system-update') {
    return createSnapshot(event.label ?? 'System update checkpoint', {
      origin: 'auto',
      description: 'Captured before applying system update.',
    });
  }

  return undefined;
});
