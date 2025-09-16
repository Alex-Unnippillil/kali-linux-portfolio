import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getThemePreferences, getUnlockedThemes, setTheme } from '../utils/theme';


describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
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

  test('persists accent and wallpaper per theme', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() =>
      expect(getThemePreferences(result.current.theme)).not.toEqual({}),
    );

    act(() => {
      result.current.setAccent('#e53e3e');
      result.current.setWallpaper('wall-3');
    });

    expect(getThemePreferences('default')).toEqual(
      expect.objectContaining({ accent: '#e53e3e', wallpaper: 'wall-3' }),
    );

    act(() => {
      result.current.setTheme('dark');
    });

    act(() => {
      result.current.setAccent('#38a169');
      result.current.setWallpaper('wall-4');
    });

    expect(getThemePreferences('dark')).toEqual(
      expect.objectContaining({ accent: '#38a169', wallpaper: 'wall-4' }),
    );

    act(() => {
      result.current.setTheme('default');
    });

    expect(result.current.accent).toBe('#e53e3e');
    expect(result.current.wallpaper).toBe('wall-3');
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
});
