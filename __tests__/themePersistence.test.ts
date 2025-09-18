import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getUnlockedThemes, setTheme, THEME_KEY } from '../utils/theme';
import * as settingsStore from '../utils/settingsStore';

jest.mock('../utils/settingsStore', () => {
  const actual = jest.requireActual('../utils/settingsStore');
  return {
    ...actual,
    getAccent: jest.fn().mockResolvedValue(actual.defaults.accent),
    setAccent: jest.fn().mockResolvedValue(undefined),
    getWallpaper: jest.fn().mockResolvedValue(actual.defaults.wallpaper),
    setWallpaper: jest.fn().mockResolvedValue(undefined),
    getDensity: jest.fn().mockResolvedValue(actual.defaults.density),
    setDensity: jest.fn().mockResolvedValue(undefined),
    getReducedMotion: jest.fn().mockResolvedValue(actual.defaults.reducedMotion),
    setReducedMotion: jest.fn().mockResolvedValue(undefined),
    getFontScale: jest.fn().mockResolvedValue(actual.defaults.fontScale),
    setFontScale: jest.fn().mockResolvedValue(undefined),
    getHighContrast: jest.fn().mockResolvedValue(actual.defaults.highContrast),
    setHighContrast: jest.fn().mockResolvedValue(undefined),
    getLargeHitAreas: jest.fn().mockResolvedValue(actual.defaults.largeHitAreas),
    setLargeHitAreas: jest.fn().mockResolvedValue(undefined),
    getPongSpin: jest.fn().mockResolvedValue(actual.defaults.pongSpin),
    setPongSpin: jest.fn().mockResolvedValue(undefined),
    getAllowNetwork: jest.fn().mockResolvedValue(actual.defaults.allowNetwork),
    setAllowNetwork: jest.fn().mockResolvedValue(undefined),
    getHaptics: jest.fn().mockResolvedValue(actual.defaults.haptics),
    setHaptics: jest.fn().mockResolvedValue(undefined),
  };
});

const originalMatchMedia = window.matchMedia;

const setupBroadcastChannelMock = () => {
  type BroadcastPayload = { type?: string; theme?: string; source?: string };
  type Listener = (event: MessageEvent<BroadcastPayload>) => void;

  const channels = new Map<string, Set<MockBroadcastChannel>>();

  class MockBroadcastChannel {
    public name: string;
    private listeners: Set<Listener> = new Set();

    constructor(name: string) {
      this.name = name;
      if (!channels.has(name)) {
        channels.set(name, new Set());
      }
      channels.get(name)!.add(this);
    }

    postMessage(message: BroadcastPayload) {
      const targets = channels.get(this.name);
      if (!targets) return;
      targets.forEach((channel) => {
        channel.listeners.forEach((listener) => {
          listener({ data: message } as MessageEvent<BroadcastPayload>);
        });
      });
    }

    addEventListener(type: string, listener: Listener) {
      if (type !== 'message') return;
      this.listeners.add(listener);
    }

    removeEventListener(type: string, listener: Listener) {
      if (type !== 'message') return;
      this.listeners.delete(listener);
    }

    close() {
      const targets = channels.get(this.name);
      if (!targets) return;
      targets.delete(this);
      this.listeners.clear();
    }
  }

  const previous = (window as any).BroadcastChannel;
  (window as any).BroadcastChannel = MockBroadcastChannel;

  return () => {
    if (previous) {
      (window as any).BroadcastChannel = previous;
    } else {
      delete (window as any).BroadcastChannel;
    }
    channels.clear();
  };
};

const asMock = <T extends (...args: any[]) => any>(fn: T) =>
  fn as unknown as jest.MockedFunction<T>;

const setupMatchMediaMock = (initial = false) => {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mock = jest.fn().mockImplementation(() => ({
    media: '(prefers-color-scheme: dark)',
    get matches() {
      return matches;
    },
    addEventListener: (event: string, callback: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.add(callback);
    },
    removeEventListener: (event: string, callback: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.delete(callback);
    },
    addListener: (callback: (event: MediaQueryListEvent) => void) => {
      listeners.add(callback);
    },
    removeListener: (callback: (event: MediaQueryListEvent) => void) => {
      listeners.delete(callback);
    },
    dispatchEvent: () => true,
  }));

  // @ts-ignore
  window.matchMedia = mock;

  return {
    setMatches(value: boolean) {
      matches = value;
      listeners.forEach((listener) =>
        listener({
          matches: value,
          media: '(prefers-color-scheme: dark)',
        } as MediaQueryListEvent),
      );
    },
  };
};

const renderSettingsHook = async () => {
  const hook = renderHook(() => useSettings(), { wrapper: SettingsProvider });
  await act(async () => {
    await Promise.resolve();
  });
  return hook;
};

describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    delete document.documentElement.dataset.themePreference;
    document.documentElement.className = '';
    jest.clearAllMocks();
    const defaults = settingsStore.defaults;
    asMock(settingsStore.getAccent).mockResolvedValue(defaults.accent);
    asMock(settingsStore.getWallpaper).mockResolvedValue(defaults.wallpaper);
    asMock(settingsStore.getDensity).mockResolvedValue(defaults.density);
    asMock(settingsStore.getReducedMotion).mockResolvedValue(defaults.reducedMotion);
    asMock(settingsStore.getFontScale).mockResolvedValue(defaults.fontScale);
    asMock(settingsStore.getHighContrast).mockResolvedValue(defaults.highContrast);
    asMock(settingsStore.getLargeHitAreas).mockResolvedValue(defaults.largeHitAreas);
    asMock(settingsStore.getPongSpin).mockResolvedValue(defaults.pongSpin);
    asMock(settingsStore.getAllowNetwork).mockResolvedValue(defaults.allowNetwork);
    asMock(settingsStore.getHaptics).mockResolvedValue(defaults.haptics);
    asMock(settingsStore.setAccent).mockResolvedValue(undefined);
    asMock(settingsStore.setWallpaper).mockResolvedValue(undefined);
    asMock(settingsStore.setDensity).mockResolvedValue(undefined);
    asMock(settingsStore.setReducedMotion).mockResolvedValue(undefined);
    asMock(settingsStore.setFontScale).mockResolvedValue(undefined);
    asMock(settingsStore.setHighContrast).mockResolvedValue(undefined);
    asMock(settingsStore.setLargeHitAreas).mockResolvedValue(undefined);
    asMock(settingsStore.setPongSpin).mockResolvedValue(undefined);
    asMock(settingsStore.setAllowNetwork).mockResolvedValue(undefined);
    asMock(settingsStore.setHaptics).mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.clearAllMocks();
  });

  test('theme persists across sessions', async () => {
    const { result } = await renderSettingsHook();
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(getTheme()).toBe('dark');
    expect(window.localStorage.getItem('app:theme')).toBe('dark');
    expect(document.documentElement.dataset.themePreference).toBe('dark');

  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(600);
    expect(unlocked).toEqual(
      expect.arrayContaining(['default', 'high-contrast', 'system', 'neon', 'dark']),
    );
    expect(unlocked).not.toContain('matrix');
  });

  test('dark class applied for neon, matrix, and high contrast themes', () => {
    setTheme('neon');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('matrix');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('high-contrast');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('updates CSS variables without reload', () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: white; }
      html[data-theme='dark'] { --color-bg: black; }
      html[data-theme='neon'] { --color-bg: red; }
      html[data-theme='high-contrast'] { --color-bg: rgb(255, 255, 0); }
    `;
    document.head.appendChild(style);

    setTheme('default');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('white');

    setTheme('dark');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('black');

    setTheme('neon');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('red');

    setTheme('high-contrast');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
    ).toBe('rgb(255, 255, 0)');
  });

  test('defaults to system preference when no stored theme', () => {
    setupMatchMediaMock(true);
    expect(getTheme()).toBe('dark');
    setupMatchMediaMock(false);
    expect(getTheme()).toBe('default');
  });

  test('system theme follows OS preference changes', async () => {
    const controller = setupMatchMediaMock(false);
    const { result } = await renderSettingsHook();

    act(() => result.current.setTheme('system'));
    expect(result.current.theme).toBe('system');
    expect(window.localStorage.getItem('app:theme')).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('default');
    expect(document.documentElement.dataset.themePreference).toBe('system');

    act(() => {
      controller.setMatches(true);
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('app:theme')).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.themePreference).toBe('system');

    act(() => {
      controller.setMatches(false);
    });
    expect(document.documentElement.dataset.theme).toBe('default');
    expect(window.localStorage.getItem('app:theme')).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.dataset.themePreference).toBe('system');
  });

  test('responds to storage theme changes from other contexts', async () => {
    const { result, unmount } = await renderSettingsHook();

    await act(async () => {
      window.localStorage.setItem(THEME_KEY, 'dark');
      const event = new StorageEvent('storage', {
        key: THEME_KEY,
        newValue: 'dark',
      });
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    unmount();
  });

  test('broadcast channel syncs theme updates across instances', async () => {
    const restoreBroadcast = setupBroadcastChannelMock();

    try {
      const first = await renderSettingsHook();
      const second = await renderSettingsHook();

      act(() => {
        first.result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(second.result.current.theme).toBe('dark');
      });

      first.unmount();
      second.unmount();
    } finally {
      restoreBroadcast();
    }
  });
});
