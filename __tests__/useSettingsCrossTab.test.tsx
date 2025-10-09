import { act, renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { THEME_KEY } from '../utils/theme';

describe('useSettings cross-tab synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
  });

  test('updates allowNetwork in response to StorageEvent and notifies subscribers', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    const events: StorageEvent[] = [];
    let unsubscribe: () => void = () => {};

    act(() => {
      unsubscribe = result.current.subscribeToCrossTabChanges((event) => {
        events.push(event);
      });
    });

    act(() => {
      window.localStorage.setItem('allow-network', 'true');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'allow-network',
          newValue: 'true',
          storageArea: window.localStorage,
        })
      );
    });

    await waitFor(() => expect(result.current.allowNetwork).toBe(true));
    expect(events).toHaveLength(1);
    expect(events[0]?.key).toBe('allow-network');

    act(() => {
      unsubscribe();
    });
  });

  test('updates theme in response to StorageEvent across tabs', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    act(() => {
      window.localStorage.setItem(THEME_KEY, 'matrix');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_KEY,
          newValue: 'matrix',
          storageArea: window.localStorage,
        })
      );
    });

    await waitFor(() => expect(result.current.theme).toBe('matrix'));
    expect(document.documentElement.dataset.theme).toBe('matrix');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
