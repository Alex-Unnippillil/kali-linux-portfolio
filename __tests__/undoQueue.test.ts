import { act, renderHook } from '@testing-library/react';
import useUndoQueue from '../hooks/useUndoQueue';

describe('useUndoQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('removes entries after expiry timeout', () => {
    const { result } = renderHook(() => useUndoQueue({ defaultTimeout: 1000 }));

    act(() => {
      result.current.enqueue({
        type: 'file-delete',
        metadata: { fileName: 'test.txt', path: '/documents' },
        undo: jest.fn(),
      });
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.entries).toHaveLength(0);
  });

  test('runs undo callback and clears entry on success', async () => {
    const { result } = renderHook(() => useUndoQueue({ defaultTimeout: 5000 }));
    const restore = jest.fn().mockResolvedValue(undefined);
    let id = '';

    act(() => {
      id = result.current.enqueue({
        type: 'file-delete',
        metadata: { fileName: 'config.json', path: '/etc' },
        undo: restore,
      });
    });

    expect(result.current.entries).toHaveLength(1);

    await act(async () => {
      const success = await result.current.undo(id);
      expect(success).toBe(true);
    });

    expect(restore).toHaveBeenCalledTimes(1);
    expect(result.current.entries).toHaveLength(0);
  });
});
