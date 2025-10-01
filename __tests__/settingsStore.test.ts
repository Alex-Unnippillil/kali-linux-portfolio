import {
  setAccent,
  setWallpaper,
  setUseKaliWallpaper,
  setDensity,
  setReducedMotion,
  setFontScale,
  setHighContrast,
  setLargeHitAreas,
  setPongSpin,
  setAllowNetwork,
  setHaptics,
  exportSettings,
  importSettings,
  resetSettings,
  getAccent,
  getWallpaper,
  getUseKaliWallpaper,
  getDensity,
  getReducedMotion,
  getFontScale,
  getHighContrast,
  getLargeHitAreas,
  getPongSpin,
  getAllowNetwork,
  getHaptics,
  defaults,
} from '../utils/settingsStore';
import { setTheme, getTheme } from '../utils/theme';

describe('settingsStore import/export', () => {
  beforeEach(async () => {
    await resetSettings();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('round-trips preferences, layout, and shortcuts', async () => {
    await setAccent('#38a169');
    await setWallpaper('wall-5');
    await setUseKaliWallpaper(true);
    await setDensity('compact');
    await setReducedMotion(true);
    await setFontScale(1.2);
    await setHighContrast(true);
    await setLargeHitAreas(true);
    await setPongSpin(false);
    await setAllowNetwork(true);
    await setHaptics(false);
    setTheme('neon');

    window.localStorage.setItem(
      'desktop-session',
      JSON.stringify({
        windows: [{ id: 'terminal', x: 200, y: 150 }],
        wallpaper: 'wall-5',
        dock: ['terminal', 'browser'],
      }),
    );
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'Shift+/',
        'Open settings': 'Cmd+,',
      }),
    );
    window.localStorage.setItem('snap-enabled', JSON.stringify(false));

    const exported = await exportSettings();
    const parsed = JSON.parse(exported);

    expect(parsed.version).toBe(1);
    expect(parsed.preferences).toMatchObject({
      accent: '#38a169',
      wallpaper: 'wall-5',
      useKaliWallpaper: true,
      density: 'compact',
      reducedMotion: true,
      fontScale: 1.2,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
      theme: 'neon',
      snapEnabled: false,
    });
    expect(parsed.layout).toMatchObject({
      wallpaper: 'wall-5',
      dock: ['terminal', 'browser'],
    });
    expect(parsed.layout.windows).toEqual([{ id: 'terminal', x: 200, y: 150 }]);
    expect(parsed.shortcuts['Show keyboard shortcuts']).toBe('Shift+/');

    await resetSettings();
    window.localStorage.clear();

    const result = await importSettings(exported);
    expect(result.success).toBe(true);

    expect(await getAccent()).toBe('#38a169');
    expect(await getWallpaper()).toBe('wall-5');
    expect(await getUseKaliWallpaper()).toBe(true);
    expect(await getDensity()).toBe('compact');
    expect(await getReducedMotion()).toBe(true);
    expect(await getFontScale()).toBeCloseTo(1.2);
    expect(await getHighContrast()).toBe(true);
    expect(await getLargeHitAreas()).toBe(true);
    expect(await getPongSpin()).toBe(false);
    expect(await getAllowNetwork()).toBe(true);
    expect(await getHaptics()).toBe(false);
    expect(getTheme()).toBe('neon');

    const storedSession = JSON.parse(window.localStorage.getItem('desktop-session') || 'null');
    expect(storedSession).toMatchObject({
      wallpaper: 'wall-5',
      dock: ['terminal', 'browser'],
    });
    expect(storedSession.windows).toEqual([{ id: 'terminal', x: 200, y: 150 }]);

    const storedShortcuts = JSON.parse(window.localStorage.getItem('keymap') || '{}');
    expect(storedShortcuts['Show keyboard shortcuts']).toBe('Shift+/');
    expect(storedShortcuts['Open settings']).toBe('Cmd+,');

    const snapSetting = JSON.parse(window.localStorage.getItem('snap-enabled') || 'null');
    expect(snapSetting).toBe(false);
  });

  it('resetSettings restores defaults and clears stored layout', async () => {
    await setAccent('#ff0000');
    await setWallpaper('wall-4');
    await setUseKaliWallpaper(true);
    await setDensity('compact');
    await setReducedMotion(true);
    await setFontScale(1.5);
    await setHighContrast(true);
    await setLargeHitAreas(true);
    await setPongSpin(false);
    await setAllowNetwork(true);
    await setHaptics(false);
    setTheme('neon');

    window.localStorage.setItem(
      'desktop-session',
      JSON.stringify({ windows: [{ id: 'notes', x: 10, y: 20 }], wallpaper: 'wall-4', dock: ['notes'] }),
    );

    await resetSettings();

    expect(await getAccent()).toBe(defaults.accent);
    expect(await getWallpaper()).toBe(defaults.wallpaper);
    expect(await getUseKaliWallpaper()).toBe(defaults.useKaliWallpaper);
    expect(await getDensity()).toBe(defaults.density);
    expect(await getReducedMotion()).toBe(defaults.reducedMotion);
    expect(await getFontScale()).toBeCloseTo(defaults.fontScale);
    expect(await getHighContrast()).toBe(defaults.highContrast);
    expect(await getLargeHitAreas()).toBe(defaults.largeHitAreas);
    expect(await getPongSpin()).toBe(defaults.pongSpin);
    expect(await getAllowNetwork()).toBe(defaults.allowNetwork);
    expect(await getHaptics()).toBe(defaults.haptics);
    expect(getTheme()).toBe('default');

    expect(window.localStorage.getItem('desktop-session')).toBeNull();
    expect(window.localStorage.getItem('keymap')).toBeNull();
    expect(window.localStorage.getItem('snap-enabled')).toBeNull();
  });
});
