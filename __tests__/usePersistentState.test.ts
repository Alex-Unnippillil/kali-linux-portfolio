import { renderHook, act } from '@testing-library/react';
import usePersistentState from '../hooks/usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('falls back to the initial value when stored JSON is invalid', () => {
    window.localStorage.setItem('invalid-json', '{not:"json"');

    const { result } = renderHook(() => usePersistentState('invalid-json', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });

  it('uses the validator to reject invalid stored data and fall back', () => {
    window.localStorage.setItem('validated-key', JSON.stringify('not-a-boolean'));

    const { result } = renderHook(() =>
      usePersistentState('validated-key', true, (value): value is boolean => typeof value === 'boolean'),
    );

    expect(result.current[0]).toBe(true);
  });

  it('exposes reset and clear helpers that restore the initial value', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

    const { result } = renderHook(() => usePersistentState('helper-key', 0));

    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);
    expect(setItemSpy).toHaveBeenLastCalledWith('helper-key', '42');

    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe(0);
    expect(setItemSpy).toHaveBeenLastCalledWith('helper-key', '0');

    act(() => {
      result.current[3]();
    });
    expect(removeItemSpy).toHaveBeenCalledWith('helper-key');
    expect(result.current[0]).toBe(0);
  });
});
