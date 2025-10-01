import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

jest.mock('idb-keyval', () => ({
  get: jest.fn(() => Promise.resolve(undefined)),
  set: jest.fn(() => Promise.resolve(undefined)),
  del: jest.fn(() => Promise.resolve(undefined)),
}));

describe('accessibility settings persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
    document.body.innerHTML = '';
  });

  test('dyslexia font toggle updates the root class and persists to storage', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(result.current.dyslexiaFont).toBe(false));

    await act(async () => {
      result.current.setDyslexiaFont(true);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(document.documentElement.classList.contains('dyslexia')).toBe(true),
    );
    await waitFor(() => expect(window.localStorage.getItem('dyslexia-font')).toBe('true'));
  });

  test('spacing multiplier updates reading variables for inputs and editors', async () => {
    const textarea = document.createElement('textarea');
    textarea.style.lineHeight = 'var(--reading-line-height)';
    textarea.style.letterSpacing = 'var(--reading-letter-spacing)';
    textarea.style.wordSpacing = 'var(--reading-word-spacing)';
    document.body.appendChild(textarea);

    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.style.lineHeight = 'var(--reading-line-height)';
    editor.style.letterSpacing = 'var(--reading-letter-spacing)';
    editor.style.wordSpacing = 'var(--reading-word-spacing)';
    document.body.appendChild(editor);

    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--spacing-multiplier')).toBe('1'),
    );

    await act(async () => {
      result.current.setSpacingMultiplier(1.4);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--spacing-multiplier')).toBe('1.4'),
    );
    expect(document.documentElement.style.getPropertyValue('--reading-line-height')).toBe('2.10');
    expect(document.documentElement.style.getPropertyValue('--reading-letter-spacing')).toBe(
      '0.020em',
    );
    expect(document.documentElement.style.getPropertyValue('--reading-word-spacing')).toBe(
      '0.040em',
    );
    expect(textarea.style.lineHeight).toBe('var(--reading-line-height)');
    expect(editor.style.lineHeight).toBe('var(--reading-line-height)');
    await waitFor(() => expect(window.localStorage.getItem('spacing-multiplier')).toBe('1.4'));
  });
});
