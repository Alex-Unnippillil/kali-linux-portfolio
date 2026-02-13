import { act, renderHook } from '@testing-library/react';
import useTrashState, {
  ConflictResolver,
  OperationSummary,
  TrashItem,
} from '../apps/trash/state';

describe('useTrashState conflict handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('keeps both with automatic rename when requested', async () => {
    const resolver: ConflictResolver = jest
      .fn()
      .mockResolvedValue({ action: 'keep-both' });
    const { result } = renderHook(() => useTrashState({ resolveConflict: resolver }));
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1 };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2 };

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(fromHistory);
    });

    await act(async () => {
      await result.current.restoreFromHistory(0);
    });

    expect(result.current.items).toEqual([
      existing,
      { ...fromHistory, title: 'App (1)' },
    ]);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  test('replaces existing entry when replace is selected', async () => {
    const resolver: ConflictResolver = jest
      .fn()
      .mockResolvedValue({ action: 'replace' });
    const { result } = renderHook(() => useTrashState({ resolveConflict: resolver }));
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1 };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2 };

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(fromHistory);
    });

    await act(async () => {
      await result.current.restoreFromHistory(0);
    });

    expect(result.current.items).toEqual([{ ...fromHistory }]);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  test('skips conflict and keeps history entry when skip is chosen', async () => {
    const resolver: ConflictResolver = jest
      .fn()
      .mockResolvedValue({ action: 'skip' });
    const { result } = renderHook(() => useTrashState({ resolveConflict: resolver }));
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1 };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2 };

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(fromHistory);
    });

    await act(async () => {
      await result.current.restoreFromHistory(0);
    });

    expect(result.current.items).toEqual([existing]);
    expect(result.current.history).toEqual([fromHistory]);
  });

  test('apply to all reuses the selected action across a batch restore', async () => {
    const resolver: ConflictResolver = jest
      .fn()
      .mockResolvedValueOnce({ action: 'keep-both', applyToAll: true });
    const { result } = renderHook(() => useTrashState({ resolveConflict: resolver }));
    const existing: TrashItem = { id: '1', title: 'Doc', closedAt: 1 };
    const fromHistory: TrashItem[] = [
      { id: '2', title: 'Doc', closedAt: 2 },
      { id: '3', title: 'Doc', closedAt: 3 },
    ];

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(fromHistory);
    });

    let summary: OperationSummary | undefined;
    await act(async () => {
      summary = await result.current.restoreAllFromHistory();
    });

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(result.current.items.map(item => item.title)).toEqual([
      'Doc',
      'Doc (1)',
      'Doc (2)',
    ]);
    expect(summary?.keptBoth).toHaveLength(2);
    expect(result.current.history).toEqual([]);
  });

  test('restoreAllFromHistory returns a detailed summary', async () => {
    const resolver: ConflictResolver = jest
      .fn()
      .mockResolvedValueOnce({ action: 'replace' })
      .mockResolvedValueOnce({ action: 'skip' });
    const { result } = renderHook(() => useTrashState({ resolveConflict: resolver }));
    const existing: TrashItem = { id: '1', title: 'Doc', closedAt: 1 };
    const conflicts: TrashItem[] = [
      { id: '2', title: 'Doc', closedAt: 2 },
      { id: '3', title: 'Doc', closedAt: 3 },
      { id: '4', title: 'Report', closedAt: 4 },
    ];

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(conflicts);
    });

    let summary: OperationSummary | undefined;
    await act(async () => {
      summary = await result.current.restoreAllFromHistory();
    });

    expect(summary).toEqual({
      restored: [{ ...conflicts[2] }],
      replaced: [{ ...conflicts[0] }],
      skipped: [{ ...conflicts[1] }],
      keptBoth: [],
    });
    expect(result.current.history).toEqual([conflicts[1]]);
    expect(result.current.items).toEqual([{ ...conflicts[0] }, conflicts[2]]);
  });
});

