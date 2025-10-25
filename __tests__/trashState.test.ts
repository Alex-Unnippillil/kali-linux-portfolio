import React from 'react';
import { act, renderHook } from '@testing-library/react';
import useTrashState, { TrashItem, TRASH_FULL_THRESHOLD } from '../apps/trash/state';
import { NotificationsContext } from '../components/common/NotificationCenter';

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

describe('useTrashState actions', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('moveToTrash and restore remove item', () => {
    const { result } = renderHook(() => useTrashState());
    const item: TrashItem = { id: '1', title: 'App1', closedAt: Date.now() };
    act(() => {
      result.current.moveToTrash(item);
    });
    expect(result.current.items).toEqual([item]);
    let restored: TrashItem | null = null;
    act(() => {
      restored = result.current.restore(0);
    });
    expect(restored).toEqual(item);
    expect(result.current.items).toEqual([]);
  });

  test('empty moves all items to history', () => {
    const { result } = renderHook(() => useTrashState());
    const a: TrashItem = { id: '1', title: 'A', closedAt: Date.now() };
    const b: TrashItem = { id: '2', title: 'B', closedAt: Date.now() };
    act(() => {
      result.current.moveToTrash(a);
      result.current.moveToTrash(b);
    });
    act(() => {
      result.current.empty();
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.history).toEqual([a, b]);
  });

  test('notifies when trash is full', () => {
    const pushNotification = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        NotificationsContext.Provider,
        { value: { notifications: {}, pushNotification, clearNotifications: () => {} } },
        children,
      );
    const { result } = renderHook(() => useTrashState(), { wrapper });
    for (let i = 0; i < TRASH_FULL_THRESHOLD; i += 1) {
      act(() => {
        result.current.moveToTrash({
          id: `${i}`,
          title: `App${i}`,
          closedAt: Date.now(),
        });
      });
    }
    expect(pushNotification).not.toHaveBeenCalled();
    act(() => {
      result.current.moveToTrash({ id: 'x', title: 'AppX', closedAt: Date.now() });
    });
    expect(pushNotification).toHaveBeenCalledWith('trash', 'Trash is full');
  });
});

