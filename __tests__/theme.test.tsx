import React, { type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';
import BodyThemeClassSync from '../components/system/BodyThemeClassSync';

describe('theme persistence', () => {
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <SettingsProvider>
      <BodyThemeClassSync />
      {children}
    </SettingsProvider>
  );

  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
        get length() {
          return storage.size;
        },
      },
    });
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    document.body.className = '';
    document.body.dataset.theme = '';
  });

  test('selected theme persists across sessions', () => {
    const { result, unmount } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    expect(getTheme()).toBe('light');
    expect(window.localStorage.getItem('app:theme')).toBe('light');

    unmount();

    const { result: next } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    expect(next.current.theme).toBe('light');
  });

  test('body receives theme class when selection changes', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => result.current.setTheme('high-contrast'));
    expect(document.body.classList.contains('theme-high-contrast')).toBe(true);
    expect(document.body.dataset.theme).toBe('high-contrast');

    act(() => result.current.setTheme('dark'));
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    expect(
      Array.from(document.body.classList).filter((cls) => cls.startsWith('theme-')).length,
    ).toBe(1);
  });

  test('getUnlockedThemes exposes all theme options', () => {
    expect(getUnlockedThemes()).toEqual(['light', 'dark', 'high-contrast']);
  });

  test('setTheme toggles dark class for dark modes', () => {
    setTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    setTheme('high-contrast');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('falls back to system preference when storage empty', () => {
    const originalMatchMedia = window.matchMedia;
    // @ts-expect-error allow mock assignment
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(getTheme()).toBe('dark');
    // @ts-expect-error allow mock assignment
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTheme()).toBe('light');
    window.matchMedia = originalMatchMedia;
  });
});
