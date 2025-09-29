jest.mock('idb-keyval', () => ({
  get: jest.fn(() => Promise.resolve(undefined)),
  del: jest.fn(() => Promise.resolve()),
}));

const LEGACY_KEYS = [
  'use-kali-wallpaper',
  'density',
  'reduced-motion',
  'font-scale',
  'high-contrast',
  'large-hit-areas',
  'pong-spin',
  'allow-network',
  'haptics',
];

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    const { get, del } = require('idb-keyval') as {
      get: jest.Mock;
      del: jest.Mock;
    };
    get.mockClear();
    del.mockClear();
  });

  it('returns defaults when no stored preferences are present', async () => {
    const { defaults, getPreferences } = await import('../utils/settingsStore');
    const preferences = await getPreferences();
    expect(preferences).toEqual(defaults);
  });

  it('migrates legacy storage into the current schema version', async () => {
    const { get, del } = require('idb-keyval') as {
      get: jest.Mock;
      del: jest.Mock;
    };
    get.mockImplementation((key: string) => {
      if (key === 'accent') return Promise.resolve('legacy-accent');
      if (key === 'bg-image') return Promise.resolve('legacy-wall');
      return Promise.resolve(undefined);
    });

    localStorage.setItem('use-kali-wallpaper', 'true');
    localStorage.setItem('density', 'compact');
    localStorage.setItem('reduced-motion', 'true');
    localStorage.setItem('font-scale', '1.25');
    localStorage.setItem('high-contrast', 'true');
    localStorage.setItem('large-hit-areas', 'true');
    localStorage.setItem('pong-spin', 'false');
    localStorage.setItem('allow-network', 'true');
    localStorage.setItem('haptics', 'false');

    const { getPreferences, preferencesSchema } = await import('../utils/settingsStore');
    const preferences = await getPreferences();

    expect(preferences).toMatchObject({
      accent: 'legacy-accent',
      wallpaper: 'legacy-wall',
      useKaliWallpaper: true,
      density: 'compact',
      reducedMotion: true,
      fontScale: 1.25,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
    });

    const stored = localStorage.getItem('app:preferences');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.version).toBe(preferencesSchema.version);
    expect(parsed.data.accent).toBe('legacy-accent');

    expect(del).toHaveBeenCalledWith('accent');
    expect(del).toHaveBeenCalledWith('bg-image');
    for (const key of LEGACY_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });
});
