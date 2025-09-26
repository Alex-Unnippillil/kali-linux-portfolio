import { act, renderHook } from '@testing-library/react';
import useDebouncedValue from '../hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces value changes by the provided delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 50 },
      }
    );

    expect(result.current).toBe('initial');

    act(() => {
      rerender({ value: 'update', delay: 50 });
    });
    act(() => {
      jest.advanceTimersByTime(40);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(result.current).toBe('update');
  });

  it('cancels a pending update when the value changes again before the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 30),
      { initialProps: { value: 'first' } }
    );

    act(() => {
      rerender({ value: 'second' });
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(result.current).toBe('first');

    act(() => {
      rerender({ value: 'third' });
    });
    act(() => {
      jest.advanceTimersByTime(29);
    });
    expect(result.current).toBe('first');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('third');
  });

  it('returns the immediate value when delay is zero or negative', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebouncedValue(value, delay),
      { initialProps: { value: 1, delay: 0 } }
    );

    expect(result.current).toBe(1);
    act(() => {
      rerender({ value: 2, delay: -1 });
    });
    expect(result.current).toBe(2);
  });
});
