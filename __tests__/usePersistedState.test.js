import { renderHook, act } from '@testing-library/react';
import usePersistedState from '../hooks/usePersistedState';

describe('usePersistedState', () => {
  it('persists value to localStorage', () => {
    const { result, rerender } = renderHook(() => usePersistedState('test-key', 0));
    expect(result.current[0]).toBe(0);
    act(() => result.current[1](42));
    rerender();
    expect(result.current[0]).toBe(42);
    expect(JSON.parse(window.localStorage.getItem('test-key'))).toBe(42);
  });
});
