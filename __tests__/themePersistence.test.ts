import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';


const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('theme persistence and unlocking', () => {
  let desktop: HTMLElement;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    const existing = document.getElementById('desktop');
    if (existing) existing.remove();
    desktop = document.createElement('main');
    desktop.id = 'desktop';
    document.body.appendChild(desktop);
  });

  afterEach(() => {
    if (desktop && desktop.parentNode) {
      desktop.parentNode.removeChild(desktop);
    }
  });

  test('theme persists across sessions', () => {
    const { result, unmount } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });
    act(() => result.current.setTheme('kali-blue-deep'));
    expect(result.current.theme).toBe('kali-blue-deep');
    expect(getTheme()).toBe('kali-blue-deep');
    expect(window.localStorage.getItem('app:theme')).toBe('kali-blue-deep');
    unmount();

  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(0);
    expect(unlocked).toEqual(expect.arrayContaining(['kali-dark', 'kali-blue-deep']));
  });

  test('dark class applied for Kali themes', () => {
    setTheme('kali-blue-deep');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('kali-dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('updates CSS variables without reload', () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: white; }
      #desktop[data-theme='kali-dark'] { --color-bg: black; }
      #desktop[data-theme='kali-blue-deep'] { --color-bg: red; }
    `;
    document.head.appendChild(style);

    setTheme('kali-dark');
    expect(getComputedStyle(desktop).getPropertyValue('--color-bg')).toBe('black');

    setTheme('kali-blue-deep');
    expect(getComputedStyle(desktop).getPropertyValue('--color-bg')).toBe('red');
  });

  test('defaults to system preference when no stored theme', () => {
    // simulate dark mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(getTheme()).toBe('kali-dark');
    // simulate light mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTheme()).toBe('kali-blue-deep');
  });
});
