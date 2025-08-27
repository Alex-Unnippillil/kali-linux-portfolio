import { renderHook, act } from '@testing-library/react';
import useGameInput from '../hooks/useGameInput';

describe('useGameInput', () => {
  it('tracks last input type and hides virtual controls on keyboard', () => {
    const { result } = renderHook(() => useGameInput());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    expect(result.current.lastInput).toBe('keyboard');
    expect(result.current.hideVirtualControls).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current.lastInput).toBe('touch');
  });
});
