import {
  getBool,
  getJson,
  migrateShellStorage,
  setBool,
  setJson,
  SHELL_STORAGE_KEYS,
} from '../../utils/storage';

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads and writes booleans', () => {
    expect(getBool(SHELL_STORAGE_KEYS.lock, false)).toBe(false);
    setBool(SHELL_STORAGE_KEYS.lock, true);
    expect(getBool(SHELL_STORAGE_KEYS.lock, false)).toBe(true);
  });

  it('reads and writes json payloads', () => {
    const payload = { enabled: true, grid: [8, 8] };
    setJson(SHELL_STORAGE_KEYS.snap, payload);
    expect(getJson(SHELL_STORAGE_KEYS.snap, null)).toEqual(payload);
  });

  it('migrates legacy shell keys', () => {
    localStorage.setItem('bg-image', 'wall-3');
    localStorage.setItem('screen-locked', 'true');
    localStorage.setItem('booting_screen', 'false');
    localStorage.setItem('shut-down', 'true');

    migrateShellStorage();

    expect(getJson(SHELL_STORAGE_KEYS.bgImage, '')).toBe('wall-3');
    expect(getBool(SHELL_STORAGE_KEYS.lock, false)).toBe(true);
    expect(getBool(SHELL_STORAGE_KEYS.bootSeen, false)).toBe(true);
    expect(getBool(SHELL_STORAGE_KEYS.shutdown, false)).toBe(true);
  });
});
