import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import {
  applyHighContrastPreference,
  getTheme,
  getUnlockedThemes,
  setTheme,
} from '../utils/theme';


describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const localStorageMock: Storage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
    window.localStorage.clear();
    // @ts-ignore provide default stub
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    document.documentElement.dataset.colorScheme = '';
    document.documentElement.dataset.contrast = '';
    document.documentElement.style.colorScheme = '';
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
    expect(unlocked).toEqual(expect.arrayContaining(['default', 'neon', 'dark']));
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
      :root { --color-bg: white; }
      html[data-theme='dark'] { --color-bg: black; }
      html[data-theme='neon'] { --color-bg: red; }
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
  });

  test('setTheme maps to color-scheme tokens', () => {
    setTheme('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.dataset.colorScheme).toBe('dark');

    setTheme('default');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.documentElement.dataset.colorScheme).toBe('light');
  });

  test('defaults to system preference when no stored theme', () => {
    // simulate dark mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(getTheme()).toBe('dark');
    // simulate light mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTheme()).toBe('default');
  });

  test('high contrast tokens respond to prefers-contrast media query', () => {
    const originalMatchMedia = window.matchMedia;
    // @ts-ignore
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-contrast: more'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: white; --color-text: black; }
      .high-contrast { --color-bg: black; --color-text: white; }
    `;
    document.head.appendChild(style);

    window.localStorage.removeItem('high-contrast');
    const enabled = applyHighContrastPreference();
    expect(enabled).toBe(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    const computed = getComputedStyle(document.documentElement);
    expect(computed.getPropertyValue('--color-bg').trim()).toBe('black');
    expect(computed.getPropertyValue('--color-text').trim()).toBe('white');

    document.head.removeChild(style);
    window.matchMedia = originalMatchMedia;
  });

  test('manual contrast override beats system preference', () => {
    const originalMatchMedia = window.matchMedia;
    window.localStorage.setItem('high-contrast', 'false');
    // @ts-ignore
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-contrast: more'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const enabled = applyHighContrastPreference();
    expect(enabled).toBe(false);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    expect(document.documentElement.dataset.contrast).toBe('standard');

    window.matchMedia = originalMatchMedia;
  });
});
