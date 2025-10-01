import { act, renderHook } from '@testing-library/react';
import { useFieldHighlights } from '../hooks/useFieldHighlights';

describe('useFieldHighlights', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('highlights fields and clears them after the timeout', () => {
    const { result } = renderHook(() => useFieldHighlights(500));

    act(() => {
      result.current.triggerHighlight(['name', 'email']);
    });

    expect(result.current.isHighlighted('name')).toBe(true);
    expect(result.current.isHighlighted('email')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isHighlighted('name')).toBe(false);
    expect(result.current.isHighlighted('email')).toBe(false);
  });

  it('extends highlight duration when retriggered', () => {
    const { result } = renderHook(() => useFieldHighlights(400));

    act(() => {
      result.current.triggerHighlight(['message']);
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.isHighlighted('message')).toBe(true);

    act(() => {
      result.current.triggerHighlight(['message']);
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current.isHighlighted('message')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current.isHighlighted('message')).toBe(false);
  });
});
