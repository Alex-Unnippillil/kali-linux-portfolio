import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';

describe('theme persistence and auto mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
  });

  test('theme persists across sessions', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });
    act(() => result.current.setTheme('kali-light'));
    expect(result.current.theme).toBe('kali-light');
    expect(getTheme()).toBe('kali-light');
    expect(window.localStorage.getItem('app:theme')).toBe('kali-light');
  });

  test('returns all themes as unlocked', () => {
    const unlocked = getUnlockedThemes(0);
    expect(unlocked).toEqual(expect.arrayContaining(['auto', 'kali-dark', 'kali-light']));
  });

  test('dark class applied for dark theme only', () => {
    setTheme('kali-dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('kali-light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('updates CSS variables without reload', () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: white; }
      html[data-theme='kali-dark'] { --color-bg: black; }
      html[data-theme='kali-light'] { --color-bg: red; }
    `;
    document.head.appendChild(style);

    setTheme('kali-dark');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('black');

    setTheme('kali-light');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('red');
  });

  test('auto theme follows system preference', () => {
    // simulate dark mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    setTheme('auto');
    expect(document.documentElement.dataset.theme).toBe('kali-dark');
    // simulate light mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    setTheme('auto');
    expect(document.documentElement.dataset.theme).toBe('kali-light');
  });
});
