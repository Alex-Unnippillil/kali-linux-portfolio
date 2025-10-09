const LOADED_ACCENT = '#805ad5';

jest.mock('../utils/settingsStore', () => {
  const actual = jest.requireActual('../utils/settingsStore');
  return {
    ...actual,
    getAccent: jest.fn().mockResolvedValue('#805ad5'),
  };
});

import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getTheme, getUnlockedThemes, setTheme } from '../utils/theme';


const shadeColor = (color: string, percent: number): string => {
  const f = parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1)}`;
};


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

  test('accent updates are flushed through throttled CSS variable queue', async () => {
    const originalRaf = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;

    let nextFrameHandle = 1;
    const scheduledFrames = new Map<number, ReturnType<typeof setTimeout>>();

    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      const handle = nextFrameHandle++;
      const timeoutId = setTimeout(() => {
        scheduledFrames.delete(handle);
        cb(0);
      }, 0);
      scheduledFrames.set(handle, timeoutId);
      return handle;
    });
    window.cancelAnimationFrame = jest.fn((handle: number) => {
      const timeoutId = scheduledFrames.get(handle);
      if (timeoutId) {
        clearTimeout(timeoutId);
        scheduledFrames.delete(handle);
      }
    });

    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => {
      expect(result.current.accent).toBe(LOADED_ACCENT);
    });

    const rafMock = window.requestAnimationFrame as jest.Mock;
    const initialRafCalls = rafMock.mock.calls.length;

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe(
        LOADED_ACCENT
      );
    });

    const newAccent = '#38a169';
    const expectedBorder = shadeColor(newAccent, -0.2);

    act(() => result.current.setAccent(newAccent));

    expect(result.current.accent).toBe(newAccent);

    const afterSetRafCalls = rafMock.mock.calls.length;
    expect(afterSetRafCalls).toBeGreaterThan(initialRafCalls);

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe(
        newAccent
      );
    });
    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue('--color-ub-border-orange')
      ).toBe(expectedBorder);
    });

    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
  });
});
