import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

const getCaretWidth = () =>
  document.documentElement.style.getPropertyValue('--text-caret-width');

const getCaretShape = () =>
  document.documentElement.style.getPropertyValue('--text-caret-shape');

describe('cursor thickness setting', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty('--text-caret-width');
    document.documentElement.style.removeProperty('--text-caret-shape');
    document.documentElement.style.removeProperty('--text-caret-transition');
  });

  test('persists selection and updates css variables', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    act(() => {
      result.current.setCursorThickness('thick');
    });

    expect(result.current.cursorThickness).toBe('thick');
    expect(window.localStorage.getItem('cursor-thickness')).toBe('thick');
    expect(getCaretWidth()).toBe('4px');
    expect(getCaretShape()).toBe('block');

    input.focus();
    expect(getCaretWidth()).toBe('4px');
    input.blur();
    expect(getCaretWidth()).toBe('4px');
  });

  test('restores saved cursor thickness on load', async () => {
    window.localStorage.setItem('cursor-thickness', 'thin');
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.cursorThickness).toBe('thin'));
    expect(getCaretWidth()).toBe('1px');
    expect(getCaretShape()).toBe('bar');
  });
});
