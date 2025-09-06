import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('focus model setting', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('focus model persists across sessions', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    expect(result.current.focusMode).toBe('click');
    act(() => result.current.setFocusMode('mouse'));
    expect(result.current.focusMode).toBe('mouse');
    expect(window.localStorage.getItem('focus-mode')).toBe('mouse');
  });
});
