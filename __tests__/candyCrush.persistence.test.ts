import { act, renderHook } from '@testing-library/react';
import { useCandyCrushStats } from '../components/apps/candy-crush-logic';

describe('candy crush persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('best score and streak persist across hook instances', () => {
    const { result: first } = renderHook(() => useCandyCrushStats());

    expect(first.current.bestScore).toBe(0);
    expect(first.current.bestStreak).toBe(0);

    act(() => {
      first.current.updateStats(180, 6);
    });

    expect(first.current.bestScore).toBe(180);
    expect(first.current.bestStreak).toBe(6);
    expect(JSON.parse(window.localStorage.getItem('candy-crush:best-score') || '0')).toBe(180);
    expect(JSON.parse(window.localStorage.getItem('candy-crush:best-streak') || '0')).toBe(6);

    const { result: second } = renderHook(() => useCandyCrushStats());
    expect(second.current.bestScore).toBe(180);
    expect(second.current.bestStreak).toBe(6);

    act(() => {
      second.current.updateStats(120, 3);
    });

    expect(second.current.bestScore).toBe(180);
    expect(second.current.bestStreak).toBe(6);
  });
});

