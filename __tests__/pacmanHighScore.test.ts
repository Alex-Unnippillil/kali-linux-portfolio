import { renderHook, act } from '@testing-library/react';
import { usePacmanHighScore } from '../games/pacman/highScore';

describe('usePacmanHighScore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records and preserves the highest score', () => {
    const { result, rerender } = renderHook(() => usePacmanHighScore());
    expect(result.current.highScore).toBe(0);

    act(() => {
      result.current.recordScore(1200);
    });
    expect(result.current.highScore).toBe(1200);

    act(() => {
      result.current.recordScore(400);
    });
    expect(result.current.highScore).toBe(1200);

    rerender();
    expect(result.current.highScore).toBe(1200);
  });

  it('persists across sessions and can reset', () => {
    const { result, unmount } = renderHook(() => usePacmanHighScore());
    act(() => {
      result.current.recordScore(900);
    });
    unmount();

    const { result: next } = renderHook(() => usePacmanHighScore());
    expect(next.current.highScore).toBe(900);

    act(() => {
      next.current.resetHighScore();
    });
    expect(next.current.highScore).toBe(0);

    act(() => {
      next.current.recordScore(300);
      next.current.clearHighScore();
    });
    expect(next.current.highScore).toBe(0);
  });
});
