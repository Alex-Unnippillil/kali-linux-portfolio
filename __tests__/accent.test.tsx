import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

jest.mock('idb-keyval', () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn(),
  del: jest.fn(),
}));

describe('accent theming', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
    window.localStorage.clear();
  });

  it('updates CSS variables when accent changes', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    const option = ACCENT_OPTIONS.find((entry) => entry.value !== defaults.accent);
    expect(option).toBeDefined();

    await waitFor(() => {
      expect(result.current.accent).toBe(defaults.accent);
    });

    await act(async () => {
      result.current.setAccent(option!.value);
    });

    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue('--color-accent')
      ).toBe(option!.value);
      expect(
        document.documentElement.style.getPropertyValue('--color-focus-ring')
      ).toBe(option!.value);
      expect(
        document.documentElement.style.getPropertyValue('--color-ub-orange')
      ).toBe(option!.value);
      expect(
        document.documentElement.style.getPropertyValue('--focus-outline-color')
      ).toBe(option!.value);
    });
  });

  it('falls back to default accent when stored value is missing', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => {
      expect(result.current.accent).toBe(defaults.accent);
    });

    expect(
      document.documentElement.style.getPropertyValue('--color-accent')
    ).toBe(defaults.accent);
    expect(
      document.documentElement.style.getPropertyValue('--color-ub-orange')
    ).toBe(defaults.accent);
  });
});
