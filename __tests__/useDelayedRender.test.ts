import { renderHook, act } from '@testing-library/react';
import useDelayedRender from '../hooks/useDelayedRender';

describe('useDelayedRender', () => {
  it('only returns true after the delay', () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active, delay }) => useDelayedRender(active, delay),
      { initialProps: { active: true, delay: 400 } }
    );

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);

    act(() => {
      rerender({ active: false, delay: 400 });
    });
    expect(result.current).toBe(false);
  });
});
