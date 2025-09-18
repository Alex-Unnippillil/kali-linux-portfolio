import { get, set, del } from 'idb-keyval';

import {
  SETTINGS_KEY,
  defaults,
  importSettings,
  loadSettings,
  migrateRecord,
  migrations,
} from '../utils/settingsStore';

describe('settingsStore schema migrations', () => {
  beforeEach(async () => {
    await del(SETTINGS_KEY).catch(() => undefined);
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  afterEach(async () => {
    await del(SETTINGS_KEY).catch(() => undefined);
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('loads defaults when no settings are stored', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(defaults);
  });

  it('upgrades version 1 records to the latest schema', async () => {
    await set(SETTINGS_KEY, {
      version: 1,
      data: {
        accent: '#ffffff',
        wallpaper: 'wall-5',
        density: 'compact',
        reducedMotion: true,
        fontScale: 1.25,
        highContrast: true,
        largeHitAreas: true,
        pongSpin: false,
        allowNetwork: true,
      },
    });

    const settings = await loadSettings();
    expect(settings.haptics).toBe(true);
    expect(settings.density).toBe('compact');

    const stored = await get(SETTINGS_KEY);
    expect(stored.version).toBeGreaterThanOrEqual(2);
  });

  it('downgrades settings when migrating to an older schema', () => {
    const record = {
      version: 2,
      data: {
        ...defaults,
        haptics: false,
      },
    };

    const { record: downgraded, migrated } = migrateRecord(record, 1);
    expect(migrated).toBe(true);
    expect(downgraded.version).toBe(1);
    expect(downgraded.data.haptics).toBeUndefined();
  });

  it('rolls back changes when a migration throws', async () => {
    const originalMigration = migrations.up.get(1);
    migrations.up.set(1, () => {
      throw new Error('boom');
    });

    try {
      await set(SETTINGS_KEY, {
        version: 1,
        data: {
          accent: '#123456',
          wallpaper: 'wall-3',
          density: 'regular',
          reducedMotion: false,
          fontScale: 1,
          highContrast: false,
          largeHitAreas: false,
          pongSpin: true,
          allowNetwork: false,
        },
      });

      const settings = await loadSettings();
      expect(settings.haptics).toBeUndefined();

      const stored = await get(SETTINGS_KEY);
      expect(stored.version).toBe(1);
    } finally {
      if (originalMigration) {
        migrations.up.set(1, originalMigration);
      } else {
        migrations.up.delete(1);
      }
    }
  });

  it('imports settings and upgrades them when required', async () => {
    await importSettings(
      JSON.stringify({
        version: 1,
        data: {
          accent: '#ff0000',
          wallpaper: 'wall-4',
          density: 'compact',
        },
      }),
    );

    const settings = await loadSettings();
    expect(settings.accent).toBe('#ff0000');
    expect(settings.haptics).toBe(true);
  });
});
