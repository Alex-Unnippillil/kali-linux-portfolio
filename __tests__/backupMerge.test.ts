import type { MergeAuditEntry, MergeDecisionMap, BackupBuckets } from '../utils/backupMerge';

describe('backupMerge utilities', () => {
  const setupStorage = () => {
    const store = new Map<string, string>();
    const storageMock = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    } as Storage;

    Object.defineProperty(global, 'localStorage', {
      value: storageMock,
      configurable: true,
    });
  };

  afterEach(() => {
    delete (global as any).localStorage;
  });

  test('mergeSnapshots resolves conflicts deterministically', async () => {
    const { mergeSnapshots } = await import('../utils/backupMerge');

    const local: BackupBuckets = {
      settings: { accent: 'blue', theme: 'default' },
      progress: { level: 2 },
    };
    const incoming: BackupBuckets = {
      settings: { accent: 'red', theme: 'default', wallpaper: 'wall-2' },
      progress: { level: 3 },
    };
    const decisions: MergeDecisionMap = {
      settings: 'incoming',
      progress: 'local',
    };

    const { merged, auditEntries } = mergeSnapshots(local, incoming, decisions);

    expect(merged.settings).toEqual({ accent: 'red', theme: 'default', wallpaper: 'wall-2' });
    expect(merged.progress).toEqual({ level: 2 });

    expect(auditEntries).toHaveLength(2);
    expect(auditEntries[0].bucket).toBe('progress');
    expect(auditEntries[0].decision).toBe('local');
    expect(auditEntries[0].changedKeys).toContain('level');
    expect(auditEntries[1].bucket).toBe('settings');
    expect(auditEntries[1].decision).toBe('incoming');
    expect(auditEntries[1].changedKeys).toEqual(['accent', 'wallpaper']);
  });

  test('appendAuditEntries persists sorted audit log', async () => {
    jest.resetModules();
    setupStorage();
    const { appendAuditEntries, loadAuditLog, clearAuditLog } = await import('../utils/backupMerge');

    clearAuditLog();

    const entries: MergeAuditEntry[] = [
      {
        id: '2-b',
        bucket: 'bucket-b',
        decision: 'incoming',
        changedKeys: ['beta'],
        timestamp: 2,
      },
      {
        id: '1-a',
        bucket: 'bucket-a',
        decision: 'local',
        changedKeys: ['alpha'],
        timestamp: 1,
      },
    ];

    let combined = appendAuditEntries(entries);
    expect(combined.map((entry) => entry.id)).toEqual(['1-a', '2-b']);

    combined = appendAuditEntries([
      {
        id: '3-c',
        bucket: 'bucket-c',
        decision: 'incoming',
        changedKeys: ['charlie'],
        timestamp: 3,
      },
    ]);

    expect(combined.map((entry) => entry.id)).toEqual(['1-a', '2-b', '3-c']);
    expect(loadAuditLog().map((entry) => entry.id)).toEqual(['1-a', '2-b', '3-c']);
  });
});
