import {
  CURRENT_SETTINGS_SCHEMA_VERSION,
  defaults,
  getAllowNetwork,
  getDensity,
  getFontScale,
  getHaptics,
  getReducedMotion,
} from '../utils/settingsStore';

const clearIndexedDb = async () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('keyval-store');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to reset keyval-store'));
    request.onblocked = () => resolve();
  });

describe('settings schema migrations', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clearIndexedDb();
  });

  test('normalizes legacy values and records schema version', async () => {
    window.localStorage.setItem('reduced-motion', 'TRUE');
    window.localStorage.setItem('haptics', '0');
    window.localStorage.setItem('allow-network', 'YES');
    window.localStorage.setItem('density', 'tablet');
    window.localStorage.setItem('font-scale', '-5');

    await expect(getDensity()).resolves.toBe(defaults.density);
    await expect(getReducedMotion()).resolves.toBe(true);
    await expect(getHaptics()).resolves.toBe(false);
    await expect(getAllowNetwork()).resolves.toBe(false);
    await expect(getFontScale()).resolves.toBe(defaults.fontScale);

    expect(window.localStorage.getItem('reduced-motion')).toBe('true');
    expect(window.localStorage.getItem('haptics')).toBe('false');
    expect(window.localStorage.getItem('allow-network')).toBe('false');
    expect(window.localStorage.getItem('density')).toBe(defaults.density);
    expect(window.localStorage.getItem('font-scale')).toBe(String(defaults.fontScale));
    expect(window.localStorage.getItem('settings-schema-version')).toBe(
      String(CURRENT_SETTINGS_SCHEMA_VERSION),
    );
  });

  test('re-running migrations leaves normalized data untouched', async () => {
    window.localStorage.setItem('density', 'compact');
    window.localStorage.setItem('font-scale', '2.5');

    await expect(getDensity()).resolves.toBe('compact');
    expect(window.localStorage.getItem('settings-schema-version')).toBe(
      String(CURRENT_SETTINGS_SCHEMA_VERSION),
    );

    window.localStorage.setItem('settings-schema-version', '0');

    await expect(getDensity()).resolves.toBe('compact');
    await expect(getFontScale()).resolves.toBeCloseTo(2.5);
    expect(window.localStorage.getItem('font-scale')).toBe('2.5');
    expect(window.localStorage.getItem('density')).toBe('compact');
    expect(window.localStorage.getItem('settings-schema-version')).toBe(
      String(CURRENT_SETTINGS_SCHEMA_VERSION),
    );
  });

  test('rolls back when schema version update fails', async () => {
    window.localStorage.setItem('density', 'compact');

    const storageProto = Object.getPrototypeOf(window.localStorage);
    const originalSetItem = storageProto.setItem;
    let shouldFail = true;
    const setItemSpy = jest.spyOn(storageProto, 'setItem').mockImplementation(function (key, value) {
      if (shouldFail && key === 'settings-schema-version') {
        shouldFail = false;
        throw new Error('boom');
      }
      return originalSetItem.call(this, key, value);
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(getDensity()).resolves.toBe('compact');
      expect(window.localStorage.getItem('settings-schema-version')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      await expect(getDensity()).resolves.toBe('compact');
      expect(window.localStorage.getItem('settings-schema-version')).toBe(
        String(CURRENT_SETTINGS_SCHEMA_VERSION),
      );
    } finally {
      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });
});
