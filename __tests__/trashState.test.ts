import { act, renderHook } from '@testing-library/react';
import useTrashState, { TrashItem } from '../apps/trash/state';

describe('useTrashState restoreFromHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renames on conflict when confirmed', () => {
    const { result } = renderHook(() => useTrashState());
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1, path: '/app' };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2, path: '/app2' };

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
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1, path: '/app' };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2, path: '/app2' };

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

  test('moveToTrash and restore preserve path', () => {
    const { result } = renderHook(() => useTrashState());
    act(() => {
      result.current.moveToTrash({ id: '3', title: 'A', path: '/a' });
    });
    expect(result.current.items).toHaveLength(1);
    let restored: TrashItem | null = null;
    act(() => {
      restored = result.current.restore(0);
    });
    expect(restored?.path).toBe('/a');
  });

  test('emptyTrash clears items and returns them', () => {
    const { result } = renderHook(() => useTrashState());
    act(() => {
      result.current.moveToTrash({ id: '4', title: 'A', path: '/a' });
      result.current.moveToTrash({ id: '5', title: 'B', path: '/b' });
    });
    let removed: TrashItem[] = [];
    act(() => {
      removed = result.current.emptyTrash();
    });
    expect(removed.length).toBe(2);
    expect(result.current.items).toHaveLength(0);
  });
});

