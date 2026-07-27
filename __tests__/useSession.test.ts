import { renderHook, act } from '@testing-library/react';
import useSession from '../hooks/useSession';

describe('useSession', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('open and close windows', () => {
    const { result } = renderHook(() => useSession());
    act(() =>
      result.current.dispatch({
        type: 'open',
        win: { id: 'one', x: 0, y: 0 },
      }),
    );
    expect(result.current.session.windows).toHaveLength(1);

    act(() => result.current.dispatch({ type: 'close', id: 'one' }));
    expect(result.current.session.windows).toHaveLength(0);
  });

  test('move and snap windows', () => {
    const { result } = renderHook(() => useSession());
    act(() =>
      result.current.dispatch({
        type: 'open',
        win: { id: 'a', x: 0, y: 0 },
      }),
    );
    act(() =>
      result.current.dispatch({ type: 'move', id: 'a', x: 10, y: 20 }),
    );
    expect(result.current.session.windows[0]).toMatchObject({ x: 10, y: 20 });

    act(() =>
      result.current.dispatch({ type: 'snap', id: 'a', snap: 'left' }),
    );
    expect(result.current.session.windows[0].snap).toBe('left');
  });

  test('reset session clears storage', () => {
    const { result } = renderHook(() => useSession());
    act(() =>
      result.current.dispatch({
        type: 'open',
        win: { id: 'a', x: 0, y: 0 },
      }),
    );
    expect(result.current.session.windows).toHaveLength(1);

    act(() => result.current.resetSession());
    expect(result.current.session.windows).toHaveLength(0);
    const stored = window.localStorage.getItem('desktop-session');
    expect(stored).not.toBeNull();
    expect(JSON.parse(String(stored)).windows).toEqual([]);
  });
});
