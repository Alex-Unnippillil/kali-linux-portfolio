import { act, renderHook, waitFor } from '@testing-library/react';
import useTrashState, { TrashItem } from '../apps/trash/state';

describe('useTrashState restoreFromHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renames on conflict when confirmed', () => {
    const { result } = renderHook(() => useTrashState());
    const existing: TrashItem = {
      id: '1',
      title: 'App',
      closedAt: 1,
      originalPath: '/apps/app',
    };
    const fromHistory: TrashItem = {
      id: '2',
      title: 'App',
      closedAt: 2,
      originalPath: '/apps/app',
    };

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(fromHistory);
    });

    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const prompt = jest
      .spyOn(window, 'prompt')
      .mockReturnValue('App (1)');

    act(() => {
      result.current.restoreFromHistory(0);
    });

    expect(result.current.items).toEqual([
      existing,
      { ...fromHistory, title: 'App (1)' },
    ]);

    confirm.mockRestore();
    prompt.mockRestore();
  });

  test('replaces on confirm', () => {
    const { result } = renderHook(() => useTrashState());
    const existing: TrashItem = {
      id: '1',
      title: 'App',
      closedAt: 1,
      originalPath: '/apps/app',
    };
    const fromHistory: TrashItem = {
      id: '2',
      title: 'App',
      closedAt: 2,
      originalPath: '/apps/app',
    };

    act(() => {
      result.current.setItems([existing]);
      result.current.pushHistory(fromHistory);
    });

    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    act(() => {
      result.current.restoreFromHistory(0);
    });

    expect(result.current.items).toEqual([{ ...fromHistory }]);

    confirm.mockRestore();
  });
});

describe('useTrashState item lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('removeItem moves entry to history', async () => {
    const { result } = renderHook(() => useTrashState());
    const item: TrashItem = {
      id: 'demo',
      title: 'Demo',
      closedAt: Date.now(),
      originalPath: '/apps/demo',
    };

    await act(async () => {
      result.current.setItems([item]);
    });

    await waitFor(() => expect(result.current.items).toEqual([item]));

    let removed: TrashItem | undefined;
    await act(async () => {
      removed = result.current.removeItem(0) ?? undefined;
    });

    expect(removed).toEqual(item);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.history).toContainEqual(item);
  });

  test('restoreItem returns removed entry', async () => {
    const { result } = renderHook(() => useTrashState());
    const item: TrashItem = {
      id: 'demo',
      title: 'Demo',
      closedAt: Date.now(),
      originalPath: '/apps/demo',
    };

    await act(async () => {
      result.current.setItems([item]);
    });

    await waitFor(() => expect(result.current.items).toEqual([item]));

    let restored: TrashItem | undefined;
    await act(async () => {
      restored = result.current.restoreItem(0) ?? undefined;
    });

    expect(restored).toEqual(item);
    expect(result.current.items).toHaveLength(0);
  });

  test('emptyTrash archives all items in history', async () => {
    const { result } = renderHook(() => useTrashState());
    const itemA: TrashItem = {
      id: 'a',
      title: 'A',
      closedAt: Date.now(),
      originalPath: '/apps/a',
    };
    const itemB: TrashItem = {
      id: 'b',
      title: 'B',
      closedAt: Date.now(),
      originalPath: '/apps/b',
    };

    await act(async () => {
      result.current.setItems([itemA, itemB]);
    });

    await waitFor(() => expect(result.current.items).toEqual([itemA, itemB]));

    let removed: TrashItem[] = [];
    await act(async () => {
      removed = result.current.emptyTrash();
    });

    expect(removed).toEqual([itemA, itemB]);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.history.slice(0, 2)).toEqual([itemA, itemB]);
  });
});

