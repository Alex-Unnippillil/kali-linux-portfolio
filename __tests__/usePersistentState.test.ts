import { renderHook, act, waitFor } from '@testing-library/react';
import usePersistentState from '../hooks/usePersistentState';

describe('usePersistentState storage synchronization', () => {
  let addEventListenerSpy: jest.SpyInstance;

  const dispatchStorageEvent = (data: { key: string | null; newValue: string | null }) => {
    const event = new Event('storage') as StorageEvent;
    Object.defineProperties(event, {
      key: { value: data.key, configurable: true },
      newValue: { value: data.newValue, configurable: true },
      storageArea: { value: window.localStorage, configurable: true },
    });
    window.dispatchEvent(event);
  };

  beforeEach(() => {
    window.localStorage.clear();
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  test('updates state when other tabs write to the same key', async () => {
    const { result } = renderHook(() => usePersistentState<number>('shared-key', 1));

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    act(() => {
      dispatchStorageEvent({ key: 'shared-key', newValue: JSON.stringify(42) });
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(42);
    });
  });

  test('ignores events for other keys and invalid payloads', async () => {
    const validator = (value: unknown): value is number => typeof value === 'number';
    const { result } = renderHook(() => usePersistentState<number>('another-key', 10, validator));

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    act(() => {
      dispatchStorageEvent({ key: 'irrelevant-key', newValue: JSON.stringify(20) });
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(10);
    });

    act(() => {
      dispatchStorageEvent({ key: 'another-key', newValue: '"not-a-number"' });
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(10);
    });
  });

  test('resets to the initial value when storage entry is cleared', async () => {
    const { result } = renderHook(() => usePersistentState<number>('reset-key', 5));

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    act(() => {
      result.current[1](9);
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(9);
    });

    act(() => {
      dispatchStorageEvent({ key: 'reset-key', newValue: null });
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(5);
    });
  });
});
