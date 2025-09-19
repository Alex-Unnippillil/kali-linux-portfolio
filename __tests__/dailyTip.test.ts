import { act, renderHook } from '@testing-library/react';
import useDailyTip from '../hooks/useDailyTip';

describe('useDailyTip', () => {
  const STORAGE_KEY = 'desktop.dailyTip';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T08:00:00Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the first tip and persists the state', async () => {
    const { result, unmount } = renderHook(() => useDailyTip());

    await act(async () => {});

    expect(result.current.tip?.id).toBe('launcher-shortcut');

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored).toMatchObject({
      tipId: 'launcher-shortcut',
      lastShown: '2024-01-01',
      never: false,
    });

    act(() => result.current.dismissTip());
    expect(result.current.tip).toBeNull();

    unmount();

    const { result: second } = renderHook(() => useDailyTip());
    await act(async () => {});
    expect(second.current.tip).toBeNull();
  });

  it('rotates to the next tip on a new day', async () => {
    const { unmount } = renderHook(() => useDailyTip());
    await act(async () => {});
    unmount();

    jest.setSystemTime(new Date('2024-01-02T08:00:00Z'));

    const { result } = renderHook(() => useDailyTip());
    await act(async () => {});

    expect(result.current.tip?.id).toBe('workspace-drag');

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored).toMatchObject({
      tipId: 'workspace-drag',
      lastShown: '2024-01-02',
      never: false,
    });
  });

  it('honors the never show preference across sessions', async () => {
    const { result, unmount } = renderHook(() => useDailyTip());
    await act(async () => {});

    act(() => result.current.neverShow());
    expect(result.current.tip).toBeNull();
    expect(result.current.optedOut).toBe(true);

    let stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.never).toBe(true);

    unmount();

    jest.setSystemTime(new Date('2024-01-02T08:00:00Z'));

    const { result: second } = renderHook(() => useDailyTip());
    await act(async () => {});
    expect(second.current.optedOut).toBe(true);

    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.never).toBe(true);
  });
});
