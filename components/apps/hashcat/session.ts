import { useMemo, useSyncExternalStore } from 'react';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type HashcatSessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface SessionMetadata {
  [key: string]: unknown;
}

export interface WorkerSnapshot {
  current: number;
  target: number;
  stepDelay?: number;
}

export interface HashcatCheckpoint {
  id: string;
  createdAt: number;
  label: string | null;
  reason: 'manual' | 'auto';
  progress: number;
  metadata: SessionMetadata;
  workerState: WorkerSnapshot;
  checksum: string;
}

interface InternalState {
  status: HashcatSessionStatus;
  progress: number;
  target: number;
  metadata: SessionMetadata;
  checkpoints: HashcatCheckpoint[];
  error: string | null;
  corrupted: boolean;
}

export interface StartSessionOptions {
  target: number;
  startProgress?: number;
  metadata?: SessionMetadata;
  stepDelay?: number;
}

export interface HashcatSessionConfig {
  storage?: StorageLike | null;
  retentionLimit?: number;
  autoCheckpointEvery?: number;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

export interface SessionPublicState {
  status: HashcatSessionStatus;
  progress: number;
  target: number;
  metadata: SessionMetadata;
  checkpoints: HashcatCheckpoint[];
  error: string | null;
  corrupted: boolean;
}

type Listener = () => void;

const CHECKPOINT_KEY = 'hashcat.session.checkpoints.v1';

const createDefaultState = (): InternalState => ({
  status: 'idle',
  progress: 0,
  target: 100,
  metadata: {},
  checkpoints: [],
  error: null,
  corrupted: false,
});

const buildCheckpointFallback = async (payload: {
  progress: number;
  metadata: SessionMetadata;
  workerState: WorkerSnapshot;
  label?: string | null;
  reason: 'manual' | 'auto';
}): Promise<HashcatCheckpoint> => {
  const now = Date.now();
  const snapshot = {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    label: payload.label ?? null,
    reason: payload.reason,
    progress: payload.progress,
    metadata: payload.metadata,
    workerState: payload.workerState,
  };
  const serialized = JSON.stringify(snapshot);
  let checksum = 0;
  for (let i = 0; i < serialized.length; i += 1) {
    checksum = (checksum + serialized.charCodeAt(i) * (i + 1)) % 0xffffffff;
  }
  return { ...snapshot, checksum: checksum.toString(16) };
};

const runCheckpointWorker = async (payload: {
  progress: number;
  metadata: SessionMetadata;
  workerState: WorkerSnapshot;
  label?: string | null;
  reason: 'manual' | 'auto';
}): Promise<HashcatCheckpoint> => {
  if (typeof Worker !== 'function') {
    return buildCheckpointFallback(payload);
  }

  return new Promise<HashcatCheckpoint>((resolve) => {
    const worker = new Worker(
      new URL('./checkpoint.worker.js', import.meta.url)
    );
    const cleanup = () => {
      worker.terminate();
    };
    worker.onmessage = (event) => {
      if (event.data?.type === 'checkpoint') {
        cleanup();
        resolve(event.data.payload as HashcatCheckpoint);
      }
    };
    worker.postMessage({
      type: 'create',
      payload,
    });
  });
};

export class HashcatSessionManager {
  private state: InternalState = createDefaultState();

  private listeners: Set<Listener> = new Set();

  private storage: StorageLike | null;

  private retentionLimit: number;

  private autoCheckpointEvery: number;

  private onComplete?: () => void;

  private onProgress?: (progress: number) => void;

  private progressWorker: Worker | null = null;

  private fallbackTimer: number | null = null;

  private snapshotResolvers: ((snapshot: WorkerSnapshot) => void)[] = [];

  private lastCheckpointProgress = 0;

  private snapshot: SessionPublicState;

  constructor(config: HashcatSessionConfig = {}) {
    this.storage = config.storage ?? (typeof window !== 'undefined'
      ? window.localStorage
      : null);
    this.retentionLimit = config.retentionLimit ?? 5;
    this.autoCheckpointEvery = config.autoCheckpointEvery ?? 10;
    this.onComplete = config.onComplete;
    this.onProgress = config.onProgress;
    this.loadStoredCheckpoints();
    this.snapshot = this.toSnapshot(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SessionPublicState {
    return this.snapshot;
  }

  startSession(options: StartSessionOptions): void {
    this.cancelSession(false);
    const startProgress = options.startProgress ?? 0;
    this.state = {
      ...this.state,
      status: 'running',
      progress: startProgress,
      target: options.target,
      metadata: options.metadata ?? {},
      error: null,
    };
    this.lastCheckpointProgress = startProgress;
    this.emit();
    this.spawnProgressWorker(startProgress, options);
  }

  pauseSession(): void {
    if (this.state.status !== 'running') return;
    if (this.progressWorker) {
      this.progressWorker.postMessage({ type: 'pause' });
    }
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.state = { ...this.state, status: 'paused' };
    this.emit();
  }

  resumeSession(checkpointId?: string): void {
    if (checkpointId) {
      const checkpoint = this.state.checkpoints.find(
        (cp) => cp.id === checkpointId
      );
      if (!checkpoint) {
        this.state = {
          ...this.state,
          error: 'Checkpoint not found',
        };
        this.emit();
        return;
      }
      this.cancelSession(false);
      this.state = {
        ...this.state,
        status: 'running',
        progress: checkpoint.progress,
        target: checkpoint.workerState.target ?? checkpoint.progress,
        metadata: checkpoint.metadata,
        error: null,
      };
      this.lastCheckpointProgress = checkpoint.progress;
      this.emit();
      this.spawnProgressWorker(checkpoint.workerState.current ?? checkpoint.progress, {
        target: this.state.target,
        stepDelay: checkpoint.workerState.stepDelay,
        metadata: checkpoint.metadata,
        startProgress: checkpoint.workerState.current ?? checkpoint.progress,
      });
      return;
    }

    if (this.state.status === 'paused' && this.progressWorker) {
      this.progressWorker.postMessage({ type: 'resume' });
      this.state = { ...this.state, status: 'running' };
      this.emit();
      return;
    }

    if (this.state.status !== 'running') {
      this.spawnProgressWorker(this.state.progress, {
        target: this.state.target,
        metadata: this.state.metadata,
        startProgress: this.state.progress,
      });
      this.state = { ...this.state, status: 'running', error: null };
      this.emit();
    }
  }

  cancelSession(reset = true): void {
    this.shutdownWorkers();
    this.lastCheckpointProgress = 0;
    if (reset) {
      this.state = createDefaultState();
    } else {
      this.state = { ...this.state, status: 'idle' };
    }
    this.emit();
  }

  async createCheckpoint(
    label?: string | null,
    reason: 'manual' | 'auto' = 'manual'
  ): Promise<HashcatCheckpoint | null> {
    const snapshot = await this.requestWorkerSnapshot();
    const checkpoint = await runCheckpointWorker({
      progress: this.state.progress,
      metadata: this.state.metadata,
      workerState: snapshot,
      label: label ?? null,
      reason,
    });
    this.storeCheckpoint(checkpoint);
    this.lastCheckpointProgress = checkpoint.progress;
    return checkpoint;
  }

  deleteCheckpoint(id: string): void {
    const next = this.state.checkpoints.filter((cp) => cp.id !== id);
    this.state = { ...this.state, checkpoints: next };
    this.persistCheckpoints(next);
    this.emit();
  }

  clearCorruptedCheckpoints(): void {
    this.persistCheckpoints([]);
    this.state = {
      ...this.state,
      checkpoints: [],
      corrupted: false,
      error: null,
    };
    this.emit();
  }

  private emit(): void {
    this.snapshot = this.toSnapshot(this.state);
    this.listeners.forEach((listener) => listener());
  }

  private setProgress(progress: number): void {
    this.state = { ...this.state, progress };
    this.onProgress?.(progress);
    this.emit();
  }

  private async handleProgress(value: number): Promise<void> {
    this.setProgress(value);
    if (
      this.state.status === 'running' &&
      value - this.lastCheckpointProgress >= this.autoCheckpointEvery
    ) {
      await this.createCheckpoint(null, 'auto');
    }
    if (value >= this.state.target) {
      this.completeSession();
    }
  }

  private completeSession(): void {
    this.shutdownWorkers();
    this.state = { ...this.state, status: 'completed' };
    this.emit();
    this.onComplete?.();
  }

  private spawnProgressWorker(startAt: number, options: StartSessionOptions): void {
    const normalizedStepDelay = Math.max(10, options.stepDelay ?? 100);
    if (typeof Worker === 'function') {
      if (this.progressWorker) {
        this.progressWorker.terminate();
      }
      const worker = new Worker(
        new URL('./progress.worker.js', import.meta.url)
      );
      worker.onmessage = (event) => {
        const { data } = event;
        if (!data) return;
        if (data.type === 'progress') {
          this.handleProgress(data.current);
        } else if (data.type === 'complete') {
          this.handleProgress(data.current);
        } else if (data.type === 'snapshot') {
          const resolver = this.snapshotResolvers.shift();
          if (resolver) {
            resolver(data.payload as WorkerSnapshot);
          }
        }
      };
      worker.postMessage({
        type: 'start',
        target: options.target,
        startAt,
        stepDelay: normalizedStepDelay,
      });
      this.progressWorker = worker;
      return;
    }

    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
    }
    const stepDelay = normalizedStepDelay;
    this.fallbackTimer = setInterval(() => {
      const next = Math.min(this.state.target, this.state.progress + 1);
      this.handleProgress(next);
      if (next >= this.state.target && this.fallbackTimer !== null) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    }, stepDelay) as unknown as number;
  }

  private shutdownWorkers(): void {
    if (this.progressWorker) {
      this.progressWorker.postMessage({ type: 'cancel' });
      this.progressWorker.terminate();
      this.progressWorker = null;
    }
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private async requestWorkerSnapshot(): Promise<WorkerSnapshot> {
    if (this.progressWorker) {
      return new Promise<WorkerSnapshot>((resolve) => {
        this.snapshotResolvers.push(resolve);
        this.progressWorker?.postMessage({ type: 'snapshot' });
      });
    }
    return {
      current: this.state.progress,
      target: this.state.target,
    };
  }

  private storeCheckpoint(checkpoint: HashcatCheckpoint): void {
    const next = [checkpoint, ...this.state.checkpoints]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, this.retentionLimit);
    this.state = { ...this.state, checkpoints: next, corrupted: false };
    this.persistCheckpoints(next);
    this.emit();
  }

  private persistCheckpoints(checkpoints: HashcatCheckpoint[]): void {
    if (!this.storage) return;
    this.storage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoints));
  }

  private loadStoredCheckpoints(): void {
    if (!this.storage) return;
    const raw = this.storage.getItem(CHECKPOINT_KEY);
    if (!raw) {
      this.state = { ...this.state, checkpoints: [] };
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid checkpoint format');
      }
      const valid: HashcatCheckpoint[] = parsed.filter((item) =>
        Boolean(item?.id && typeof item.progress === 'number')
      );
      this.state = {
        ...this.state,
        checkpoints: valid
          .map((cp) => ({
            ...cp,
            label: cp.label ?? null,
            reason: cp.reason === 'auto' ? 'auto' : 'manual',
          }))
          .sort((a, b) => b.createdAt - a.createdAt),
        corrupted: valid.length !== parsed.length,
      };
    } catch (error) {
      this.state = {
        ...this.state,
        checkpoints: [],
        corrupted: true,
        error: (error as Error).message,
      };
    }
  }

  private toSnapshot(state: InternalState): SessionPublicState {
    return {
      status: state.status,
      progress: state.progress,
      target: state.target,
      metadata: { ...state.metadata },
      checkpoints: [...state.checkpoints],
      error: state.error,
      corrupted: state.corrupted,
    };
  }
}

export interface UseHashcatSessionResult extends SessionPublicState {
  startSession: (options: StartSessionOptions) => void;
  pauseSession: () => void;
  resumeSession: (checkpointId?: string) => void;
  cancelSession: (reset?: boolean) => void;
  createCheckpoint: (
    label?: string | null,
    reason?: 'manual' | 'auto'
  ) => Promise<HashcatCheckpoint | null>;
  deleteCheckpoint: (id: string) => void;
  clearCorruptedCheckpoints: () => void;
}

export const useHashcatSession = (
  config: HashcatSessionConfig = {}
): UseHashcatSessionResult => {
  const manager = useMemo(() => new HashcatSessionManager(config), []);
  const state = useSyncExternalStore(
    (listener) => manager.subscribe(listener),
    () => manager.getState(),
    () => manager.getState()
  );
  const actions = useMemo(
    () => ({
      startSession: manager.startSession.bind(manager),
      pauseSession: manager.pauseSession.bind(manager),
      resumeSession: manager.resumeSession.bind(manager),
      cancelSession: manager.cancelSession.bind(manager),
      createCheckpoint: manager.createCheckpoint.bind(manager),
      deleteCheckpoint: manager.deleteCheckpoint.bind(manager),
      clearCorruptedCheckpoints:
        manager.clearCorruptedCheckpoints.bind(manager),
    }),
    [manager]
  );

  return {
    ...state,
    ...actions,
  };
};

export { CHECKPOINT_KEY };
