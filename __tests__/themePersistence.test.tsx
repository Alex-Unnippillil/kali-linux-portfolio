import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import { THEME_DEFINITIONS } from '../lib/theme/tokens';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';


const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  test('theme persists across sessions', () => {
    const { result, unmount } = renderHook(() => useTheme(), {
      wrapper: ThemeWrapper,
    });
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(getTheme()).toBe('dark');
    expect(window.localStorage.getItem('app:theme')).toBe('dark');
    unmount();

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
    setTheme('default');
    expect(
      document.documentElement.style.getPropertyValue('--color-bg').trim(),
    ).toBe(THEME_DEFINITIONS.default.tokens.background);

    setTheme('dark');
    expect(
      document.documentElement.style.getPropertyValue('--color-bg').trim(),
    ).toBe(THEME_DEFINITIONS.dark.tokens.background);

    setTheme('neon');
    expect(
      document.documentElement.style.getPropertyValue('--color-bg').trim(),
    ).toBe(THEME_DEFINITIONS.neon.tokens.background);
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
