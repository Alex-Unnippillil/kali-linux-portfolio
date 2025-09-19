import { renderHook, act } from '@testing-library/react';
jest.mock('idb-keyval');

import React from 'react';
import type { ReactNode } from 'react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { ProfileProvider } from '../hooks/useProfileSwitcher';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';

const { __reset } = require('idb-keyval');

const Wrapper = ({ children }: { children: ReactNode }) => (
  <ProfileProvider>
    <SettingsProvider>{children}</SettingsProvider>
  </ProfileProvider>
);

describe('theme persistence and unlocking', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    __reset();
  });

  test('theme persists across sessions', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: Wrapper,
    });
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(getTheme('default')).toBe('dark');
    expect(window.localStorage.getItem('app:theme:default')).toBe('dark');

  });

  test('themes unlock at score milestones', () => {
    const unlocked = getUnlockedThemes(600);
    expect(unlocked).toEqual(expect.arrayContaining(['default', 'neon', 'dark']));
    expect(unlocked).not.toContain('matrix');
  });

  test('dark class applied for neon and matrix themes', () => {
    setTheme('default', 'neon');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    setTheme('default', 'matrix');
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

    setTheme('default', 'default');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('white');

    setTheme('default', 'dark');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('black');

    setTheme('default', 'neon');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg')
    ).toBe('red');
  });

  test('defaults to system preference when no stored theme', () => {
    // simulate dark mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(getTheme('default')).toBe('dark');
    // simulate light mode preference
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTheme('default')).toBe('default');
  });
});
