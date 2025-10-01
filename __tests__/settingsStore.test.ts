jest.mock('idb-keyval');

describe('settingsStore migrations', () => {
  const loadStore = async () => import('../utils/settingsStore');

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const idb = require('idb-keyval');
    idb.__reset();
    window.localStorage.clear();
  });

  it('writes schema version and backup on first access', async () => {
    const { getAccent } = await loadStore();

    const accent = await getAccent();

    expect(accent).toBe('#1793d1');
    expect(window.localStorage.getItem('settings-schema-version')).toBe('1');
    const backupRaw = window.localStorage.getItem('settings-backup');
    expect(backupRaw).not.toBeNull();
    const backup = JSON.parse(backupRaw!);
    expect(backup.version).toBe(1);
    expect(backup.data).toMatchObject({
      density: null,
      useKaliWallpaper: null,
    });
  });

  it('restores from backup when schema version is corrupted', async () => {
    const payload = {
      version: 1,
      createdAt: Date.now(),
      data: {
        accent: '#ff0000',
        wallpaper: 'wall-1',
        density: 'compact',
        useKaliWallpaper: true,
        reducedMotion: true,
        fontScale: 1.5,
        highContrast: true,
        largeHitAreas: true,
        pongSpin: false,
        allowNetwork: true,
        haptics: false,
        theme: 'matrix',
      },
    };
    window.localStorage.setItem('settings-schema-version', 'oops');
    window.localStorage.setItem('settings-backup', JSON.stringify(payload));

    const { getDensity, getUseKaliWallpaper } = await loadStore();

    expect(await getDensity()).toBe('compact');
    expect(await getUseKaliWallpaper()).toBe(true);
    expect(window.localStorage.getItem('settings-schema-version')).toBe('1');

    const idb = require('idb-keyval');
    await expect(idb.get('accent')).resolves.toBe('#ff0000');
  });

  it('rolls back to backup when migrations fail', async () => {
    const backup = {
      version: 0,
      createdAt: Date.now(),
      data: {
        density: 'compact',
        useKaliWallpaper: true,
        pongSpin: false,
        allowNetwork: true,
      },
    };
    window.localStorage.setItem('settings-schema-version', '0');
    window.localStorage.setItem('settings-backup', JSON.stringify(backup));
    window.localStorage.setItem('density', 'cozy');

    const idb = require('idb-keyval');
    idb.__store.set('accent', '#00ff00');
    idb.set.mockImplementationOnce(async () => {
      throw new Error('migration failure');
    });

    const { getDensity } = await loadStore();

    expect(await getDensity()).toBe('cozy');
    expect(window.localStorage.getItem('settings-schema-version')).toBe('1');

    const backupString = window.localStorage.getItem('settings-backup');
    expect(backupString).not.toBeNull();
    expect(JSON.parse(backupString!).data.density).toBe('cozy');

    await expect(idb.get('accent')).resolves.toBe('#00ff00');
  });
});
