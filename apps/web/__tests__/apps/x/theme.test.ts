import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_EMBED_THEME,
  getNextEmbedTheme,
  useEmbedTheme,
  validateEmbedTheme,
} from '../../../apps/x/state/theme';

describe('X embed theme utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('computes the next theme', () => {
    expect(getNextEmbedTheme('light')).toBe('dark');
    expect(getNextEmbedTheme('dark')).toBe('light');
  });

  it('validates embed themes', () => {
    expect(validateEmbedTheme('light')).toBe(true);
    expect(validateEmbedTheme('dark')).toBe(true);
    expect(validateEmbedTheme('blue')).toBe(false);
    expect(validateEmbedTheme(null)).toBe(false);
  });

  it('toggles and persists the theme preference', () => {
    const { result, rerender } = renderHook(() => useEmbedTheme());
    expect(result.current.theme).toBe(DEFAULT_EMBED_THEME);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');

    rerender();
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
  });

  it('honors an initial theme when storage is empty', () => {
    const { result } = renderHook(() => useEmbedTheme('dark'));
    expect(result.current.theme).toBe('dark');
  });
});
