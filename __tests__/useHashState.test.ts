import { renderHook, act } from '@testing-library/react';
import useHashState from '../hooks/useHashState';

describe('useHashState', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('initializes from hash when present', () => {
    window.location.hash = '#bar';
    const { result } = renderHook(() =>
      useHashState<'foo' | 'bar'>('foo', ['foo', 'bar'])
    );
    expect(result.current[0]).toBe('bar');
  });

  it('updates hash on change', () => {
    const { result } = renderHook(() =>
      useHashState<'foo' | 'bar'>('foo', ['foo', 'bar'])
    );
    act(() => result.current[1]('bar'));
    expect(result.current[0]).toBe('bar');
    expect(window.location.hash).toBe('#bar');
  });
});
