import { act, renderHook } from '@testing-library/react';
import useTrashState, { TrashItem } from '../apps/trash/state';

describe('useTrashState restoreFromHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renames on conflict when confirmed', () => {
    const { result } = renderHook(() => useTrashState());
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1 };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2 };

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
    const existing: TrashItem = { id: '1', title: 'App', closedAt: 1 };
    const fromHistory: TrashItem = { id: '2', title: 'App', closedAt: 2 };

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

