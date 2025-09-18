import { act, renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { getAccessibleTextColor } from '../utils/color';
import { get as getKeyval, set as setKeyval } from 'idb-keyval';

jest.mock('idb-keyval', () => ({
  get: jest.fn(async () => undefined),
  set: jest.fn(async () => undefined),
  del: jest.fn(async () => undefined),
}));

describe('accent settings validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.style.cssText = '';
    window.localStorage.clear();
  });

  test('rejects accent colors below WCAG AA contrast', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await act(async () => {});

    expect(result.current.accent).toBe('#1793d1');

    let success = true;
    await act(async () => {
      success = result.current.setAccent('#767676');
    });

    expect(success).toBe(false);
    expect(result.current.accent).toBe('#1793d1');
    expect(setKeyval).not.toHaveBeenCalledWith('accent', '#767676');
  });

  test('persists custom accent when accessible', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await act(async () => {});

    const customAccent = '#1abc9c';
    let success = false;
    await act(async () => {
      success = result.current.setAccent(customAccent);
    });

    expect(success).toBe(true);
    expect(result.current.accent).toBe(customAccent);

    await waitFor(() => {
      expect(setKeyval).toHaveBeenLastCalledWith('accent', customAccent);
    });

    const accentText = document.documentElement.style
      .getPropertyValue('--color-on-accent')
      .trim();
    expect(accentText).toBe(getAccessibleTextColor(customAccent));
  });

  test('falls back to default when stored accent fails contrast', async () => {
    const mockedGet = getKeyval as jest.MockedFunction<typeof getKeyval>;
    mockedGet.mockResolvedValueOnce('#101010');

    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(result.current.accent).toBe('#1793d1'));
    expect(mockedGet).toHaveBeenCalledWith('accent');
  });
});
