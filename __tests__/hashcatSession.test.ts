import { HashcatSessionManager, CHECKPOINT_KEY } from '../components/apps/hashcat/session';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe('HashcatSessionManager', () => {
  const originalWorker = global.Worker;

  beforeAll(() => {
    // Force fallback timers in tests for predictable control.
    // @ts-expect-error - we intentionally unset Worker for the tests.
    global.Worker = undefined;
  });

  afterAll(() => {
    // @ts-expect-error - restore potential Worker implementation.
    global.Worker = originalWorker;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createManager = (
    storage: MemoryStorage = new MemoryStorage(),
    autoCheckpointEvery = 3
  ) => new HashcatSessionManager({ storage, autoCheckpointEvery });

  it('creates checkpoints and persists them', async () => {
    const storage = new MemoryStorage();
    const manager = createManager(storage, 1000);
    manager.startSession({ target: 10, stepDelay: 20 });
    jest.advanceTimersByTime(120);
    await manager.createCheckpoint('Manual');
    const state = manager.getState();
    expect(state.checkpoints).toHaveLength(1);
    const raw = storage.getItem(CHECKPOINT_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toHaveLength(1);
  });

  it('flags corrupted storage and can reset', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHECKPOINT_KEY, '{"bad":');
    const manager = createManager(storage);
    const state = manager.getState();
    expect(state.corrupted).toBe(true);
    manager.clearCorruptedCheckpoints();
    expect(manager.getState().corrupted).toBe(false);
    expect(storage.getItem(CHECKPOINT_KEY)).toBe(JSON.stringify([]));
  });

  it('resumes from stored checkpoints', async () => {
    const manager = createManager();
    manager.startSession({ target: 12, stepDelay: 30 });
    jest.advanceTimersByTime(150);
    await manager.createCheckpoint('Manual');
    const checkpoint = manager.getState().checkpoints[0];
    expect(checkpoint.progress).toBeGreaterThan(0);

    manager.pauseSession();
    manager.resumeSession(checkpoint.id);
    const resumed = manager.getState();
    expect(resumed.status).toBe('running');
    expect(resumed.progress).toBe(checkpoint.progress);

    jest.advanceTimersByTime(120);
    expect(manager.getState().progress).toBeGreaterThan(checkpoint.progress);
  });
});
