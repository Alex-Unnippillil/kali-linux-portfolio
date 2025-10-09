jest.mock('idb-keyval', () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/theme', () => ({
  getTheme: jest.fn(() => 'default'),
  setTheme: jest.fn(),
}));

import { set as idbSet } from 'idb-keyval';
import * as settingsStore from '../utils/settingsStore';
import * as themeModule from '../utils/theme';

describe('importSettings validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies validated settings and returns the sanitized payload', async () => {
    const payload = {
      accent: '#1793d1',
      wallpaper: 'wall-4',
      useKaliWallpaper: true,
      density: 'compact',
      reducedMotion: true,
      fontScale: 1.15,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
      theme: 'dark',
    } as const;

    const result = await settingsStore.importSettings(JSON.stringify(payload));

    expect(result).toEqual(payload);
    expect(idbSet).toHaveBeenCalledWith('accent', payload.accent);
    expect(idbSet).toHaveBeenCalledWith('bg-image', payload.wallpaper);
    expect(window.localStorage.getItem('use-kali-wallpaper')).toBe('true');
    expect(window.localStorage.getItem('density')).toBe(payload.density);
    expect(window.localStorage.getItem('reduced-motion')).toBe('true');
    expect(window.localStorage.getItem('font-scale')).toBe(
      String(payload.fontScale),
    );
    expect(window.localStorage.getItem('high-contrast')).toBe('true');
    expect(window.localStorage.getItem('large-hit-areas')).toBe('true');
    expect(window.localStorage.getItem('pong-spin')).toBe('false');
    expect(window.localStorage.getItem('allow-network')).toBe('true');
    expect(window.localStorage.getItem('haptics')).toBe('false');
    expect(themeModule.setTheme).toHaveBeenCalledWith(payload.theme);
  });

  it('rejects invalid payloads and surfaces errors without applying settings', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      settingsStore.importSettings(
        JSON.stringify({ accent: 'blue', fontScale: 10 })
      ),
    ).rejects.toThrow('Settings import failed validation.');

    expect(idbSet).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('rejects malformed JSON and surfaces an error', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      settingsStore.importSettings('{ accent: #123 }'),
    ).rejects.toThrow('Settings import failed. The selected file is not valid JSON.');

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
