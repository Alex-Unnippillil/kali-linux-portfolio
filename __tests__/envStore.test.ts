import {
  __resetEnvStoreForTests,
  EnvEntry,
  deleteKey,
  getEntries,
  getValue,
  setValue,
  subscribe,
  validateKey,
} from '../utils/envStore';

const findEntry = (entries: EnvEntry[], key: string) =>
  entries.find((entry) => entry.key === key);

describe('envStore', () => {
  beforeEach(() => {
    __resetEnvStoreForTests();
  });

  it('validates keys and prevents reserved overrides', () => {
    const invalid = setValue(0, 'bad key', 'value');
    expect(invalid.success).toBe(false);
    expect(invalid.error).toMatch(/uppercase/i);

    const tooLongKey = 'A'.repeat(70);
    const tooLong = validateKey(tooLongKey);
    expect(tooLong.valid).toBe(false);
    expect(tooLong.message).toMatch(/fewer/i);

    const reserved = setValue(0, 'PATH', '/tmp');
    expect(reserved.success).toBe(false);
    expect(reserved.warning).toBeDefined();
  });

  it('notifies subscribers when values change', () => {
    const updates: EnvEntry[][] = [];
    const unsubscribe = subscribe(0, (entries) => {
      updates.push(entries);
    });

    expect(updates.length).toBe(1);
    expect(findEntry(updates[0], 'PATH')).toBeDefined();

    const created = setValue(0, 'API_URL', 'https://example.local');
    expect(created.success).toBe(true);
    expect(updates.length).toBeGreaterThan(1);

    const latest = updates[updates.length - 1];
    const stored = findEntry(latest, 'API_URL');
    expect(stored).toBeDefined();
    expect(stored?.value).toBe('https://example.local');

    unsubscribe();
  });

  it('isolates values per workspace and supports deletion', () => {
    setValue(0, 'TOKEN', 'ws0-token');
    setValue(1, 'TOKEN', 'ws1-token');

    expect(getValue(0, 'TOKEN')).toBe('ws0-token');
    expect(getValue(1, 'TOKEN')).toBe('ws1-token');

    const workspaceOneUpdates: EnvEntry[][] = [];
    const unsubscribe = subscribe(1, (entries) => {
      workspaceOneUpdates.push(entries);
    });

    const initialCount = workspaceOneUpdates.length;
    setValue(0, 'API_KEY', 'abc');
    expect(workspaceOneUpdates.length).toBe(initialCount);

    setValue(1, 'API_KEY', 'def');
    expect(workspaceOneUpdates.length).toBeGreaterThan(initialCount);
    const latest = workspaceOneUpdates[workspaceOneUpdates.length - 1];
    expect(findEntry(latest, 'API_KEY')?.value).toBe('def');

    const removal = deleteKey(1, 'TOKEN');
    expect(removal.success).toBe(true);
    const afterRemoval = getEntries(1);
    expect(findEntry(afterRemoval, 'TOKEN')).toBeUndefined();

    unsubscribe();
  });
});
