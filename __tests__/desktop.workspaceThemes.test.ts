import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));
jest.mock('../components/util-components/background-image', () => () => null);

const THEME_STORAGE_KEY = 'desktop_workspace_themes';

describe('Desktop workspace theme persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates stored workspace themes on mount', () => {
    const storedTheme = {
      id: 'custom-theme',
      accent: '#ff00aa',
      wallpaperUrl: '/images/custom.jpg',
      fallbackWallpaperUrl: '/images/fallback.jpg',
      wallpaperName: 'custom-wallpaper',
      blur: 24,
      overlay: 'rgba(0, 0, 0, 0.35)',
      useKaliWallpaper: false,
    };

    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify([storedTheme]));

    const desktop = new Desktop({ desktopTheme: { accent: '#123456' } });

    jest.spyOn(desktop, 'setState').mockImplementation((updater, callback) => {
      const nextState =
        typeof updater === 'function' ? updater(desktop.state, desktop.props) : updater;
      if (nextState) {
        desktop.state = { ...desktop.state, ...nextState };
      }
      if (typeof callback === 'function') {
        callback();
      }
    });

    desktop.hydrateWorkspaceThemesFromStorage();

    expect(desktop.workspaceThemes[0]).toEqual(expect.objectContaining({
      accent: storedTheme.accent,
      wallpaperUrl: storedTheme.wallpaperUrl,
      fallbackWallpaperUrl: storedTheme.fallbackWallpaperUrl,
      wallpaperName: storedTheme.wallpaperName,
      blur: storedTheme.blur,
      overlay: storedTheme.overlay,
      useKaliWallpaper: storedTheme.useKaliWallpaper,
    }));
    expect(desktop.state.currentTheme.accent).toBe(storedTheme.accent);
  });

  it('persists workspace themes when updated', () => {
    const desktop = new Desktop({ desktopTheme: { accent: '#123456' } });

    const nextTheme = {
      id: 'persisted-theme',
      accent: '#abcdef',
      wallpaperUrl: '/wallpapers/persisted.jpg',
      fallbackWallpaperUrl: '/wallpapers/persisted-fallback.jpg',
      wallpaperName: 'persisted-wallpaper',
      blur: 12,
      overlay: 'rgba(255, 255, 255, 0.1)',
      useKaliWallpaper: false,
    };

    desktop.setWorkspaceTheme(0, nextTheme);

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored ?? '[]');
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toEqual(expect.objectContaining({
      accent: nextTheme.accent,
      wallpaperUrl: nextTheme.wallpaperUrl,
      fallbackWallpaperUrl: nextTheme.fallbackWallpaperUrl,
      wallpaperName: nextTheme.wallpaperName,
      blur: nextTheme.blur,
      overlay: nextTheme.overlay,
      useKaliWallpaper: nextTheme.useKaliWallpaper,
    }));
  });
});
