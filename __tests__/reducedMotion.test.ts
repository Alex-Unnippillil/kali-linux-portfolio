import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('reduced motion settings', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.removeProperty('--motion-fast');
    document.documentElement.style.removeProperty('--motion-medium');
    document.documentElement.style.removeProperty('--motion-slow');
  });

  test('caps animation tokens and restores defaults when toggled', () => {
    const root = document.documentElement;
    root.style.setProperty('--motion-fast', '600ms');
    root.style.setProperty('--motion-medium', '800ms');
    root.style.setProperty('--motion-slow', '1s');

    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    expect(root.classList.contains('reduced-motion')).toBe(false);
    expect(root.style.getPropertyValue('--motion-fast')).toBe('600ms');
    expect(root.style.getPropertyValue('--motion-medium')).toBe('800ms');
    expect(root.style.getPropertyValue('--motion-slow')).toBe('1s');

    act(() => result.current.setReducedMotion(true));

    expect(root.classList.contains('reduced-motion')).toBe(true);
    expect(root.style.getPropertyValue('--motion-fast')).toBe('100ms');
    expect(root.style.getPropertyValue('--motion-medium')).toBe('100ms');
    expect(root.style.getPropertyValue('--motion-slow')).toBe('100ms');

    act(() => result.current.setReducedMotion(false));

    expect(root.classList.contains('reduced-motion')).toBe(false);
    expect(root.style.getPropertyValue('--motion-fast')).toBe('600ms');
    expect(root.style.getPropertyValue('--motion-medium')).toBe('800ms');
    expect(root.style.getPropertyValue('--motion-slow')).toBe('1s');
  });
});
