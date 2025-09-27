jest.mock('idb-keyval', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../utils/theme', () => ({
  getTheme: jest.fn(() => 'default'),
  setTheme: jest.fn(),
}));

import { importSettings, resetSettings } from '../utils/settingsStore';
import { setTheme } from '../utils/theme';
import { set as idbSet, del as idbDel } from 'idb-keyval';

describe('settingsStore persistence', () => {
  beforeEach(() => {
    (idbSet as jest.Mock).mockResolvedValue(undefined);
    (idbDel as jest.Mock).mockResolvedValue(undefined);
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('imports settings and writes all toggles', async () => {
    await importSettings({
      accent: '#ffffff',
      wallpaper: 'wall-4',
      useKaliWallpaper: true,
      density: 'compact',
      reducedMotion: true,
      fontScale: 1.25,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
      theme: 'dark',
    });

    expect(idbSet).toHaveBeenCalledWith('accent', '#ffffff');
    expect(idbSet).toHaveBeenCalledWith('bg-image', 'wall-4');
    expect(window.localStorage.getItem('use-kali-wallpaper')).toBe('true');
    expect(window.localStorage.getItem('large-hit-areas')).toBe('true');
    expect(window.localStorage.getItem('pong-spin')).toBe('false');
    expect(window.localStorage.getItem('allow-network')).toBe('true');
    expect(window.localStorage.getItem('haptics')).toBe('false');
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('resets stored values', async () => {
    window.localStorage.setItem('large-hit-areas', 'true');
    window.localStorage.setItem('allow-network', 'true');
    window.localStorage.setItem('pong-spin', 'false');
    await resetSettings();
    expect(idbDel).toHaveBeenCalledWith('accent');
    expect(idbDel).toHaveBeenCalledWith('bg-image');
    expect(window.localStorage.getItem('large-hit-areas')).toBeNull();
    expect(window.localStorage.getItem('allow-network')).toBeNull();
    expect(window.localStorage.getItem('pong-spin')).toBeNull();
  });
});
