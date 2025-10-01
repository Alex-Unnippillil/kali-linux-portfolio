import { act, renderHook } from '@testing-library/react';
import useStableInput from '../hooks/useStableInput';

describe('useStableInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('debounces updates before committing the value', () => {
    const { result } = renderHook(() => useStableInput({ defaultValue: '', delay: 200 }));

    act(() => {
      result.current.onChange('abc');
    });

    expect(result.current.inputValue).toBe('abc');
    expect(result.current.value).toBe('');

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(result.current.value).toBe('');

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current.value).toBe('abc');
  });

  it('cancels pending updates on unmount', () => {
    const onCommit = jest.fn();
    const { result, unmount } = renderHook(() =>
      useStableInput({ defaultValue: '', delay: 150, onCommit })
    );

    act(() => {
      result.current.onChange('pending');
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('supports controlled values', () => {
    const onCommit = jest.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useStableInput({ value, defaultValue: '', delay: 100, onCommit }),
      { initialProps: { value: '' } }
    );

    act(() => {
      result.current.onChange('next');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(onCommit).toHaveBeenCalledWith('next');

    rerender({ value: 'next' });

    expect(result.current.value).toBe('next');
    expect(result.current.inputValue).toBe('next');
  });

  it('updates internal state in uncontrolled mode', () => {
    const { result } = renderHook(() => useStableInput({ defaultValue: 'start', delay: 50 }));

    expect(result.current.value).toBe('start');

    act(() => {
      result.current.setInputValue('finish');
    });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current.value).toBe('finish');
  });
});
