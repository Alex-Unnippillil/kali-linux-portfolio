import { act, renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../../hooks/useSettings';
import { defaults, getBodyFont, getCodeFont } from '../../utils/settingsStore';

describe('useSettings typography preferences', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
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
      },
      configurable: true,
    });
    window.localStorage.clear();
    document.documentElement.removeAttribute('style');
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });
    document.body.style.fontFamily = '';
  });

  test('persists font selections to storage and CSS variables', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(result.current.bodyFont).toBeDefined();
    });

    act(() => {
      result.current.setBodyFont('system');
      result.current.setCodeFont('system-mono');
      result.current.setAntialiasing('grayscale');
      result.current.setHinting('precision');
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('font-body')).toBe('system');
      expect(window.localStorage.getItem('font-code')).toBe('system-mono');
      expect(window.localStorage.getItem('font-antialiasing')).toBe('grayscale');
      expect(window.localStorage.getItem('font-hinting')).toBe('precision');
    });

    expect(result.current.bodyFont).toBe('system');
    expect(result.current.codeFont).toBe('system-mono');
    expect(document.documentElement.style.getPropertyValue('--font-family-body')).toContain('system-ui');
    expect(document.documentElement.style.getPropertyValue('--font-family-code')).toContain('SFMono-Regular');
    expect(document.body.style.fontFamily).toContain('system-ui');
    expect(document.documentElement.style.getPropertyValue('--font-smoothing-webkit')).toBe('antialiased');
    expect(document.documentElement.style.getPropertyValue('--font-text-rendering')).toBe('geometricPrecision');
  });

  test('restores persisted typography preferences on mount', async () => {
    window.localStorage.setItem('font-body', 'inter');
    window.localStorage.setItem('font-code', 'jetbrains-mono');
    window.localStorage.setItem('font-antialiasing', 'grayscale');
    window.localStorage.setItem('font-hinting', 'legibility');

    await expect(getBodyFont()).resolves.toBe('inter');
    await expect(getCodeFont()).resolves.toBe('jetbrains-mono');

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.bodyFont).toBe('inter');
      expect(document.documentElement.dataset.codeFont).toBe('jetbrains-mono');
    });

    expect(result.current.bodyFont).toBe('inter');
    expect(result.current.codeFont).toBe('jetbrains-mono');
    expect(document.documentElement.style.getPropertyValue('--font-family-body')).toContain('Inter');
    expect(document.documentElement.style.getPropertyValue('--font-family-code')).toContain('JetBrains Mono');
    expect(document.documentElement.style.getPropertyValue('--font-smoothing-webkit')).toBe('antialiased');
    expect(document.documentElement.style.getPropertyValue('--font-text-rendering')).toBe('optimizeLegibility');
    expect(result.current.antialiasing).toBe('grayscale');
    expect(result.current.hinting).toBe('legibility');
  });

  test('falls back to defaults when persisted values are invalid', async () => {
    window.localStorage.setItem('font-body', 'unknown');
    window.localStorage.setItem('font-code', 'weird');
    window.localStorage.setItem('font-antialiasing', 'other');
    window.localStorage.setItem('font-hinting', 'mystery');

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(result.current.bodyFont).toBe(defaults.bodyFont);
      expect(result.current.codeFont).toBe(defaults.codeFont);
    });

    expect(result.current.antialiasing).toBe(defaults.antialiasing);
    expect(result.current.hinting).toBe(defaults.hinting);
  });
});
