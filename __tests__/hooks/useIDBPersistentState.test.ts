import { act, renderHook, waitFor } from '@testing-library/react';
import { clear as clearStore, get, set } from 'idb-keyval';

import useIDBPersistentState from '../../hooks/useIDBPersistentState';

describe('useIDBPersistentState', () => {
  beforeEach(async () => {
    await clearStore();
  });

  it('hydrates values stored in IndexedDB', async () => {
    const key = 'idb:prefs';
    await set(key, { theme: 'dark' });

    const validator = (value: unknown): value is { theme: string } =>
      typeof value === 'object' && value !== null && typeof (value as { theme?: unknown }).theme === 'string';

    const { result } = renderHook(() =>
      useIDBPersistentState(key, { theme: 'light' }, validator),
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual({ theme: 'dark' });
    });
  });

  it('persists updates and supports reset/clear helpers', async () => {
    const key = 'idb:settings';
    const { result } = renderHook(() =>
      useIDBPersistentState(key, { enabled: false }),
    );

    await waitFor(async () => {
      const stored = await get(key);
      expect(stored).toEqual({ enabled: false });
    });

    act(() => {
      result.current[1]({ enabled: true });
    });

    await waitFor(async () => {
      const stored = await get(key);
      expect(stored).toEqual({ enabled: true });
    });

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toEqual({ enabled: false });

    await waitFor(async () => {
      const stored = await get(key);
      expect(stored).toEqual({ enabled: false });
    });

    act(() => {
      result.current[1]({ enabled: true });
    });

    await waitFor(async () => {
      const stored = await get(key);
      expect(stored).toEqual({ enabled: true });
    });

    act(() => {
      result.current[3]();
    });

    expect(result.current[0]).toEqual({ enabled: false });

    await waitFor(async () => {
      const stored = await get(key);
      expect(stored).toEqual({ enabled: false });
    });
  });

  it('falls back to the initial value when validation fails', async () => {
    const key = 'idb:invalid';
    await set(key, { unexpected: true });

    const validator = (value: unknown): value is number => typeof value === 'number';

    const { result } = renderHook(() => useIDBPersistentState(key, 42, validator));

    expect(result.current[0]).toBe(42);

    await waitFor(async () => {
      const stored = await get(key);
      expect(stored).toBe(42);
    });
  });
});
