import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';

type MediaQueryListener = (event: MediaQueryListEvent | { matches: boolean }) => void;

const createMatchMediaMock = (initialMatch = false) => {
  let match = initialMatch;
  const listeners: MediaQueryListener[] = [];

  const matchMedia = jest.fn().mockImplementation(() => {
    const mediaQueryList = {
      media: '(prefers-color-scheme: dark)',
      get matches() {
        return match;
      },
      addEventListener: jest.fn((event: string, handler: MediaQueryListener) => {
        if (event === 'change') {
          listeners.push(handler);
        }
      }),
      removeEventListener: jest.fn((event: string, handler: MediaQueryListener) => {
        if (event === 'change') {
          const index = listeners.indexOf(handler);
          if (index !== -1) listeners.splice(index, 1);
        }
      }),
      addListener: jest.fn((handler: MediaQueryListener) => {
        listeners.push(handler);
      }),
      removeListener: jest.fn((handler: MediaQueryListener) => {
        const index = listeners.indexOf(handler);
        if (index !== -1) listeners.splice(index, 1);
      }),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList;

    return mediaQueryList;
  });

  return {
    matchMedia,
    update(value: boolean) {
      match = value;
      listeners.forEach((listener) => listener({ matches: value }));
    },
  };
};

describe('theme persistence and unlocking', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    delete document.documentElement.dataset.themePreference;
    document.documentElement.className = '';
    document.documentElement.style.removeProperty('color-scheme');
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  test('theme persists across sessions', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(getTheme()).toBe('dark');
    expect(window.localStorage.getItem('app:theme')).toBe('dark');
  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(600);
    expect(unlocked).toEqual(
      expect.arrayContaining(['system', 'default', 'light', 'neon', 'dark'])
    );
    expect(unlocked).not.toContain('matrix');
  });

  test('dark class applied for neon and matrix themes', () => {
    setTheme('neon');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('matrix');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('updates CSS variables without reload', () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: grey; }
      html[data-theme='light'] { --color-bg: white; }
      html[data-theme='dark'] { --color-bg: black; }
    `;
    document.head.appendChild(style);

    setTheme('light');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('white');

    setTheme('dark');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('black');
  });

  test('system theme persists preference and follows OS changes', () => {
    const { matchMedia, update } = createMatchMediaMock(false);
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;

    setTheme('system');
    expect(getTheme()).toBe('system');
    expect(window.localStorage.getItem('app:theme')).toBe('system');
    expect(document.documentElement.dataset.themePreference).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('light');

    update(true);
    expect(document.documentElement.dataset.theme).toBe('dark');

    update(false);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

