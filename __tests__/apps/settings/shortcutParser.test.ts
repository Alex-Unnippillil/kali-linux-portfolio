import {
  keyboardEventToShortcut,
  normalizeShortcutString,
  normalizeShortcutTokens,
} from '../../../apps/settings/utils/shortcutParser';

describe('normalizeShortcutString', () => {
  it('orders modifiers and uppercases letters', () => {
    expect(normalizeShortcutString('shift + ctrl + a')).toBe('Ctrl+Shift+A');
  });

  it('deduplicates modifiers and trims whitespace', () => {
    expect(normalizeShortcutString('Ctrl + alt + Ctrl + K')).toBe('Ctrl+Alt+K');
  });

  it('normalizes meta aliases and special keys', () => {
    expect(normalizeShortcutString('cmd + option + space')).toBe('Alt+Meta+Space');
  });

  it('handles function keys and punctuation', () => {
    expect(normalizeShortcutString('f5')).toBe('F5');
    expect(normalizeShortcutString('ctrl + ,')).toBe('Ctrl+,');
  });
});

describe('normalizeShortcutTokens', () => {
  it('drops empty tokens', () => {
    expect(normalizeShortcutTokens(['', 'ctrl', 'A'])).toBe('Ctrl+A');
  });
});

describe('keyboardEventToShortcut', () => {
  it('builds chords from keyboard events', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, altKey: true });
    expect(keyboardEventToShortcut(event)).toBe('Ctrl+Alt+K');
  });

  it('captures modifier-only chords', () => {
    const event = new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true });
    expect(keyboardEventToShortcut(event)).toBe('Ctrl');
  });
});
