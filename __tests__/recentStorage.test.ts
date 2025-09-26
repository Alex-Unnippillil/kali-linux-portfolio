import type { RecentEntry } from '../utils/recentStorage';

const createMemoryStorage = (backing: Record<string, string>) => {
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(backing, key) ? backing[key] : null;
    },
    setItem(key: string, value: string) {
      backing[key] = String(value);
    },
    removeItem(key: string) {
      delete backing[key];
    },
    clear() {
      Object.keys(backing).forEach((key) => delete backing[key]);
    },
    key(index: number) {
      const keys = Object.keys(backing);
      return keys[index] ?? null;
    },
    get length() {
      return Object.keys(backing).length;
    },
  } as Storage;
};

describe('recentStorage', () => {
  let store: Record<string, string>;
  let addRecentApp: (id: string) => RecentEntry[];
  let addRecentFile: (options: { path: string; title?: string }) => RecentEntry[];
  let readRecentEntries: () => RecentEntry[];
  let clearRecentEntries: () => void;
  let RECENT_STORAGE_KEY: string;

  const setLocalStorage = () => {
    const storage = createMemoryStorage(store);
    Object.defineProperty(global, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  };

  const importRecentStorage = async () => {
    const mod = await import('../utils/recentStorage');
    addRecentApp = mod.addRecentApp;
    addRecentFile = mod.addRecentFile;
    readRecentEntries = mod.readRecentEntries;
    clearRecentEntries = mod.clearRecentEntries;
    RECENT_STORAGE_KEY = mod.RECENT_STORAGE_KEY;
  };

  beforeEach(async () => {
    jest.resetModules();
    store = {};
    setLocalStorage();
    await importRecentStorage();
  });

  afterEach(() => {
    delete (global as any).localStorage;
    jest.restoreAllMocks();
  });

  it('records apps with newest first ordering and deduplication', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000);
    addRecentApp('terminal');
    nowSpy.mockReturnValueOnce(2_000);
    addRecentApp('files');
    nowSpy.mockReturnValueOnce(3_000);
    addRecentApp('terminal');

    const apps = readRecentEntries().filter((entry) => entry.type === 'app');
    expect(apps.map((entry) => [entry.id, entry.openedAt])).toEqual([
      ['terminal', 3_000],
      ['files', 2_000],
    ]);

    const stored = store[RECENT_STORAGE_KEY];
    expect(stored).toBeDefined();
    expect(JSON.parse(stored as string)).toHaveLength(2);
  });

  it('migrates legacy arrays from previous storage keys', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10_000);
    localStorage.setItem('recentApps', JSON.stringify(['browser', 'terminal']));

    const entries = readRecentEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('browser');
    expect(entries[1].id).toBe('terminal');
    expect(localStorage.getItem('recentApps')).toBeNull();
    nowSpy.mockRestore();
  });

  it('persists recent entries across module reloads', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(5_000);
    addRecentApp('terminal');
    nowSpy.mockReturnValueOnce(6_000);
    addRecentFile({ path: '/notes.txt', title: 'notes.txt' });
    nowSpy.mockRestore();

    jest.resetModules();
    setLocalStorage();
    await importRecentStorage();

    const entries = readRecentEntries();
    expect(entries).toHaveLength(2);
    const appEntry = entries.find((entry) => entry.type === 'app');
    const fileEntry = entries.find((entry) => entry.type === 'file');
    expect(appEntry?.id).toBe('terminal');
    expect(fileEntry?.meta?.path).toBe('/notes.txt');
  });

  it('clears persisted entries', () => {
    addRecentApp('terminal');
    expect(readRecentEntries()).toHaveLength(1);
    clearRecentEntries();
    expect(readRecentEntries()).toHaveLength(0);
    expect(localStorage.getItem(RECENT_STORAGE_KEY)).toBe('[]');
  });
});

